import React, { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { BarChart3, Package, ShoppingCart, TrendingUp, Receipt, PieChart } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { InsightCard } from '@/components/Kpi'
import { SkeletonBox } from '@/components/LoadingSkeleton'
import { comparisonLabel, type SupplierAnalyticsData } from '@/services/supplierService/supplierAnalyticsService'
import type { ProductOptions, ProductPerformance, ProductSort } from '@/services/supplierService/supplierProductAnalytics'
import { AnalyticsDonut } from './AnalyticsCharts'
import { ProductRevenueTrend } from './ProductAnalyticsCharts'

const php = (value: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value)
const number = (value: number) => value.toLocaleString('en-PH', { maximumFractionDigits: 2 })
const SORTS: { key: ProductSort; label: string }[] = [
  { key: 'REVENUE', label: 'Revenue' }, { key: 'NET', label: 'Net earnings' }, { key: 'QUANTITY', label: 'Quantity' },
  { key: 'ORDERS', label: 'Orders' }, { key: 'AVERAGE', label: 'Average value' }, { key: 'CONTRIBUTION', label: 'Contribution' },
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

function ProductRows({ rows, table, ranked = false }: { rows: ProductPerformance[]; table: boolean; ranked?: boolean }) {
  const { colors } = useTheme()
  const labels = ranked ? ['Rank / Product', 'SKU', 'Revenue', 'Quantity', 'Orders', 'Contribution', 'Revenue trend']
    : ['Product', 'SKU', 'Category', 'Revenue', 'Net earnings', 'Fees', 'Quantity', 'Orders', 'Avg selling value', 'Contribution', 'Revenue trend']
  const widths = ranked ? [1.6, 0.8, 1, 1, 0.5, 0.8, 1] : [1.5, 0.7, 0.9, 1, 1, 0.8, 0.8, 0.6, 1, 0.8, 1]
  return <View style={{ gap: table ? 0 : 12 }}>
    {table && <View style={{ flexDirection: 'row', gap: 8, paddingBottom: 12 }}>{labels.map((label, i) => <Text key={label} style={{ color: colors.textSecondary, fontSize: 10, fontWeight: '700', flex: widths[i] }}>{label}</Text>)}</View>}
    {rows.map((p, index) => {
      const quantity = `${number(p.quantity)} ${p.unit}`
      const trend = comparisonLabel(p.revenue, p.previousRevenue)
      const cells = ranked ? [`#${index + 1} ${p.name}`, p.sku || '—', php(p.revenue), quantity, number(p.settledOrders), `${p.contribution.toFixed(1)}%`, trend]
        : [p.name, p.sku || '—', p.category, php(p.revenue), php(p.netEarnings), php(p.fees), quantity, number(p.settledOrders), p.averageSellingValue === null ? '—' : php(p.averageSellingValue), `${p.contribution.toFixed(1)}%`, trend]
      return table ? <View key={p.itemId} style={{ flexDirection: 'row', gap: 8, borderTopWidth: 1, borderColor: colors.border, paddingVertical: 16 }}>
        {cells.map((value, i) => <Text key={i} style={{ color: colors.text, fontSize: 11, flex: widths[i] }}>{value}</Text>)}
      </View> : <View key={p.itemId} style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 10 }}>
        <Text style={{ color: colors.text, fontWeight: '800', fontSize: 14 }}>{ranked ? `#${index + 1} ` : ''}{p.name}</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{p.sku || 'No saved SKU'} · {p.category}</Text>
        {cells.slice(ranked ? 2 : 3).map((value, index) => <View key={index} style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{labels[index + (ranked ? 2 : 3)]}</Text><Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>{value}</Text>
        </View>)}
      </View>
    })}
  </View>
}

