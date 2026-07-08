import React from 'react'
import { Text, View } from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'
import type { TimelineEventType, TimelineStatus } from '@/services/supplierTimelineService'

const STATUS_COLORS: Record<TimelineStatus, string> = {
  SUCCESS: '#16A34A',
  WARNING: '#F59E0B',
  INFO: '#2563EB',
  ERROR: '#DC2626',
  PENDING: '#64748B',
}

const EVENT_LABELS: Record<TimelineEventType, string> = {
  PURCHASE_ORDER: 'Purchase order',
  DELIVERY: 'Delivery',
  WALLET: 'Wallet',
  MANDATE: 'Mandate',
  INVENTORY: 'Inventory',
  SYSTEM: 'System',
  ORGANIZATION: 'Organization',
  NOTIFICATION: 'Notification',
}

export function EventBadge({
  status,
  eventType,
}: {
  status?: TimelineStatus
  eventType?: TimelineEventType
}) {
  const { colors } = useTheme()
  const accent = status ? STATUS_COLORS[status] : '#64748B'
  const label = eventType ? EVENT_LABELS[eventType] : status ? status.toLowerCase() : ''

  return (
    <View
      style={{
        borderRadius: 999,
        paddingHorizontal: 9,
        paddingVertical: 4,
        backgroundColor: `${accent}18`,
        borderWidth: 1,
        borderColor: `${accent}38`,
      }}
    >
      <Text style={{ color: colors.text, fontSize: 11, fontWeight: '700' }}>{label}</Text>
    </View>
  )
}

export { STATUS_COLORS, EVENT_LABELS }
