import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { Truck, Calendar, Package, User } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { formatDateSafe, formatTimeSafe } from '@/utils/financial'
import type { ConversationMessage } from '@/types'

interface DeliveryScheduledCardProps {
  message: ConversationMessage
  onViewTracking?: (url: string) => void
}

export function DeliveryScheduledCard({ message, onViewTracking }: DeliveryScheduledCardProps) {
  const { colors } = useTheme()
  const meta = message.metadata ?? {}

  const scheduledDate = meta.scheduledDate ?? meta.deliveryDate ?? message.createdAt
  const carrier = meta.carrier ?? 'Standard Courier'
  const trackingNumber = meta.trackingNumber ?? meta.trackingNumber ?? null
  const trackingUrl = meta.trackingUrl ?? null
  const estimatedDays = meta.estimatedDays ?? null
  const items = meta.lineItems ?? []

  return (
    <View style={{ alignSelf: 'stretch', marginVertical: 4 }}>
      <View
        style={{
          backgroundColor: colors.info + '10',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.info + '30',
          padding: 16,
          gap: 12,
        }}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Truck size={20} color={colors.info} />
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.info }}>
            Delivery Scheduled
          </Text>
        </View>

        {/* Carrier */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <User size={12} color={colors.info} />
          <Text style={{ fontSize: 12, color: colors.info, opacity: 0.85 }}>
            Carrier: {carrier}
          </Text>
        </View>

        {/* Scheduled Date */}
        <View style={{ gap: 8, marginTop: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}>
            <Calendar size={14} color={colors.textSecondary} />
            <View>
              <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Scheduled Date
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                {formatDateSafe(scheduledDate, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
              </Text>
            </View>
          </View>

          {estimatedDays && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}>
              <Package size={14} color={colors.textSecondary} />
              <View>
                <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Estimated Delivery
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                  {estimatedDays} {parseInt(estimatedDays) === 1 ? 'day' : 'days'}
                </Text>
              </View>
            </View>
          )}

          {trackingNumber && (
            <View style={{ flexDirection: 'row,', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 }}>
              <View>
                <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Tracking Number
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, fontFamily: 'monospace' }}>
                  {trackingNumber}
                </Text>
              </View>
              {trackingUrl && onViewTracking && (
                <TouchableOpacity onPress={() => onViewTracking(trackingUrl)}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.primary }}>
                    Track
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {items.length > 0 && (
            <View style={{ marginTop: 4, gap: 4 }}>
              <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Items ({items.length})
              </Text>
              {items.slice(0, 3).map((item: any, i: number) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
                  <Text style={{ fontSize: 11, color: colors.textSecondary }}>{item.name ?? item.label}</Text>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>{item.qty ?? item.quantity} {item.unit ?? ''}</Text>
                </View>
              ))}
              {items.length > 3 && (
                <Text style={{ fontSize: 10, color: colors.textSecondary }}>+ {items.length - 3} more items</Text>
              )}
            </View>
          )}
        </View>

        {/* Timestamp */}
        <Text style={{ fontSize: 10, color: colors.textSecondary, opacity: 0.6, textAlign: 'right', marginTop: 4 }}>
          {formatTimeSafe(message.createdAt)}
        </Text>
      </View>
    </View>
  )
}
