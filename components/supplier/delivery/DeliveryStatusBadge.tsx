import React from 'react'
import { View, Text } from 'react-native'
import type { DeliveryStatus } from '@/services/supplierService/deliveryService'

export const DELIVERY_STATUS_COLORS: Record<DeliveryStatus, string> = {
    SCHEDULED: '#F59E0B',
    IN_TRANSIT: '#3B82F6',
    DELIVERED: '#22C55E',
    FAILED: '#EF4444',
}

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
    SCHEDULED: 'Scheduled',
    IN_TRANSIT: 'In Transit',
    DELIVERED: 'Delivered',
    FAILED: 'Failed',
}

export function DeliveryStatusBadge({ status, size = 'md' }: { status: DeliveryStatus; size?: 'sm' | 'md' }) {
    const color = DELIVERY_STATUS_COLORS[status]
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
                {DELIVERY_STATUS_LABELS[status]}
            </Text>
        </View>
    )
}