import React from 'react'
import { View, Text } from 'react-native'
import { Package, Calendar, Clock } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { formatPHP, computeFinancials } from '@/utils/financial'

interface Props {
  quantity: number
  unitPrice: number
  deliveryDate?: string | null
  leadTime?: string | null
  isVatExempt?: boolean
  vatRate?: number
  isCompact?: boolean
}

export function FinancialSummary({
  quantity,
  unitPrice,
  deliveryDate,
  leadTime,
  isVatExempt = false,
  vatRate = 0.12,
  isCompact = false,
}: Props) {
  const { colors } = useTheme()
  const fin = computeFinancials(quantity, unitPrice, vatRate, isVatExempt)

  const rowStyle: any = {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  }
  const labelStyle: any = { fontSize: 11, color: colors.textSecondary }
  const valueStyle: any = { fontSize: 12, fontWeight: '600', color: colors.text }

  return (
    <View style={{ gap: isCompact ? 2 : 6, marginTop: 4 }}>
      <View style={rowStyle}>
        <Text style={labelStyle}>Quantity</Text>
        <Text style={valueStyle}>
          {quantity % 1 === 0 ? String(quantity) : quantity.toFixed(2)} pcs
        </Text>
      </View>

      <View style={rowStyle}>
        <Text style={labelStyle}>Unit Price</Text>
        <Text style={valueStyle}>{formatPHP(unitPrice)}</Text>
      </View>

      <View style={rowStyle}>
        <Text style={labelStyle}>Subtotal</Text>
        <Text style={valueStyle}>{formatPHP(fin.subtotal)}</Text>
      </View>

      <View style={rowStyle}>
        <Text style={labelStyle}>
          {isVatExempt ? 'VAT (Exempt)' : `VAT (${Math.round(fin.vatRate * 100)}%)`}
        </Text>
        <Text style={valueStyle}>{formatPHP(fin.vatAmount)}</Text>
      </View>

      <View style={[rowStyle, { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 4, paddingTop: 6 }]}>
        <Text style={[labelStyle, { fontSize: 12 }]}>Grand Total</Text>
        <Text style={[valueStyle, { fontSize: 14, fontWeight: '700', color: colors.primary }]}>
          {formatPHP(fin.grandTotal)}
        </Text>
      </View>

      {deliveryDate && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: isCompact ? 0 : 4 }}>
          <Calendar size={11} color={colors.textSecondary} />
          <Text style={{ fontSize: 10, color: colors.textSecondary }}>
            Delivery: {new Date(deliveryDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
          </Text>
        </View>
      )}

      {leadTime && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Clock size={11} color={colors.textSecondary} />
          <Text style={{ fontSize: 10, color: colors.textSecondary }}>Lead Time: {leadTime}</Text>
        </View>
      )}
    </View>
  )
}
