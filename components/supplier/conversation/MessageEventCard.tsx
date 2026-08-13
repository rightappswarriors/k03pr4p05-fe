import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { Package, User } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { resolveSenderName, formatTimeSafe } from '@/utils/financial'
import { SenderInfo } from './SenderInfo'
import type { ConversationMessage, ConversationRole } from '@/types'

interface Props {
  message: ConversationMessage
  supplierName?: string
  buyerName?: string
  isFromSupplier?: boolean
}

export function MessageEventCard({
  message,
  supplierName = 'Supplier',
  buyerName = 'Buyer',
  isFromSupplier = false,
}: Props) {
  const { colors } = useTheme()

  const senderType: ConversationRole = isFromSupplier ? 'SUPPLIER' : 'AGENT'
  const align: 'flex-start' | 'flex-end' = isFromSupplier ? 'flex-end' : 'flex-start'

  const displayName = resolveSenderName({
    fullName: message.senderAgent?.fullname ?? null,
    organizationName: message.senderOrg?.name ?? null,
    email: message.senderAgent?.email ?? null,
    senderType: message.type === 'TEXT' ? senderType : undefined,
  })

  const label = isFromSupplier ? supplierName : buyerName
  const effectiveName =
    displayName && displayName !== 'Unknown' ? displayName : label

  return (
    <View
      style={{
        alignSelf: align,
        maxWidth: '75%',
        marginVertical: 4,
      }}
    >
      <SenderInfo
        message={message}
        senderType={senderType}
        senderName={effectiveName}
        createdAt={message.createdAt}
      />
      <View
        style={{
          backgroundColor: isFromSupplier ? colors.primary + '15' : colors.surface,
          borderRadius: 16,
          borderTopLeftRadius: isFromSupplier ? 16 : 4,
          borderTopRightRadius: isFromSupplier ? 4 : 16,
          borderWidth: 1,
          borderColor: isFromSupplier ? colors.primary + '40' : colors.border,
          padding: 12,
        }}
      >
        <Text
          style={{
            fontSize: 13,
            color: colors.text,
            lineHeight: 18,
          }}
        >
          {message.message}
        </Text>

        {message.attachments && message.attachments?.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            {message.attachments.map((att, i) => (
              <TouchableOpacity key={i}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: colors.background,
                    borderRadius: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                  }}
                >
                  <Package size={12} color={colors.textSecondary} />
                  <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                    {att.replace('upload://', '')}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text
          style={{
            fontSize: 10,
            color: colors.textSecondary,
            opacity: 0.6,
            textAlign: 'right',
            marginTop: 4,
          }}
        >
          {formatTimeSafe(message.createdAt)}
        </Text>
      </View>
    </View>
  )
}
