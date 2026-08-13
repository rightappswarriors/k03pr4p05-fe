import React from 'react'
import { View, Text } from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'
import type { InventoryAnalytics } from '@/services/supplierService/supplierInventoryService'

const formatPHP = (n: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n)

function StatBlock({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme()
  return (
    <View style={{ width: '48%', backgroundColor: colors.background, borderRadius: 10, padding: 12, gap: 4 }}>
      <Text style={{ fontSize: 11, color: colors.textSecondary }}>{label}</Text>
      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{value}</Text>
    </View>
  )
}

export function InventoryAnalyticsPanel({ analytics }: { analytics: InventoryAnalytics }) {
  const { colors } = useTheme()
  const aging = analytics.stockAging
  const agingTotal = aging.fresh + aging.aging + aging.old + aging.stale || 1

  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <StatBlock label="Inventory Value" value={formatPHP(analytics.inventoryValue)} />
        <StatBlock label="Average Cost" value={formatPHP(analytics.averageCost)} />
        <StatBlock label="Highest Cost" value={analytics.highestCost != null ? formatPHP(analytics.highestCost) : '—'} />
        <StatBlock label="Lowest Cost" value={analytics.lowestCost != null ? formatPHP(analytics.lowestCost) : '—'} />
        <StatBlock label="Inventory Turnover" value={analytics.inventoryTurnover != null ? `${analytics.inventoryTurnover.toFixed(2)}x` : '—'} />
        <StatBlock label="Avg. Days in Stock" value={analytics.avgDaysInStock != null ? `${Math.round(analytics.avgDaysInStock)}d` : '—'} />
        <StatBlock label="Estimated Profit" value={analytics.estimatedProfit != null ? formatPHP(analytics.estimatedProfit) : '—'} />
        <StatBlock label="Margin %" value={analytics.marginPct != null ? `${analytics.marginPct.toFixed(1)}%` : '—'} />
      </View>

      <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 10 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>Stock Aging</Text>
        <View style={{ flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: colors.border }}>
          <View style={{ width: `${(aging.fresh / agingTotal) * 100}%`, backgroundColor: '#22C55E' }} />
          <View style={{ width: `${(aging.aging / agingTotal) * 100}%`, backgroundColor: '#F59E0B' }} />
          <View style={{ width: `${(aging.old / agingTotal) * 100}%`, backgroundColor: '#F97316' }} />
          <View style={{ width: `${(aging.stale / agingTotal) * 100}%`, backgroundColor: '#EF4444' }} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {[{ l: '0–30d', v: aging.fresh, c: '#22C55E' }, { l: '31–60d', v: aging.aging, c: '#F59E0B' }, { l: '61–90d', v: aging.old, c: '#F97316' }, { l: '90d+', v: aging.stale, c: '#EF4444' }].map((s) => (
            <View key={s.l} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: s.c }} />
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>{s.l}: {s.v}</Text>
            </View>
          ))}
        </View>
      </View>

      {analytics.batchDistribution.length > 0 && (
        <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>Batch Distribution</Text>
          {analytics.batchDistribution.map((b) => (
            <View key={b.batchId} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>{b.batchNumber ?? b.batchId.slice(0, 8)}</Text>
              <Text style={{ fontSize: 12, color: colors.text }}>{b.remainingQty} @ {formatPHP(b.unitCost)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}