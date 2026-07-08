import React, { useEffect, useState, useMemo } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput, Switch, ActivityIndicator, Image } from 'react-native'
import { X, LayoutGrid, DollarSign, Boxes, Star, Pencil, Trash2 } from 'lucide-react-native'
import * as ImagePicker from 'expo-image-picker'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { useConfirm } from '@/contexts/ConfirmDialogContext'
import { ProductStatusBadge } from './ProductStatusBadge'
import { RatingStars } from './RatingStars'
import { ReviewList } from './ReviewList'
import { FadeDialogModal } from './FadeDialogModal'
import { MediaService } from '@/services/mediaService'
import {
  updateSupplierItem,
  archiveSupplierItem,
  reactivateSupplierItem,
  fetchSupplierItemReviews,
  type SupplierItem,
  type SupplierItemReviewPayload,
} from '@/services/supplierService/supplierService'

const formatPHP = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)

type TabKey = 'overview' | 'pricing' | 'inventory' | 'reviews'
const TABS: Array<{ key: TabKey; label: string; Icon: any }> = [
  { key: 'overview', label: 'Overview', Icon: LayoutGrid },
  { key: 'pricing', label: 'Pricing', Icon: DollarSign },
  { key: 'inventory', label: 'Inventory', Icon: Boxes },
  { key: 'reviews', label: 'Reviews', Icon: Star },
]

interface Props {
  item: SupplierItem | null
  visible: boolean
  startInEditMode?: boolean
  onClose: () => void
  onUpdated: (item: SupplierItem) => void
}

interface EditableFields {
  name: string
  description: string
  sku: string
  unit: string
  unitPrice: string
  isVatExempt: boolean
  moq: string
  availableQty: string
}

function toFields(item: SupplierItem): EditableFields {
  return {
    name: item.name,
    description: item.description ?? '',
    sku: item.sku ?? '',
    unit: item.unit,
    unitPrice: String(item.unitPrice),
    isVatExempt: item.isVatExempt,
    moq: String(item.moq),
    availableQty: String(item.availableQty),
  }
}

