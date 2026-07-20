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
 * capabilities, specifications, and images are all compared against their
 * snapshots.
 *
 * Save-flow notes (fixed):
 * - Pricing tier edits are now actually sent to the backend, bundled into the
 *   same updateSupplierItem call as the core fields (the schema accepts
 *   priceTiers directly on that mutation — no separate CRUD needed).
 * - Packaging update now sends packageLength/packageWidth/packageHeight,
 *   matching the real UpdatePackagingInput schema (previously sent
 *   length/width/height, which the schema doesn't define).
 * - MediaBuilder changes (upload/replace/delete/reorder/make-primary) are now
 *   diffed against imagesSnapshot and persisted via WholesaleService's image
 *   mutations, and the resulting primary image URL is written to
 *   SupplierItem.image — nothing here writes to any Supplier (org)-level
 *   field.
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
  SupplierItemImage, SupplierCapabilityType,
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

// Capability types supported by the system
const CAPABILITY_TYPES: Array<{ value: SupplierCapabilityType; label: string; description: string }> = [
  { value: 'MINOR_CUSTOMIZATION', label: 'Minor Customization', description: 'Small changes to existing products' },
  { value: 'DRAWING_CUSTOMIZATION', label: 'Drawing Customization', description: 'Custom designs based on drawings' },
  { value: 'SAMPLE_CUSTOMIZATION', label: 'Sample Customization', description: 'Modifications to samples' },
  { value: 'FULL_CUSTOMIZATION', label: 'Full Customization', description: 'Complete product customization' },
  { value: 'OEM', label: 'OEM', description: 'Original Equipment Manufacturing' },
  { value: 'ODM', label: 'ODM', description: 'Original Design Manufacturing' },
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

// Numeric coercion helper for packaging fields: treats '', null, undefined,
// and NaN uniformly as "not provided" (null) rather than sending garbage or
// throwing further down the line.
function toNullableNumber(v: unknown): number | null {
  if (v === '' || v === null || v === undefined) return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

// Saving overlay — registers into the shared OverlayHost at priority 200,
// so it renders above FadeDialogModal sheets (100) but below confirm dialogs (300).
function SavingOverlay({ visible }: { visible: boolean }) {
  const { colors, } = useTheme()

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

  // Track capabilities per type for proper dirty checking and toggle handling
  const [capabilities, setCapabilities] = useState<Record<string, SupplierCapability>>({})
  const [capabilitiesSnapshot, setCapabilitiesSnapshot] = useState<Record<string, SupplierCapability>>({})

  // Track current images for dirty comparison
  const [images, setImages] = useState<SupplierItemImage[]>(item?.supplierItemImage || [])
  const [imagesSnapshot, setImagesSnapshot] = useState<SupplierItemImage[]>(item?.supplierItemImage || [])
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
    setDocuments(item.wholesaleDocument || [])
    setDocumentsSnapshot(item.wholesaleDocument || [])
    setSpecifications(item.productSpecifications || [])
    setSpecificationsSnapshot(item.productSpecifications || [])
    setWholesaleSettings(item.productWholesaleSettings || null)
    setWholesaleSettingsSnapshot(item.productWholesaleSettings || null)
    setImages(item.supplierItemImage || [])
    setImagesSnapshot(item.supplierItemImage || [])
    // Initialize capabilities from wholesale settings (all start as sampleAvailable for now)
    const initialCaps: Record<string, SupplierCapability> = {}
    CAPABILITY_TYPES.forEach(t => {
      initialCaps[t.value] = {
        id: item.productWholesaleSettings?.id || '',
        organizationId: 0,
        type: t.value,
        name: t.label,
        available: t.value === 'MINOR_CUSTOMIZATION' ? !!item.productWholesaleSettings?.sampleAvailable : false,
        description: t.value === 'MINOR_CUSTOMIZATION' ? item.productWholesaleSettings?.leadTime || '' : '',
        createdAt: item.productWholesaleSettings?.createdAt || new Date().toISOString(),
        updatedAt: item.productWholesaleSettings?.updatedAt || new Date().toISOString(),
      }
    })
    setCapabilities(initialCaps)
    setCapabilitiesSnapshot({ ...initialCaps })
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

    // Check capabilities
    if (stableStringify(capabilities) !== stableStringify(capabilitiesSnapshot)) return true

    // Check images
    if (stableStringify(images) !== stableStringify(imagesSnapshot)) return true

    return false
  }, [fields, snapshot, pendingImageAsset, pricingTiers, pricingTiersSnapshot, packaging, packagingSnapshot, shipping, shippingSnapshot, documents, documentsSnapshot, specifications, specificationsSnapshot, wholesaleSettings, wholesaleSettingsSnapshot, capabilities, capabilitiesSnapshot, images, imagesSnapshot])

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
      setImages(imagesSnapshot)
      setCapabilities(capabilitiesSnapshot)
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
    setImages(imagesSnapshot)
    setCapabilities(capabilitiesSnapshot)
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

    // Packaging validation — catches the "sellingUnit: sdasdasd, everything else
    // null" case before it ever reaches the network. Only validate if the user
    // actually touched packaging this session.
    const packagingChanged = stableStringify(packaging) !== stableStringify(packagingSnapshot)
    if (packagingChanged && packaging) {
      if (!packaging.sellingUnit || !packaging.sellingUnit.trim()) {
        setSaveError('Selling unit is required in Packaging.')
        setTab('packaging')
        return
      }
      const dims = [packaging.packageLength, packaging.packageWidth, packaging.packageHeight, packaging.grossWeight, packaging.netWeight]
      if (dims.some((v) => v !== null && v !== undefined && (typeof v === 'string' ? v !== '' : true) && !Number.isFinite(Number(v)))) {
        setSaveError('Packaging dimensions and weights must be valid numbers.')
        setTab('packaging')
        return
      }
    }

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
      // --- Overview-tab quick photo upload (legacy single-image flow) ---
      let overviewImageUrl: string | undefined
      if (pendingImageAsset && user?.orgId) {
        const { publicUrl } = await MediaService.uploadMedia(
          {
            uri: pendingImageAsset.uri,
            name: pendingImageAsset.fileName || `product_${Date.now()}.jpg`,
            type: pendingImageAsset.mimeType || 'image/jpeg',
          },
          String(user.orgId),
        )
        overviewImageUrl = publicUrl
      }

      // --- Media tab: diff `images` vs `imagesSnapshot` and persist to
      //     SupplierItemImage. This is what MediaBuilder was missing —
      //     previously it only updated local state, never the backend.
      
      const imagesChanged = stableStringify(images) !== stableStringify(imagesSnapshot)
      if (imagesChanged) {
        try {
          const snapshotIds = new Set((imagesSnapshot || []).map((img) => img.id))
          const currentIds = new Set((images || []).map((img) => img.id))

          // Deletes — present before, gone now.
          for (const img of imagesSnapshot || []) {
            if (!currentIds.has(img.id)) {
              await WholesaleService.deleteSupplierItemImage(img.id)
            }
          }

          // Creates & updates. MediaBuilder assigns brand-new images a
          // client-generated id (Date.now() + Math.random()), so anything
          // whose id wasn't in the snapshot is a create; anything that was
          // there but changed (replaced photo / moved) is an update.
          const idMap = new Map<number, number>() // client-side temp id -> real server id
          for (const img of images || []) {
            if (!snapshotIds.has(img.id)) {
              const created = await WholesaleService.createSupplierItemImage({
                supplierItemId: item.id,
                url: img.url,
                sortOrder: img.sortOrder,
              })
              idMap.set(img.id, created.id)
            } else {
              const original = (imagesSnapshot || []).find((o) => o.id === img.id)
              if (original && (original.url !== img.url || original.sortOrder !== img.sortOrder)) {
                await WholesaleService.updateSupplierItemImage({
                  id: img.id,
                  url: img.url,
                  sortOrder: img.sortOrder,
                })
              }
            }
          }

          // Final reorder pass — cheap safety net so sortOrder in the DB
          // always matches what's on screen, even across mixed create/update/
          // delete/reorder actions in the same save.
          const finalOrder = [...images].sort((a, b) => a.sortOrder - b.sortOrder)
          if (finalOrder.length > 0) {
            const realIds = finalOrder.map((img) => idMap.get(img.id) ?? img.id)
            await WholesaleService.reorderSupplierItemImages({
              ids: realIds,
              sortOrders: finalOrder.map((_, i) => i),
            })
          }

        } catch (e: any) {
          errors.push(`Media: ${e?.message ?? 'Failed to save images'}`)
        }
      }

      // --- Core item update ---
      // Image priority: an explicit overview-tab photo pick wins (the user
      // just did it this save), otherwise fall back to whatever the Media
      // tab's primary image resolved to, otherwise keep what's already there.
      // This writes to SupplierItem.image only — never a Supplier-level field.
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
        image: overviewImageUrl ?? item.image ?? '',
        // Pricing tiers were previously never sent — the schema accepts them
        // directly on this mutation, so bundle them in here.
        priceTiers: pricingTiers.map((t) => ({ minQty: t.minQty, price: t.price })),
      }) as unknown as SupplierItem // Cast to get full typed fields

      // --- Packaging update (only if changed) ---
      if (packaging && packagingChanged) {
        try {
          await WholesaleService.updatePackaging({
            supplierItemId: item.id,
            sellingUnit: packaging.sellingUnit,
            packageLength: toNullableNumber(packaging.packageLength),
            packageWidth: toNullableNumber(packaging.packageWidth),
            packageHeight: toNullableNumber(packaging.packageHeight),
            grossWeight: toNullableNumber(packaging.grossWeight),
            netWeight: toNullableNumber(packaging.netWeight),
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
      let syncedSpecifications = specifications
      try {
        const snapshotIds = new Set((specificationsSnapshot || []).map(s => s.id).filter(id => !String(id).startsWith('temp_')))
        const createdSpecIds: Array<{ tempId?: string, realId: string }> = []

        // Create new specs (those with temp ids or id not in snapshot)
        for (const spec of specifications || []) {
          if (!spec.id || String(spec.id).startsWith('temp_')) {
            const created = await WholesaleService.createSpecification({
              supplierItemId: item.id,
              name: spec.name,
              value: spec.value,
              category: spec.category,
              groupName: spec.groupName,
              unit: spec.unit,
              sortOrder: spec.sortOrder,
            })
            // Track the created specification ID for syncing
            createdSpecIds.push({ tempId: spec._tempId || spec.id, realId: created.id })
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

        // Sync created specification IDs back to local state
        if (createdSpecIds.length > 0) {
          syncedSpecifications = specifications.map(s => {
            const createdSpec = createdSpecIds.find(cs => cs.tempId === s._tempId || cs.tempId === s.id)
            if (createdSpec) {
              return { ...s, id: createdSpec.realId, _tempId: undefined }
            }
            return s
          })
        }
      } catch (e: any) {
        errors.push(`Specifications: ${e?.message ?? 'Failed to save'}`)
      }

      // --- Capabilities diff and save ---
      // NOTE: Capabilities are organization-level, stored on SupplierCapability table
      // The current implementation incorrectly saves to productWholesaleSettings
      // We need to save each capability separately to the correct table
      try {
        const orgId = user?.orgId ?? 0
        const snapshotCaps = capabilitiesSnapshot // original values
        const currentCaps = capabilities // current values

        // Get list of capability types that exist in current state
        const currentTypes = Object.keys(currentCaps)
        const snapshotTypes = Object.keys(snapshotCaps)

        // Create or update capabilities based on changes
        for (const type of currentTypes) {
          const current = currentCaps[type]
          const wasInSnapshot = snapshotCaps[type]

          if (!wasInSnapshot) {
            // New capability - create it
            if (current.available) {
              await WholesaleService.createSupplierCapability({
                organizationId: orgId,
                type: type as SupplierCapabilityType,
                name: current.name,
                available: current.available,
                description: current.description,
              })
            }
          } else if (wasInSnapshot && (current.available !== wasInSnapshot.available || current.description !== wasInSnapshot.description)) {
            // Updated capability - find the real ID and update
            const realId = wasInSnapshot.id
            if (realId && !String(realId).startsWith('temp_')) {
              await WholesaleService.updateSupplierCapability({
                id: String(realId),
                available: current.available,
                description: current.description,
              })
            }
          }
        }

        // Delete capabilities that were turned off (only if they exist in DB)
        for (const type of snapshotTypes) {
          const wasInSnapshot = snapshotCaps[type]
          const current = currentCaps[type]
          if (wasInSnapshot?.id && !String(wasInSnapshot.id).startsWith('temp_') && (!current || !current.available)) {
            // Capability was removed or turned off - soft delete
            // Note: We only delete if it was created during this session (has real DB id)
            // and is now being turned off (available = false)
            if (current && !current.available) {
              await WholesaleService.deleteSupplierCapability(String(wasInSnapshot.id))
            }
          }
        }
      } catch (e: any) {
        errors.push(`Capabilities: ${e?.message ?? 'Failed to save'}`)
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
          errors.push(`WholesaleSettings: ${e?.message ?? 'Failed to save'}`)
        }
      }

      // --- Documents diff and save ---
      let syncedDocuments = documents
      try {
        const documentsChanged = stableStringify(documents) !== stableStringify(documentsSnapshot)
        if (documentsChanged) {
          const snapshotIds = new Set((documentsSnapshot || []).map(d => d.id))
          const currentIds = new Set((documents || []).map(d => d.id))
          const createdDocIds: Array<{ tempId?: string, realId: string }> = []

          // Deletes — present before, gone now.
          for (const doc of documentsSnapshot || []) {
            if (!currentIds.has(doc.id)) {
              await WholesaleService.deleteDocument(doc.id)
            }
          }

          // Creates & updates. Documents with temp ids are creates, existing ones with changes are updates.
          for (const doc of documents || []) {
            const isNew = !snapshotIds.has(doc.id) && doc.id?.toString().startsWith('temp_')
            const isExisting = snapshotIds.has(doc.id) && !doc.id?.toString().startsWith('temp_')

            if (isNew) {
              const created = await WholesaleService.uploadDocument({
                supplierItemId: item.id,
                type: doc.type,
                title: doc.title,
                fileUrl: doc.fileUrl,
              })
              // Track the created document ID for syncing
              createdDocIds.push({ tempId: doc._tempId || doc.id, realId: created.id })
            } else if (isExisting) {
              const original = documentsSnapshot.find(d => d.id === doc.id)
              // Check if type or title changed (fileUrl is immutable after upload)
              if (original && (doc.type !== original.type || doc.title !== original.title)) {
                await WholesaleService.updateDocument({
                  id: doc.id,
                  type: doc.type,
                  title: doc.title,
                })
              }
            }
          }

          // Sync created document IDs back to local state
          if (createdDocIds.length > 0) {
            syncedDocuments = documents.map(d => {
              const createdDoc = createdDocIds.find(cd => cd.tempId === d._tempId || cd.tempId === d.id)
              if (createdDoc) {
                return { ...d, id: createdDoc.realId, _tempId: undefined }
              }
              return d
            })
          }
        }
      } catch (e: any) {
        errors.push(`Documents: ${e?.message ?? 'Failed to save'}`)
      }

      if (errors.length > 0) {
        setSaveError(errors.join('; '))
      }

      // Update all snapshots on partial or full success
      // Create an updated item that includes our synced sub-resources
      const fullyUpdated = {
        ...updated,
        wholesaleDocuments: syncedDocuments,
        productSpecifications: syncedSpecifications,
        wholesalePackaging: packaging,
        wholesaleShipping: shipping,
      } as SupplierItem

      onUpdated(fullyUpdated)
      const newSnap = snap(updated)
      setSnapshot(newSnap)
      setFields(newSnap)
      setPendingImageAsset(null)

      // Update snapshots for sub-resources
      setPricingTiersSnapshot(pricingTiers)
      setPackagingSnapshot(packaging)
      setShippingSnapshot(shipping)
      // Sync the documents/specifications with real IDs after save
      setDocumentsSnapshot(syncedDocuments)
      setDocuments(syncedDocuments) // Also update the state to replace temp IDs
      setSpecificationsSnapshot(syncedSpecifications)
      setSpecifications(syncedSpecifications) // Also update the state to replace temp IDs
      setWholesaleSettingsSnapshot(wholesaleSettings)
      // Reflect the server's canonical image list/order if it came back on
      // `updated`; otherwise keep what we just persisted locally.
      setImages(updated.supplierItemImage ?? images)
      setImagesSnapshot(updated.supplierItemImage ?? images)
      setCapabilitiesSnapshot({ ...capabilities })

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
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: editing ? 90 : 16 }} indicatorStyle={theme === 'dark' ? 'black' : 'white'}>
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
                images={item.supplierItemImage || []} // supplierItemImage

                orgId={user?.orgId ?? ''}
                onUpdated={(imgs,) => {
                  // Update images state for dirty tracking
                  setImages(imgs)
                  // Update both images array and primary image field
                  onUpdated({ ...item, supplierItemImage: imgs, })
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
                capabilities={Object.values(capabilities)}
                editable={editing}
                onChange={(caps) => {
                  // Update capabilities state
                  const capsMap: Record<string, SupplierCapability> = {}
                  caps.forEach(c => {
                    capsMap[c.type] = c
                  })
                  setCapabilities(capsMap)
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