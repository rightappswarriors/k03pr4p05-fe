import React from 'react'
import { View, Text } from 'react-native'
import { ArrowDownCircle, ArrowUpCircle, RefreshCw, ArrowLeftRight, ShieldAlert, Undo2 } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import type { SupplierInventoryMovement, SupplierInventoryMovementType } from '@/services/supplierService/supplierInventoryService'

const META: Record<SupplierInventoryMovementType, { label: string; color: string; Icon: any; sign: '+' | '-' | '±' }> = {
    RECEIVED: { label: 'Received', color: '#22C55E', Icon: ArrowDownCircle, sign: '+' },
    SOLD: { label: 'Sold', color: '#3B82F6', Icon: ArrowUpCircle, sign: '-' },
    RESERVED: { label: 'Reserved', color: '#F59E0B', Icon: RefreshCw, sign: '-' },
    RELEASED: { label: 'Reservation Released', color: '#22C55E', Icon: RefreshCw, sign: '+' },
    TRANSFERRED_OUT: { label: 'Transferred Out', color: '#8B5CF6', Icon: ArrowLeftRight, sign: '-' },
    TRANSFERRED_IN: { label: 'Transferred In', color: '#8B5CF6', Icon: ArrowLeftRight, sign: '+' },
    ADJUSTED: { label: 'Adjusted', color: '#0EA5E9', Icon: RefreshCw, sign: '±' },
    RETURNED: { label: 'Returned', color: '#F59E0B', Icon: Undo2, sign: '+' },
    DAMAGED: { label: 'Damaged', color: '#EF4444', Icon: ShieldAlert, sign: '-' },
    EXPIRED: { label: 'Expired', color: '#EF4444', Icon: ShieldAlert, sign: '-' },
}

export function MovementTimeline({ movements }: { movements: SupplierInventoryMovement[] }) {
    const { colors } = useTheme()

    if (movements.length === 0) {
        return (
            <View style={{ padding: 32, alignItems: 'center', gap: 6, backgroundColor: colors.surface, borderRadius: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>No movements yet</Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>Stock activity will appear here as it happens.</Text>
            </View>
        )
    }

    return (
        <View>
            {movements.map((m, idx) => {
                const meta = META[m.type]
                const signedQty = meta.sign === '±' ? `${m.quantityAfter >= m.quantityBefore ? '+' : ''}${(m.quantityAfter - m.quantityBefore).toFixed(0)}` : `${meta.sign}${m.quantity}`
                return (
                    <View key={m.id} style={{ flexDirection: 'row', gap: 12 }}>
                        <View style={{ alignItems: 'center' }}>
                            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: meta.color + '18', alignItems: 'center', justifyContent: 'center' }}>
                                <meta.Icon size={14} color={meta.color} />
                            </View>
                            {idx < movements.length - 1 && <View style={{ width: 2, flex: 1, minHeight: 20, backgroundColor: colors.border }} />}
                        </View>
                        <View style={{ paddingBottom: 18, flex: 1 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{meta.label}</Text>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: meta.color }}>{signedQty}</Text>
                            </View>
                            <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                                {new Date(m.createdAt).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                {m.reason ? ` · ${m.reason}` : ''}
                            </Text>
                        </View>
                    </View>
                )
            })}
        </View>
    )
}