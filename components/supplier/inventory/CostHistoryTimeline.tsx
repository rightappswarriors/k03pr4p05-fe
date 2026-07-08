import React from 'react'
import { View, Text } from 'react-native'
import Svg, { Polyline, Circle } from 'react-native-svg'
import { useTheme } from '@/contexts/ThemeContext'
import type { SupplierItemCostHistoryEntry } from '@/services/supplierService/supplierInventoryService'

const formatPHP = (n: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n)

function CostSparkline({ entries }: { entries: SupplierItemCostHistoryEntry[] }) {
    const { colors } = useTheme()
    if (entries.length < 2) return null

    const width = 280
    const height = 60
    const pad = 6
    const values = entries.map((e) => e.newCost).reverse() // oldest → newest for left-to-right chart
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min || 1

    const points = values
        .map((v, i) => {
            const x = pad + (i / (values.length - 1)) * (width - pad * 2)
            const y = height - pad - ((v - min) / range) * (height - pad * 2)
            return `${x},${y}`
        })
        .join(' ')

    return (
        <Svg width={width} height={height}>
            <Polyline points={points} fill="none" stroke={colors.primary} strokeWidth={2} />
            {values.map((v, i) => {
                const x = pad + (i / (values.length - 1)) * (width - pad * 2)
                const y = height - pad - ((v - min) / range) * (height - pad * 2)
                return <Circle key={i} cx={x} cy={y} r={2.5} fill={colors.primary} />
            })}
        </Svg>
    )
}

export function CostHistoryTimeline({ entries }: { entries: SupplierItemCostHistoryEntry[] }) {
    const { colors } = useTheme()

    if (entries.length === 0) {
        return (
            <View style={{ padding: 32, alignItems: 'center', gap: 6, backgroundColor: colors.surface, borderRadius: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>No cost history yet</Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>Cost changes are recorded automatically when stock is received.</Text>
            </View>
        )
    }

    return (
        <View style={{ gap: 16 }}>
            {entries.length >= 2 && (
                <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, alignItems: 'center' }}>
                    <CostSparkline entries={entries} />
                </View>
            )}
            <View>
                {entries.map((e, idx) => {
                    const diff = e.newCost - e.oldCost
                    const diffColor = diff > 0 ? '#EF4444' : diff < 0 ? '#22C55E' : colors.textSecondary
                    return (
                        <View key={e.id} style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={{ alignItems: 'center' }}>
                                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 4 }} />
                                {idx < entries.length - 1 && <View style={{ width: 2, flex: 1, minHeight: 26, backgroundColor: colors.border }} />}
                            </View>
                            <View style={{ paddingBottom: 16, flex: 1 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{formatPHP(e.oldCost)} → {formatPHP(e.newCost)}</Text>
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: diffColor }}>{diff > 0 ? '+' : ''}{formatPHP(diff)}</Text>
                                </View>
                                <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                                    {new Date(e.effectiveAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    {e.reason ? ` · ${e.reason}` : ''}
                                </Text>
                            </View>
                        </View>
                    )
                })}
            </View>
        </View>
    )
}