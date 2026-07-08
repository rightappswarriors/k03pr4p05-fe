// components/supplier/inventory/ReceiveStockModal.tsx
import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native'
import { FadeDialogModal } from '@/components/supplier/catalog/FadeDialogModal'
import { useTheme } from '@/contexts/ThemeContext'
import { useConfirm } from '@/contexts/ConfirmDialogContext'
import { receiveStock } from '@/services/supplierService/supplierInventoryService'
import type { InventoryRowData } from './InventoryTable'

interface Props {
  item: InventoryRowData | null
  visible: boolean
  onClose: () => void
  onReceived: () => void
}

export function ReceiveStockModal({ item, visible, onClose, onReceived }: Props) {
  const { colors } = useTheme()
  const confirm = useConfirm()
  const [quantity, setQuantity] = useState('')
  const [unitCost, setUnitCost] = useState('')
  const [batchNumber, setBatchNumber] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const reset = () => { setQuantity(''); setUnitCost(''); setBatchNumber(''); setError('') }
  const handleClose = () => { reset(); onClose() }

  if (!item) return null

  const handleSubmit = async () => {
    setError('')
    const qty = Number(quantity)
    const cost = Number(unitCost)
    if (!quantity || isNaN(qty) || qty <= 0) return setError('Enter a valid quantity.')
    if (!unitCost || isNaN(cost) || cost < 0) return setError('Enter a valid unit cost.')

    const ok = await confirm({
      title: 'Receive Stock',
      message: `Add ${qty} ${item.unit} of "${item.name}" at ${cost.toFixed(2)}/${item.unit}?`,
      confirmLabel: 'Receive',
    })
    if (!ok) return

    setSaving(true)
    try {
      await receiveStock({ supplierItemId: item.id, quantity: qty, unitCost: cost, batchNumber: batchNumber || undefined })
      onReceived()
      handleClose()
    } catch (e: any) {
      setError(e.message ?? 'Failed to receive stock.')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, backgroundColor: colors.background, color: colors.text, fontSize: 14 }
  const labelStyle = { fontSize: 12, fontWeight: '600' as const, color: colors.textSecondary, marginBottom: 4 }

  return (
    <FadeDialogModal visible={visible} onRequestClose={handleClose} maxWidth={440}>
      <View style={{ padding: 20, gap: 14 }}>
        <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>Receive Stock</Text>
        <Text style={{ fontSize: 13, color: colors.textSecondary }}>{item.name}</Text>

        {!!error && (
          <View style={{ backgroundColor: '#FEF2F2', borderRadius: 8, padding: 10, borderLeftWidth: 3, borderLeftColor: '#EF4444' }}>
            <Text style={{ color: '#DC2626', fontSize: 12 }}>{error}</Text>
          </View>
        )}

        <View><Text style={labelStyle}>Quantity ({item.unit}) *</Text><TextInput value={quantity} onChangeText={setQuantity} style={inputStyle} keyboardType="decimal-pad" placeholderTextColor={colors.textSecondary} /></View>
        <View><Text style={labelStyle}>Unit Cost (₱) *</Text><TextInput value={unitCost} onChangeText={setUnitCost} style={inputStyle} keyboardType="decimal-pad" placeholderTextColor={colors.textSecondary} /></View>
        <View><Text style={labelStyle}>Batch # (optional)</Text><TextInput value={batchNumber} onChangeText={setBatchNumber} style={inputStyle} placeholderTextColor={colors.textSecondary} /></View>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
          <TouchableOpacity onPress={handleClose} disabled={saving} style={{ flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontWeight: '700', color: colors.text }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSubmit} disabled={saving} style={{ flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ fontWeight: '700', color: '#fff' }}>Receive</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </FadeDialogModal>
  )
}