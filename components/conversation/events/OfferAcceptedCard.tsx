import React from 'react'
import { View, Text } from 'react-native'
import { CheckCircle2, Calendar, DollarSign } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { formatPHP, formatDateSafe, formatTimeSafe } from '@/utils/financial'
import type { ConversationMessage } from '@/types'

interface OfferAcceptedCardProps {
  message: ConversationMessage
  buyerName?: string
  supplierName?: string
}

export function OfferAcceptedCard({
  message,
  buyerName = 'Buyer',
  supplierName = 'Supplier',
}: OfferAcceptedCardProps) {
  const { colors } = useTheme()
  const meta = message.metadata ?? {}

  const quantity = meta.quantity ?? 0
  const unitPrice = meta.unitPrice ?? 0
  const deliveryDate = meta.deliveryDate ?? null
  const acceptedByName = meta.acceptedByName ?? buyerName
  // Reuse the negotiated financial values supplied in event metadata. Older
  // event records use `vat`, `tax`, or `totalVat`, so accept those aliases.
  const subtotal = meta.subtotal ?? quantity * unitPrice
  const vatAmount = meta.vatAmount ?? meta.vat ?? meta.tax ?? meta.totalVat ?? 0
  const totalAmount = meta.totalAmount ?? meta.grandTotal ?? subtotal + vatAmount

  return (
    <View style={{ alignSelf: 'stretch', marginVertical: 4 }}>
      <View
        style={{
          backgroundColor: colors.success + '10',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.success + '30',
          padding: 16,
          gap: 12,
        }}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={20} color={colors.success} />
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.success }}>
            Offer Accepted
          </Text>
        </View>

        {/* Accepted by */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 12, color: colors.success, opacity: 0.85 }}>
            Accepted by {acceptedByName}
          </Text>
        </View>

        {/* Financial Details Grid */}
        <View style={{ gap: 8, marginTop: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Quantity
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                {quantity.toLocaleString()} pcs
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Unit Price
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                {formatPHP(unitPrice)}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Subtotal
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                {formatPHP(subtotal)}
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                VAT (12%)
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                {formatPHP(vatAmount)}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.success + '20', paddingTop: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Grand Total
              </Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.success }}>
                {formatPHP(totalAmount)}
              </Text>
            </View>
            {deliveryDate && (
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Delivery
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                  <Calendar size={12} color={colors.textSecondary} />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>
                    {formatDateSafe(deliveryDate, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Status Banner */}
        <View
          style={{
            backgroundColor: colors.warning + '15',
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 8,
            marginTop: 4,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <CheckCircle2 size={14} color={colors.warning} />
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.warning }}>
            Waiting for Supplier Confirmation
          </Text>
        </View>

        {/* Timestamp */}
        <Text style={{ fontSize: 10, color: colors.textSecondary, opacity: 0.6, textAlign: 'right', marginTop: 4 }}>
          {formatTimeSafe(message.createdAt)}
        </Text>
      </View>
    </View>
  )
}
