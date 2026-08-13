import React from 'react'
import { View, Text } from 'react-native'
import { XCircle, Tag, Calendar } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { resolveSenderName, formatDateSafe, formatTimeSafe } from '@/utils/financial'
import { FinancialSummary } from './FinancialSummary'
import { SenderInfo } from './SenderInfo'
import type { ConversationMessage, NegotiationOffer, ConversationRole } from '@/types'

interface Props {
  message: ConversationMessage
  offer?: NegotiationOffer
  supplierName?: string
  buyerName?: string
}

export function OfferRejectedCard({
  message,
  offer,
  supplierName = 'Supplier',
  buyerName = 'Buyer',
}: Props) {
  const { colors } = useTheme()
  const meta = message.metadata ?? {}

  const senderLabel = message.senderRole === 'AGENT' ? buyerName : supplierName
  const quantity = meta.quantity ?? offer?.quantity ?? 0
  const unitPrice = meta.unitPrice ?? offer?.unitPrice ?? 0

  const reason = meta.reason ?? message.message ?? 'No reason provided'

  return (
    <View style={{ alignSelf: 'stretch', marginVertical: 4 }}>
      <View
        style={{
          backgroundColor: colors.error + '10',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.error + '30',
          padding: 12,
          gap: 8,
        }}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <XCircle size={18} color={colors.error} />
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.error }}>
            Negotiation Rejected
          </Text>
        </View>

        {/* Rejected by */}
        <Text style={{ fontSize: 11, color: colors.error, opacity: 0.8 }}>
          Rejected by {senderLabel}
        </Text>

        {/* Financial summary (if offer data available) */}
        {quantity > 0 && unitPrice > 0 && (
          <FinancialSummary
            quantity={quantity}
            unitPrice={unitPrice}
            deliveryDate={offer?.deliveryDate ?? null}
            isCompact
          />
        )}

        {/* Reason */}
        <View
          style={{
            backgroundColor: colors.error + '10',
            borderRadius: 8,
            padding: 8,
            marginTop: 4,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 4 }}>
            <Tag size={12} color={colors.error} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: colors.error, marginBottom: 2 }}>
                Reason
              </Text>
              <Text style={{ fontSize: 11, color: colors.error, opacity: 0.85 }}>
                {reason}
              </Text>
            </View>
          </View>
        </View>

        {/* Timestamp */}
        <Text style={{ fontSize: 10, color: colors.textSecondary, opacity: 0.6, textAlign: 'right' }}>
          {formatTimeSafe(message.createdAt)}
        </Text>
      </View>
    </View>
  )
}
