/**
 * ProductDetailsModal — product view/edit sheet for the supplier catalog.
 *
 * Modal stacking fix: confirmation dialogs (discard / save) use useConfirm()
 * which now renders in its own RN Modal above this sheet. This file never
 * renders its own nested modals. The "Applying Changes" overlay also uses a
 * separate transparent Modal so it sits above this sheet.
 *
 * Stacking tiers (see ConfirmDialogContext.tsx for the full explanation):
 *   Confirm dialog        zIndex 9000
 *   This sheet / overlay  zIndex 1000  (matches FadeDialogModal's tier)
 *
 * Dirty-state: compared field-by-field against a snapshot taken when the item
 * loads. Reverting a field back to its original value clears dirty state.
 *
 * Sub-resource dirty checking: pricingTiers, packaging, shipping, documents,
 * capabilities, and specifications are all compared against their snapshots.
 */
import React, { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator, Image,
  ScrollView, Switch, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import {
  Boxes, Camera, DollarSign, FileText, Globe, ImagePlus, Layers,
  LayoutGrid, Package, Pencil, Settings, Star, Truck, Trash2, X,
} from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { useConfirm } from '@/contexts/ConfirmDialogContext'
import { useToast } from '@/contexts/ToastContext'
import { FadeDialogModal } from './FadeDialogModal'
import { ProductStatusBadge } from './ProductStatusBadge'
import { RatingStars } from './RatingStars'
import { ReviewList } from './ReviewList'
import { VariantsTab } from './VariantsTab'
import { MarketplaceReadinessModal } from './MarketplaceReadinessModal'
import { MediaBuilder } from './builders/MediaBuilder'
import { MediaService } from '@/services/mediaService'
import { validateInventoryField } from '@/utils/catalogValidator'
import { useOverlayEntry } from '@/contexts/OverlayHostContext'
import {
  updateSupplierItem, archiveSupplierItem, reactivateSupplierItem,
  fetchSupplierItemReviews,
} from '@/services/supplierService/supplierService'
import type { SupplierItemReviewPayload } from '@/services/supplierService/supplierService'
import { WholesaleService } from '@/services/wholesaleService'
import type {
  SupplierItem,
  PriceTier, WholesalePackaging, WholesaleShipping, WholesaleDocument,
  ProductWholesaleSettings, SupplierCapability, ProductSpecification,
} from '@/types'
import {
  ProductSpecificationBuilder,
  PackagingBuilder,
  ShippingBuilder,
  DocumentsBuilder,
  SupplierCapabilityBuilder,
  PricingBuilder,
} from './builders'

const fmt = (n: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n)

type TabKey = 'overview' | 'media' | 'specifications' | 'variants' | 'pricing' | 'packaging' | 'shipping' | 'documents' | 'capabilities' | 'reviews'
const TABS: Array<{ key: TabKey; label: string; Icon: any }> = [
  { key: 'overview', label: 'Overview', Icon: LayoutGrid },
  { key: 'media', label: 'Media', Icon: Camera },
  { key: 'specifications', label: 'Specifications', Icon: Boxes },
  { key: 'variants', label: 'Variants', Icon: Layers },
  { key: 'pricing', label: 'Pricing', Icon: DollarSign },
  { key: 'packaging', label: 'Packaging', Icon: Package },
  { key: 'shipping', label: 'Shipping', Icon: Truck },
  { key: 'documents', label: 'Documents', Icon: FileText },
  { key: 'capabilities', label: 'Capabilities', Icon: Settings },
  { key: 'reviews', label: 'Reviews', Icon: Star },
]

interface Props {
  item: SupplierItem | null
  visible: boolean
  startInEditMode?: boolean
  onClose: () => void
  onUpdated: (item: SupplierItem) => void
}

interface Fields {
  name: string; description: string; sku: string
  unit: string; unitPrice: string; isVatExempt: boolean
  moq: string; availableQty: string
}

// Snapshot of a live item for dirty comparison.
function snap(item: SupplierItem): Fields {
  return {
    name: item.name, description: item.description ?? '',
    sku: item.sku ?? '', unit: item.unit,
    unitPrice: String(item.unitPrice), isVatExempt: item.isVatExempt,
    moq: String(item.moq), availableQty: String(item.availableQty),
  }
}

// Helper to sort and stringify arrays for dirty comparison (avoids false positives from key ordering)
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return JSON.stringify(value.map(item => {
      if (item && typeof item === 'object' && item.id !== undefined) {
        // Sort by id to ensure consistent comparison
        return item
      }
      return item
    }).sort((a: any, b: any) => {
      if (a && b && a.id !== undefined && b.id !== undefined) {
        return String(a.id).localeCompare(String(b.id))
      }
      return 0
    }))
  }
  return JSON.stringify(value)
}

