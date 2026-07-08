import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { Package, Eye, PlusCircle, ClipboardEdit, History } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { InventoryStatusBadge } from './InventoryStatusBadge'
import { InventoryValueBadge } from './InventoryValueBadge'
import { StockIndicator } from './StockIndicator'
import type { InventoryRowData } from './InventoryTable'

export function InventoryCard({
    item, onView, onReceive, onAdjust, onHistory,
}: { item: InventoryRowData; onView: () => void; onReceive: () => void; onAdjust: () => void; onHistory: () => void }) {
    const { colors } = useTheme()
    return (
        <TouchableOpacity onPress={onView} activeOpacity={0.85} style={{
            backgroundColor: colors.surface, borderRadius: 14, padding: 14, gap: 10,
            shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2,
            opacity: item.isActive ? 1 : 0.6,
        }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
                    <Package size={18} color={colors.textSecondary} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }} numberOfLines={1}>{item.name}</Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>{item.batchCount} batch{item.batchCount === 1 ? '' : 'es'}</Text>
                </View>
                <InventoryStatusBadge item={item} size="sm" />
            </View>

            <StockIndicator available={item.availableQty} reserved={item.reservedQty} incoming={item.incomingQty} unit={item.unit} />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View>
                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>Avg. Cost</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{item.averageCost > 0 ? `₱${item.averageCost.toFixed(2)}` : '—'}</Text>
                </View>
                <View>
                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>Inventory Value</Text>
                    <InventoryValueBadge value={item.inventoryValue} />
                </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
                <TouchableOpacity onPress={onView} style={{ flex: 1, flexDirection: 'row', gap: 4, justifyContent: 'center', alignItems: 'center', paddingVertical: 8, borderRadius: 8, backgroundColor: colors.background }}>
                    <Eye size={12} color={colors.text} /><Text style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>Manage</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onReceive} style={{ flex: 1, flexDirection: 'row', gap: 4, justifyContent: 'center', alignItems: 'center', paddingVertical: 8, borderRadius: 8, backgroundColor: colors.primary + '15' }}>
                    <PlusCircle size={12} color={colors.primary} /><Text style={{ fontSize: 11, fontWeight: '600', color: colors.primary }}>Receive</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onAdjust} style={{ flex: 1, flexDirection: 'row', gap: 4, justifyContent: 'center', alignItems: 'center', paddingVertical: 8, borderRadius: 8, backgroundColor: '#F59E0B15' }}>
                    <ClipboardEdit size={12} color="#F59E0B" /><Text style={{ fontSize: 11, fontWeight: '600', color: '#F59E0B' }}>Adjust</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onHistory} style={{ flex: 1, flexDirection: 'row', gap: 4, justifyContent: 'center', alignItems: 'center', paddingVertical: 8, borderRadius: 8, backgroundColor: colors.background }}>
                    <History size={12} color={colors.text} /><Text style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>History</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    )
}