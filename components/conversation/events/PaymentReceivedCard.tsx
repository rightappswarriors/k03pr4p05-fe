import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { CreditCard, Calendar, Tag, Receipt } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { formatPHP, formatDateSafe, formatTimeSafe } from '@/utils/financial'
import type { ConversationMessage } from '@/types'

interface PaymentReceivedCardProps {
  message: ConversationMessage
  onViewReceipt?: (url: string) => void
}

export function PaymentReceivedCard({ message, onViewReceipt }: PaymentReceivedCardProps) {
  const { colors } = useTheme()
  const meta = message.metadata ?? {}

  const amount = meta.amount ?? 0
  const paymentMethod = meta.paymentMethod ?? meta.method ?? 'Bank Transfer'
  const referenceNumber = meta.referenceNumber ?? meta.refNumber ?? null
  const paidByName = meta.paidByName ?? message.senderName ?? 'System'
  const receiptUrl = meta.receiptUrl ?? meta.fileUrl ?? null
  const paymentDate = meta.paidAt ?? meta.paymentDate ?? message.createdAt

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
          <CreditCard size={20} color={colors.success} />
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.success }}>
            Payment Received
          </Text>
        </View>

        {/* Paid by */}
        <Text style={{ fontSize: 12, color: colors.success, opacity: 0.85 }}>
          Paid by {paidByName}
        </Text>

        {/* Financial Details */}
        <View style={{ gap: 8, marginTop: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Amount
              </Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                {formatPHP(amount)}
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Method
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                {paymentMethod}
              </Text>
            </View>
          </View>

          {referenceNumber && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Reference No.
              </Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, fontFamily: 'monospace' }}>
                {referenceNumber}
              </Text>
            </View>
          )}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Payment Date
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Calendar size={11} color={colors.textSecondary} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>
                  {formatDateSafe(paymentDate, { year: 'numeric', month: 'short', day: 'numeric' })}
                </Text>
              </View>
            </View>
            {receiptUrl && onViewReceipt && (
              <TouchableOpacity onPress={() => onViewReceipt(receiptUrl)} style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 10, color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Receipt
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Receipt size={11} color={colors.primary} />
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.primary }}>
                    View receipt
                  </Text>
                </View>
              </TouchableOpacity>
            )}
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
