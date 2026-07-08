import React from 'react'
import { View, Text } from 'react-native'
import type { POStatus } from '@/services/supplierService/supplierService'

export const STATUS_COLORS: Record<POStatus, string> = {
  PENDING: '#F59E0B',
  ACCEPTED: '#3B82F6',
  REJECTED: '#EF4444',
  IN_TRANSIT: '#8B5CF6',
  DELIVERED: '#22C55E',
  CANCELLED: '#6B7280',
}

export const STATUS_LABELS: Record<POStatus, string> = {
  PENDING: 'Pending Review',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  IN_TRANSIT: 'In Transit',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
}

// TODO(backend): schema's POStatus has no PREPARING / READY_FOR_PICKUP states.
// If you want that granularity in the pipeline (matches the spec's filter chips),
// it needs to be added to the Prisma enum + a migration. Until then, IN_TRANSIT
// is the closest real state between ACCEPTED and DELIVERED.

export function StatusBadge({ status, size = 'md' }: { status: POStatus; size?: 'sm' | 'md' }) {
  const color = STATUS_COLORS[status]
  const isSmall = size === 'sm'
  return (
    <View
      style={{
        backgroundColor: color + '20',
        paddingHorizontal: isSmall ? 8 : 10,
        paddingVertical: isSmall ? 3 : 4,
        borderRadius: 20,
        alignSelf: 'flex-start',
      }}
    >
      <Text style={{ fontSize: isSmall ? 10 : 11, fontWeight: '600', color }}>
        {STATUS_LABELS[status]}
      </Text>
    </View>
  )
}