// Saving overlay — registers into the shared OverlayHost at priority 200,
// so it renders above FadeDialogModal sheets (100) but below confirm dialogs (300).
function SavingOverlay({ visible }: { visible: boolean }) {
  const { colors,  } = useTheme()

  const node = (
    <View style={{
      flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <View style={{
        backgroundColor: colors.surface, borderRadius: 16,
        padding: 28, alignItems: 'center', gap: 14,
        borderWidth: 1, borderColor: colors.border,
        shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 24,
        shadowOffset: { width: 0, height: 12 }, elevation: 14,
        minWidth: 220,
      }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
          Applying Changes…
        </Text>
        <Text style={{ fontSize: 12, color: colors.textSecondary }}>
          Please wait, do not close this window.
        </Text>
      </View>
    </View>
  )

  useOverlayEntry(node, 200, visible)
  return null
}

export function ProductDetailsModal({ item, visible, startInEditMode, onClose, onUpdated }: Props) {
  const { colors, theme } = useTheme()
  const { user } = useAuth()
  const confirm = useConfirm()
  const toast = useToast()

  const [tab, setTab] = useState<TabKey>('overview')
  const [editing, setEditing] = useState(false)
  const [fields, setFields] = useState<Fields | null>(null)
  const [snapshot, setSnapshot] = useState<Fields | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [reviews, setReviews] = useState<SupplierItemReviewPayload | null>(null)
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [pendingImageAsset, setPendingImageAsset] = useState<ImagePicker.ImagePickerAsset | null>(null)
  const [marketplaceOpen, setMarketplaceOpen] = useState(false)

  // Sub-resource state for staged editing
  const [pricingTiers, setPricingTiers] = useState<PriceTier[]>([])
  const [pricingTiersSnapshot, setPricingTiersSnapshot] = useState<PriceTier[]>([])
  const [packaging, setPackaging] = useState<WholesalePackaging | null>(null)
  const [packagingSnapshot, setPackagingSnapshot] = useState<WholesalePackaging | null>(null)
  const [shipping, setShipping] = useState<WholesaleShipping | null>(null)
  const [shippingSnapshot, setShippingSnapshot] = useState<WholesaleShipping | null>(null)
  const [documents, setDocuments] = useState<WholesaleDocument[]>([])
  const [documentsSnapshot, setDocumentsSnapshot] = useState<WholesaleDocument[]>([])
  const [specifications, setSpecifications] = useState<ProductSpecification[]>([])
  const [specificationsSnapshot, setSpecificationsSnapshot] = useState<ProductSpecification[]>([])

  // capabilities state - derived from productWholesaleSettings for now
  // TODO: Capabilities may need separate API endpoints; using wholesaleSettings for now
  const [wholesaleSettings, setWholesaleSettings] = useState<ProductWholesaleSettings | null>(null)
  const [wholesaleSettingsSnapshot, setWholesaleSettingsSnapshot] = useState<ProductWholesaleSettings | null>(null)

  // Field-level validation errors for inventory tab
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof Fields, string>>>({})

  // Reset everything when item changes or modal opens.
  useEffect(() => {
    if (!item) return
    const s = snap(item)
    setFields(s)
    setSnapshot(s)
    setEditing(!!startInEditMode)
    setTab('overview')
    setReviews(null)
    setPendingImageAsset(null)
    setSaveError('')
    setFieldErrors({})

    // Initialize sub-resource state
    setPricingTiers(item.priceTiers || [])
    setPricingTiersSnapshot(item.priceTiers || [])
    setPackaging(item.wholesalePackaging || null)
    setPackagingSnapshot(item.wholesalePackaging || null)
    setShipping(item.wholesaleShipping || null)
    setShippingSnapshot(item.wholesaleShipping || null)
    setDocuments(item.wholesaleDocuments || [])
    setDocumentsSnapshot(item.wholesaleDocuments || [])
    setSpecifications(item.productSpecifications || [])
    setSpecificationsSnapshot(item.productSpecifications || [])
    setWholesaleSettings(item.productWholesaleSettings || null)
    setWholesaleSettingsSnapshot(item.productWholesaleSettings || null)
  }, [item?.id, startInEditMode])

  // Dirty = any field differs from the snapshot, OR a new image was picked, OR any sub-resource changed.
  const isDirty = useMemo(() => {
    if (!fields || !snapshot) return false
    if (pendingImageAsset) return true

    // Check core fields
    if ((Object.keys(fields) as Array<keyof Fields>).some(
      (k) => String(fields[k]) !== String(snapshot[k]),
    )) return true

    // Check pricing tiers
    if (stableStringify(pricingTiers) !== stableStringify(pricingTiersSnapshot)) return true

    // Check packaging
    if (stableStringify(packaging) !== stableStringify(packagingSnapshot)) return true

    // Check shipping
    if (stableStringify(shipping) !== stableStringify(shippingSnapshot)) return true

    // Check documents
    if (stableStringify(documents) !== stableStringify(documentsSnapshot)) return true

    // Check specifications
    if (stableStringify(specifications) !== stableStringify(specificationsSnapshot)) return true

    // Check wholesale settings (capabilities)
    if (stableStringify(wholesaleSettings) !== stableStringify(wholesaleSettingsSnapshot)) return true

    return false
  }, [fields, snapshot, pendingImageAsset, pricingTiers, pricingTiersSnapshot, packaging, packagingSnapshot, shipping, shippingSnapshot, documents, documentsSnapshot, specifications, specificationsSnapshot, wholesaleSettings, wholesaleSettingsSnapshot])

  if (!item || !fields) return null

  const set = <K extends keyof Fields>(k: K, v: Fields[K]) => {
    setFields((prev) => prev ? { ...prev, [k]: v } : prev)
    if (fieldErrors[k]) setFieldErrors((e) => ({ ...e, [k]: undefined }))
  }

  // Validate a single inventory field inline.
  const validateField = (k: 'availableQty' | 'moq') => {
    const err = validateInventoryField(k, fields[k] as string)
    if (err) setFieldErrors((e) => ({ ...e, [k]: err }))
    return !err
  }

  const handlePickImage = async () => {
    if (!editing) return
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      toast.show('Photo library access is required.', 'warning')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85, allowsEditing: true, aspect: [1, 1],
    })
    if (!result.canceled && result.assets?.[0]) setPendingImageAsset(result.assets[0])
  }

  const loadReviews = async () => {
    if (reviewsLoading) return
    setReviewsLoading(true)
    try {
      setReviews(await fetchSupplierItemReviews(item.id))
    } catch {
      toast.show('Could not load reviews.', 'error')
    } finally {
      setReviewsLoading(false)
    }
  }

  const handleTabPress = (key: TabKey) => {
    setTab(key)
    if (key === 'reviews' && reviews === null) loadReviews()
  }

  // Close — prompt to discard only if there are actual unsaved changes.
  const handleClose = async () => {
    if (isDirty) {
      const discard = await confirm({
        title: 'Discard changes?',
        message: 'You have unsaved changes. Discard them and close?',
        confirmLabel: 'Discard',
        cancelLabel: 'Keep Editing',
        destructive: true,
      })
      if (!discard) return
      // Discard — restore all snapshots
      if (snapshot && fields) setFields(snapshot)
      setPendingImageAsset(null)
      // Restore sub-resource snapshots
      setPricingTiers(pricingTiersSnapshot)
      setPackaging(packagingSnapshot)
      setShipping(shippingSnapshot)
      setDocuments(documentsSnapshot)
      setSpecifications(specificationsSnapshot)
      setWholesaleSettings(wholesaleSettingsSnapshot)
    }
    setSaveError('')
    setEditing(false)
    onClose()
  }

  // Cancel edit — revert to snapshot without closing.
  const handleCancelEdit = () => {
    if (snapshot && fields) setFields(snapshot)
    setPendingImageAsset(null)
    setSaveError('')
    setFieldErrors({})
    // Restore all sub-resource snapshots
    setPricingTiers(pricingTiersSnapshot)
    setPackaging(packagingSnapshot)
    setShipping(shippingSnapshot)
    setDocuments(documentsSnapshot)
    setSpecifications(specificationsSnapshot)
    setWholesaleSettings(wholesaleSettingsSnapshot)
    setEditing(false)
  }

  const handleSave = async () => {
    // Inline validation
    const moqOk = validateField('moq')
    const qtyOk = validateField('availableQty')
    if (!moqOk || !qtyOk) { setTab('overview'); return } // Changed to 'overview' for MOQ validation

    if (!fields.name.trim()) { setSaveError('Product name is required.'); setTab('overview'); return }
    if (!fields.unit.trim()) { setSaveError('Unit is required.'); setTab('overview'); return }
    const price = Number(fields.unitPrice)
    if (isNaN(price) || price <= 0) { setSaveError('A valid unit price is required.'); setTab('pricing'); return }

    const confirmed = await confirm({
      title: 'Save Changes',
      message: `Update "${item.name}"?`,
      confirmLabel: 'Save',
    })
    if (!confirmed) return

    setSaving(true)
    setSaveError('')
    const errors: string[] = []

    try {
      let imageUrl: string | undefined
      if (pendingImageAsset && user?.orgId) {
        const { publicUrl } = await MediaService.uploadMedia(
          {
            uri: pendingImageAsset.uri,
            name: pendingImageAsset.fileName || `product_${Date.now()}.jpg`,
            type: pendingImageAsset.mimeType || 'image/jpeg',
          },
          String(user.orgId),
        )
        imageUrl = publicUrl
      }

      // --- Core item update ---
      const updated = await updateSupplierItem({
        id: item.id,
        name: fields.name.trim(),
        description: fields.description.trim() || undefined,
        sku: fields.sku.trim() || undefined,
        unit: fields.unit.trim(),
        unitPrice: price,
        isVatExempt: fields.isVatExempt,
        vatRate: fields.isVatExempt ? 0 : 0.12,
        moq: parseInt(fields.moq, 10) || 1,
        availableQty: parseInt(fields.availableQty, 10) || 0,
        // Always pass image - use existing image if no new one uploaded
        image: imageUrl ?? item.image ?? '',
      }) as unknown as SupplierItem // Cast to get full typed fields

      // --- Packaging update (only if changed) ---
      if (packaging && stableStringify(packaging) !== stableStringify(packagingSnapshot)) {
        try {
          await WholesaleService.updatePackaging({
            supplierItemId: item.id,
            sellingUnit: packaging.sellingUnit,
            length: packaging.packageLength,
            width: packaging.packageWidth,
            height: packaging.packageHeight,
            grossWeight: packaging.grossWeight,
            netWeight: packaging.netWeight,
          })
        } catch (e: any) {
          errors.push(`Packaging: ${e?.message ?? 'Failed to save'}`)
        }
      }

      // --- Shipping update (only if changed) ---
      if (shipping && stableStringify(shipping) !== stableStringify(shippingSnapshot)) {
        try {
          await WholesaleService.updateShipping({
            supplierItemId: item.id,
            originCountry: shipping.originCountry,
            originProvince: shipping.originProvince,
            originCity: shipping.originCity,
            shippingMethod: shipping.shippingMethod,
            estimatedDays: shipping.estimatedDays,
            shippingNotes: shipping.shippingNotes,
          })
        } catch (e: any) {
          errors.push(`Shipping: ${e?.message ?? 'Failed to save'}`)
        }
      }

      // --- Specifications diff and save ---
      try {
        const snapshotIds = new Set((specificationsSnapshot || []).map(s => s.id).filter(id => !String(id).startsWith('temp_')))

        // Create new specs (those with temp ids or id not in snapshot)
        for (const spec of specifications || []) {
          if (!spec.id || String(spec.id).startsWith('temp_')) {
            await WholesaleService.createSpecification({
              supplierItemId: item.id,
              name: spec.name,
              value: spec.value,
              category: spec.category,
              groupName: spec.groupName,
              unit: spec.unit,
              sortOrder: spec.sortOrder,
            })
          }
        }

        // Update existing specs
        for (const spec of specifications || []) {
          if (spec.id && !String(spec.id).startsWith('temp_') && snapshotIds.has(String(spec.id))) {
            const original = specificationsSnapshot.find(s => s.id === spec.id)
            if (original && (spec.name !== original.name || spec.value !== original.value ||
                spec.category !== original.category || spec.groupName !== original.groupName ||
                spec.unit !== original.unit || spec.sortOrder !== original.sortOrder)) {
              await WholesaleService.updateSpecification({
                id: String(spec.id),
                name: spec.name,
                value: spec.value,
                category: spec.category,
                groupName: spec.groupName,
                unit: spec.unit,
                sortOrder: spec.sortOrder,
              })
            }
          }
        }

        // Delete removed specs
        for (const spec of specificationsSnapshot || []) {
          if (!spec.id?.startsWith('temp_') && !(specifications || []).some(s => s.id === spec.id)) {
            await WholesaleService.deleteSpecification(String(spec.id))
          }
        }
      } catch (e: any) {
        errors.push(`Specifications: ${e?.message ?? 'Failed to save'}`)
      }

      // --- Wholesale settings update (only if changed) ---
      if (wholesaleSettings && stableStringify(wholesaleSettings) !== stableStringify(wholesaleSettingsSnapshot)) {
        try {
          await WholesaleService.updateWholesaleSettings(item.id, {
            minimumOrderQty: wholesaleSettings.minimumOrderQty,
            sampleAvailable: wholesaleSettings.sampleAvailable,
            samplePrice: wholesaleSettings.samplePrice,
            leadTime: wholesaleSettings.leadTime,
          })
        } catch (e: any) {
          errors.push(`Capabilities: ${e?.message ?? 'Failed to save'}`)
        }
      }

      if (errors.length > 0) {
        setSaveError(errors.join('; '))
      }

      // Update all snapshots on partial or full success
      onUpdated(updated)
      const newSnap = snap(updated)
      setSnapshot(newSnap)
      setFields(newSnap)
      setPendingImageAsset(null)

      // Update snapshots for sub-resources
      setPricingTiersSnapshot(pricingTiers)
      setPackagingSnapshot(packaging)
      setShippingSnapshot(shipping)
      setDocumentsSnapshot(documents)
      setSpecificationsSnapshot(specifications)
      setWholesaleSettingsSnapshot(wholesaleSettings)

      // Only exit edit mode if no errors
      if (errors.length === 0) {
        setEditing(false)
        toast.show('Changes saved successfully.', 'success')
      }
    } catch (e: any) {
      setSaveError(e?.message ?? 'Failed to save changes.')
    } finally {
      setSaving(false)
    }
  }

  const handleArchiveToggle = async () => {
    const confirmed = await confirm({
      title: item.isActive ? 'Archive Product' : 'Reactivate Product',
      message: item.isActive
        ? `Archive "${item.name}"? It will stop appearing to buyers.`
        : `Reactivate "${item.name}"?`,
      confirmLabel: item.isActive ? 'Archive' : 'Reactivate',
      destructive: item.isActive,
    })
    if (!confirmed) return
    try {
      const updated = item.isActive
        ? await archiveSupplierItem(item.id)
        : await reactivateSupplierItem(item.id)
      onUpdated(updated as unknown as SupplierItem)
      toast.show(item.isActive ? 'Product archived.' : 'Product reactivated.', 'info')
    } catch (e: any) {
      setSaveError(e?.message ?? 'Failed to update product status.')
    }
  }

  const inp = {
    borderWidth: 1, borderColor: colors.border, borderRadius: 8,
    padding: 12, backgroundColor: colors.background,
    color: colors.text, fontSize: 14,
  }
  const lbl = { fontSize: 12, fontWeight: '600' as const, color: colors.textSecondary, marginBottom: 4 }
  const displayImageUri = pendingImageAsset?.uri ?? item.image ?? null

  return (
    <>
      {/* Applying-Changes overlay — its own Modal, always on top */}
      <SavingOverlay visible={saving} />

      <FadeDialogModal visible={visible} onRequestClose={handleClose} maxWidth={700}>
        {/* ── Header ── */}
        <View style={{
          flexDirection: 'row', justifyContent: 'space-between',
          alignItems: 'center', padding: 16,
          borderBottomWidth: 1, borderBottomColor: colors.border,
        }}>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }} numberOfLines={1}>
                {item.name}
              </Text>
              {/* Unsaved changes indicator */}
              {isDirty && (
                <View style={{
                  paddingHorizontal: 7, paddingVertical: 2,
                  borderRadius: 6, backgroundColor: `${colors.warning}22`,
                }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: colors.warning }}>
                    Unsaved
                  </Text>
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <ProductStatusBadge item={item} size="sm" />
              <RatingStars rating={item.averageRating} reviewCount={item.reviewCount} size={11} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {!editing && (
              <TouchableOpacity
                onPress={() => setEditing(true)}
                style={{ padding: 8, borderRadius: 8, backgroundColor: `${colors.primary}18` }}
              >
                <Pencil size={16} color={colors.primary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleArchiveToggle}
              disabled={saving}
              style={{ padding: 8, borderRadius: 8, backgroundColor: '#EF444415' }}
            >
              <Trash2 size={16} color="#EF4444" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClose} disabled={saving} style={{ padding: 8 }}>
              <X size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Tabs ── */}
        <ScrollView
          horizontal showsHorizontalScrollIndicator={true} indicatorStyle={theme === 'dark' ? 'black' : 'white'}
          style={{ borderBottomWidth: 1, borderBottomColor: colors.border, flexGrow: 0, }}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 2 }}
        >
          {TABS.map(({ key, label, Icon }) => {
            const active = tab === key
            return (
              <TouchableOpacity
                key={key} onPress={() => handleTabPress(key)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  paddingVertical: 12, paddingHorizontal: 10,
                  borderBottomWidth: 2,
                  borderBottomColor: active ? colors.primary : 'transparent',
                }}
              >
                <Icon size={14} color={active ? colors.primary : colors.textSecondary} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: active ? colors.primary : colors.textSecondary }}>
                  {label}
                </Text>
              </TouchableOpacity>
            )
          })}
          <TouchableOpacity
            onPress={() => setMarketplaceOpen(true)}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              paddingVertical: 12, paddingHorizontal: 10,
            }}
          >
            <Globe size={14} color={colors.textSecondary} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>
              Marketplace
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* ── Body ── */}
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: editing ? 90 : 16 }}  indicatorStyle={theme === 'dark' ? 'black' : 'white'}>
          {!!saveError && (
            <View style={{ backgroundColor: '#FEF2F2', borderRadius: 8, padding: 12, borderLeftWidth: 3, borderLeftColor: '#EF4444' }}>
              <Text style={{ color: '#DC2626', fontSize: 13 }}>{saveError}</Text>
            </View>
          )}

          {/* ── Overview tab ── */}
          {tab === 'overview' && (
            <>
              {/* Image */}
              <View style={{ alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  onPress={handlePickImage} disabled={!editing}
                  style={{
                    width: 148, height: 148, borderRadius: 14,
                    overflow: 'hidden', backgroundColor: colors.surface,
                    alignItems: 'center', justifyContent: 'center',
                    borderWidth: editing ? 2 : 1,
                    borderColor: editing ? `${colors.primary}60` : colors.border,
                    borderStyle: editing ? 'dashed' : 'solid',
                    opacity: editing ? 1 : 0.9,
                  }}
                >
                  {displayImageUri ? (
                    <Image source={{ uri: displayImageUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  ) : (
                    <View style={{ alignItems: 'center', gap: 6 }}>
                      <ImagePlus size={24} color={colors.textSecondary} />
                      <Text style={{ fontSize: 11, color: colors.textSecondary }}>No image</Text>
                    </View>
                  )}
                  {pendingImageAsset && (
                    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.55)', paddingVertical: 4 }}>
                      <Text style={{ fontSize: 10, color: '#fff', textAlign: 'center', fontWeight: '600' }}>
                        Pending — not saved yet
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
                {editing && (
                  <TouchableOpacity onPress={handlePickImage}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>
                      {displayImageUri ? 'Change Image' : 'Upload Image'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {editing ? (
                <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 12 }}>
                  <View>
                    <Text style={lbl}>Product Name *</Text>
                    <TextInput value={fields.name} onChangeText={(v) => set('name', v)} style={inp} placeholderTextColor={colors.textSecondary} />
                  </View>
                  <View>
                    <Text style={lbl}>SKU</Text>
                    <TextInput value={fields.sku} onChangeText={(v) => set('sku', v)} style={inp} placeholderTextColor={colors.textSecondary} autoCapitalize="characters" />
                  </View>
                  <View>
                    <Text style={lbl}>Description</Text>
                    <TextInput value={fields.description} onChangeText={(v) => set('description', v)} style={[inp, { minHeight: 72 }]} multiline placeholderTextColor={colors.textSecondary} />
                  </View>
                  {/* MOQ and Available Qty moved here from orphaned 'inventory' tab */}
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={lbl}>Minimum Order Quantity (MOQ) *</Text>
                      <TextInput
                        value={fields.moq}
                        onChangeText={(v) => set('moq', v)}
                        onBlur={() => validateField('moq')}
                        style={[inp, fieldErrors.moq ? { borderColor: '#EF4444' } : {}]}
                        keyboardType="number-pad"
                        placeholderTextColor={colors.textSecondary}
                      />
                      {!!fieldErrors.moq && (
                        <Text style={{ fontSize: 11, color: '#EF4444', marginTop: 3 }}>{fieldErrors.moq}</Text>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={lbl}>Available Quantity</Text>
                      <TextInput
                        value={fields.availableQty}
                        onChangeText={(v) => set('availableQty', v)}
                        onBlur={() => validateField('availableQty')}
                        style={[inp, fieldErrors.availableQty ? { borderColor: '#EF4444' } : {}]}
                        keyboardType="number-pad"
                        placeholderTextColor={colors.textSecondary}
                      />
                      {!!fieldErrors.availableQty && (
                        <Text style={{ fontSize: 11, color: '#EF4444', marginTop: 3 }}>{fieldErrors.availableQty}</Text>
                      )}
                    </View>
                  </View>
                </View>
              ) : (
                <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 8 }}>
                  <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 19 }}>
                    {item.description || 'No description provided.'}
                  </Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>SKU</Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>{item.sku ?? '—'}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>MOQ / Available</Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>
                      {item.moq} {item.unit} / {item.availableQty} {item.unit}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>Last Updated</Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>
                      {new Date(item.updatedAt).toLocaleString('en-PH')}
                    </Text>
                  </View>
                </View>
              )}
            </>
          )}

          {/* ── Pricing tab ── */}
          {tab === 'pricing' && (
            <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 12 }}>
              <PricingBuilder
                supplierItemId={item.id}
                priceTiers={pricingTiers}
                moq={parseInt(fields.moq, 10) || 1}
                unit={fields.unit}
                onChange={setPricingTiers}
                editable={editing}
              />
            </View>
          )}

          {/* ── Media tab ── */}
          {tab === 'media' && (
            <View style={{ backgroundColor: colors.background, borderRadius: 12 }}>
              <MediaBuilder
                supplierItemId={item.id}
                images={item.images || []}
                primaryImageUrl={item.image || undefined}
                orgId={user?.orgId ?? ''}
                onUpdated={(imgs, primaryUrl) => {
                  // Update both images array and primary image field
                  onUpdated({ ...item, images: imgs, image: primaryUrl })
                }}
                editable={editing}
              />
            </View>
          )}

          {/* ── Specifications tab ── */}
          {tab === 'specifications' && (
            <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16 }}>
              <ProductSpecificationBuilder
                supplierItemId={item.id}
                specifications={specifications}
                editable={editing}
                onChange={setSpecifications}
              />
            </View>
          )}
          {tab === 'packaging' && (
            <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16 }}>
              <PackagingBuilder
                supplierItemId={item.id}
                packaging={packaging}
                editable={editing}
                onChange={setPackaging}
              />
            </View>
          )}

          {tab === 'shipping' && (
            <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16 }}>
              <ShippingBuilder
                supplierItemId={item.id}
                shipping={shipping}
                editable={editing}
                onChange={setShipping}
              />
            </View>
          )}

          {tab === 'documents' && (
            <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16 }}>
              <DocumentsBuilder
                supplierItemId={item.id}
                documents={documents}
                orgId={user?.orgId ?? ''}
                editable={editing}
                onChange={setDocuments}
              />
            </View>
          )}

          {tab === 'capabilities' && (
            <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16 }}>
              <SupplierCapabilityBuilder
                capabilities={wholesaleSettings ? [{
                  id: wholesaleSettings.id,
                  organizationId: 0,
                  type: 'MINOR_CUSTOMIZATION',
                  name: 'Sample Available',
                  available: wholesaleSettings.sampleAvailable,
                  description: wholesaleSettings.leadTime,
                  createdAt: wholesaleSettings.createdAt,
                  updatedAt: wholesaleSettings.updatedAt,
                }] : []}
                editable={editing}
                onChange={(caps) => {
                  const c = caps[0]
                  setWholesaleSettings({
                    id: wholesaleSettings?.id || '',
                    supplierItemId: item.id,
                    minimumOrderQty: wholesaleSettings?.minimumOrderQty,
                    sampleAvailable: c?.available ?? false,
                    samplePrice: wholesaleSettings?.samplePrice,
                    leadTime: c?.description,
                    createdAt: wholesaleSettings?.createdAt || new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  })
                }}
              />
            </View>
          )}
          {tab === 'variants' && <VariantsTab item={item} />}
          {tab === 'reviews' && <ReviewList payload={reviews} loading={reviewsLoading} />}
        </ScrollView>

        {/* ── Sticky footer when editing ── */}
        {editing && (
          <View style={{
            flexDirection: 'row', gap: 10, padding: 14,
            backgroundColor: colors.surface,
            borderTopWidth: 1, borderTopColor: colors.border,
          }}>
            <TouchableOpacity
              onPress={handleCancelEdit}
              disabled={saving}
              style={{ flex: 1, padding: 13, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}
            >
              <Text style={{ fontWeight: '700', color: colors.text }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving || !isDirty}
              style={{
                flex: 2, padding: 13, borderRadius: 10, alignItems: 'center',
                backgroundColor: colors.primary,
                opacity: saving || !isDirty ? 0.45 : 1,
              }}
            >
              <Text style={{ fontWeight: '700', color: '#fff' }}>
                {isDirty ? 'Save Changes' : 'No Changes'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </FadeDialogModal>
      <MarketplaceReadinessModal
        visible={marketplaceOpen}
        supplierItemId={item.id}
        itemName={item.name}
        currentListing={(item as any).marketplaceListing}
        onClose={() => setMarketplaceOpen(false)}
        onPublished={(listing) => onUpdated({ ...item, marketplaceListing: listing } as SupplierItem)}
        onUnpublished={(listing) => onUpdated({ ...item, marketplaceListing: listing } as SupplierItem)}
      />
    </>
  )
}