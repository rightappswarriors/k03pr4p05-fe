import React from 'react'
import { View, Text } from 'react-native'
import { XCircle, AlertCircle, Tag, Calendar, DollarSign } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { formatPHP, formatDateSafe, formatTimeSafe } from '@/utils/financial'
import type { ConversationMessage } from '@/types'

interface OfferRejectedCardProps {
  message: ConversationMessage
  supplierName?: string
  buyerName?: string
}

export function OfferRejectedCard({
  message,
  supplierName = 'Supplier',
  buyerName = 'Buyer',
}: OfferRejectedCardProps) {
  const { colors } = useTheme()
  const meta = message.metadata ?? {}

  const senderLabel = message.senderRole === 'AGENT' ? buyerName : supplierName
  const quantity = meta.quantity ?? 0
  const unitPrice = meta.unitPrice ?? 0
  const subtotal = quantity * unitPrice
  const reason = meta.reason ?? message.message ?? 'No reason provided'

  return (
    <View style={{ alignSelf: 'stretch', marginVertical: 4 }}>
      <View
        style={{
          backgroundColor: colors.error + '10',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.error + '30',
          padding: 16,
          gap: 12,
        }}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <XCircle size={20} color={colors.error} />
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.error }}>
            Offer Rejected
          </Text>
        </View>

        {/* Rejected by */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 12, color: colors.error, opacity: 0.85 }}>
            Rejected by {senderLabel}
          </Text>
        </View>

        {/* Financial Summary (if available) */}
        {quantity > 0 && unitPrice > 0 && (
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
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.error + '20', paddingTop: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Subtotal
                </Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                  {formatPHP(subtotal)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Reason */}
        <View
          style={{
            backgroundColor: colors.error + '10',
            borderRadius: 10,
            padding: 12,
            marginTop: 4,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <AlertCircle size={16} color={colors.error} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: colors.error, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Reason
              </Text>
              <Text style={{ fontSize: 12, color: colors.error, opacity: 0.9, lineHeight: 18 }}>
                {reason}
              </Text>
            </View>
          </View>
        </View>

        {/* Suggested Action */}
        <View
          style={{
            backgroundColor: colors.warning + '10',
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 8,
            marginTop: 4,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            borderWidth: 1,
            borderColor: colors.warning + '30',
          }}
        >
          <AlertCircle size={14} color={colors.warning} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.warning }}>
              Suggested Action
            </Text>
            <Text style={{ fontSize: 11, color: colors.warning, opacity: 0.85, marginTop: 2 }}>
              {senderLabel === buyerName
                ? 'Supplier can submit a new counter offer or wait for buyer to re-engage.'
                : 'Buyer can submit a new counter offer or create a new RFQ.'}
            </Text>
          </View>
        </View>

        {/* Timestamp */}
        <Text style={{ fontSize: 10, color: colors.textSecondary, opacity: 0.6, textAlign: 'right', marginTop: 4 }}>
          {formatTimeSafe(message.createdAt)}
        </Text>
      </View>
    </View>
  )
}