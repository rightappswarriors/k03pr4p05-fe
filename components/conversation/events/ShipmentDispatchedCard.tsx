import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { PackageCheck, Calendar, User, MapPin, Clipboard, ExternalLink } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { formatDateSafe, formatTimeSafe } from '@/utils/financial'
import type { ConversationMessage } from '@/types'

interface ShipmentDispatchedCardProps {
  message: ConversationMessage
  onViewTracking?: (url: string) => void
}

export function ShipmentDispatchedCard({ message, onViewTracking }: ShipmentDispatchedCardProps) {
  const { colors } = useTheme()
  const meta = message.metadata ?? {}

  const dispatchedAt = meta.dispatchedAt ?? meta.shipDate ?? message.createdAt
  const trackingNumber = meta.trackingNumber ?? null
  const trackingUrl = meta.trackingUrl ?? null
  const carrier = meta.carrier ?? 'Standard Courier'
  const driverName = meta.driverName ?? null
  const driverContact = meta.driverContact ?? null
  const deliveryDate = meta.deliveryDate ?? meta.scheduledDate ?? null

  return (
    <View style={{ alignSelf: 'stretch', marginVertical: 4 }}>
      <View
        style={{
          backgroundColor: colors.primary + '10',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.primary + '30',
          padding: 16,
          gap: 12,
        }}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <PackageCheck size={20} color={colors.primary} />
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary }}>
            Shipment Dispatched
          </Text>
        </View>

        {/* Carrier & Tracking */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <User size={12} color={colors.primary} />
          <Text style={{ fontSize: 12, color: colors.primary, opacity: 0.85 }}>
            Carrier: {carrier}
          </Text>
        </View>

        {/* Details Grid */}
        <View style={{ gap: 8, marginTop: 4 }}>
          <View style={{ flexDirection: 'row,', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }}>
            <View>
              <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Tracking Number
              </Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, fontFamily: 'monospace' }}>
                {trackingNumber ?? 'N/A'}
              </Text>
            </View>
            {trackingUrl && onViewTracking && (
              <TouchableOpacity onPress={() => onViewTracking(trackingUrl)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <ExternalLink size={12} color={colors.primary} />
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.primary }}>Track</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
            <Calendar size={14} color={colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Dispatched At
              </Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>
                {formatDateSafe(dispatchedAt, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>

          {deliveryDate && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
              <MapPin size={14} color={colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Estimated Delivery
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>
                  {formatDateSafe(deliveryDate, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                </Text>
              </View>
            </View>
          )}

          {driverName && (
            <View style={{ flexDirection: 'row,', justifyContent: 'space-between', paddingVertical: 4 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Driver
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>{driverName}</Text>
                {driverContact && (
                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>{driverContact}</Text>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Status Banner */}
        <View
          style={{
            backgroundColor: colors.warning + '15',
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 8,
            marginTop: 4,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Clipboard size={14} color={colors.warning} />
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.warning }}>
            In transit — estimated delivery on {formatDateSafe(deliveryDate ?? dispatchedAt, { month: 'short', day: 'numeric' })}
          </Text>
        </View>

        {/* Timestamp */}
        <Text style={{ fontSize: 10, color: colors.textSecondary, opacity: 0.6, textAlign: 'right', marginTop: 4 }}>
          {formatTimeSafe(message.createdAt)}
        </Text>
      </View>
    </View>
  )
}
