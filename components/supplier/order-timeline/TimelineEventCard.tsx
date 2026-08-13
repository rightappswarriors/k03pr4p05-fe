import React from 'react'
import { Text, TouchableOpacity, View } from 'react-native'
import {
  Bell,
  Building2,
  Handshake,
  Package,
  Settings,
  ShoppingCart,
  Truck,
  Wallet,
} from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import type { TimelineEvent, TimelineEventType } from '@/services/supplierTimelineService'
import { EventBadge } from './EventBadge'

const ICONS = {
  PURCHASE_ORDER: ShoppingCart,
  DELIVERY: Truck,
  WALLET: Wallet,
  MANDATE: Handshake,
  INVENTORY: Package,
  SYSTEM: Settings,
  ORGANIZATION: Building2,
  NOTIFICATION: Bell,
} satisfies Record<TimelineEventType, any>

function formatDate(value: string) {
  return new Date(value).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function TimelineEventCard({
  event,
  onPress,
  compact = false,
}: {
  event: TimelineEvent
  onPress: (event: TimelineEvent) => void
  compact?: boolean
}) {
  const { colors } = useTheme()
  const Icon = ICONS[event.eventType]

  return (
    <TouchableOpacity
      onPress={() => onPress(event)}
      activeOpacity={0.85}
      style={{
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        padding: compact ? 12 : 14,
        gap: 10,
        shadowColor: '#0F172A',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 1,
      }}
    >
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ width: 38, height: 38, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: `${event.color}18` }}>
          <Icon size={18} color={event.color} />
        </View>
        <View style={{ flex: 1, gap: 6, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: '800', flex: 1 }} numberOfLines={2}>{event.title}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '600' }}>{formatDate(event.createdAt)}</Text>
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18 }} numberOfLines={compact ? 2 : 3}>{event.description}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            <EventBadge eventType={event.eventType} />
            <EventBadge status={event.status} />
            {!!event.actor && <Text style={{ color: colors.textSecondary, fontSize: 12 }}>by {event.actor}</Text>}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )
}