export default function ProductsAnalytics({ data, loading, busy, width, options, onOptionsChange }: {
  data: SupplierAnalyticsData | null; loading: boolean; busy: boolean; width: number
  options: ProductOptions; onOptionsChange: (next: Partial<ProductOptions>) => void
}) {
  const { colors } = useTheme()
  const [allMetrics, setAllMetrics] = useState(false)
  const mobile = width < 680
  const wide = width >= 1100
  const columns = width >= 1250 ? 6 : width >= 680 ? 3 : width >= 440 ? 2 : 1
  const body = { color: colors.textSecondary, fontSize: 12 } as const
  if (loading) return <>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6, rowGap: 12 }}>{Array.from({ length: mobile ? 4 : 6 }, (_, i) => <View key={i} style={{ width: `${100 / columns}%`, paddingHorizontal: 6 }}><SkeletonBox style={{ height: 154 }} /></View>)}</View>
    <SkeletonBox style={{ height: 440 }} /><SkeletonBox style={{ height: 320 }} /><SkeletonBox style={{ height: 400 }} />
  </>
  if (!data) return null
  const products = data.productAnalytics
  const current = products.metrics
  const previous = products.previousMetrics
  const metrics = [
    { key: 'revenue', label: 'Product Revenue', icon: BarChart3, money: true },
    { key: 'quantity', label: 'Quantity Sold', icon: Package, money: false },
    { key: 'settledOrders', label: 'Settled Orders', icon: ShoppingCart, money: false },
    { key: 'activeSellingProducts', label: 'Active Selling Products', icon: TrendingUp, money: false },
    { key: 'averageSellingValue', label: 'Average Selling Value', icon: Receipt, money: true },
    { key: 'topProductContribution', label: 'Top Product Contribution', icon: PieChart, money: false },
  ] as const
  const page = products.performance
  const chartKey = data.range.startDate + data.range.endDate + data.search
  const reasons: Record<string, string> = { MISSING_LINES: 'missing order lines', ZERO_BASIS: 'zero historical line value', INVALID_LINES: 'invalid historical line data', INVALID_SETTLEMENT: 'amounts requiring reconciliation' }
  return <>
    <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>Products Analytics</Text>
    <Text style={body}>{data.environment} · Asia/Manila · {data.range.startDate} – {data.range.endDate} · Compared with {data.comparisonRange.startDate} – {data.comparisonRange.endDate}</Text>
    {products.diagnostics.length > 0 && <Panel title="Some revenue could not be attributed" subtitle="The settlement totals remain unchanged. The product revenue comparison may be incomplete.">
      {products.diagnostics.map(d => <Text key={d.period + d.reason} style={body}>{d.period === 'current' ? 'Selected' : 'Previous'} period: {d.settledOrders} settlements with {reasons[d.reason] ?? 'incomplete historical data'} · Unallocated gross {php(d.unallocatedGross)}, fees {php(d.unallocatedFees)}, net {php(d.unallocatedNet)}.</Text>)}
    </Panel>}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6, rowGap: 12 }}>{metrics.slice(0, mobile && !allMetrics ? 4 : 6).map(metric => {
      const value = current[metric.key]
      const prior = previous[metric.key]
      const contribution = metric.key === 'topProductContribution'
      return <View key={metric.key} style={{ width: `${100 / columns}%`, paddingHorizontal: 6 }}><InsightCard title={metric.label} icon={metric.icon} accent={colors.primary} valueFontSize={columns === 6 ? 17 : columns >= 2 ? 18 : 24}
        value={value === null ? '—' : contribution ? `${value.toFixed(1)}%` : metric.money ? php(value) : number(value)} subtitleColor={colors.textSecondary}
        subtitle={contribution ? products.topProducts[0]?.name ?? 'No product revenue' : value === null ? 'No quantity in selected period' : prior === null ? 'No quantity in previous period' : `${comparisonLabel(value, prior)} · vs. previous period`} /></View>
    })}</View>
    {mobile && <Choice label={allMetrics ? 'Show primary metrics' : 'View all metrics'} onPress={() => setAllMetrics(!allMetrics)} />}
    <Text style={body}>Quantity Sold sums saved line counts across different units; it is not a single physical measure. Average Selling Value is allocated revenue per saved quantity. Unit labels and categories reflect the current catalog.</Text>
    <View style={{ flexDirection: wide ? 'row' : 'column', gap: 14 }}>
      <View style={{ flex: wide ? 3 : undefined, minWidth: 0 }}><Panel title="Product Revenue Trend" subtitle={`${data.interval.toLowerCase()} · revenue and quantity use separate scales`}><ProductRevenueTrend key={chartKey} points={products.trend} /></Panel></View>
      <View style={{ flex: wide ? 2 : undefined, minWidth: 0 }}><Panel title="Revenue Contribution" subtitle="Top 5 products + Others · share of all allocated product revenue">
        {products.contribution.length ? <AnalyticsDonut rows={products.contribution.map(p => ({ label: p.name, value: p.amount, percentage: p.percentage }))} center={php(current.revenue)} caption="Product revenue" money /> : <Empty>No product revenue to compare.</Empty>}
      </Panel></View>
    </View>
    <View style={{ flexDirection: wide ? 'row' : 'column', gap: 14 }}>
      <View style={{ flex: wide ? 3 : undefined, minWidth: 0 }}><Panel title="Top Products" subtitle="Top 5 by allocated revenue · trend compares settled revenue with the previous period">
        {products.topProducts.length ? <ProductRows rows={products.topProducts} table={width >= 1500} ranked /> : <Empty>No products were sold in this period.</Empty>}
      </Panel></View>
      <View style={{ flex: wide ? 2 : undefined, minWidth: 0 }}><Panel title="Quantity Sold by Product" subtitle="Top 10 by saved quantity count. Counts in different units are not equivalent physical volumes.">
        {products.quantityLeaders.length ? products.quantityLeaders.map((p, i) => <View key={p.itemId} style={{ borderBottomWidth: 1, borderColor: colors.border, paddingVertical: 10, gap: 6 }}>
          <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>#{i + 1} {p.name}</Text><Text style={body}>{number(p.quantity)} {p.unit} · {p.sku || 'No saved SKU'}</Text>
        </View>) : <Empty>No products were sold in this period.</Empty>}
      </Panel></View>
    </View>
    <Panel title="Product Performance" subtitle="Current or previous-period settled activity. Prior-only products show zero current sales. Category and unit changes may alter this presentation, but not allocated revenue.">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 6 }}>
        {SORTS.map(sort => <Choice key={sort.key} label={`Sort: ${sort.label}`} selected={options.productSort === sort.key} disabled={busy} onPress={() => onOptionsChange({ productSort: sort.key })} />)}
      </ScrollView>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Choice label={options.productDirection === 'DESC' ? 'Descending ↓' : 'Ascending ↑'} disabled={busy} onPress={() => onOptionsChange({ productDirection: options.productDirection === 'DESC' ? 'ASC' : 'DESC' })} />
        {[20, 50, 100].map(limit => <Choice key={limit} label={`${limit} per page`} selected={options.productLimit === limit} disabled={busy} onPress={() => onOptionsChange({ productLimit: limit })} />)}
      </View>
      {busy && <Text accessibilityLiveRegion="polite" style={body}>Updating product performance… Previous results remain visible.</Text>}
      {page.items.length ? <ProductRows rows={page.items} table={width >= 1300} /> : <Empty>No product performance data for this period.</Empty>}
      <Text style={body}>{number(page.total)} products · Page {page.page} of {page.totalPages} · Export includes this loaded product page.</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Choice label="Previous product page" disabled={busy || page.page <= 1} onPress={() => onOptionsChange({ productPage: page.page - 1 })} />
        <Choice label="Next product page" disabled={busy || page.page >= page.totalPages} onPress={() => onOptionsChange({ productPage: page.page + 1 })} />
      </View>
    </Panel>
  </>
}