export function ProductDetailsModal({ item, visible, startInEditMode, onClose, onUpdated }: Props) {
  const { colors } = useTheme()
  const { user } = useAuth()
  const confirm = useConfirm()

  const [tab, setTab] = useState<TabKey>('overview')
  const [editing, setEditing] = useState(false)
  const [fields, setFields] = useState<EditableFields | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [reviews, setReviews] = useState<SupplierItemReviewPayload | null>(null)
  const [reviewsLoading, setReviewsLoading] = useState(false)

  // Image changes are staged locally until Save Changes is confirmed — no
  // network call happens just from picking a photo.
  const [pendingImageAsset, setPendingImageAsset] = useState<ImagePicker.ImagePickerAsset | null>(null)

  useEffect(() => {
    if (item) {
      setFields(toFields(item))
      setEditing(!!startInEditMode)
      setTab('overview')
      setReviews(null)
      setPendingImageAsset(null)
      setSaveError('')
    }
  }, [item?.id, startInEditMode])

  const isDirty = useMemo(() => {
    if (!item || !fields) return false
    const original = toFields(item)
    return JSON.stringify(original) !== JSON.stringify(fields) || pendingImageAsset !== null
  }, [item, fields, pendingImageAsset])

  if (!item || !fields) return null

  const set = (k: keyof EditableFields, v: any) => setFields((prev) => (prev ? { ...prev, [k]: v } : prev))

  const handlePickImage = async () => {
    if (!editing) return
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      const ok = await confirm({
        title: 'Permission needed',
        message: 'Photo library access is required to change the product image. Please enable it in your device/browser settings.',
        confirmLabel: 'OK',
        cancelLabel: 'Dismiss',
      })
      void ok
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    })
    if (result.canceled || !result.assets?.[0]) return
    setPendingImageAsset(result.assets[0])
  }

  const loadReviews = async () => {
    setReviewsLoading(true)
    try {
      const payload = await fetchSupplierItemReviews(item.id)
      setReviews(payload)
    } catch (e) {
      if (__DEV__) console.error('fetchSupplierItemReviews error', e)
    } finally {
      setReviewsLoading(false)
    }
  }

  const handleTabPress = (key: TabKey) => {
    setTab(key)
    if (key === 'reviews' && reviews === null) loadReviews()
  }

  const handleClose = async () => {
    if (isDirty) {
      const discard = await confirm({
        title: 'Discard changes?',
        message: 'You have unsaved changes to this product.',
        confirmLabel: 'Discard',
        cancelLabel: 'Keep Editing',
        destructive: true,
      })
      if (!discard) return
    }
    onClose()
  }

  const handleSave = async () => {
    setSaveError('')
    const unitPriceNum = Number(fields.unitPrice)
    const moqNum = parseInt(fields.moq, 10)
    const qtyNum = parseInt(fields.availableQty, 10)
    if (!fields.name.trim()) return setSaveError('Product name is required.')
    if (!fields.unit.trim()) return setSaveError('Unit is required.')
    if (isNaN(unitPriceNum) || unitPriceNum <= 0) return setSaveError('A valid unit price is required.')

    const confirmed = await confirm({
      title: 'Update Product',
      message: 'You are updating this item. Are you sure?',
      confirmLabel: 'Save Changes',
    })
    if (!confirmed) return

    setSaving(true)
    try {
      let imageUrl: string | undefined
      if (pendingImageAsset) {
        if (!user?.orgId) throw new Error('Organization not found.')
        // NOTE: no stored filePath for the old image, so this uploads a new
        // file rather than replacing the old one in storage. Add `imagePath`
        // to SupplierItem for proper cleanup via MediaService.updateMedia.
        const { publicUrl } = await MediaService.uploadMedia(
          {
            uri: pendingImageAsset.uri,
            name: pendingImageAsset.fileName || `product_${Date.now()}.jpg`,
            type: pendingImageAsset.mimeType || 'image/jpeg',
          },
          String(user.orgId)
        )
        imageUrl = publicUrl
      }

      const updated = await updateSupplierItem({
        id: item.id,
        name: fields.name,
        description: fields.description || undefined,
        sku: fields.sku || undefined,
        unit: fields.unit,
        unitPrice: unitPriceNum,
        isVatExempt: fields.isVatExempt,
        vatRate: fields.isVatExempt ? 0 : 0.12,
        moq: isNaN(moqNum) ? 1 : moqNum,
        availableQty: isNaN(qtyNum) ? 0 : qtyNum,
        ...(imageUrl ? { image: imageUrl } : {}),
      })
      onUpdated(updated)
      setPendingImageAsset(null)
      setEditing(false)
    } catch (e: any) {
      setSaveError(e.message ?? 'Failed to save changes.')
    } finally {
      setSaving(false)
    }
  }

  const handleArchiveToggle = async () => {
    const confirmed = await confirm({
      title: item.isActive ? 'Archive Product' : 'Reactivate Product',
      message: item.isActive
        ? `Archive "${item.name}"? It will stop appearing to buyers but its order history is kept.`
        : `Reactivate "${item.name}"?`,
      confirmLabel: item.isActive ? 'Archive' : 'Reactivate',
      destructive: item.isActive,
    })
    if (!confirmed) return

    try {
      const updated = item.isActive ? await archiveSupplierItem(item.id) : await reactivateSupplierItem(item.id)
      onUpdated(updated)
    } catch (e: any) {
      setSaveError(e.message ?? 'Failed to update product status.')
    }
  }

  const inputStyle = { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, backgroundColor: colors.background, color: colors.text, fontSize: 14 }
  const labelStyle = { fontSize: 12, fontWeight: '600' as const, color: colors.textSecondary, marginBottom: 4 }

  // Local preview takes priority over the saved image whenever a pick is staged.
  const displayImageUri = pendingImageAsset?.uri ?? item.image ?? null

  return (
    <FadeDialogModal visible={visible} onRequestClose={handleClose} maxWidth={680}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }} numberOfLines={1}>{item.name}</Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <ProductStatusBadge item={item} size="sm" />
            <RatingStars rating={item.averageRating} reviewCount={item.reviewCount} size={11} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {!editing && (
            <TouchableOpacity onPress={() => setEditing(true)} style={{ padding: 8, borderRadius: 8, backgroundColor: colors.primary + '15' }}>
              <Pencil size={16} color={colors.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleArchiveToggle} style={{ padding: 8, borderRadius: 8, backgroundColor: '#EF444415' }}>
            <Trash2 size={16} color="#EF4444" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClose} style={{ padding: 8 }}>
            <X size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ borderBottomWidth: 1, borderBottomColor: colors.border, flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 4 }}>
        {TABS.map(({ key, label, Icon }) => {
          const active = tab === key
          return (
            <TouchableOpacity key={key} onPress={() => handleTabPress(key)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: 2, borderBottomColor: active ? colors.primary : 'transparent' }}>
              <Icon size={14} color={active ? colors.primary : colors.textSecondary} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: active ? colors.primary : colors.textSecondary }}>{label}</Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: editing ? 100 : 16 }}>
        {!!saveError && (
          <View style={{ backgroundColor: '#FEF2F2', borderRadius: 8, padding: 12, borderLeftWidth: 3, borderLeftColor: '#EF4444' }}>
            <Text style={{ color: '#DC2626', fontSize: 13 }}>{saveError}</Text>
          </View>
        )}

        {tab === 'overview' && (
          <>
            <View style={{ alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                onPress={handlePickImage}
                disabled={!editing}
                style={{ width: 140, height: 140, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', opacity: editing ? 1 : 0.9 }}
              >
                {displayImageUri ? (
                  <Image source={{ uri: displayImageUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                ) : (
                  <Text style={{ fontSize: 11, color: colors.textSecondary }}>No image</Text>
                )}
                {pendingImageAsset && (
                  <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.55)', paddingVertical: 3 }}>
                    <Text style={{ fontSize: 10, color: '#fff', textAlign: 'center', fontWeight: '600' }}>Pending — not saved yet</Text>
                  </View>
                )}
              </TouchableOpacity>
              {editing && (
                <TouchableOpacity onPress={handlePickImage}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>Change Image</Text>
                </TouchableOpacity>
              )}
            </View>

            {editing ? (
              <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 12 }}>
                <View><Text style={labelStyle}>Product Name *</Text><TextInput value={fields.name} onChangeText={(v) => set('name', v)} style={inputStyle} placeholderTextColor={colors.textSecondary} /></View>
                <View><Text style={labelStyle}>SKU</Text><TextInput value={fields.sku} onChangeText={(v) => set('sku', v)} style={inputStyle} placeholderTextColor={colors.textSecondary} /></View>
                <View><Text style={labelStyle}>Description</Text><TextInput value={fields.description} onChangeText={(v) => set('description', v)} style={[inputStyle, { minHeight: 72 }]} multiline placeholderTextColor={colors.textSecondary} /></View>
              </View>
            ) : (
              <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 8 }}>
                <Text style={{ fontSize: 13, color: colors.textSecondary }}>{item.description || 'No description provided.'}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>SKU</Text>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>{item.sku ?? '—'}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>Last Updated</Text>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>{new Date(item.updatedAt).toLocaleString('en-PH')}</Text>
                </View>
              </View>
            )}
          </>
        )}

        {tab === 'pricing' && (
          <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 12 }}>
            {editing ? (
              <>
                <View><Text style={labelStyle}>Unit *</Text><TextInput value={fields.unit} onChangeText={(v) => set('unit', v)} style={inputStyle} placeholderTextColor={colors.textSecondary} /></View>
                <View><Text style={labelStyle}>Unit Price (₱) *</Text><TextInput value={fields.unitPrice} onChangeText={(v) => set('unitPrice', v)} style={inputStyle} keyboardType="decimal-pad" placeholderTextColor={colors.textSecondary} /></View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>VAT Exempt</Text>
                  <Switch value={fields.isVatExempt} onValueChange={(v) => set('isVatExempt', v)} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />
                </View>
                {/* TODO: inline price-tier editing — reuse SupplierItemFormScreen's tier editor UI here if wanted */}
              </>
            ) : (
              <>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, color: colors.textSecondary }}>Unit Price</Text>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{formatPHP(item.unitPrice)}/{item.unit}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, color: colors.textSecondary }}>VAT</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{item.isVatExempt ? 'Exempt' : `${(item.vatRate * 100).toFixed(0)}%`}</Text>
                </View>
                {item.priceTiers.length > 0 && (
                  <View style={{ gap: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary }}>VOLUME PRICING</Text>
                    {item.priceTiers.map((t) => (
                      <Text key={t.id} style={{ fontSize: 13, color: colors.text }}>{t.minQty}+ {item.unit}: {formatPHP(t.price)}</Text>
                    ))}
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {tab === 'inventory' && (
          <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 12 }}>
            {editing ? (
              <>
                <View><Text style={labelStyle}>Minimum Order Quantity</Text><TextInput value={fields.moq} onChangeText={(v) => set('moq', v)} style={inputStyle} keyboardType="number-pad" placeholderTextColor={colors.textSecondary} /></View>
                <View><Text style={labelStyle}>Available Quantity</Text><TextInput value={fields.availableQty} onChangeText={(v) => set('availableQty', v)} style={inputStyle} keyboardType="number-pad" placeholderTextColor={colors.textSecondary} /></View>
              </>
            ) : (
              <>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, color: colors.textSecondary }}>Available Stock</Text>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{item.availableQty} {item.unit}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, color: colors.textSecondary }}>Minimum Order</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{item.moq} {item.unit}</Text>
                </View>
              </>
            )}
          </View>
        )}

        {tab === 'reviews' && <ReviewList payload={reviews} loading={reviewsLoading} />}
      </ScrollView>

      {editing && (
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 10, padding: 16, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }}>
          <TouchableOpacity
            onPress={() => { setFields(toFields(item)); setPendingImageAsset(null); setSaveError(''); setEditing(false) }}
            disabled={saving}
            style={{ flex: 1, padding: 14, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}
          >
            <Text style={{ fontWeight: '700', color: colors.text }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving || !isDirty}
            style={{ flex: 2, backgroundColor: colors.primary, padding: 14, borderRadius: 10, alignItems: 'center', opacity: saving || !isDirty ? 0.6 : 1 }}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ fontWeight: '700', color: '#fff' }}>Save Changes</Text>}
          </TouchableOpacity>
        </View>
      )}
    </FadeDialogModal>
  )
}