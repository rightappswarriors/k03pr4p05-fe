import React from 'react'
import { View, Text } from 'react-native'
import { CheckCircle2, User, Calendar } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { resolveSenderName, formatDateSafe, formatTimeSafe } from '@/utils/financial'
import { SenderInfo } from './SenderInfo'
import { formatPHP } from '@/utils/financial'
import type { ConversationMessage } from '@/types'

interface Props {
  message: ConversationMessage
  supplierName?: string
}

export function SupplierConfirmedCard({
  message,
  supplierName = 'Supplier',
}: Props) {
  const { colors } = useTheme()
  const meta = message.metadata ?? {}

  const confirmedByName = meta.supplierName ?? supplierName
  const confirmedAt = meta.confirmedAt ?? message.createdAt

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
            Supplier Confirmed
          </Text>
        </View>

        {/* Confirmed by */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <User size={12} color={colors.success} />
          <Text style={{ fontSize: 11, color: colors.success, opacity: 0.85 }}>
            Confirmed by {confirmedByName}
          </Text>
        </View>

        {/* Confirmed date */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Calendar size={12} color={colors.success} />
          <Text style={{ fontSize: 11, color: colors.success, opacity: 0.85 }}>
            {formatDateSafe(confirmedAt, { year: 'numeric', month: 'short', day: 'numeric' })}
          </Text>
        </View>

        {/* Financial info if available */}
        {(meta.acceptedPrice != null || meta.totalAmount != null) && (
          <Text style={{ fontSize: 11, color: colors.success, opacity: 0.85 }}>
            {meta.totalAmount != null
              ? `Total: ${formatPHP(meta.totalAmount)}`
              : meta.acceptedPrice != null
                ? `Unit Price: ${formatPHP(meta.acceptedPrice)}`
                : ''}
          </Text>
        )}

        {/* Next step banner */}
        <View
          style={{
            backgroundColor: colors.success + '15',
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 6,
            marginTop: 4,
          }}
        >
          <Text style={{ fontSize: 10, color: colors.success, fontWeight: '500' }}>
            Purchase Order creation is now enabled
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
