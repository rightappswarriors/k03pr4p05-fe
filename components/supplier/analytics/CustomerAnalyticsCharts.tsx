import React, { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { LineChart } from 'react-native-chart-kit'
import { useTheme } from '@/contexts/ThemeContext'
import type { CustomerAnalytics } from '@/services/supplierService/supplierCustomerAnalytics'

const php = (value: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value)

function SummaryValue({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme()
  return <View style={{ flex: 1, minWidth: 105, padding: 10, gap: 4, borderWidth: 1, borderColor: colors.border, borderRadius: 9 }}>
    <Text style={{ color: colors.textSecondary, fontSize: 10 }}>{label}</Text>
    <Text style={{ color: colors.text, fontSize: 14, fontWeight: '800' }}>{value}</Text>
  </View>
}

export function CustomerRevenueTrend({ points, totalRevenue, uniqueCustomers }: {
  points: CustomerAnalytics['revenueTrend']; totalRevenue: number; uniqueCustomers: number
}) {
  const { colors } = useTheme()
  const [width, setWidth] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [showValues, setShowValues] = useState(false)
  const active = selected === null ? null : points[selected]
  const stride = Math.max(1, Math.ceil(points.length / (width < 400 ? 5 : 7)))
  const maxCustomers = Math.max(1, ...points.map(point => point.activeCustomers))
  const hasRevenue = points.some(point => point.revenue > 0)
  const activePeriods = points.filter(point => point.revenue > 0 || point.activeCustomers > 0).length
  const compact = width > 0 && width < 440
  return <View onLayout={event => setWidth(event.nativeEvent.layout.width)} style={{ minWidth: 0, gap: 12 }}>
    <Text style={{ color: colors.primary, fontSize: 12 }}>Gross customer revenue · PHP</Text>
    {width > 0 && points.length > 0 && <View style={{ overflow: 'hidden' }} accessibilityLabel="Gross customer revenue in PHP. Active-customer counts use a separate scale below.">
      <LineChart width={width} height={215} fromZero withOuterLines={false} withVerticalLines={false} withShadow={hasRevenue} withDots={hasRevenue}
        yAxisLabel="₱" yAxisSuffix="" segments={4} formatYLabel={value => Number(value) >= 1000 ? `${(Number(value) / 1000).toFixed(0)}k` : Number(value).toFixed(0)}
        data={{ labels: points.map((point, index) => index % stride === 0 ? new Date(`${point.bucket}T12:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : ''), datasets: [{ data: points.map(point => point.revenue), color: () => '#168CFF' }] }}
        chartConfig={{ backgroundGradientFrom: colors.surface, backgroundGradientTo: colors.surface, color: () => '#168CFF', labelColor: () => colors.textSecondary,
          decimalPlaces: 0, propsForBackgroundLines: { stroke: colors.border }, propsForLabels: { fontSize: width < 400 ? 10 : 11 }, useShadowColorFromDataset: true, fillShadowGradientOpacity: 0.12 }}
        getDotProps={(_value, index) => ({ r: points[index]?.revenue > 0 ? 3 : 0 })} onDataPointClick={({ index }) => setSelected(index)} />
    </View>}
    <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Unique active customers · separate count scale</Text>
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 44 }}>
      {points.map((point, index) => <Pressable key={point.bucket} onPress={() => setSelected(index)} accessibilityLabel={`${point.bucket}: ${point.activeCustomers} active customers`}
        style={{ flex: 1, minWidth: 2, height: 44, justifyContent: 'flex-end' }}><View style={{ height: point.activeCustomers > 0 ? Math.max(3, point.activeCustomers / maxCustomers * 40) : 0, backgroundColor: '#00D8A4', borderRadius: 2 }} /></Pressable>)}
    </View>
    <View accessibilityLabel={`${activePeriods} active periods. Total revenue ${php(totalRevenue)}. ${uniqueCustomers} active customers.`} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <SummaryValue label="Active periods" value={activePeriods.toLocaleString('en-PH')} />
      <SummaryValue label="Total revenue" value={php(totalRevenue)} />
      <SummaryValue label="Active customers" value={uniqueCustomers.toLocaleString('en-PH')} />
    </View>
    <Text accessibilityLiveRegion="polite" style={{ minHeight: 20, color: colors.textSecondary, fontSize: 12 }}>
      {activePeriods === 0 ? 'No customer purchase activity in this period.' : activePeriods === 1 && active === null ? 'Only one period had customer purchase activity.' : active ? `${active.bucket} · ${php(active.revenue)} · ${active.activeCustomers} active customers` : 'Select a point or activity bar to inspect its period.'}
    </Text>
    <Pressable accessibilityRole="button" onPress={() => setShowValues(!showValues)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: colors.primary, fontSize: 12 }}>{showValues ? 'Hide' : 'Show'} all period values</Text></Pressable>
    {showValues && <ScrollView nestedScrollEnabled style={{ maxHeight: compact ? 260 : 220 }} contentContainerStyle={{ gap: 6 }}>
      {points.map(point => <View key={point.bucket} style={{ flexDirection: compact ? 'column' : 'row', justifyContent: 'space-between', gap: compact ? 3 : 12, paddingVertical: 6, borderBottomWidth: 1, borderColor: colors.border }}>
        <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{point.bucket}</Text><Text style={{ color: colors.text, fontSize: 11 }}>{php(point.revenue)} · {point.activeCustomers} active customers</Text>
      </View>)}
    </ScrollView>}
  </View>
}

export function CustomerLifecycleTrend({ points, newCustomers, returningCustomers, repeatCustomerRate }: {
  points: CustomerAnalytics['lifecycleTrend']; newCustomers: number; returningCustomers: number; repeatCustomerRate: number | null
}) {
  const { colors } = useTheme()
  const [width, setWidth] = useState(0)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [selected, setSelected] = useState<number | null>(null)
  const activePoints = points.filter(point => point.newCustomers > 0 || point.returningCustomers > 0)
  const detailPoints = showAll ? points : activePoints
  const max = Math.max(1, ...points.flatMap(point => [point.newCustomers, point.returningCustomers]))
  const stride = Math.max(1, Math.ceil(points.length / (width < 400 ? 5 : 7)))
  const compact = width > 0 && width < 440
  const active = selected === null ? null : points[selected]
  return <View onLayout={event => setWidth(event.nativeEvent.layout.width)} style={{ minWidth: 0, gap: 12 }}>
    <View accessibilityLabel={`${newCustomers} new customers. ${returningCustomers} returning customers. Repeat customer rate ${repeatCustomerRate === null ? 'unavailable' : `${repeatCustomerRate.toFixed(1)} percent`}.`} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <SummaryValue label="New" value={newCustomers.toLocaleString('en-PH')} />
      <SummaryValue label="Returning" value={returningCustomers.toLocaleString('en-PH')} />
      <SummaryValue label="Repeat rate" value={repeatCustomerRate === null ? '—' : `${repeatCustomerRate.toFixed(1)}%`} />
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}><Text style={{ color: '#168CFF', fontSize: 12 }}>● New</Text><Text style={{ color: '#00D8A4', fontSize: 12 }}>● Returning</Text></View>
    {activePoints.length ? <View accessibilityLabel="New and returning customer activity by period" style={{ height: 142, flexDirection: 'row', alignItems: 'flex-end', gap: 3, borderBottomWidth: 1, borderColor: colors.border }}>
      {points.map((point, index) => <Pressable key={point.bucket} onPress={() => setSelected(index)} accessibilityLabel={`${point.bucket}: ${point.newCustomers} new and ${point.returningCustomers} returning customers`}
        style={{ flex: 1, minWidth: 3, height: 142, justifyContent: 'flex-end', alignItems: 'center' }}>
        <View style={{ height: 112, width: '100%', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 1 }}>
          <View style={{ flex: 1, maxWidth: 12, height: point.newCustomers > 0 ? Math.max(3, point.newCustomers / max * 108) : 0, backgroundColor: '#168CFF', borderTopLeftRadius: 3, borderTopRightRadius: 3 }} />
          <View style={{ flex: 1, maxWidth: 12, height: point.returningCustomers > 0 ? Math.max(3, point.returningCustomers / max * 108) : 0, backgroundColor: '#00D8A4', borderTopLeftRadius: 3, borderTopRightRadius: 3 }} />
        </View>
        <Text numberOfLines={1} style={{ height: 24, color: colors.textSecondary, fontSize: compact ? 9 : 10 }}>{index % stride === 0 || index === points.length - 1 ? new Date(`${point.bucket}T12:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : ''}</Text>
      </Pressable>)}
    </View> : <Text style={{ color: colors.textSecondary, textAlign: 'center', paddingVertical: 24 }}>No customer purchase activity in this period.</Text>}
    {active && <Text accessibilityLiveRegion="polite" style={{ color: colors.textSecondary, fontSize: 12 }}>{active.bucket} · {active.newCustomers} new · {active.returningCustomers} returning</Text>}
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: detailsOpen }} onPress={() => setDetailsOpen(!detailsOpen)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: colors.primary, fontSize: 12 }}>{detailsOpen ? 'Hide period details' : 'View period details'}</Text></Pressable>
    {detailsOpen && <View style={{ gap: 8 }}>
      {!activePoints.length && !showAll && <Text style={{ color: colors.textSecondary, fontSize: 12 }}>No customer purchase activity in this period.</Text>}
      <Pressable accessibilityRole="button" onPress={() => setShowAll(!showAll)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: colors.primary, fontSize: 12 }}>{showAll ? 'Show active periods' : 'Show all periods'}</Text></Pressable>
      <ScrollView nestedScrollEnabled style={{ maxHeight: compact ? 260 : 220 }} contentContainerStyle={{ gap: 6 }}>
        {detailPoints.map(point => <View key={point.bucket} style={{ flexDirection: compact ? 'column' : 'row', justifyContent: 'space-between', gap: compact ? 3 : 12, paddingVertical: 6, borderBottomWidth: 1, borderColor: colors.border }}>
          <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{point.bucket}</Text><Text style={{ color: colors.text, fontSize: 11 }}>{point.newCustomers} new · {point.returningCustomers} returning</Text>
        </View>)}
      </ScrollView>
    </View>}
  </View>
}
