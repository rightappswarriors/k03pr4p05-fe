import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, TextInput, Platform } from 'react-native'
import { BarChart3, Wallet, ShoppingCart, Receipt, Package, Users, Calendar, Download, RefreshCw, Search, LayoutGrid, List, ChevronRight, ChevronDown } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { useToast } from '@/contexts/ToastContext'
import { InsightCard, KpiGrid } from '@/components/Kpi'
import { SkeletonBox } from '@/components/LoadingSkeleton'
import DateRangePickerModal from '@/components/DateRangePickerModal'
import { AnalyticsDonut, RevenueTrendChart } from '@/components/supplier/analytics/AnalyticsCharts'
import { dateKey, presetRange, useSupplierAnalytics, validAnalyticsRange } from '@/hooks/useSupplierAnalytics'
import { analyticsCSV, comparisonLabel, type AnalyticsOrder } from '@/services/supplierService/supplierAnalyticsService'
import PODetailScreen from './PODetailScreen'
import SalesRevenue from '@/components/supplier/analytics/SalesRevenue'
import ProductsAnalytics from '@/components/supplier/analytics/ProductsAnalytics'
import CustomersAnalytics from '@/components/supplier/analytics/CustomersAnalytics'
import OrdersAnalytics from '@/components/supplier/analytics/OrdersAnalytics'
import FeesAnalytics from '@/components/supplier/analytics/FeesAnalytics'
import PayoutsAnalytics from '@/components/supplier/analytics/PayoutsAnalytics'

const formatPHP = (amount: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)

const PERIODS = [{ label: 'Last 7 days', value: 7 }, { label: 'Last 30 days', value: 30 }, { label: 'Last 3 months', value: 90 }, { label: 'Last 6 months', value: 180 }, { label: 'Last 12 months', value: 360 }]
const TABS = ['Overview', 'Sales & Revenue', 'Products', 'Customers', 'Orders', 'Fees', 'Payouts']
const METRICS = [
  { key: 'grossSales', label: 'Gross Sales', icon: BarChart3, color: '#00C997', money: true },
  { key: 'netEarnings', label: 'Net Earnings', icon: Wallet, color: '#168CFF', money: true },
  { key: 'totalOrders', label: 'Total Orders', icon: ShoppingCart, color: '#A78BFA', money: false },
  { key: 'platformFees', label: 'Platform Fees', icon: Receipt, color: '#FB7185', money: true },
  { key: 'productsSold', label: 'Products Sold', icon: Package, color: '#FBBF24', money: false },
  { key: 'customers', label: 'Customers / Buyers', icon: Users, color: '#22D3EE', money: false },
] as const

function Panel({ title, subtitle, children, collapsible = false }: { title: string; subtitle?: string; children: React.ReactNode; collapsible?: boolean }) {
  const { colors } = useTheme()
  const [open, setOpen] = useState(false)
  return <View style={{ flexGrow: 1, flexShrink: 0, minWidth: 0, backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 18, gap: 16 }}>
    {collapsible ? <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ flex: 1 }}><Text style={{ color: colors.text, fontSize: 15, fontWeight: '800' }}>{title}</Text>{subtitle && <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 5 }}>{subtitle}</Text>}</View>
      {open ? <ChevronDown size={18} color={colors.primary} /> : <ChevronRight size={18} color={colors.primary} />}
    </TouchableOpacity> : <View style={{ gap: 5 }}><Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>{title}</Text>{subtitle && <Text style={{ fontSize: 12, color: colors.textSecondary }}>{subtitle}</Text>}</View>}
    {(!collapsible || open) && children}
  </View>
}

function Empty({ children }: { children: string }) {
  const { colors } = useTheme()
  return <Text style={{ textAlign: 'center', color: colors.textSecondary, fontSize: 13, paddingVertical: 24 }}>{children}</Text>
}

