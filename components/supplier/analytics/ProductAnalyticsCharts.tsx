import React, { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { LineChart } from 'react-native-chart-kit'
import { useTheme } from '@/contexts/ThemeContext'
import type { ProductAnalytics } from '@/services/supplierService/supplierProductAnalytics'

const php = (value: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value)

export function ProductRevenueTrend({ points }: { points: ProductAnalytics['trend'] }) {
  const { colors } = useTheme()
  const [width, setWidth] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [showValues, setShowValues] = useState(false)
  const active = selected === null ? null : points[selected]
  const stride = Math.max(1, Math.ceil(points.length / (width < 400 ? 3 : 5)))
  const maxQuantity = Math.max(1, ...points.map(p => p.quantity))
  const hasRevenue = points.some(p => p.revenue > 0)
  return <View onLayout={e => setWidth(e.nativeEvent.layout.width)} style={{ minWidth: 0, gap: 12 }}>
    <Text style={{ color: colors.primary, fontSize: 12 }}>Allocated revenue · PHP</Text>
    {width > 0 && points.length > 0 && <View style={{ overflow: 'hidden' }} accessibilityLabel="Product revenue in PHP. Period values are also available below.">
      <LineChart width={width} height={220} fromZero withOuterLines={false} withVerticalLines={false} withShadow={hasRevenue} withDots={hasRevenue}
        yAxisLabel="₱" yAxisSuffix="" segments={4} formatYLabel={value => Number(value) >= 1000 ? `${(Number(value) / 1000).toFixed(0)}k` : Number(value).toFixed(0)}
        data={{ labels: points.map((p, i) => i % stride === 0 ? p.bucket.slice(5) : ''), datasets: [{ data: points.map(p => p.revenue) }] }}
        chartConfig={{ backgroundGradientFrom: colors.surface, backgroundGradientTo: colors.surface, color: () => colors.primary, labelColor: () => colors.textSecondary,
          propsForBackgroundLines: { stroke: colors.border }, propsForLabels: { fontSize: 10 }, fillShadowGradientOpacity: 0.12 }}
        onDataPointClick={({ index }) => setSelected(index)} />
    </View>}
    {!hasRevenue && <Text style={{ color: colors.textSecondary, fontSize: 12 }}>No settled product sales in this period.</Text>}
    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Quantity volume · separate scale · saved line counts</Text>
    <View style={{ flexDirection: 'row', height: 80, gap: 2 }}>
      {points.map((p, i) => <Pressable key={p.bucket} onPress={() => setSelected(i)} onHoverIn={() => setSelected(i)} accessibilityRole="button"
        accessibilityLabel={`${p.bucket}: ${p.quantity} quantity, ${php(p.revenue)}, ${p.settledOrders} settled orders`}
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: colors.card, borderRadius: 3 }}>
        <View style={{ height: `${p.quantity / maxQuantity * 100}%`, backgroundColor: selected === i ? colors.primary : '#00C997', borderRadius: 3 }} />
      </Pressable>)}
    </View>
    <Text accessibilityLiveRegion="polite" style={{ color: colors.textSecondary, fontSize: 12, minHeight: 32 }}>{active
      ? `${active.bucket} · ${php(active.revenue)} · Quantity ${active.quantity.toLocaleString('en-PH')} · ${active.settledOrders} settled orders`
      : 'Select a revenue point or quantity bar for period values. Labels mark calendar bucket starts; edge periods may be partial.'}</Text>
    <Pressable onPress={() => setShowValues(!showValues)} accessibilityRole="button" accessibilityState={{ expanded: showValues }} style={{ minHeight: 44, justifyContent: 'center' }}>
      <Text style={{ color: colors.primary, fontSize: 12 }}>{showValues ? 'Hide' : 'Show'} all period values</Text>
    </Pressable>
    {showValues && points.map(p => <Text key={p.bucket} style={{ color: colors.textSecondary, fontSize: 12 }}>{p.bucket} · {php(p.revenue)} · Quantity {p.quantity.toLocaleString('en-PH')} · {p.settledOrders} orders</Text>)}
  </View>
}
