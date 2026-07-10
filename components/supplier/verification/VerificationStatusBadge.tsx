import React from 'react'
import { View, Text } from 'react-native'
import { CheckCircle2, Clock, XCircle, AlertTriangle, HelpCircle } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { withAlpha } from '@/utils/color'
import type { OrgVerificationStatus, VerificationStatus } from '@/services/supplierService/verificationService'

type Status = OrgVerificationStatus | VerificationStatus

const STATUS_CONFIG: Record<Status, { label: string; color: string; icon: any }> = {
  UNVERIFIED: { label: 'Unverified', color: '#6B7280', icon: HelpCircle },
  PENDING: { label: 'Pending Review', color: '#D97706', icon: Clock },
  VERIFIED: { label: 'Verified', color: '#059669', icon: CheckCircle2 },
  APPROVED: { label: 'Approved', color: '#059669', icon: CheckCircle2 },
  REJECTED: { label: 'Rejected', color: '#DC2626', icon: XCircle },
  EXPIRED: { label: 'Expired', color: '#DC2626', icon: AlertTriangle },
  BYPASSED_DEV: { label: 'Sandbox Bypass', color: '#7C3AED', icon: HelpCircle },
}

export function VerificationStatusBadge({
  status,
  size = 'md',
}: {
  status: Status
  size?: 'sm' | 'md'
}) {
  const { colors } = useTheme()
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.UNVERIFIED
  const Icon = config.icon
  const iconSize = size === 'sm' ? 11 : 13
  const fontSize = size === 'sm' ? 11 : 12.5

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        alignSelf: 'flex-start',
        paddingHorizontal: size === 'sm' ? 8 : 10,
        paddingVertical: size === 'sm' ? 3 : 5,
        borderRadius: 999,
        backgroundColor: withAlpha(config.color, '18'),
      }}
    >
      <Icon size={iconSize} color={config.color} strokeWidth={2.4} />
      <Text style={{ fontSize, fontWeight: '700', color: config.color }}>{config.label}</Text>
    </View>
  )
}