function RecentOrders({ rows, table, onView }: { rows: AnalyticsOrder[]; table: boolean; onView: (id: string) => void }) {
  const { colors } = useTheme()
  const widths = [1.45, 0.95, 1.4, 0.5, 1, 0.8, 1, 1.05, 0.5]
  if (!rows.length) return <Empty>No qualifying orders in this period.</Empty>
  return <View style={{ gap: table ? 0 : 12 }}>
    {table && <View style={{ flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.border }}>
      {['Order #', 'Settled', 'Buyer', 'Items', 'Gross', 'Fee', 'Net', 'Status', 'Action'].map((text, i) => <Text key={text} style={{ flex: widths[i], paddingHorizontal: 5, fontSize: 10, fontWeight: '700', color: colors.textSecondary }}>{text}</Text>)}
    </View>}
    {rows.map(order => table ? <View key={order.id} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 58, borderBottomWidth: 1, borderColor: colors.border }}>
      {[order.poNumber, order.date, order.buyerName, String(order.itemCount), formatPHP(order.grossAmount), formatPHP(order.platformFee), formatPHP(order.netAmount), order.status.replace(/_/g, ' ')].map((text, i) => <Text key={i} style={{ flex: widths[i], paddingHorizontal: 5, color: i === 7 ? colors.success : colors.text, fontSize: 11 }}>{text}</Text>)}
      <TouchableOpacity accessibilityLabel={`View order ${order.poNumber}`} onPress={() => onView(order.id)} style={{ flex: widths[8], minHeight: 44, justifyContent: 'center' }}><Text style={{ color: colors.primary, fontSize: 12 }}>View</Text></TouchableOpacity>
    </View> : <View key={order.id} style={{ padding: 14, gap: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 12 }}>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'space-between' }}><Text style={{ color: colors.text, fontWeight: '700' }}>{order.poNumber}</Text><Text style={{ color: colors.success, fontSize: 11 }}>{order.status.replace(/_/g, ' ')}</Text></View>
      <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{order.buyerName}</Text>
      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{order.date} · {order.itemCount} line items</Text>
      <View style={{ gap: 6 }}>{[['Gross', order.grossAmount], ['Platform fee', order.platformFee], ['Net earnings', order.netAmount]].map(([label, value]) => <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}><Text style={{ color: colors.textSecondary, fontSize: 12 }}>{label}</Text><Text style={{ color: colors.text, fontWeight: '600', fontSize: 12 }}>{formatPHP(Number(value))}</Text></View>)}</View>
      <TouchableOpacity onPress={() => onView(order.id)} accessibilityLabel={`View order ${order.poNumber}`} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: colors.primary, fontWeight: '700' }}>View Order →</Text></TouchableOpacity>
    </View>)}
  </View>
}

