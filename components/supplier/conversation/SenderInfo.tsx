import React from 'react'
import { View, Text } from 'react-native'
import { User } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { resolveSenderName, formatTimeSafe } from '@/utils/financial'
import type { ConversationMessage, NegotiationOffer } from '@/types'

interface Props {
  message?: ConversationMessage
  offer?: NegotiationOffer
  senderType?: 'AGENT' | 'SUPPLIER'
  senderName?: string
  createdAt?: string
}

export function SenderInfo({ message, offer, senderType, senderName, createdAt }: Props) {
  const { colors } = useTheme()

  // Resolve sender info with priority chain
  let resolvedName = senderName ?? 'Unknown'
  let effectiveSenderType = senderType

  if (message?.senderAgent?.fullname || message?.senderOrg?.name) {
    resolvedName = resolveSenderName({
      fullName: message?.senderAgent?.fullname ?? null,
      organizationName: message?.senderOrg?.name ?? null,
      email: message?.senderAgent?.email ?? null,
      senderType: message?.senderRole,
    })
    effectiveSenderType = message?.senderRole ?? effectiveSenderType
  } else if (offer?.senderAgent?.fullname || offer?.senderOrg?.name) {
    resolvedName = resolveSenderName({
      fullName: offer?.senderAgent?.fullname ?? null,
      organizationName: offer?.senderOrg?.name ?? null,
      email: offer?.senderAgent?.email ?? null,
      senderType: offer?.senderType,
    })
    effectiveSenderType = offer?.senderType ?? effectiveSenderType
  } else if (message?.senderName && message?.senderName !== 'undefined' && message?.senderName !== 'Unknown') {
    resolvedName = message.senderName
  } else if (offer?.senderName && offer?.senderName !== 'undefined' && offer?.senderName !== 'Unknown') {
    resolvedName = offer.senderName
  }

  // Don't show "undefined" or "Unknown" — fall back to role
  if (resolvedName === 'undefined' || resolvedName === 'Unknown') {
    resolvedName = effectiveSenderType === 'AGENT' ? 'Agent' :
                   effectiveSenderType === 'SUPPLIER' ? 'Supplier' : 'Unknown'
  }

  const timeString = formatTimeSafe(createdAt ?? message?.createdAt ?? offer?.createdAt ?? null)

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
      <View style={{
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: effectiveSenderType === 'AGENT' ? colors.primary + '20' : colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <User size={10} color={effectiveSenderType === 'AGENT' ? colors.primary : colors.textSecondary} />
      </View>
      <Text style={{ fontSize: 10, fontWeight: '600', color: colors.textSecondary }}>
        {resolvedName}
      </Text>
      <Text style={{ fontSize: 10, color: colors.textSecondary, opacity: 0.6 }}>
        {timeString}
      </Text>
    </View>
  )
}
