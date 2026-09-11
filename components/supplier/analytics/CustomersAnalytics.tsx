import React, { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { BarChart3, Percent, RotateCcw, ShoppingCart, UserPlus, Users } from 'lucide-react-native'
import { InsightCard } from '@/components/Kpi'
import { SkeletonBox } from '@/components/LoadingSkeleton'
import { useTheme } from '@/contexts/ThemeContext'
import type { CustomerOptions, CustomerPerformance, CustomerSort } from '@/services/supplierService/supplierCustomerAnalytics'
import { comparisonLabel, type SupplierAnalyticsData } from '@/services/supplierService/supplierAnalyticsService'
import { AnalyticsDonut } from './AnalyticsCharts'
import { CustomerLifecycleTrend, CustomerRevenueTrend } from './CustomerAnalyticsCharts'

const php = (value: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value)
const number = (value: number) => value.toLocaleString('en-PH', { maximumFractionDigits: 2 })
const date = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
const SORTS: { key: CustomerSort; label: string }[] = [
  { key: 'REVENUE', label: 'Revenue' }, { key: 'NET', label: 'Net earnings' }, { key: 'ORDERS', label: 'Orders' },
  { key: 'AVERAGE', label: 'Average value' }, { key: 'CONTRIBUTION', label: 'Contribution' },
  { key: 'LATEST_PURCHASE', label: 'Latest purchase' }, { key: 'FIRST_PURCHASE', label: 'First purchase' },
]

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const { colors } = useTheme()
  return <View style={{ flexGrow: 1, minWidth: 0, backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 18, gap: 16 }}>
    <View style={{ gap: 5 }}><Text style={{ color: colors.text, fontSize: 15, fontWeight: '800' }}>{title}</Text>{subtitle && <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{subtitle}</Text>}</View>{children}
  </View>
}
function Empty({ children }: { children: string }) {
  const { colors } = useTheme()
  return <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 13, paddingVertical: 24 }}>{children}</Text>
}
function Choice({ label, onPress, selected = false, disabled = false }: { label: string; onPress: () => void; selected?: boolean; disabled?: boolean }) {
  const { colors } = useTheme()
  return <Pressable accessibilityRole="button" accessibilityState={{ selected, disabled }} onPress={onPress} disabled={disabled}
    style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: selected ? colors.primaryLight : colors.surface, opacity: disabled ? 0.5 : 1 }}>
    <Text style={{ color: colors.text, fontSize: 12 }}>{label}</Text>
  </Pressable>
}

function CustomerRows({ rows, table, ranked = false }: { rows: CustomerPerformance[]; table: boolean; ranked?: boolean }) {
  const { colors } = useTheme()
  const labels = ranked ? ['Customer', 'Type / status', 'Revenue', 'Orders', 'Average value', 'Contribution', 'Trend']
    : ['Customer', 'Type / status', 'Revenue', 'Net', 'Fees', 'Orders', 'Average value', 'First purchase', 'Latest purchase', 'Contribution', 'Trend']
  const widths = ranked ? [1.6, 1, 1, 0.55, 1, 0.75, 0.9] : [1.5, 1, 1, 1, 0.8, 0.55, 1, 0.85, 0.85, 0.75, 0.9]
  return <View style={{ gap: table ? 0 : 12 }}>
    {table && <View style={{ flexDirection: 'row', gap: 8, paddingBottom: 12 }}>{labels.map((label, index) => <Text key={label} style={{ color: colors.textSecondary, fontWeight: '700', fontSize: 10, flex: widths[index] }}>{label}</Text>)}</View>}
    {rows.map((customer, index) => {
      const identity = `${customer.customerType === 'ORGANIZATION' ? 'Organization' : 'Agent'} · ${customer.status === 'NEW' ? 'New' : 'Returning'}`
      const values = ranked ? [customer.displayName, identity, php(customer.revenue), number(customer.settledOrders), php(customer.averageOrderValue), `${customer.contribution.toFixed(1)}%`, comparisonLabel(customer.revenue, customer.previousRevenue)]
        : [customer.displayName, identity, php(customer.revenue), php(customer.netEarnings), php(customer.fees), number(customer.settledOrders), php(customer.averageOrderValue), date(customer.firstPurchase), date(customer.latestPurchase), `${customer.contribution.toFixed(1)}%`, comparisonLabel(customer.revenue, customer.previousRevenue)]
      return table ? <View key={customer.customerKey} style={{ flexDirection: 'row', gap: 8, borderTopWidth: 1, borderColor: colors.border, paddingVertical: 16 }}>
        {values.map((value, cell) => <Text key={cell} style={{ color: colors.text, fontSize: 11, flex: widths[cell] }}>{ranked && cell === 0 ? `#${index + 1} ${value}` : value}</Text>)}
      </View> : <View key={customer.customerKey} style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 10 }}>
        <Text style={{ color: colors.text, fontWeight: '800', fontSize: 14 }}>{ranked ? `#${index + 1} ` : ''}{customer.displayName}</Text><Text style={{ color: colors.textSecondary, fontSize: 12 }}>{identity}</Text>
        {values.slice(2).map((value, valueIndex) => <View key={valueIndex} style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}><Text style={{ color: colors.textSecondary, fontSize: 12 }}>{labels[valueIndex + 2]}</Text><Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>{value}</Text></View>)}
      </View>
    })}
  </View>
}