export default function SupplierAnalyticsScreen() {
  const { colors } = useTheme()
  const toast = useToast()
  const state = useSupplierAnalytics()
  const { data, range } = state
  const [width, setWidth] = useState(0)
  const [tab, setTab] = useState('Overview')
  const [dateOpen, setDateOpen] = useState(false)
  const [allMetrics, setAllMetrics] = useState(false)
  const [selectedPo, setSelectedPo] = useState<string | null>(null)
  const mobile = width < 680
  const wide = width >= 1050
  const columns = width >= 1120 ? 6 : width >= 720 ? 3 : width >= 480 ? 2 : 1
  const gap = 12
  const metricWidth = Math.max(0, Math.floor((Math.min(width, 1800) - (mobile ? 28 : 48) - gap * (columns - 1)) / columns))
  const body = { color: colors.textSecondary, fontSize: 12 } as const
  const actionStyle = { minHeight: 44, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 8 }

  const exportReport = () => {
    if (!data || !state.canExport || Platform.OS !== 'web') return
    try {
      const csv = analyticsCSV(data, data.supplierName)
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `kompra-supplier-analytics-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      toast.show('Analytics report exported.', 'success')
    } catch {
      toast.show('Unable to export analytics. Please try again.', 'error')
    }
  }

  if (selectedPo) return <PODetailScreen poId={selectedPo} onBack={() => setSelectedPo(null)} />

  return <View style={{ flex: 1, backgroundColor: colors.background }} onLayout={e => setWidth(e.nativeEvent.layout.width)}>
    <ScrollView refreshControl={<RefreshControl refreshing={state.refreshing} onRefresh={state.refresh} tintColor={colors.primary} />}
      contentContainerStyle={{ padding: mobile ? 14 : 24, paddingBottom: 40, gap: 16, width: '100%', maxWidth: 1800, alignSelf: 'center' }}>
      <View style={{ flexDirection: mobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: mobile ? 'stretch' : 'center', gap: 18, flexWrap: 'wrap' }}>
        <View style={{ gap: 6 }}><Text style={{ fontSize: mobile ? 26 : 32, fontWeight: '900', color: colors.text }}>Analytics</Text><Text style={{ ...body, fontSize: 13 }}>Business intelligence and supplier performance.</Text></View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <TouchableOpacity onPress={() => setDateOpen(true)} style={actionStyle} accessibilityLabel="Choose analytics date range"><Calendar size={16} color={colors.text} /><Text style={{ color: colors.text, fontSize: 12 }}>{range.startDate} – {range.endDate}</Text><ChevronDown size={14} color={colors.textSecondary} /></TouchableOpacity>
          {Platform.OS === 'web' && <TouchableOpacity onPress={exportReport} disabled={!state.canExport} accessibilityState={{ disabled: !state.canExport }} style={{ ...actionStyle, opacity: state.canExport ? 1 : 0.45 }}><Download size={16} color={colors.text} /><Text style={{ color: colors.text, fontSize: 12 }}>Export</Text></TouchableOpacity>}
          <TouchableOpacity onPress={state.refresh} disabled={state.refreshing || state.loading} style={{ ...actionStyle, backgroundColor: '#168CFF', borderColor: '#168CFF' }}><RefreshCw size={16} color="#fff" /><Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{state.refreshing ? 'Refreshing…' : 'Refresh'}</Text></TouchableOpacity>
        </View>
      </View>

      <ScrollView horizontal style={{ flexGrow: 0, flexShrink: 0 }} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {TABS.map(name => <TouchableOpacity key={name} accessibilityRole="tab" accessibilityState={{ selected: tab === name }} onPress={() => setTab(name)}
          style={{ ...actionStyle, borderRadius: 24, backgroundColor: tab === name ? '#168CFF' : colors.surface, borderColor: tab === name ? '#168CFF' : colors.border }}>
          <Text style={{ color: tab === name ? '#fff' : colors.text, fontSize: 12, fontWeight: tab === name ? '700' : '500' }}>{name}</Text>
        </TouchableOpacity>)}
      </ScrollView>

      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 10 }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, backgroundColor: colors.surface, gap: 10 }}>
          <Search size={17} color={colors.textSecondary} /><TextInput accessibilityLabel="Search analytics by order, product, buyer or payout" placeholder="Search orders, products, buyers or payouts…" placeholderTextColor={colors.textSecondary}
            value={state.search} onChangeText={state.setSearch} maxLength={100} style={{ flex: 1, minWidth: 0, minHeight: 44, color: colors.text, fontSize: 13 }} />
        </View>
        {wide && <View style={{ flexDirection: 'row', gap: 6 }}>{(['cards', 'table'] as const).map(mode => <TouchableOpacity key={mode} onPress={() => state.setViewMode(mode)} accessibilityRole="button" accessibilityLabel={`Recent orders ${mode} view`} accessibilityState={{ selected: state.viewMode === mode }} style={{ ...actionStyle, backgroundColor: state.viewMode === mode ? colors.primaryLight : colors.surface }}>
          {mode === 'cards' ? <LayoutGrid size={16} color={colors.text} /> : <List size={16} color={colors.text} />}<Text style={{ color: colors.text, fontSize: 12 }}>{mode === 'cards' ? 'Cards' : 'Table'}</Text>
        </TouchableOpacity>)}</View>}
      </View>

      <ScrollView horizontal style={{ flexGrow: 0, flexShrink: 0 }} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {PERIODS.map(preset => {
          const dates = presetRange(preset.value)
          const active = range.startDate === dates.startDate && range.endDate === dates.endDate
          return <TouchableOpacity key={preset.value} onPress={() => state.setRange(dates)} style={{ ...actionStyle, backgroundColor: active ? colors.primaryLight : colors.surface }} accessibilityState={{ selected: active }}><Text style={{ color: colors.textSecondary, fontSize: 11 }}>{preset.label}</Text></TouchableOpacity>
        })}
        <TouchableOpacity onPress={() => setDateOpen(true)} style={actionStyle}><Text style={{ color: colors.primary, fontSize: 12 }}>Custom</Text></TouchableOpacity>
      </ScrollView>

      {state.error && <Panel title="Unable to load analytics"><Text style={body}>We couldn't load your analytics right now.{data ? ' The previous results remain below.' : ''}</Text><TouchableOpacity onPress={state.retry} style={{ ...actionStyle, alignSelf: 'flex-start' }}><Text style={{ color: colors.primary }}>Try Again</Text></TouchableOpacity></Panel>}

      {tab === 'Payouts' ? <PayoutsAnalytics data={data} loading={state.loading} busy={state.refreshing} width={width} options={state.payoutOptions} onOptionsChange={state.setPayoutOptions} /> : tab === 'Fees' ? <FeesAnalytics data={data} loading={state.loading} busy={state.refreshing} width={width} options={state.feeOptions} onOptionsChange={state.setFeeOptions} /> : tab === 'Orders' ? <OrdersAnalytics data={data} loading={state.loading} busy={state.refreshing} width={width} options={state.orderOptions} onOptionsChange={state.setOrderOptions} onView={setSelectedPo} /> : tab === 'Customers' ? <CustomersAnalytics data={data} loading={state.loading} busy={state.refreshing} width={width} options={state.customerOptions} onOptionsChange={state.setCustomerOptions} /> : tab === 'Products' ? <ProductsAnalytics data={data} loading={state.loading} busy={state.refreshing} width={width} options={state.productOptions} onOptionsChange={state.setProductOptions} /> : tab === 'Sales & Revenue' ? <SalesRevenue data={data} loading={state.loading} width={width} recentOrders={data ? <RecentOrders rows={data.recentOrders} table={wide && state.viewMode === 'table'} onView={setSelectedPo} /> : null} /> : tab !== 'Overview' ? <Panel title={tab}><View style={{ paddingVertical: 40, alignItems: 'center', gap: 14 }}><BarChart3 size={34} color={colors.primary} /><Text style={{ color: colors.text, textAlign: 'center', fontSize: 16, fontWeight: '700' }}>Detailed analytics coming in the next increment</Text><Text style={{ ...body, textAlign: 'center' }}>Your selected dates and filters will be preserved. Explore the Overview for current insights.</Text><TouchableOpacity onPress={() => setTab('Overview')} style={actionStyle}><Text style={{ color: colors.primary }}>Back to Overview</Text></TouchableOpacity></View></Panel>
        : state.loading ? <>
          <KpiGrid>{METRICS.map(metric => <SkeletonBox key={metric.key} style={{ width: metricWidth, height: 154 }} />)}</KpiGrid>
          <View style={{ flexDirection: wide ? 'row' : 'column', gap: 14 }}><SkeletonBox style={{ flex: wide ? 3 : undefined, height: 310 }} /><SkeletonBox style={{ flex: wide ? 2 : undefined, height: 310 }} /></View>
          <SkeletonBox style={{ height: 190 }} /><SkeletonBox style={{ height: 250 }} />
        </> : data && <>
          <Text style={body}>{data.environment === 'SANDBOX' ? 'Sandbox · ' : ''}Asia/Manila · {data.range.startDate} – {data.range.endDate} · Compared with {data.comparisonRange.startDate} – {data.comparisonRange.endDate}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6, rowGap: 12 }}>{METRICS.slice(0, mobile && !allMetrics ? 4 : 6).map(metric => {
            const value = data.kpis[metric.key]
            const previous = data.previousKpis[metric.key]
            return <View key={metric.key} style={{ width: `${100 / columns}%`, paddingHorizontal: 6 }}>
              <InsightCard title={metric.label} value={metric.money ? formatPHP(value) : value.toLocaleString('en-PH')} valueFontSize={columns === 6 ? 17 : 24} icon={metric.icon} accent={metric.color}
                subtitleColor={value === previous ? colors.textSecondary : metric.key === 'platformFees' ? colors.textSecondary : value > previous ? colors.success : colors.error}
                subtitle={`${comparisonLabel(value, previous)} · vs. previous period`} />
            </View>
          })}</View>
          {mobile && <TouchableOpacity onPress={() => setAllMetrics(!allMetrics)} style={{ ...actionStyle, alignSelf: 'center' }}><Text style={{ color: colors.primary }}>{allMetrics ? 'Show primary metrics' : 'View all metrics'} →</Text></TouchableOpacity>}
          <Text style={body}>Sales, fees, units and buyers use settled orders. Total Orders counts orders created in this period.</Text>

          <View style={{ flexDirection: wide ? 'row' : 'column', gap: 14, alignItems: 'stretch' }}>
            <View style={{ flex: wide ? 3 : undefined, minWidth: 0 }}><Panel title="Revenue Trend" subtitle={`Gross sales and net earnings over time · ${data.interval.toLowerCase()}`}><RevenueTrendChart key={data.range.startDate + data.range.endDate + data.search} points={data.revenueTrend} /></Panel></View>
            <View style={{ flex: wide ? 2 : undefined, minWidth: 0 }}><Panel title="Sales by Product Category" subtitle="Product subtotals · current category assignments">
              <AnalyticsDonut rows={data.categorySales.map(c => ({ label: c.name, value: c.amount, percentage: c.percentage }))} center={formatPHP(data.categorySales.reduce((sum, c) => sum + c.amount, 0))} caption="Product sales" money />
              {!data.categorySales.length && <Empty>No category sales in this period.</Empty>}
              <Text style={body}>Excludes order-level tax and charges. Historical category snapshots are unavailable.</Text>
            </Panel></View>
          </View>

          <View style={{ flexDirection: mobile ? 'column' : 'row', flexWrap: 'wrap', gap: 14 }}>
            <View style={{ flex: mobile ? undefined : 1, minWidth: mobile ? 0 : 220 }}><Panel title="Order Status" subtitle={`${data.kpis.totalOrders} orders created in this period`} collapsible={mobile}>
              <AnalyticsDonut rows={data.orderStatuses.map(s => ({ label: s.label, value: s.count, percentage: s.percentage }))} center={String(data.kpis.totalOrders)} caption="Orders" />
              {!data.orderStatuses.length && <Empty>No orders created in this period.</Empty>}
            </Panel></View>
            <View style={{ flex: mobile ? undefined : 1, minWidth: mobile ? 0 : 220 }}><Panel title="Top Products" subtitle="By quantity sold · settled orders" collapsible={mobile}>
              {data.topProducts.length ? data.topProducts.map((product, index) => <View key={product.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, borderBottomWidth: 1, borderColor: colors.border }}>
                <Text style={{ color: colors.primary, fontWeight: '800' }}>{index + 1}</Text><Text style={{ flex: 1, color: colors.text, fontSize: 13 }}>{product.name}</Text><Text style={{ color: colors.textSecondary, fontSize: 13 }}>{product.quantity.toLocaleString()}</Text>
              </View>) : <Empty>No product sales in this period.</Empty>}
            </Panel></View>
            <View style={{ flex: mobile ? undefined : 1, minWidth: mobile ? 0 : 220 }}><Panel title="Top Customers" subtitle="By settled purchase amount" collapsible={mobile}>
              {data.topCustomers.length ? data.topCustomers.map((buyer, index) => <View key={buyer.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, borderBottomWidth: 1, borderColor: colors.border }}>
                <Text style={{ color: colors.primary, fontWeight: '800' }}>{index + 1}</Text><View style={{ flex: 1 }}><Text style={{ color: colors.text, fontSize: 12 }}>{buyer.name}</Text><Text style={{ ...body, fontSize: 10 }}>{buyer.orderCount} orders</Text></View><Text style={{ color: colors.textSecondary, fontSize: 12 }}>{formatPHP(buyer.amount)}</Text>
              </View>) : <Empty>No buyer activity in this period.</Empty>}
            </Panel></View>
          </View>

          <Panel title="Platform Fees Breakdown" subtitle="Fees recorded when orders settle">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 14 }}>
              <View style={{ gap: 6 }}><Text style={body}>Total platform fees</Text><Text style={{ color: colors.text, fontSize: 24, fontWeight: '800' }}>{formatPHP(data.kpis.platformFees)}</Text></View>
              <View style={{ gap: 6 }}><Text style={body}>Settled gross − platform fees = net earnings</Text><Text style={{ color: colors.text, fontSize: 13 }}>{formatPHP(data.kpis.grossSales)} − {formatPHP(data.kpis.platformFees)} = {formatPHP(data.kpis.netEarnings)}</Text></View>
            </View>
          </Panel>
          <Panel title="Recent Orders" subtitle="Latest 5 settled orders in the selected period" collapsible={mobile}>
            <RecentOrders rows={data.recentOrders} table={wide && state.viewMode === 'table'} onView={setSelectedPo} />
          </Panel>
        </>}
    </ScrollView>
    <DateRangePickerModal visible={dateOpen} onClose={() => setDateOpen(false)} initialStart={new Date(`${range.startDate}T12:00:00`)} initialEnd={new Date(`${range.endDate}T12:00:00`)}
      onApply={(start, end) => {
        const next = { startDate: dateKey(start), endDate: dateKey(end) }
        if (!validAnalyticsRange(next)) { toast.show('Choose a date range of at most 366 days.', 'warning'); return }
        state.setRange(next)
      }} />
  </View>
}
