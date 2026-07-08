// components/supplier/inventory/BatchTable.tsx
import React, { useState } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'
import type { SupplierStockBatch } from '@/services/supplierService/supplierInventoryService'

const formatPHP = (n: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n)
const formatDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—')

type SortKey = 'receivedAt' | 'expiryDate' | 'remainingQty' | 'unitCost'

const STATUS_COLORS: Record<string, string> = { ACTIVE: '#22C55E', DEPLETED: '#6B7280', EXPIRED: '#EF4444', DAMAGED: '#F59E0B' }

export function BatchTable({ batches }: { batches: SupplierStockBatch[] }) {
    const { colors } = useTheme()
    const [sortKey, setSortKey] = useState<SortKey>('receivedAt')
    const [asc, setAsc] = useState(false)

    const sorted = [...batches].sort((a, b) => {
        const av = sortKey === 'expiryDate' ? new Date(a.expiryDate ?? 0).getTime() : sortKey === 'receivedAt' ? new Date(a.receivedAt).getTime() : (a as any)[sortKey]
        const bv = sortKey === 'expiryDate' ? new Date(b.expiryDate ?? 0).getTime() : sortKey === 'receivedAt' ? new Date(b.receivedAt).getTime() : (b as any)[sortKey]
        return asc ? av - bv : bv - av
    })

    const HeaderCell = ({ label, keyName, flex }: { label: string; keyName: SortKey; flex: number }) => (
        <TouchableOpacity
            onPress={() => { if (sortKey === keyName) setAsc(!asc); else { setSortKey(keyName); setAsc(false) } }}
            style={{ flex }}
        >
            <Text style={{ fontSize: 11, fontWeight: '700', color: sortKey === keyName ? colors.primary : colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                {label}{sortKey === keyName ? (asc ? ' ↑' : ' ↓') : ''}
            </Text>
        </TouchableOpacity>
    )

    if (batches.length === 0) {
        return (
            <View style={{ padding: 32, alignItems: 'center', gap: 6, backgroundColor: colors.surface, borderRadius: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>No batches yet</Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>Receive stock to create the first batch.</Text>
            </View>
        )
    }

    return (
        <View style={{ backgroundColor: colors.surface, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
            <View style={{ flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 14, backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Text style={{ flex: 1.3, fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase' }}>Batch #</Text>
                <HeaderCell label="Remaining" keyName="remainingQty" flex={1} />
                <HeaderCell label="Unit Cost" keyName="unitCost" flex={1} />
                <Text style={{ flex: 1, fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase' }}>Value</Text>
                <HeaderCell label="Received" keyName="receivedAt" flex={1.1} />
                <HeaderCell label="Expiry" keyName="expiryDate" flex={1.1} />
                <Text style={{ flex: 0.9, fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase' }}>Status</Text>
            </View>
            {sorted.map((b, idx) => (
                <View key={b.id} style={{
                    flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14,
                    backgroundColor: idx % 2 === 0 ? colors.surface : colors.background + '40',
                    borderBottomWidth: idx === sorted.length - 1 ? 0 : 1, borderBottomColor: colors.border,
                }}>
                    <Text style={{ flex: 1.3, fontSize: 12, fontWeight: '600', color: colors.text }} numberOfLines={1}>{b.batchNumber ?? b.id.slice(0, 8)}</Text>
                    <Text style={{ flex: 1, fontSize: 12, color: colors.text }}>{b.remainingQty} / {b.quantity}</Text>
                    <Text style={{ flex: 1, fontSize: 12, color: colors.text }}>{formatPHP(b.unitCost)}</Text>
                    <Text style={{ flex: 1, fontSize: 12, fontWeight: '600', color: colors.text }}>{formatPHP(b.remainingQty * b.unitCost)}</Text>
                    <Text style={{ flex: 1.1, fontSize: 11, color: colors.textSecondary }}>{formatDate(b.receivedAt)}</Text>
                    <Text style={{ flex: 1.1, fontSize: 11, color: colors.textSecondary }}>{formatDate(b.expiryDate)}</Text>
                    <View style={{ flex: 0.9 }}>
                        <View style={{ backgroundColor: (STATUS_COLORS[b.status] ?? '#6B7280') + '18', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, alignSelf: 'flex-start' }}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: STATUS_COLORS[b.status] ?? '#6B7280' }}>{b.status}</Text>
                        </View>
                    </View>
                </View>
            ))}
        </View>
    )
}