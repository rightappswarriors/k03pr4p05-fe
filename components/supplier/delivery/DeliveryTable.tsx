import React, { useState } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { DeliveryStatusBadge, DELIVERY_STATUS_COLORS } from './DeliveryStatusBadge'
import { isOverdue, type DeliveryItem } from '@/services/supplierService/deliveryService'

const formatPHP = (amount: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })

const COLUMNS = [
  { key: 'po', label: 'PO Number', flex: 1.2 },
  { key: 'buyer', label: 'Buyer', flex: 1.5 },
  { key: 'scheduled', label: 'Scheduled', flex: 1 },
  { key: 'driver', label: 'Driver', flex: 1.3 },
  { key: 'total', label: 'Total', flex: 0.9, align: 'right' as const },
  { key: 'status', label: 'Status', flex: 1 },
]

export function DeliveryTable({
  deliveries,
  onSelect,
  onMarkInTransit,
  onMarkDelivered,
}: {
  deliveries: DeliveryItem[]
  onSelect: (poId: string) => void
  onMarkInTransit: (d: DeliveryItem) => void
  onMarkDelivered: (d: DeliveryItem) => void
}) {
  const { colors } = useTheme()
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
      <View style={{ flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        {COLUMNS.map((col) => (
          <Text key={col.key} style={{ flex: col.flex, fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, textAlign: col.align ?? 'left' }}>
            {col.label}
          </Text>
        ))}
        <View style={{ width: 130 }} />
      </View>

      {deliveries.map((d, idx) => {
        const isHovered = hovered === d.poId
        const overdue = isOverdue(d)
        const statusColor = overdue ? '#EF4444' : DELIVERY_STATUS_COLORS[d.status]
        return (
          <TouchableOpacity
            key={d.poId}
            onPress={() => onSelect(d.poId)}
            onPressIn={() => setHovered(d.poId)}
            onPressOut={() => setHovered(null)}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16,
              backgroundColor: isHovered ? colors.background : idx % 2 === 0 ? colors.surface : colors.background + '40',
              borderLeftWidth: 3, borderLeftColor: statusColor,
              borderBottomWidth: idx === deliveries.length - 1 ? 0 : 1, borderBottomColor: colors.border,
            }}
          >
            <Text style={{ flex: 1.2, fontSize: 14, fontWeight: '700', color: colors.text }}>{d.poNumber}</Text>
            <Text style={{ flex: 1.5, fontSize: 13, color: colors.text }} numberOfLines={1}>{d.buyerName}</Text>
            <Text style={{ flex: 1, fontSize: 13, color: colors.textSecondary }}>{formatDate(d.scheduledDate)}</Text>
            <Text style={{ flex: 1.3, fontSize: 13, color: colors.textSecondary }} numberOfLines={1}>{d.driverName ?? '—'}</Text>
            <Text style={{ flex: 0.9, fontSize: 14, fontWeight: '700', color: colors.text, textAlign: 'right' }}>{formatPHP(d.totalAmount)}</Text>
            <View style={{ flex: 1 }}><DeliveryStatusBadge status={d.status} size="sm" /></View>
            <View style={{ width: 130, alignItems: 'flex-end' }}>
              {d.status === 'SCHEDULED' && (
                <TouchableOpacity onPress={() => onMarkInTransit(d)} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#3B82F615' }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#3B82F6' }}>In Transit</Text>
                </TouchableOpacity>
              )}
              {d.status === 'IN_TRANSIT' && (
                <TouchableOpacity onPress={() => onMarkDelivered(d)} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#22C55E15' }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#22C55E' }}>Delivered</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}