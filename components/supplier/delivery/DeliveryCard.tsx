import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { MapPin, User, Calendar, Package } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { DeliveryStatusBadge, DELIVERY_STATUS_COLORS } from './DeliveryStatusBadge'
import { isOverdue, type DeliveryItem } from '@/services/supplierService/deliveryService'

const formatPHP = (amount: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })

interface Props {
  delivery: DeliveryItem
  onPress: () => void
  onMarkInTransit: () => void
  onMarkDelivered: () => void
}

export function DeliveryCard({ delivery, onPress, onMarkInTransit, onMarkDelivered }: Props) {
  const { colors } = useTheme()
  const color = DELIVERY_STATUS_COLORS[delivery.status]
  const overdue = isOverdue(delivery)

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        backgroundColor: colors.surface, borderRadius: 16, padding: 16, gap: 12,
        borderLeftWidth: 4, borderLeftColor: overdue ? '#EF4444' : color,
        shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>{delivery.poNumber}</Text>
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>{delivery.buyerName}</Text>
        </View>
        <View style={{ gap: 6, alignItems: 'flex-end' }}>
          <DeliveryStatusBadge status={delivery.status} />
          {overdue && (
            <View style={{ backgroundColor: '#EF444415', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#EF4444' }}>Overdue</Text>
            </View>
          )}
        </View>
      </View>

      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Calendar size={13} color={colors.textSecondary} />
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>
            Scheduled {formatDate(delivery.scheduledDate)}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 5 }}>
          <MapPin size={13} color={colors.textSecondary} style={{ marginTop: 1 }} />
          <Text style={{ fontSize: 12, color: colors.textSecondary, flex: 1 }} numberOfLines={1}>{delivery.outletAddress}</Text>
        </View>
        {delivery.driverName && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <User size={13} color={colors.textSecondary} />
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
              {delivery.driverName}{delivery.driverContact ? ` · ${delivery.driverContact}` : ''}
            </Text>
          </View>
        )}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
        <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>{formatPHP(delivery.totalAmount)}</Text>
        {delivery.status === 'SCHEDULED' && (
          <TouchableOpacity onPress={onMarkInTransit} style={{ backgroundColor: '#3B82F615', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#3B82F6' }}>Mark In Transit</Text>
          </TouchableOpacity>
        )}
        {delivery.status === 'IN_TRANSIT' && (
          <TouchableOpacity onPress={onMarkDelivered} style={{ backgroundColor: '#22C55E15', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#22C55E' }}>Mark Delivered</Text>
          </TouchableOpacity>
        )}
        {(delivery.status === 'DELIVERED' || delivery.status === 'FAILED') && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Package size={12} color={colors.textSecondary} />
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>View details →</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )
}