// Modal for creating or editing a single variant with full sections.
import React, { useEffect, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  Switch, ActivityIndicator, Alert, Image,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { X, ImagePlus } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { FadeDialogModal } from './FadeDialogModal'
import { MediaService } from '@/services/mediaService'
import {
  createVariant, updateVariant,
  type SupplierItemVariant, type VariantGroup,
} from '@/services/supplierService/variantService'

type SectionKey = 'general' | 'pricing' | 'inventory' | 'images' | 'shipping'

const SECTIONS: Array<{ key: SectionKey; label: string }> = [
  { key: 'general',   label: 'General' },
  { key: 'pricing',   label: 'Pricing' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'images',    label: 'Images' },
  { key: 'shipping',  label: 'Shipping' },
]

interface Props {
  visible: boolean
  supplierItemId: string
  variantGroups: VariantGroup[]
  editing: SupplierItemVariant | null   // null = create mode
  onClose: () => void
  onSaved: (variant: SupplierItemVariant) => void
}

interface Form {
  name: string; sku: string; barcode: string
  price: string; cost: string
  availableQty: string; reorderLevel: string; reorderQty: string
  weight: string; length: string; width: string; height: string
  isDefault: boolean; isActive: boolean
  selectedOptionIds: string[]
}

const empty = (): Form => ({
  name: '', sku: '', barcode: '',
  price: '', cost: '',
  availableQty: '0', reorderLevel: '', reorderQty: '',
  weight: '', length: '', width: '', height: '',
  isDefault: false, isActive: true,
  selectedOptionIds: [],
})

function toForm(v: SupplierItemVariant): Form {
  return {
    name: v.name, sku: v.sku ?? '', barcode: v.barcode ?? '',
    price: String(v.price), cost: String(v.cost),
    availableQty: String(v.availableQty),
    reorderLevel: v.reorderLevel != null ? String(v.reorderLevel) : '',
    reorderQty: v.reorderQty != null ? String(v.reorderQty) : '',
    weight: v.weight != null ? String(v.weight) : '',
    length: v.length != null ? String(v.length) : '',
    width: v.width != null ? String(v.width) : '',
    height: v.height != null ? String(v.height) : '',
    isDefault: v.isDefault, isActive: v.isActive,
    selectedOptionIds: v.variantValues.map(vv => vv.optionId),
  }
}

export function CreateVariantModal({ visible, supplierItemId, variantGroups, editing, onClose, onSaved }: Props) {
  const { colors } = useTheme()
  const { user } = useAuth()
  const [section, setSection] = useState<SectionKey>('general')
  const [form, setForm] = useState<Form>(empty())
  const [imageAsset, setImageAsset] = useState<ImagePicker.ImagePickerAsset | null>(null)
  const [existingImage, setExistingImage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!visible) return
    if (editing) {
      setForm(toForm(editing))
      setExistingImage(editing.image ?? null)
    } else {
      setForm(empty())
      setExistingImage(null)
    }
    setImageAsset(null)
    setError('')
    setSection('general')
  }, [visible, editing])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => ({ ...f, [k]: v }))

  const toggleOption = (optionId: string) =>
    setForm(f => ({
      ...f,
      selectedOptionIds: f.selectedOptionIds.includes(optionId)
        ? f.selectedOptionIds.filter(id => id !== optionId)
        : [...f.selectedOptionIds, optionId],
    }))

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow photo library access.'); return }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, allowsEditing: true, aspect: [1, 1],
    })
    if (!result.canceled && result.assets?.[0]) setImageAsset(result.assets[0])
  }

  const handleSave = async () => {
    setError('')
    if (!form.name.trim()) return setError('Variant name is required.')
    const price = parseFloat(form.price)
    if (isNaN(price) || price <= 0) return setError('Price must be greater than 0.')
    const cost = parseFloat(form.cost) || 0
    if (cost < 0) return setError('Cost cannot be negative.')

    setSaving(true)
    try {
      let imageUrl: string | undefined
      if (imageAsset && user?.orgId) {
        const { publicUrl } = await MediaService.uploadMedia(
          { uri: imageAsset.uri, name: imageAsset.fileName || `variant_${Date.now()}.jpg`, type: imageAsset.mimeType || 'image/jpeg' },
          String(user.orgId),
        )
        imageUrl = publicUrl
      }

      let saved: SupplierItemVariant
      if (editing) {
        saved = await updateVariant({
          id: editing.id,
          name: form.name.trim(),
          sku: form.sku.trim() || null,
          barcode: form.barcode.trim() || null,
          price, cost,
          availableQty: parseFloat(form.availableQty) || 0,
          reorderLevel: form.reorderLevel ? parseFloat(form.reorderLevel) : null,
          reorderQty: form.reorderQty ? parseFloat(form.reorderQty) : null,
          weight: form.weight ? parseFloat(form.weight) : null,
          length: form.length ? parseFloat(form.length) : null,
          width: form.width ? parseFloat(form.width) : null,
          height: form.height ? parseFloat(form.height) : null,
          isDefault: form.isDefault,
          isActive: form.isActive,
          image: imageUrl ?? existingImage ?? null,
        })
      } else {
        saved = await createVariant({
          supplierItemId,
          name: form.name.trim(),
          sku: form.sku.trim() || null,
          barcode: form.barcode.trim() || null,
          price, cost,
          availableQty: parseFloat(form.availableQty) || 0,
          isDefault: form.isDefault,
          image: imageUrl ?? null,
          weight: form.weight ? parseFloat(form.weight) : null,
          length: form.length ? parseFloat(form.length) : null,
          width: form.width ? parseFloat(form.width) : null,
          height: form.height ? parseFloat(form.height) : null,
          optionIds: form.selectedOptionIds,
        })
      }
      onSaved(saved)
      onClose()
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save variant.')
    } finally {
      setSaving(false)
    }
  }

  const inp = {
    borderWidth: 1, borderColor: colors.border, borderRadius: 8,
    padding: 11, color: colors.text, fontSize: 13,
    backgroundColor: colors.background,
  }
  const lbl = { fontSize: 11, fontWeight: '600' as const, color: colors.textSecondary, marginBottom: 3 }
  const row2 = { flexDirection: 'row' as const, gap: 10 }

  const displayImg = imageAsset?.uri ?? existingImage

  return (
    <FadeDialogModal visible={visible} onRequestClose={onClose} maxWidth={600}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 10 }}>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '800', color: colors.text }}>
          {editing ? 'Edit Variant' : 'Add Variant'}
        </Text>
        <TouchableOpacity onPress={onClose}><X size={20} color={colors.textSecondary} /></TouchableOpacity>
      </View>

      {/* Section tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ borderBottomWidth: 1, borderBottomColor: colors.border, flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 2 }}>
        {SECTIONS.map(s => {
          const active = s.key === section
          return (
            <TouchableOpacity key={s.key} onPress={() => setSection(s.key)}
              style={{ paddingVertical: 11, paddingHorizontal: 10, borderBottomWidth: 2, borderBottomColor: active ? colors.primary : 'transparent' }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: active ? colors.primary : colors.textSecondary }}>{s.label}</Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 13 }} keyboardShouldPersistTaps="handled">
        {!!error && (
          <View style={{ backgroundColor: '#FEF2F2', borderRadius: 8, padding: 10, borderLeftWidth: 3, borderLeftColor: '#EF4444' }}>
            <Text style={{ color: '#DC2626', fontSize: 13 }}>{error}</Text>
          </View>
        )}

        {/* ── General ─────────────────────────────────────────── */}
        {section === 'general' && (
          <>
            <View><Text style={lbl}>Variant Name *</Text><TextInput value={form.name} onChangeText={v => set('name', v)} style={inp} placeholderTextColor={colors.textSecondary} placeholder="e.g. Black / XL" /></View>
            <View style={row2}>
              <View style={{ flex: 1 }}><Text style={lbl}>SKU</Text><TextInput value={form.sku} onChangeText={v => set('sku', v)} style={inp} placeholderTextColor={colors.textSecondary} placeholder="COF-BLK-XL" autoCapitalize="characters" /></View>
              <View style={{ flex: 1 }}><Text style={lbl}>Barcode</Text><TextInput value={form.barcode} onChangeText={v => set('barcode', v)} style={inp} placeholderTextColor={colors.textSecondary} placeholder="123456789" keyboardType="numeric" /></View>
            </View>

            {/* Option assignment — only in create mode */}
            {!editing && variantGroups.length > 0 && (
              <View style={{ gap: 10 }}>
                <Text style={lbl}>ASSIGN OPTIONS</Text>
                {variantGroups.map(group => (
                  <View key={group.id}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text, marginBottom: 6 }}>{group.name}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {group.options.map(opt => {
                        const sel = form.selectedOptionIds.includes(opt.id)
                        return (
                          <TouchableOpacity key={opt.id} onPress={() => toggleOption(opt.id)}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: sel ? colors.primary : colors.border, backgroundColor: sel ? `${colors.primary}14` : colors.surface }}>
                            {opt.colorHex && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: opt.colorHex }} />}
                            <Text style={{ fontSize: 12, fontWeight: '700', color: sel ? colors.primary : colors.textSecondary }}>{opt.value}</Text>
                          </TouchableOpacity>
                        )
                      })}
                    </View>
                  </View>
                ))}
              </View>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Default variant</Text>
              <Switch value={form.isDefault} onValueChange={v => set('isDefault', v)} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />
            </View>
            {editing && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Active</Text>
                <Switch value={form.isActive} onValueChange={v => set('isActive', v)} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />
              </View>
            )}
          </>
        )}

        {/* ── Pricing ──────────────────────────────────────────── */}
        {section === 'pricing' && (
          <View style={row2}>
            <View style={{ flex: 1 }}><Text style={lbl}>Selling Price (₱) *</Text><TextInput value={form.price} onChangeText={v => set('price', v)} keyboardType="decimal-pad" style={inp} placeholderTextColor={colors.textSecondary} placeholder="0.00" /></View>
            <View style={{ flex: 1 }}><Text style={lbl}>Cost (₱)</Text><TextInput value={form.cost} onChangeText={v => set('cost', v)} keyboardType="decimal-pad" style={inp} placeholderTextColor={colors.textSecondary} placeholder="0.00" /></View>
          </View>
        )}

        {/* ── Inventory ─────────────────────────────────────────── */}
        {section === 'inventory' && (
          <>
            <View><Text style={lbl}>Available Quantity</Text><TextInput value={form.availableQty} onChangeText={v => set('availableQty', v)} keyboardType="number-pad" style={inp} placeholderTextColor={colors.textSecondary} /></View>
            <View style={row2}>
              <View style={{ flex: 1 }}><Text style={lbl}>Reorder Level</Text><TextInput value={form.reorderLevel} onChangeText={v => set('reorderLevel', v)} keyboardType="decimal-pad" style={inp} placeholderTextColor={colors.textSecondary} placeholder="—" /></View>
              <View style={{ flex: 1 }}><Text style={lbl}>Reorder Qty</Text><TextInput value={form.reorderQty} onChangeText={v => set('reorderQty', v)} keyboardType="decimal-pad" style={inp} placeholderTextColor={colors.textSecondary} placeholder="—" /></View>
            </View>
          </>
        )}

        {/* ── Images ───────────────────────────────────────────── */}
        {section === 'images' && (
          <>
            <TouchableOpacity onPress={pickImage}
              style={{ height: 160, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {displayImg
                ? <Image source={{ uri: displayImg }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                : <View style={{ alignItems: 'center', gap: 6 }}><ImagePlus size={24} color={colors.textSecondary} /><Text style={{ fontSize: 12, color: colors.textSecondary }}>Tap to upload variant image</Text></View>}
            </TouchableOpacity>
            <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center' }}>
              If no image is set, the parent product image will be used as a fallback.
            </Text>
            {displayImg && (
              <TouchableOpacity onPress={() => { setImageAsset(null); setExistingImage(null) }}
                style={{ alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#FEF2F2' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#DC2626' }}>Remove image</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* ── Shipping ─────────────────────────────────────────── */}
        {section === 'shipping' && (
          <>
            <View><Text style={lbl}>Weight (kg)</Text><TextInput value={form.weight} onChangeText={v => set('weight', v)} keyboardType="decimal-pad" style={inp} placeholderTextColor={colors.textSecondary} placeholder="0.00" /></View>
            <View style={row2}>
              <View style={{ flex: 1 }}><Text style={lbl}>Length (cm)</Text><TextInput value={form.length} onChangeText={v => set('length', v)} keyboardType="decimal-pad" style={inp} placeholderTextColor={colors.textSecondary} /></View>
              <View style={{ flex: 1 }}><Text style={lbl}>Width (cm)</Text><TextInput value={form.width} onChangeText={v => set('width', v)} keyboardType="decimal-pad" style={inp} placeholderTextColor={colors.textSecondary} /></View>
              <View style={{ flex: 1 }}><Text style={lbl}>Height (cm)</Text><TextInput value={form.height} onChangeText={v => set('height', v)} keyboardType="decimal-pad" style={inp} placeholderTextColor={colors.textSecondary} /></View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={{ flexDirection: 'row', gap: 10, padding: 14, borderTopWidth: 1, borderTopColor: colors.border }}>
        <TouchableOpacity onPress={onClose} disabled={saving}
          style={{ flex: 1, padding: 13, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontWeight: '700', color: colors.text }}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSave} disabled={saving}
          style={{ flex: 2, padding: 13, borderRadius: 10, alignItems: 'center', backgroundColor: saving ? colors.border : colors.primary }}>
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={{ fontWeight: '700', color: '#fff' }}>{editing ? 'Save Changes' : 'Add Variant'}</Text>}
        </TouchableOpacity>
      </View>
    </FadeDialogModal>
  )
}
