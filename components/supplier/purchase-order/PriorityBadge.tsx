import React from 'react'
import { View, Text } from 'react-native'
import { AlertTriangle, Clock, CircleDot } from 'lucide-react-native'
import type { PurchaseOrder } from '@/services/supplierService/supplierService'

export type OrderPriority = 'HIGH' | 'MEDIUM' | 'LOW'

const PRIORITY_META: Record<OrderPriority, { color: string; label: string; Icon: typeof AlertTriangle }> = {
  HIGH: { color: '#EF4444', label: 'Urgent', Icon: AlertTriangle },
  MEDIUM: { color: '#F59E0B', label: 'Soon', Icon: Clock },
  LOW: { color: '#6B7280', label: 'Normal', Icon: CircleDot },
}

// TODO(backend): this is a client-side heuristic because PurchaseOrder has no
// `priority` column. Promote to a real field once you have enough signal on
// what "urgent" should mean for your ops team (SLA breach? buyer tier? both?).
export function getOrderPriority(po: PurchaseOrder): OrderPriority {
  if (po.status === 'DELIVERED' || po.status === 'CANCELLED' || po.status === 'REJECTED') return 'LOW'

  const target = po.delivery?.scheduledDate ?? po.requestedDate
  if (!target) return 'MEDIUM'

  const hoursUntil = (new Date(target).getTime() - Date.now()) / (1000 * 60 * 60)
  if (hoursUntil <= 24) return 'HIGH'
  if (hoursUntil <= 24 * 3) return 'MEDIUM'
  return 'LOW'
}

export function PriorityBadge({ priority }: { priority: OrderPriority }) {
  const { color, label, Icon } = PRIORITY_META[priority]
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: color + '15',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 20,
      }}
    >
      <Icon size={11} color={color} />
      <Text style={{ fontSize: 10, fontWeight: '700', color }}>{label}</Text>
    </View>
  )
}