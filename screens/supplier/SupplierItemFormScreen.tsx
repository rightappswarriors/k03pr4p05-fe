import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, TextInput, TouchableOpacity, Switch, ActivityIndicator, Alert } from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import {
  createSupplierItem,
  updateSupplierItem,
  fetchOrCreateCatalog,
} from '@/services/supplierService'

interface PriceTierInput {
  minQty: string
  price: string
}

interface FormData {
  name: string
  description: string
  sku: string
  unit: string
  unitPrice: string
  isVatExempt: boolean
  moq: string
  availableQty: string
  priceTiers: PriceTierInput[]
}

const COMMON_UNITS = ['piraso', 'kahon', 'kilo', 'boteng', 'lata', 'bag', 'dozen', 'pack', 'set']

interface SupplierItemFormScreenProps {
  itemId?: string
  catalogId?: string
  onSaved?: () => void
  onCancel?: () => void
}

export default function SupplierItemFormScreen({ itemId, catalogId: propCatalogId, onSaved, onCancel }: SupplierItemFormScreenProps) {
  const { colors } = useTheme()
  const { user } = useAuth()
  const isEdit = Boolean(itemId)
  const [loading, setLoading] = useState(false)
  const [catalogId, setCatalogId] = useState(propCatalogId ?? '')
  const [error, setError] = useState('')

  const [form, setForm] = useState<FormData>({
    name: '', description: '', sku: '', unit: 'piraso', unitPrice: '',
    isVatExempt: false, moq: '1', availableQty: '0', priceTiers: [],
  })

  useEffect(() => {
    if (!propCatalogId && user?.orgId) {
      fetchOrCreateCatalog(user.orgId).then(c => setCatalogId(c.id)).catch(() => {})
    }
  }, [propCatalogId, user?.orgId])

  const set = (field: keyof FormData, value: any) => setForm(prev => ({ ...prev, [field]: value }))

  const addTier = () => setForm(prev => ({ ...prev, priceTiers: [...prev.priceTiers, { minQty: '', price: '' }] }))

  const removeTier = (idx: number) => setForm(prev => ({ ...prev, priceTiers: prev.priceTiers.filter((_, i) => i !== idx) }))

  const updateTier = (idx: number, field: keyof PriceTierInput, value: string) =>
    setForm(prev => { const tiers = [...prev.priceTiers]; tiers[idx] = { ...tiers[idx], [field]: value }; return { ...prev, priceTiers: tiers } })

  const handleSave = async () => {
    setError('')
    if (!form.name.trim()) { setError('Product name is required.'); return }
    if (!form.unit.trim()) { setError('Unit is required.'); return }
    if (!form.unitPrice || isNaN(Number(form.unitPrice)) || Number(form.unitPrice) <= 0) {
      setError('A valid unit price is required.'); return
    }
    if (!catalogId) { setError('Catalog not loaded yet. Please wait.'); return }

    const parsedTiers = form.priceTiers
      .filter(t => t.minQty && t.price)
      .map(t => ({ minQty: parseInt(t.minQty), price: parseFloat(t.price) }))

    setLoading(true)
    try {
      if (isEdit && itemId) {
        await updateSupplierItem({
          id: itemId,
          name: form.name,
          description: form.description || undefined,
          sku: form.sku || undefined,
          unit: form.unit,
          unitPrice: parseFloat(form.unitPrice),
          isVatExempt: form.isVatExempt,
          vatRate: form.isVatExempt ? 0 : 0.12,
          moq: parseInt(form.moq) || 1,
          availableQty: parseInt(form.availableQty) || 0,
          priceTiers: parsedTiers,
        })
      } else {
        await createSupplierItem({
          catalogId,
          name: form.name,
          description: form.description || undefined,
          sku: form.sku || undefined,
          unit: form.unit,
          unitPrice: parseFloat(form.unitPrice),
          isVatExempt: form.isVatExempt,
          vatRate: form.isVatExempt ? 0 : 0.12,
          moq: parseInt(form.moq) || 1,
          availableQty: parseInt(form.availableQty) || 0,
          priceTiers: parsedTiers,
        })
      }
      onSaved?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save item.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, backgroundColor: colors.surface, color: colors.text, fontSize: 14 }
  const labelStyle = { fontSize: 12, fontWeight: '600' as const, color: colors.textSecondary, marginBottom: 4 }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {onCancel && (
          <TouchableOpacity onPress={onCancel} style={{ padding: 4 }}>
            <Text style={{ fontSize: 20, color: colors.primary }}>←</Text>
          </TouchableOpacity>
        )}
        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>
          {isEdit ? 'Edit Item' : 'Add Catalog Item'}
        </Text>
      </View>

      {!!error && (
        <View style={{ backgroundColor: '#FEF2F2', borderRadius: 8, padding: 12, borderLeftWidth: 3, borderLeftColor: '#EF4444' }}>
          <Text style={{ color: '#DC2626', fontSize: 13 }}>{error}</Text>
        </View>
      )}

      <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 14 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Product Details</Text>
        <View>
          <Text style={labelStyle}>Product Name *</Text>
          <TextInput value={form.name} onChangeText={v => set('name', v)} placeholder="e.g. SMB 330ml Case/24" placeholderTextColor={colors.textSecondary} style={inputStyle} />
        </View>
        <View>
          <Text style={labelStyle}>SKU (optional)</Text>
          <TextInput value={form.sku} onChangeText={v => set('sku', v)} placeholder="e.g. SMB-330-24" placeholderTextColor={colors.textSecondary} style={inputStyle} autoCapitalize="characters" />
        </View>
        <View>
          <Text style={labelStyle}>Description (optional)</Text>
          <TextInput value={form.description} onChangeText={v => set('description', v)} placeholder="Brief product description" placeholderTextColor={colors.textSecondary} style={[inputStyle, { minHeight: 72 }]} multiline />
        </View>
      </View>

      <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 14 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Pricing & Units</Text>
        <View>
          <Text style={labelStyle}>Unit *</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            {COMMON_UNITS.map(u => (
              <TouchableOpacity key={u} onPress={() => set('unit', u)}
                style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: form.unit === u ? colors.primary : colors.background, borderWidth: 1, borderColor: form.unit === u ? colors.primary : colors.border }}>
                <Text style={{ fontSize: 13, color: form.unit === u ? '#fff' : colors.textSecondary }}>{u}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput value={form.unit} onChangeText={v => set('unit', v)} placeholder="Or type a custom unit" placeholderTextColor={colors.textSecondary} style={inputStyle} />
        </View>
        <View>
          <Text style={labelStyle}>Unit Price (₱) *</Text>
          <TextInput value={form.unitPrice} onChangeText={v => set('unitPrice', v)} placeholder="0.00" placeholderTextColor={colors.textSecondary} style={inputStyle} keyboardType="decimal-pad" />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: 14, color: colors.text, fontWeight: '600' }}>VAT Exempt</Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>{form.isVatExempt ? 'No VAT applied' : '12% BIR VAT applied'}</Text>
          </View>
          <Switch value={form.isVatExempt} onValueChange={v => set('isVatExempt', v)} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />
        </View>
      </View>

      <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 14 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Stock & MOQ</Text>
        <View>
          <Text style={labelStyle}>Minimum Order Quantity</Text>
          <TextInput value={form.moq} onChangeText={v => set('moq', v)} placeholder="1" placeholderTextColor={colors.textSecondary} style={inputStyle} keyboardType="number-pad" />
        </View>
        <View>
          <Text style={labelStyle}>Available Quantity</Text>
          <TextInput value={form.availableQty} onChangeText={v => set('availableQty', v)} placeholder="0" placeholderTextColor={colors.textSecondary} style={inputStyle} keyboardType="number-pad" />
        </View>
      </View>

      <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Price Tiers</Text>
          <TouchableOpacity onPress={addTier} style={{ backgroundColor: colors.primary + '20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>+ Add Tier</Text>
          </TouchableOpacity>
        </View>
        <Text style={{ fontSize: 12, color: colors.textSecondary }}>Optional volume discounts applied when buyer orders at or above the minimum quantity.</Text>
        {form.priceTiers.map((tier, idx) => (
          <View key={idx} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}>
              <Text style={labelStyle}>Min Qty</Text>
              <TextInput value={tier.minQty} onChangeText={v => updateTier(idx, 'minQty', v)} placeholder="10" placeholderTextColor={colors.textSecondary} style={inputStyle} keyboardType="number-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={labelStyle}>Price (₱)</Text>
              <TextInput value={tier.price} onChangeText={v => updateTier(idx, 'price', v)} placeholder="0.00" placeholderTextColor={colors.textSecondary} style={inputStyle} keyboardType="decimal-pad" />
            </View>
            <TouchableOpacity onPress={() => removeTier(idx)} style={{ backgroundColor: '#EF444420', borderRadius: 8, padding: 12 }}>
              <Text style={{ color: '#EF4444', fontWeight: '700' }}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <TouchableOpacity onPress={handleSave} disabled={loading}
        style={{ backgroundColor: colors.primary, padding: 16, borderRadius: 12, alignItems: 'center', opacity: loading ? 0.6 : 1, marginTop: 4, marginBottom: 24 }}>
        {loading ? <ActivityIndicator color="#fff" /> : (
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{isEdit ? 'Save Changes' : 'Add to Catalog'}</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  )
}
