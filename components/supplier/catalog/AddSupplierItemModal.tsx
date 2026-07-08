import React, { useState } from 'react'
import { View, Text, ScrollView, TextInput, TouchableOpacity, Image, ActivityIndicator, Alert, Switch } from 'react-native'
import { ImagePlus, X } from 'lucide-react-native'
import * as ImagePicker from 'expo-image-picker'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { FadeDialogModal } from './FadeDialogModal'
import { MediaService } from '@/services/mediaService'
import { createSupplierItem, type SupplierItem } from '@/services/supplierService/supplierService'

const COMMON_UNITS = ['piraso', 'kahon', 'kilo', 'boteng', 'lata', 'bag', 'dozen', 'pack', 'set', 'litter', 'gallon']

interface Props {
  visible: boolean
  catalogId: string
  onClose: () => void
  onCreated: (item: SupplierItem) => void
}

export function AddSupplierItemModal({ visible, catalogId, onClose, onCreated }: Props) {
  const { colors } = useTheme()
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [description, setDescription] = useState('')
  const [unit, setUnit] = useState('piraso')
  const [unitPrice, setUnitPrice] = useState('')
  const [isVatExempt, setIsVatExempt] = useState(false)
  const [moq, setMoq] = useState('1')
  const [availableQty, setAvailableQty] = useState('0')
  const [imageAsset, setImageAsset] = useState<ImagePicker.ImagePickerAsset | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const reset = () => {
    setName(''); setSku(''); setDescription(''); setUnit('piraso'); setUnitPrice('')
    setIsVatExempt(false); setMoq('1'); setAvailableQty('0'); setImageAsset(null); setError('')
  }
  const handleClose = () => { reset(); onClose() }

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to add a product image.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    })
    if (!result.canceled && result.assets?.[0]) setImageAsset(result.assets[0])
  }

  const handleSave = async () => {
    setError('')
    if (!name.trim()) return setError('Product name is required.')
    if (!unit.trim()) return setError('Unit is required.')
    if (!unitPrice || isNaN(Number(unitPrice)) || Number(unitPrice) <= 0) return setError('A valid unit price is required.')
    if (!imageAsset) return setError('A product image is required.')
    if (!user?.orgId) return setError('Organization not found.')

    setSaving(true)
    try {
      // Normalize expo-image-picker's asset shape to what MediaService expects.
      const fileForUpload = {
        uri: imageAsset.uri,
        name: imageAsset.fileName || `product_${Date.now()}.jpg`,
        type: imageAsset.mimeType || 'image/jpeg',
      }
      const { publicUrl } = await MediaService.uploadMedia(fileForUpload, String(user.orgId))

      const created = await createSupplierItem({
        catalogId,
        name,
        description: description || undefined,
        sku: sku || undefined,
        unit,
        unitPrice: parseFloat(unitPrice),
        isVatExempt,
        vatRate: isVatExempt ? 0 : 0.12,
        moq: parseInt(moq) || 1,
        availableQty: parseInt(availableQty) || 0,
        image: publicUrl,
      })
      onCreated(created)
      handleClose()
    } catch (err: any) {
      setError(err.message ?? 'Failed to add product.')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, backgroundColor: colors.surface, color: colors.text, fontSize: 14 }
  const labelStyle = { fontSize: 12, fontWeight: '600' as const, color: colors.textSecondary, marginBottom: 4 }

  return (
    <FadeDialogModal visible={visible} onRequestClose={handleClose} maxWidth={640}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>Add Product</Text>
        <TouchableOpacity onPress={handleClose} style={{ padding: 4 }}><X size={20} color={colors.text} /></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
        {!!error && (
          <View style={{ backgroundColor: '#FEF2F2', borderRadius: 8, padding: 12, borderLeftWidth: 3, borderLeftColor: '#EF4444' }}>
            <Text style={{ color: '#DC2626', fontSize: 13 }}>{error}</Text>
          </View>
        )}

        <View>
          <Text style={labelStyle}>Product Image *</Text>
          <TouchableOpacity
            onPress={pickImage}
            style={{ height: 160, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
          >
            {imageAsset ? (
              <Image source={{ uri: imageAsset.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <View style={{ alignItems: 'center', gap: 6 }}>
                <ImagePlus size={26} color={colors.textSecondary} />
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>Tap to upload an image</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View><Text style={labelStyle}>Product Name *</Text><TextInput value={name} onChangeText={setName} style={inputStyle} placeholderTextColor={colors.textSecondary} placeholder="e.g. Coffee Beans" /></View>
        <View><Text style={labelStyle}>SKU</Text><TextInput value={sku} onChangeText={setSku} style={inputStyle} placeholderTextColor={colors.textSecondary} placeholder="e.g. COF-001" autoCapitalize="characters" /></View>
        <View><Text style={labelStyle}>Description</Text><TextInput value={description} onChangeText={setDescription} style={[inputStyle, { minHeight: 64 }]} multiline placeholderTextColor={colors.textSecondary} /></View>

        <View>
          <Text style={labelStyle}>Unit *</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            {COMMON_UNITS.map((u) => (
              <TouchableOpacity key={u} onPress={() => setUnit(u)} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: unit === u ? colors.primary : colors.background, borderWidth: 1, borderColor: unit === u ? colors.primary : colors.border }}>
                <Text style={{ fontSize: 13, color: unit === u ? '#fff' : colors.textSecondary }}>{u}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput value={unit} onChangeText={setUnit} style={inputStyle} placeholderTextColor={colors.textSecondary} placeholder="Or type a custom unit" />
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}><Text style={labelStyle}>Unit Price (₱) *</Text><TextInput value={unitPrice} onChangeText={setUnitPrice} style={inputStyle} keyboardType="decimal-pad" placeholderTextColor={colors.textSecondary} placeholder="0.00" /></View>
          <View style={{ flex: 1 }}><Text style={labelStyle}>Available Qty</Text><TextInput value={availableQty} onChangeText={setAvailableQty} style={inputStyle} keyboardType="number-pad" placeholderTextColor={colors.textSecondary} /></View>
          <View style={{ flex: 1 }}><Text style={labelStyle}>MOQ</Text><TextInput value={moq} onChangeText={setMoq} style={inputStyle} keyboardType="number-pad" placeholderTextColor={colors.textSecondary} /></View>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>VAT Exempt</Text>
          <Switch value={isVatExempt} onValueChange={setIsVatExempt} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />
        </View>
      </ScrollView>

      <View style={{ flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: colors.border }}>
        <TouchableOpacity onPress={handleClose} disabled={saving} style={{ flex: 1, padding: 14, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontWeight: '700', color: colors.text }}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={{ flex: 2, backgroundColor: colors.primary, padding: 14, borderRadius: 10, alignItems: 'center', opacity: saving ? 0.6 : 1 }}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ fontWeight: '700', color: '#fff' }}>Add Product</Text>}
        </TouchableOpacity>
      </View>
    </FadeDialogModal>
  )
}