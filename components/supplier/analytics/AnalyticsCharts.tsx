import React, { useState } from 'react'
import { Platform, Pressable, Text, View } from 'react-native'
import { LineChart } from 'react-native-chart-kit'
import { PieChart } from 'react-native-gifted-charts'
import { useTheme } from '@/contexts/ThemeContext'
import { LineGraph } from '@/components/LineGraph'
import type { AnalyticsTrend } from '@/services/supplierService/supplierAnalyticsService'
import { formatManilaBucketLabel, normalizePayoutActivity } from './payoutActivityLine'

export const analyticsPalette = ['#168CFF', '#00D8A4', '#8B5CF6', '#FBBF24', '#FB7185', '#94A3B8']
const php = (value: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value)

export function RevenueTrendChart({ points, feesOnly = false }: { points: AnalyticsTrend[]; feesOnly?: boolean }) {
  const { colors } = useTheme()
  const [width, setWidth] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const active = selected === null ? null : points[selected]
  const labelTarget = width < 400 ? (feesOnly ? 5 : 3) : (feesOnly ? 7 : 5)
  const stride = Math.max(1, Math.ceil(points.length / labelTarget))
  const series = feesOnly
    ? [{ label: 'Platform Fees', key: 'platformFees' as const, color: analyticsPalette[4] }]
    : [{ label: 'Gross Sales', key: 'grossSales' as const, color: analyticsPalette[0] }, { label: 'Net Earnings', key: 'netEarnings' as const, color: analyticsPalette[1] }]
  const hasSales = points.some(p => series.some(s => p[s.key] !== 0))
  return <View style={{ gap: 12, minWidth: 0 }} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 14 }}>
      {series.map(s => <Text key={s.key} style={{ color: s.color, fontSize: 12 }}>● {s.label}{feesOnly ? ' · PHP' : ''}</Text>)}
    </View>
    {width > 0 && points.length > 0 && <View accessibilityLabel={`${feesOnly ? 'Platform fees' : 'Gross sales and net earnings'} in PHP. Select a point for period values.`} style={{ overflow: 'hidden' }}>
      <LineChart width={width} height={220} fromZero segments={4} withOuterLines={false} withVerticalLines={false}
        withShadow={hasSales} withDots={hasSales} yAxisLabel="₱" yAxisSuffix=""
        formatYLabel={value => Number(value) >= 1000 ? `${(Number(value) / 1000).toFixed(0)}k` : Number(value).toFixed(0)}
        data={{ labels: points.map((p, i) => i % stride === 0 ? new Date(`${p.bucket}T12:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : ''),
          datasets: series.map(s => ({ data: points.map(p => p[s.key]), color: () => s.color })) }}
        chartConfig={{ backgroundGradientFrom: colors.surface, backgroundGradientTo: colors.surface, color: () => colors.primary,
          labelColor: () => colors.textSecondary, decimalPlaces: 0, propsForBackgroundLines: { stroke: colors.border },
          propsForLabels: { fontSize: width < 400 ? 10 : 11 }, useShadowColorFromDataset: true, fillShadowGradientOpacity: 0.12 }}
        getDotProps={(_, index) => ({ r: feesOnly && points[index].platformFees === 0 ? 0 : 3, ...(Platform.OS === 'web' ? { onMouseEnter: () => setSelected(index), onFocus: () => setSelected(index), tabIndex: 0, 'aria-label': `${points[index].bucket}: ${series.map(s => `${s.label} ${php(points[index][s.key])}`).join(', ')}` } : {}) })}
        onDataPointClick={({ index }) => setSelected(index)} />
    </View>}
    <Text accessibilityLiveRegion="polite" style={{ minHeight: 32, color: colors.textSecondary, fontSize: 12 }}>
      {!hasSales ? (feesOnly ? 'No settled fee activity in this period.' : 'No settled sales in this period.') : active
        ? feesOnly ? `${active.bucket} · Fees ${php(active.platformFees)} · Gross ${php(active.grossSales)} · Net ${php(active.netEarnings)} · ${active.settledOrders} settlements` : `${active.bucket} · Gross ${php(active.grossSales)} · Net ${php(active.netEarnings)} · Fees ${php(active.platformFees)}`
        : 'Select or hover over a point to inspect its period.'}
    </Text>
  </View>
}

export function PayoutActivityTrendChart({ points }: { points: { bucket: string; requestedCount: number; requestedAmount: number; completedCount: number; completedAmount: number }[] }) {
  const normalized = normalizePayoutActivity(points)
  return <LineGraph points={normalized} series={[{ key: 'requested', label: 'Requested · count', color: analyticsPalette[2], value: point => point.requestedCount }, { key: 'completed', label: 'Completed · count', color: analyticsPalette[1], value: point => point.completedCount }]} labelForPoint={point => formatManilaBucketLabel(point.bucket)} detailForPoint={point => point ? `${formatManilaBucketLabel(point.bucket)} · ${point.requestedCount} requested (${php(point.requestedAmount)}) · ${point.completedCount} completed (${php(point.completedAmount)})` : 'Select or hover over a point to inspect its count and amount.'} emptyMessage="No payout activity in this period." accessibilityLabel="Requested and completed payout counts by Manila date. Select a point for amounts." />
}

export function AnalyticsDonut({ rows, center, caption, money = false }: {
  rows: { label: string; value: number; percentage: number }[]; center: string; caption: string; money?: boolean
}) {
  const { colors } = useTheme()
  const [width, setWidth] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const positive = rows.some(row => row.value > 0)
  const radius = Math.max(55, Math.min(84, (width - 24) / 2))
  return <View onLayout={e => setWidth(e.nativeEvent.layout.width)} style={{ gap: 18, minWidth: 0 }}>
    <View style={{ alignItems: 'center', paddingVertical: 4 }} accessibilityLabel={`${caption}: ${center}`}>
      {positive && width > 0 ? <PieChart donut radius={radius} innerRadius={radius * 0.72} innerCircleColor={colors.surface}
        data={rows.map((row, i) => ({ value: Math.max(0, row.value), color: analyticsPalette[i % analyticsPalette.length], onPress: () => setSelected(i) }))}
        centerLabelComponent={() => <View style={{ alignItems: 'center', width: radius * 1.35 }}><Text adjustsFontSizeToFit numberOfLines={1} style={{ color: colors.text, fontWeight: '800', fontSize: 15 }}>{center}</Text><Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 5 }}>{caption}</Text></View>} />
        : <View style={{ width: 132, height: 132, borderRadius: 66, borderWidth: 14, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>0</Text><Text style={{ color: colors.textSecondary, fontSize: 11 }}>{caption}</Text></View>}
    </View>
    <View style={{ gap: 3 }}>
      {rows.map((row, i) => <Pressable key={row.label + i} onPress={() => setSelected(i)} onHoverIn={() => setSelected(i)} accessibilityRole="button"
        accessibilityLabel={`${row.label}: ${money ? php(row.value) : row.value}, ${row.percentage.toFixed(1)} percent`}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 36, borderRadius: 6, backgroundColor: selected === i ? colors.card : 'transparent', paddingHorizontal: 4 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: analyticsPalette[i % analyticsPalette.length] }} />
        <Text style={{ flex: 1, color: colors.textSecondary, fontSize: 12 }}>{row.label}</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{row.percentage.toFixed(1)}%</Text>
        <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>{money ? php(row.value) : row.value}</Text>
      </Pressable>)}
    </View>
  </View>
}
