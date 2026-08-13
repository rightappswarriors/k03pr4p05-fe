import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { Receipt, Calendar, CreditCard, Tag, ExternalLink } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { formatPHP, formatDateSafe, formatTimeSafe } from '@/utils/financial'
import type { ConversationMessage } from '@/types'

interface RefundIssuedCardProps {
  message: ConversationMessage
  onViewReceipt?: (url: string) => void
}

export function RefundIssuedCard({ message, onViewReceipt }: RefundIssuedCardProps) {
  const { colors } = useTheme()
  const meta = message.metadata ?? {}

  const amount = meta.amount ?? 0
  const reason = meta.reason ?? message.message ?? 'No reason provided'
  const refundedBy = meta.refundedBy ?? 'System'
  const refundDate = meta.refundedAt ?? meta.refundDate ?? message.createdAt
  const referenceNumber = meta.referenceNumber ?? meta.refNumber ?? null
  const paymentMethod = meta.paymentMethod ?? meta.method ?? null

  const isFullRefund = meta.isFullRefund ?? false
  const refundTypeLabel = isFullRefund ? 'Full Refund' : 'Partial Refund'

  return (
    <View style={{ alignSelf: 'stretch', marginVertical: 4 }}>
      <View
        style={{
          backgroundColor: colors.warning + '10',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.warning + '30',
          padding: 16,
          gap: 12,
        }}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Receipt size={20} color={colors.warning} />
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.warning }}>
            Refund Issued
          </Text>
        </View>

        {/* Refund type badge */}
        <View
          style={{
            alignSelf: 'flex-start',
            backgroundColor: colors.warning + '15',
            borderRadius: 8,
            paddingHorizontal: 8,
            paddingVertical: 4,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.warning }}>
            {refundTypeLabel}
          </Text>
        </View>

        {/* Refunded by */}
        <Text style={{ fontSize: 12, color: colors.warning, opacity: 0.85 }}>
          Processed by {refundedBy}
        </Text>

        {/* Financial Details */}
        <View style={{ gap: 8, marginTop: 4 }}>
          <View style={{ flexDirection: 'row,', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }}>
            <View>
              <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Refund Amount
              </Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                {formatPHP(amount)}
              </Text>
            </View>
            {paymentMethod && (
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Original Method
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <CreditCard size={11} color={colors.textSecondary} />
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>{paymentMethod}</Text>
                </View>
              </View>
            )}
          </View>

          {referenceNumber && (
            <View style={{ flexDirection: 'row,', justifyContent: 'space-between', paddingVertical: 4 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Reference No.
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text, fontFamily: 'monospace' }}>
                  {referenceNumber}
                </Text>
              </View>
            </View>
          )}

          <View style={{ flexDirection: 'row,', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Refund Date
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Calendar size={11} color={colors.textSecondary} />
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>
                  {formatDateSafe(refundDate, { year: 'numeric', month: 'short', day: 'numeric' })}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Reason */}
        <View
          style={{
            backgroundColor: colors.warning + '10',
            borderRadius: 10,
            padding: 12,
            marginTop: 4,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <Tag size={16} color={colors.warning} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: colors.warning, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Reason
              </Text>
              <Text style={{ fontSize: 12, color: colors.warning, opacity: 0.9, lineHeight: 18 }}>
                {reason}
              </Text>
            </View>
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
