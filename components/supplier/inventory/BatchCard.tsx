// components/supplier/inventory/BatchCard.tsx
import React from 'react'
import { View, Text } from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'
import type { SupplierStockBatch } from '@/services/supplierService/supplierInventoryService'

const formatPHP = (n: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n)
const formatDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : '—')
const STATUS_COLORS: Record<string, string> = { ACTIVE: '#22C55E', DEPLETED: '#6B7280', EXPIRED: '#EF4444', DAMAGED: '#F59E0B' }

export function BatchCard({ batch }: { batch: SupplierStockBatch }) {
    const { colors } = useTheme()
    const color = STATUS_COLORS[batch.status] ?? '#6B7280'
    return (
        <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 12, gap: 6, borderLeftWidth: 3, borderLeftColor: color }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{batch.batchNumber ?? batch.id.slice(0, 8)}</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color }}>{batch.status}</Text>
            </View>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>{batch.remainingQty} of {batch.quantity} remaining @ {formatPHP(batch.unitCost)}</Text>
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>Received {formatDate(batch.receivedAt)}{batch.expiryDate ? ` · Expires ${formatDate(batch.expiryDate)}` : ''}</Text>
        </View>
    )
}