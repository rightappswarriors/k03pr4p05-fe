import React from 'react'
import { Text, View } from 'react-native'
import { BarChart3, Wallet, Receipt, ShoppingCart } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { InsightCard } from '@/components/Kpi'
import { SkeletonBox } from '@/components/LoadingSkeleton'
import { averageOrderValue, comparisonLabel, type SupplierAnalyticsData } from '@/services/supplierService/supplierAnalyticsService'
import { RevenueTrendChart } from './AnalyticsCharts'

const php = (value: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value)

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const { colors } = useTheme()
  return <View style={{ flexGrow: 1, minWidth: 0, padding: 18, gap: 16, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
    <View style={{ gap: 5 }}><Text style={{ color: colors.text, fontSize: 15, fontWeight: '800' }}>{title}</Text><Text style={{ color: colors.textSecondary, fontSize: 12 }}>{subtitle}</Text></View>
    {children}
  </View>
}

export default function SalesRevenue({ data, loading, width, recentOrders }: {
  data: SupplierAnalyticsData | null; loading: boolean; width: number; recentOrders: React.ReactNode
}) {
  const { colors } = useTheme()
  const wide = width >= 1050
  const columns = wide ? 4 : width >= 600 ? 2 : 1
  const body = { color: colors.textSecondary, fontSize: 12 } as const
  if (loading) return <>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6, rowGap: 12 }}>
      {[0, 1, 2, 3].map(i => <View key={i} style={{ width: `${100 / columns}%`, paddingHorizontal: 6 }}><SkeletonBox style={{ height: 154 }} /></View>)}
    </View>
    <SkeletonBox style={{ height: 340 }} /><SkeletonBox style={{ height: 310 }} /><SkeletonBox style={{ height: 260 }} /><SkeletonBox style={{ height: 220 }} /><SkeletonBox style={{ height: 300 }} />
  </>
  if (!data) return null
  const metrics = [
    { label: 'Gross Sales', value: data.kpis.grossSales, previous: data.previousKpis.grossSales, icon: BarChart3, color: '#00C997' },
    { label: 'Net Earnings', value: data.kpis.netEarnings, previous: data.previousKpis.netEarnings, icon: Wallet, color: '#168CFF' },
    { label: 'Platform Fees', value: data.kpis.platformFees, previous: data.previousKpis.platformFees, icon: Receipt, color: '#FB7185' },
    { label: 'Average Order Value', value: averageOrderValue(data.kpis), previous: averageOrderValue(data.previousKpis), icon: ShoppingCart, color: '#A78BFA' },
  ]
  const chartKey = data.range.startDate + data.range.endDate + data.search
  const bucketLabel = (bucket: string) => {
    const end = new Date(`${bucket}T00:00:00Z`)
    if (data.interval === 'WEEKLY') end.setUTCDate(end.getUTCDate() + 6)
    if (data.interval === 'MONTHLY') { end.setUTCMonth(end.getUTCMonth() + 1); end.setUTCDate(0) }
    const first = bucket < data.range.startDate ? data.range.startDate : bucket
    const last = end.toISOString().slice(0, 10) > data.range.endDate ? data.range.endDate : end.toISOString().slice(0, 10)
    return first === last ? first : `${first} – ${last}`
  }
  return <>
    <Text style={body}>{data.environment} · Asia/Manila · {data.range.startDate} – {data.range.endDate} · Compared with {data.comparisonRange.startDate} – {data.comparisonRange.endDate}</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6, rowGap: 12 }}>{metrics.map(metric => <View key={metric.label} style={{ width: `${100 / columns}%`, paddingHorizontal: 6 }}>
      <InsightCard title={metric.label} value={metric.value === null ? '—' : php(metric.value)} valueFontSize={wide ? 20 : 24} icon={metric.icon} accent={metric.color}
        subtitleColor={colors.textSecondary} subtitle={metric.value === null ? 'No settled orders in this period' : metric.previous === null ? 'No settled orders in previous period' : `${comparisonLabel(metric.value, metric.previous)} · vs. previous period`} />
    </View>)}</View>
    <Text style={body}>Revenue is recognised on settlement. Average Order Value = gross sales ÷ settled orders; unavailable when no orders settled.</Text>
    {!data.kpis.settledOrders && <Panel title="No settled sales" subtitle="No settled orders match these dates and search."><Text style={body}>Try a different range or clear your search.</Text></Panel>}
    <View style={{ flexDirection: wide ? 'row' : 'column', gap: 14 }}>
      <View style={{ flex: wide ? 3 : undefined, minWidth: 0 }}><Panel title="Revenue Trend" subtitle={`Gross sales and net earnings · ${data.interval.toLowerCase()} · bucket start labels`}>
        <RevenueTrendChart key={chartKey} points={data.revenueTrend} />
      </Panel></View>
      <View style={{ flex: wide ? 2 : undefined, minWidth: 0 }}><Panel title="Gross vs Net" subtitle="Selected period · shared PHP scale">
        {[{ label: 'Gross Sales', value: data.kpis.grossSales, color: '#168CFF' }, { label: 'Net Earnings', value: data.kpis.netEarnings, color: '#00D8A4' }].map(row => <View key={row.label} style={{ gap: 10 }}>
          <Text style={body}>{row.label}</Text><Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>{php(row.value)}</Text>
          <View accessibilityLabel={`${row.label}: ${php(row.value)}`} style={{ height: 16, borderRadius: 8, backgroundColor: colors.border, overflow: 'hidden' }}><View style={{ height: 16, backgroundColor: row.color, width: `${Math.max(0, row.value) / (Math.max(data.kpis.grossSales, data.kpis.netEarnings, 0) || 1) * 100}%` }} /></View>
        </View>)}
        <Text style={body}>Platform fees: {php(data.kpis.platformFees)}</Text>
      </Panel></View>
    </View>
    <Panel title="Platform Fee Trend" subtitle={`Recorded settlement fees · ${data.interval.toLowerCase()} · PHP`}><RevenueTrendChart key={`fees-${chartKey}`} points={data.revenueTrend} feesOnly /></Panel>
    <Panel title="Sales by Period" subtitle="Manila calendar periods, clipped to your selected dates. Periods without settlements show zero amounts.">
      {wide && <View style={{ flexDirection: 'row', gap: 12 }}>{['Period', 'Settled orders', 'Gross sales', 'Platform fees', 'Net earnings', 'Average order value'].map(label => <Text key={label} style={{ ...body, flex: label === 'Period' ? 1.5 : 1, fontWeight: '700' }}>{label}</Text>)}</View>}
      {data.revenueTrend.map(point => {
        const aov = averageOrderValue(point)
        const values = [['Settled orders', point.settledOrders.toLocaleString('en-PH')], ['Gross sales', php(point.grossSales)], ['Platform fees', php(point.platformFees)], ['Net earnings', php(point.netEarnings)], ['Average order value', aov === null ? '—' : php(aov)]]
        return <View key={point.bucket} style={{ flexDirection: wide ? 'row' : 'column', gap: 12, paddingVertical: 14, borderTopWidth: 1, borderColor: colors.border }}>
          <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700', flex: wide ? 1.5 : undefined }}>{bucketLabel(point.bucket)}</Text>
          {values.map(([label, value]) => wide ? <Text key={label} style={{ color: colors.text, fontSize: 12, flex: 1 }}>{value}</Text> : <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}><Text style={body}>{label}</Text><Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>{value}</Text></View>)}
        </View>
      })}
    </Panel>
    <Panel title="Settlement / Revenue Breakdown" subtitle={`${data.kpis.settledOrders.toLocaleString('en-PH')} settled orders in the selected period`}>
      {[['Gross sales', data.kpis.grossSales], ['Less: platform fees', data.kpis.platformFees], ['Net earnings', data.kpis.netEarnings]].map(([label, value]) => <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}><Text style={body}>{label}</Text><Text style={{ color: colors.text, fontWeight: '700' }}>{php(Number(value))}</Text></View>)}
      <Text style={body}>Gross sales − platform fees = net earnings. Amounts come from recorded settlements; wallet balances and withdrawals do not change historical earnings.</Text>
    </Panel>
    <Panel title="Recent Settled Orders" subtitle="Latest 5 settlements matching your dates and search · status shows the current order status">{recentOrders}</Panel>
  </>
}