export default function CustomersAnalytics({ data, loading, busy, width, options, onOptionsChange }: {
  data: SupplierAnalyticsData | null; loading: boolean; busy: boolean; width: number
  options: CustomerOptions; onOptionsChange: (next: Partial<CustomerOptions>) => void
}) {
  const { colors } = useTheme()
  const [allMetrics, setAllMetrics] = useState(false)
  const mobile = width < 680
  const wide = width >= 1100
  const columns = width >= 1250 ? 6 : width >= 680 ? 3 : width >= 440 ? 2 : 1
  const body = { color: colors.textSecondary, fontSize: 12 } as const
  if (loading) return <><View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6, rowGap: 12 }}>{Array.from({ length: mobile ? 4 : 6 }, (_, i) => <View key={i} style={{ width: `${100 / columns}%`, paddingHorizontal: 6 }}><SkeletonBox style={{ height: 154 }} /></View>)}</View><SkeletonBox style={{ height: 420 }} /><SkeletonBox style={{ height: 330 }} /><SkeletonBox style={{ height: 410 }} /></>
  if (!data) return null
  const customers = data.customerAnalytics
  const current = customers.metrics
  const previous = customers.previousMetrics
  const metrics = [
    { key: 'uniqueCustomers', label: 'Unique Customers', icon: Users, kind: 'number' }, { key: 'newCustomers', label: 'New Customers', icon: UserPlus, kind: 'number' },
    { key: 'returningCustomers', label: 'Returning Customers', icon: RotateCcw, kind: 'number' }, { key: 'revenue', label: 'Customer Revenue', icon: BarChart3, kind: 'money' },
    { key: 'averageOrderValue', label: 'Average Order Value', icon: ShoppingCart, kind: 'money' }, { key: 'repeatCustomerRate', label: 'Repeat Customer Rate', icon: Percent, kind: 'percent' },
  ] as const
  const page = customers.performance
  const chartKey = data.range.startDate + data.range.endDate + data.search
  return <>
    <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>Customers Analytics</Text>
    <Text style={body}>{data.environment} · Asia/Manila · {data.range.startDate} – {data.range.endDate} · Compared with {data.comparisonRange.startDate} – {data.comparisonRange.endDate}</Text>
    {customers.diagnostics.length > 0 && <Panel title="Some settlements have no resolvable customer" subtitle="These amounts remain in settlement totals but are excluded from customer-level KPIs and rankings.">{customers.diagnostics.map(diagnostic => <Text key={diagnostic.period} style={body}>{diagnostic.period === 'current' ? 'Selected' : 'Previous'} period · {diagnostic.unresolvedSettlements} settlements · Gross {php(diagnostic.unresolvedGross)} · Fees {php(diagnostic.unresolvedFees)} · Net {php(diagnostic.unresolvedNet)}</Text>)}</Panel>}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6, rowGap: 12 }}>{metrics.slice(0, mobile && !allMetrics ? 4 : 6).map(metric => {
      const value = current[metric.key]
      const prior = previous[metric.key]
      const rendered = value === null ? '—' : metric.kind === 'money' ? php(value) : metric.kind === 'percent' ? `${value.toFixed(1)}%` : number(value)
      const subtitle = value === null ? 'Unavailable without customer activity' : prior === null ? 'Unavailable in previous period' : `${comparisonLabel(value, prior)} · vs. previous period`
      return <View key={metric.key} style={{ width: `${100 / columns}%`, paddingHorizontal: 6 }}><InsightCard title={metric.label} icon={metric.icon} accent={colors.primary} value={rendered} valueFontSize={columns === 6 ? 17 : columns >= 2 ? 18 : 24} subtitleColor={colors.textSecondary} subtitle={subtitle} /></View>
    })}</View>
    {mobile && <Choice label={allMetrics ? 'Show primary metrics' : 'View all metrics'} onPress={() => setAllMetrics(!allMetrics)} />}
    <Text style={body}>New means the first settled purchase from this supplier in this environment occurred in the selected period. Repeat Customer Rate = returning customers ÷ unique customers.</Text>
    <View style={{ flexDirection: wide ? 'row' : 'column', gap: 14 }}>
      <View style={{ flex: wide ? 3 : undefined, minWidth: 0 }}><Panel title="Customer Revenue Trend" subtitle={`${data.interval.toLowerCase()} · revenue and active-customer counts use separate scales`}><CustomerRevenueTrend key={chartKey} points={customers.revenueTrend} totalRevenue={current.revenue} uniqueCustomers={current.uniqueCustomers} /></Panel></View>
      <View style={{ flex: wide ? 2 : undefined, minWidth: 0 }}><Panel title="New vs Returning Customers" subtitle="Distinct customers in each period bucket · historically classified"><CustomerLifecycleTrend key={chartKey} points={customers.lifecycleTrend} newCustomers={current.newCustomers} returningCustomers={current.returningCustomers} repeatCustomerRate={current.repeatCustomerRate} /></Panel></View>
    </View>
    <View style={{ flexDirection: wide ? 'row' : 'column', gap: 14 }}>
      <View style={{ flex: wide ? 3 : undefined, minWidth: 0 }}><Panel title="Top Customers" subtitle="Top 5 by settled gross revenue · selected-period status and previous-period trend">{customers.topCustomers.length ? <CustomerRows rows={customers.topCustomers} table={width >= 1500} ranked /> : <Empty>No customer activity in this period.</Empty>}</Panel></View>
      <View style={{ flex: wide ? 2 : undefined, minWidth: 0 }}><Panel title="Revenue Contribution" subtitle="Top 5 customers + Others · share of resolvable settled customer revenue">{customers.contribution.length ? <AnalyticsDonut rows={customers.contribution.map(item => ({ label: item.name, value: item.amount, percentage: item.percentage }))} center={php(current.revenue)} caption="Customer revenue" money /> : <Empty>No customer activity in this period.</Empty>}</Panel></View>
    </View>
    <Panel title="Customer Concentration" subtitle="Share of resolvable settled customer revenue; informational only."><View style={{ flexDirection: mobile ? 'column' : 'row', gap: 12 }}>{([['Top 1 Customer Share', customers.concentration.top1Share], ['Top 3 Customer Share', customers.concentration.top3Share], ['Top 5 Customer Share', customers.concentration.top5Share]] as const).map(([label, value]) => <View key={label} style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 14, gap: 6 }}><Text style={body}>{label}</Text><Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>{value.toFixed(1)}%</Text></View>)}</View></Panel>
    <Panel title="Customer Performance" subtitle="Resolvable customers active in the selected period. First Purchase is lifetime within this supplier/environment; Latest Purchase is within the selected period.">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 6 }}>{SORTS.map(sort => <Choice key={sort.key} label={`Sort: ${sort.label}`} selected={options.customerSort === sort.key} disabled={busy} onPress={() => onOptionsChange({ customerSort: sort.key })} />)}</ScrollView>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}><Choice label={options.customerDirection === 'DESC' ? 'Descending ↓' : 'Ascending ↑'} disabled={busy} onPress={() => onOptionsChange({ customerDirection: options.customerDirection === 'DESC' ? 'ASC' : 'DESC' })} />{[20, 50, 100].map(limit => <Choice key={limit} label={`${limit} per page`} selected={options.customerLimit === limit} disabled={busy} onPress={() => onOptionsChange({ customerLimit: limit })} />)}</View>
      {busy && <Text accessibilityLiveRegion="polite" style={body}>Updating customer performance… Previous results remain visible.</Text>}
      {page.items.length ? <CustomerRows rows={page.items} table={width >= 1500} /> : <Empty>No customer performance data in this period.</Empty>}
      <Text style={body}>{number(page.total)} customers · Page {page.page} of {page.totalPages} · Export includes this loaded customer page.</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}><Choice label="Previous customer page" disabled={busy || page.page <= 1} onPress={() => onOptionsChange({ customerPage: page.page - 1 })} /><Choice label="Next customer page" disabled={busy || page.page >= page.totalPages} onPress={() => onOptionsChange({ customerPage: page.page + 1 })} /></View>
    </Panel>
  </>
}
