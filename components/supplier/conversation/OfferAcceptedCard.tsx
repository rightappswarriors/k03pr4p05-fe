import React from 'react'
import { View, Text } from 'react-native'
import { CheckCircle2, Calendar } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { resolveSenderName, formatDateSafe, formatTimeSafe } from '@/utils/financial'
import { FinancialSummary } from './FinancialSummary'
import { SenderInfo } from './SenderInfo'
import type { ConversationMessage, NegotiationOffer } from '@/types'

interface Props {
  message: ConversationMessage
  offer?: NegotiationOffer
  buyerName?: string
  supplierName?: string
}

export function OfferAcceptedCard({
  message,
  offer,
  buyerName = 'Buyer',
  supplierName = 'Supplier',
}: Props) {
  const { colors } = useTheme()
  const meta = message.metadata ?? {}

  const quantity = meta.quantity ?? offer?.quantity ?? 0
  const unitPrice = meta.unitPrice ?? offer?.unitPrice ?? 0
  const deliveryDate = meta.deliveryDate ?? offer?.deliveryDate ?? null
  const leadTime = offer?.estimatedLeadTime ?? null
  const acceptedByName = meta.acceptedByName ?? buyerName

  return (
    <View style={{ alignSelf: 'stretch', marginVertical: 4 }}>
      <View
        style={{
          backgroundColor: colors.success + '10',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.success + '30',
          padding: 12,
          gap: 8,
        }}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <CheckCircle2 size={18} color={colors.success} />
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.success }}>
            Negotiation Accepted
          </Text>
        </View>

        {/* Accepted by */}
        <Text style={{ fontSize: 11, color: colors.success, opacity: 0.8 }}>
          Accepted by {acceptedByName}
        </Text>

        {/* Financial summary */}
        <FinancialSummary
          quantity={quantity}
          unitPrice={unitPrice}
          deliveryDate={deliveryDate}
          leadTime={leadTime}
          isCompact
        />

        {/* Warning banner — waiting for supplier confirmation */}
        <View
          style={{
            backgroundColor: colors.warning + '15',
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 6,
            marginTop: 4,
          }}
        >
          <Text style={{ fontSize: 11, color: colors.warning, fontWeight: '500' }}>
            Waiting for Supplier Confirmation
          </Text>
        </View>

        {/* Timestamp */}
        <Text style={{ fontSize: 10, color: colors.textSecondary, opacity: 0.6, textAlign: 'right' }}>
          {formatTimeSafe(message.createdAt)}
        </Text>
      </View>
    </View>
  )
}
