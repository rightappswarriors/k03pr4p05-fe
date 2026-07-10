import React, { useMemo, useState } from 'react'
import { Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import {
  Activity,
  Award,
  Banknote,
  Boxes,
  CircleDollarSign,
  Clock3,
  CreditCard,
  DollarSign,
  LineChart,
  Package,
  PackageCheck,
  Percent,
  Receipt,
  ShoppingCart,
  Star,
  TrendingUp,
  Truck,
  Users,
  Wallet,
} from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { useResponsive } from '@/hooks/useResponsive'
import { useInsightsPrefs, useSupplierInsights, type CustomerInsight, type ProductInsight, type RevenueRow } from '@/hooks/useSupplierInsights'
import { CatalogPagination } from '@/components/supplier/catalog/CatalogPagination'
import { RatingStars } from '@/components/supplier/catalog/RatingStars'
import { ReviewList } from '@/components/supplier/reviews/ReviewList'
import { ReviewFormModal } from '@/components/supplier/reviews/ReviewFormModal'
import { ReviewSummaryCard } from '@/components/supplier/reviews/ReviewSummaryCard'
import { deleteOrganizationReview, type OrganizationReview } from '@/services/supplierService/supplierService'
import { useAuth } from '@/contexts/AuthContext'
import {
  CardGrid,
  EmptyPanel,
  ErrorState,
  InsightHeader,
  InsightsDrawer,
  InsightToolbar,
  MiniChart,
  StatusPill,
  money,
  number,
} from '@/components/supplier/insights/InsightsComponents'
import {  FinanceSectionCard } from '@/components/supplier/finance/FinanceScreenShell'
import { DataTable } from '@/components/DataTable'
import { Kpis } from '@/components/Kpi'
import { LoadingState } from '@/components/LoadingState'

type ScreenKind = 'analytics' | 'revenue' | 'customers' | 'products'

function sortRows<T extends { revenue?: number; orders?: number; rating?: number; name?: string; date?: string }>(rows: T[], sort: string) {
  const copy = [...rows]
  if (sort === 'orders') return copy.sort((a, b) => (b.orders ?? 0) - (a.orders ?? 0))
  if (sort === 'rating') return copy.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
  if (sort === 'name') return copy.sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? '')))
  if (sort === 'newest') return copy.sort((a, b) => new Date((b.date ?? '') as string).getTime() - new Date((a.date ?? '') as string).getTime())
  return copy.sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0))
}

function InsightScreenFrame({ kind, title, subtitle, children }: { kind: ScreenKind; title: string; subtitle: string; children: (ctx: ReturnType<typeof useSupplierInsights> & ReturnType<typeof useInsightsPrefs>) => React.ReactNode }) {
  const { colors } = useTheme()
  const { isDesktop } = useResponsive()
  const { prefs, setPrefs, loaded } = useInsightsPrefs(kind, isDesktop ? 'table' : 'cards')
  const insights = useSupplierInsights(prefs.dateRange)

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={insights.refreshing} onRefresh={insights.refresh} tintColor={colors.primary} />}
        contentContainerStyle={{ width: '100%', maxWidth: 1720, alignSelf: 'center', paddingHorizontal: isDesktop ? 32 : 16, paddingVertical: 22, gap: 16 }}
      >
        <InsightHeader
          title={title}
          subtitle={subtitle}
          dateRange={prefs.dateRange}
          onDateRange={(dateRange) => setPrefs({ dateRange })}
          onRefresh={insights.refresh}
          refreshing={insights.refreshing}
        />
        <InsightToolbar
          search={prefs.search}
          sort={prefs.sort}
          density={prefs.density}
          viewMode={prefs.viewMode}
          onSearch={(search) => setPrefs({ search })}
          onSort={(sort) => setPrefs({ sort })}
          onDensity={(density) => setPrefs({ density })}
          onViewMode={(viewMode) => setPrefs({ viewMode })}
        />
        {!loaded || insights.loading ? <LoadingState /> : insights.error ? <ErrorState message={insights.error} onRetry={insights.reload} /> : children({ ...insights, prefs, setPrefs, loaded })}
      </ScrollView>
    </View>
  )
}

export function AnalyticsScreen() {
  const { user } = useAuth()
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [editingReview, setEditingReview] = useState<OrganizationReview | null>(null)

  return (
    <InsightScreenFrame kind="analytics" title="Analytics" subtitle="Business intelligence and supplier performance.">
      {({ data, refresh }) => {
        const closeReviewModal = () => {
          setReviewModalOpen(false)
          setEditingReview(null)
        }
        const askDelete = (review: OrganizationReview) => {
          Alert.alert('Delete review?', 'This hides the review from your Insights dashboards.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                await deleteOrganizationReview(review.id)
                await refresh()
              },
            },
          ])
        }

        return (
          <>
          <Kpis items={[
            { title: 'Revenue', value: money(data.kpis.revenue), subtitle: `${data.kpis.revenueGrowth.toFixed(1)}% growth`, icon: DollarSign, accent: '#16A34A' },
            { title: 'Profit', value: money(data.kpis.profit), subtitle: 'Estimated margin', icon: TrendingUp, accent: '#2563EB' },
            { title: 'Orders', value: number(data.kpis.orders), subtitle: 'Selected period', icon: ShoppingCart, accent: '#7C3AED' },
            { title: 'Products Sold', value: number(data.kpis.productsSold), subtitle: 'Delivered units', icon: PackageCheck, accent: '#0EA5E9' },
            { title: 'Customers', value: number(data.kpis.customers), subtitle: 'Served accounts', icon: Users, accent: '#DB2777' },
            { title: 'Average Order Value', value: money(data.kpis.averageOrderValue), subtitle: 'Delivered orders', icon: Receipt, accent: '#F59E0B' },
            { title: 'Average Rating', value: data.kpis.averageRating ? data.kpis.averageRating.toFixed(1) : '-', subtitle: `${data.reviewAggregate?.reviewCount ?? 0} reviews`, icon: Star, accent: '#F59E0B' },
            { title: 'Inventory Value', value: money(data.kpis.inventoryValue), subtitle: 'Estimated stock value', icon: Boxes, accent: '#059669' },
            { title: 'Pending Deliveries', value: number(data.kpis.pendingDeliveries), subtitle: 'Operational queue', icon: Truck, accent: '#EA580C' },
            { title: 'Low Stock', value: number(data.kpis.lowStock), subtitle: 'Needs attention', icon: Clock3, accent: '#DC2626' },
          ]} />
          <CardGrid minWidth={390}>
            <MiniChart title="Revenue Trend" subtitle="Delivered purchase orders" data={data.charts.revenueTrend} />
            <MiniChart title="Profit Trend" subtitle="Estimated contribution" data={data.charts.profitTrend} type="line" />
            <MiniChart title="Sales by Category" data={data.charts.categoryRevenue} />
            <MiniChart title="Orders" data={data.charts.ordersByDay} />
            <MiniChart title="Customer Growth" data={data.charts.customerGrowth} />
            <FinanceSectionCard title="Quick Insights" subtitle="Generated from selected period">
              <View style={{ gap: 10 }}>{data.insights.map((item) => <StatusPill key={item} label={item} tone="#2563EB" />)}</View>
            </FinanceSectionCard>
          </CardGrid>
          <CardGrid minWidth={420}>
            <FinanceSectionCard title="Recent Activity Timeline" subtitle="Latest supplier order movement">
              {data.timeline.length ? data.timeline.map((item) => (
                <View key={item.id} style={{ flexDirection: 'row', gap: 10, paddingVertical: 8 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: item.tone, marginTop: 5 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '900', color: '#111827' }}>{item.title}</Text>
                    <Text style={{ color: '#6B7280', fontSize: 12 }}>{item.subtitle}</Text>
                  </View>
                  <Text style={{ color: '#6B7280', fontSize: 11, fontWeight: '800' }}>{new Date(item.date).toLocaleDateString()}</Text>
                </View>
              )) : <EmptyPanel title="No activity yet" message="Purchase order events will appear here." />}
            </FinanceSectionCard>
            <FinanceSectionCard title="Recent Reviews Widget" subtitle="Customer sentiment">
              <TouchableOpacity
                onPress={() => { setEditingReview(null); setReviewModalOpen(true) }}
                style={{ alignSelf: 'flex-start', backgroundColor: '#2563EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 }}
              >
                <Text style={{ color: '#fff', fontWeight: '900' }}>Add review</Text>
              </TouchableOpacity>
              {data.reviewAggregate ? <ReviewSummaryCard aggregate={data.reviewAggregate} /> : null}
              <ReviewList
                reviews={data.reviews.slice(0, 4)}
                onEdit={(review) => { setEditingReview(review); setReviewModalOpen(true) }}
                onDelete={askDelete}
              />
            </FinanceSectionCard>
          </CardGrid>
          <ReviewFormModal
            visible={reviewModalOpen}
            organizationId={user?.orgId ?? 0}
            review={editingReview}
            onClose={closeReviewModal}
            onSaved={async () => { closeReviewModal(); await refresh() }}
          />
        </>
        )
      }}
    </InsightScreenFrame>
  )
}

function RevenueTable({ rows }: { rows: RevenueRow[] }) {
  const { colors } = useTheme()
  return (
    <DataTable
      columns={[
        { label: 'Date', width: 120 },
        { label: 'Invoice', width: 150 },
        { label: 'Customer', width: 220 },
        { label: 'Revenue', width: 130, align: 'right' },
        { label: 'Profit', width: 130, align: 'right' },
        { label: 'Margin', width: 90, align: 'right' },
        { label: 'Payment Status', width: 140 },
        { label: 'Export', width: 130 },
      ]}
      rows={rows.map((row) => ({
        key: row.id,
        cells: [
          <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>{new Date(row.date).toLocaleDateString()}</Text>,
          <Text style={{ color: colors.text, fontWeight: '900' }}>{row.invoice}</Text>,
          <Text style={{ color: colors.text, fontWeight: '800' }}>{row.customer}</Text>,
          <Text style={{ color: colors.text, fontWeight: '900' }}>{money(row.revenue)}</Text>,
          <Text style={{ color: colors.text, fontWeight: '900' }}>{money(row.profit)}</Text>,
          <Text style={{ color: colors.textSecondary, fontWeight: '800' }}>{row.margin.toFixed(1)}%</Text>,
          <StatusPill label={row.paymentStatus} tone="#16A34A" />,
          <Text style={{ color: colors.primary, fontWeight: '900' }}>CSV XLS PDF</Text>,
        ],
      }))}
      emptyState={<EmptyPanel title="No revenue yet" message="Delivered purchase orders will show up in this report." />}
    />
  )
}

export function RevenueScreen() {
  return (
    <InsightScreenFrame kind="revenue" title="Revenue" subtitle="Professional finance dashboard.">
      {({ data, prefs }) => {
        const rows = data.revenueRows.filter((row) => row.customer.toLowerCase().includes(prefs.search.toLowerCase()) || row.invoice.toLowerCase().includes(prefs.search.toLowerCase()))
        return (
          <>
            <Kpis items={[
              { title: 'Gross Revenue', value: money(data.kpis.grossRevenue), subtitle: 'Before taxes', icon: CircleDollarSign, accent: '#16A34A' },
              { title: 'Net Revenue', value: money(data.kpis.netRevenue), subtitle: 'After taxes', icon: Banknote, accent: '#2563EB' },
              { title: 'Taxes', value: money(data.kpis.taxes), subtitle: 'VAT collected', icon: Percent, accent: '#7C3AED' },
              { title: 'Refunds', value: money(data.kpis.refunds), subtitle: 'Selected period', icon: RefreshIcon, accent: '#DC2626' },
              { title: 'Average Order Value', value: money(data.kpis.averageOrderValue), subtitle: 'Delivered orders', icon: Receipt, accent: '#F59E0B' },
              { title: 'Outstanding Payments', value: money(data.kpis.outstandingPayments), subtitle: 'Receivables', icon: CreditCard, accent: '#EA580C' },
              { title: 'Wallet Balance', value: money(data.kpis.walletBalance), subtitle: 'Available funds', icon: Wallet, accent: '#059669' },
              { title: 'Revenue Growth', value: `${data.kpis.revenueGrowth.toFixed(1)}%`, subtitle: 'Period change', icon: TrendingUp, accent: '#0EA5E9' },
            ]} />
            <CardGrid minWidth={390}>
              <MiniChart title="Daily Revenue" data={data.charts.ordersByDay.map((p) => ({ ...p, value: p.value * data.kpis.averageOrderValue }))} />
              <MiniChart title="Monthly Revenue" data={data.charts.revenueTrend} />
              <MiniChart title="Category Revenue" data={data.charts.categoryRevenue} />
              <MiniChart title="Product Revenue" data={data.charts.productRevenue} />
              <MiniChart title="Customer Revenue" data={data.charts.customerRevenue} />
            </CardGrid>
            <FinanceSectionCard title="Revenue Report" subtitle="Invoice-level performance with export actions">
              <RevenueTable rows={rows} />
            </FinanceSectionCard>
          </>
        )
      }}
    </InsightScreenFrame>
  )
}

const RefreshIcon = Activity

function CustomerCard({ customer, onPress }: { customer: CustomerInsight; onPress: () => void }) {
  const { colors } = useTheme()
  return (
    <TouchableOpacity onPress={onPress} style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 16, padding: 15, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: `${colors.primary}18`, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.primary, fontWeight: '900' }}>{customer.avatar}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: '900', fontSize: 15 }}>{customer.name}</Text>
          <Text style={{ color: colors.textSecondary, fontWeight: '700', fontSize: 12 }}>{customer.orders} orders - {money(customer.averageOrder)} AOV</Text>
        </View>
        <StatusPill label={customer.status} tone="#16A34A" />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
        <Text style={{ color: colors.text, fontWeight: '900' }}>{money(customer.revenue)}</Text>
        <RatingStars rating={customer.rating} size={13} showValue={false} />
      </View>
    </TouchableOpacity>
  )
}

function CustomerTable({ customers, onSelect }: { customers: CustomerInsight[]; onSelect: (customer: CustomerInsight) => void }) {
  const { colors } = useTheme()
  return (
    <DataTable
      columns={[
        { label: 'Avatar', width: 80 },
        { label: 'Customer', width: 230 },
        { label: 'Orders', width: 90, align: 'right' },
        { label: 'Revenue', width: 130, align: 'right' },
        { label: 'Average Order', width: 130, align: 'right' },
        { label: 'Lifetime Value', width: 140, align: 'right' },
        { label: 'Rating', width: 130 },
        { label: 'Status', width: 110 },
      ]}
      rows={customers.map((customer) => ({
        key: customer.id,
        cells: [
          <TouchableOpacity onPress={() => onSelect(customer)}><Text style={{ color: colors.primary, fontWeight: '900' }}>{customer.avatar}</Text></TouchableOpacity>,
          <TouchableOpacity onPress={() => onSelect(customer)}><Text style={{ color: colors.text, fontWeight: '900' }}>{customer.name}</Text></TouchableOpacity>,
          <Text style={{ color: colors.text, fontWeight: '900' }}>{number(customer.orders)}</Text>,
          <Text style={{ color: colors.text, fontWeight: '900' }}>{money(customer.revenue)}</Text>,
          <Text style={{ color: colors.textSecondary, fontWeight: '800' }}>{money(customer.averageOrder)}</Text>,
          <Text style={{ color: colors.textSecondary, fontWeight: '800' }}>{money(customer.lifetimeValue)}</Text>,
          <RatingStars rating={customer.rating} size={13} showValue={false} />,
          <StatusPill label={customer.status} tone="#16A34A" />,
        ],
      }))}
      emptyState={<EmptyPanel title="No customers yet" message="Delivered orders will identify your top customers." />}
    />
  )
}

export function TopCustomersScreen() {
  const [selected, setSelected] = useState<CustomerInsight | null>(null)
  const [page, setPage] = useState(1)
  return (
    <InsightScreenFrame kind="customers" title="Top Customers" subtitle="Beautiful CRM dashboard for your most valuable buyers.">
      {({ data, prefs, setPrefs }) => {
        const rows = sortRows(data.customers.filter((c) => c.name.toLowerCase().includes(prefs.search.toLowerCase())), prefs.sort)
        const paged = rows.slice((page - 1) * prefs.pageSize, page * prefs.pageSize)
        return (
          <>
            <Kpis items={[
              { title: 'Customers', value: number(data.kpis.customers), subtitle: 'Served buyers', icon: Users, accent: '#2563EB' },
              { title: 'Returning Customers', value: number(data.customers.filter((c) => c.orders > 1).length), subtitle: 'Repeat accounts', icon: RefreshIcon, accent: '#16A34A' },
              { title: 'Average Spend', value: money(data.kpis.customers ? data.kpis.revenue / data.kpis.customers : 0), subtitle: 'Per customer', icon: DollarSign, accent: '#F59E0B' },
              { title: 'Lifetime Value', value: money(data.customers[0]?.lifetimeValue ?? 0), subtitle: 'Top account', icon: Award, accent: '#7C3AED' },
              { title: 'Orders', value: number(data.kpis.orders), subtitle: 'Selected period', icon: ShoppingCart, accent: '#0EA5E9' },
              { title: 'Average Rating Given', value: data.kpis.averageRating ? data.kpis.averageRating.toFixed(1) : '-', subtitle: 'Org reviews', icon: Star, accent: '#F59E0B' },
            ]} />
            <CardGrid minWidth={390}>
              <MiniChart title="Top 10 Customers" data={data.charts.customerRevenue.slice(0, 10)} />
              <MiniChart title="Revenue Distribution" data={data.charts.customerRevenue} />
              <MiniChart title="Customer Growth" data={data.charts.customerGrowth} />
            </CardGrid>
            {prefs.viewMode === 'table' ? <CustomerTable customers={paged} onSelect={setSelected} /> : <CardGrid minWidth={300}>{paged.map((customer) => <CustomerCard key={customer.id} customer={customer} onPress={() => setSelected(customer)} />)}</CardGrid>}
            <CatalogPagination page={page} pageSize={prefs.pageSize} totalItems={rows.length} onPageChange={setPage} onPageSizeChange={(pageSize) => setPrefs({ pageSize })} />
            <InsightsDrawer visible={!!selected} title={selected?.name ?? ''} subtitle="Customer detail drawer" onClose={() => setSelected(null)}>
              {selected ? (
                <>
                  <Kpis items={[
                    { title: 'Revenue', value: money(selected.revenue), icon: DollarSign, accent: '#16A34A' },
                    { title: 'Orders', value: number(selected.orders), icon: ShoppingCart, accent: '#2563EB' },
                    { title: 'Average Order', value: money(selected.averageOrder), icon: Receipt, accent: '#F59E0B' },
                  ]} />
                  <MiniChart title="Revenue Timeline" data={[{ label: 'LTV', value: selected.lifetimeValue }, { label: 'AOV', value: selected.averageOrder }]} />
                  <FinanceSectionCard title="Purchased Products"><Text>{selected.products.slice(0, 6).map((p) => `${p.name} (${p.qty})`).join('\n') || 'No product details yet.'}</Text></FinanceSectionCard>
                  <FinanceSectionCard title="Reviews"><ReviewList reviews={selected.reviews} /></FinanceSectionCard>
                </>
              ) : null}
            </InsightsDrawer>
          </>
        )
      }}
    </InsightScreenFrame>
  )
}

function ProductCard({ product, onPress }: { product: ProductInsight; onPress: () => void }) {
  const { colors } = useTheme()
  return (
    <TouchableOpacity onPress={onPress} style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 16, padding: 15, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
          <Package size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: '900', fontSize: 15 }}>{product.name}</Text>
          <Text style={{ color: colors.textSecondary, fontWeight: '700', fontSize: 12 }}>{product.sku ?? 'No SKU'} - {product.unit}</Text>
        </View>
        <StatusPill label={product.status} tone={product.status === 'Active' ? '#16A34A' : product.status === 'Low stock' ? '#F59E0B' : '#DC2626'} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: colors.text, fontWeight: '900' }}>{money(product.revenue)}</Text>
        <Text style={{ color: colors.textSecondary, fontWeight: '800' }}>{number(product.unitsSold)} units</Text>
      </View>
      <RatingStars rating={product.averageRating} reviewCount={product.reviewCount} size={13} />
    </TouchableOpacity>
  )
}

function ProductTable({ products, onSelect }: { products: ProductInsight[]; onSelect: (product: ProductInsight) => void }) {
  const { colors } = useTheme()
  return (
    <DataTable
      columns={[
        { label: 'Image', width: 76 },
        { label: 'Product', width: 220 },
        { label: 'Category', width: 130 },
        { label: 'Revenue', width: 120, align: 'right' },
        { label: 'Units Sold', width: 110, align: 'right' },
        { label: 'Margin', width: 90, align: 'right' },
        { label: 'Price', width: 100, align: 'right' },
        { label: 'Cost', width: 100, align: 'right' },
        { label: 'Rating', width: 130 },
        { label: 'Status', width: 120 },
      ]}
      rows={products.map((product) => ({
        key: product.id,
        cells: [
          <TouchableOpacity onPress={() => onSelect(product)}><Package size={20} color={colors.primary} /></TouchableOpacity>,
          <TouchableOpacity onPress={() => onSelect(product)}><Text style={{ color: colors.text, fontWeight: '900' }}>{product.name}</Text></TouchableOpacity>,
          <Text style={{ color: colors.textSecondary, fontWeight: '800' }}>{(product as any).category?.name ?? 'Core'}</Text>,
          <Text style={{ color: colors.text, fontWeight: '900' }}>{money(product.revenue)}</Text>,
          <Text style={{ color: colors.text, fontWeight: '900' }}>{number(product.unitsSold)}</Text>,
          <Text style={{ color: colors.textSecondary, fontWeight: '800' }}>{product.margin.toFixed(1)}%</Text>,
          <Text style={{ color: colors.textSecondary, fontWeight: '800' }}>{money(product.unitPrice)}</Text>,
          <Text style={{ color: colors.textSecondary, fontWeight: '800' }}>{money(product.cost)}</Text>,
          <RatingStars rating={product.averageRating} reviewCount={product.reviewCount} size={12} />,
          <StatusPill label={product.status} tone={product.status === 'Active' ? '#16A34A' : product.status === 'Low stock' ? '#F59E0B' : '#DC2626'} />,
        ],
      }))}
      emptyState={<EmptyPanel title="No products yet" message="Catalog products will appear here once created." />}
    />
  )
}

export function TopProductsScreen() {
  const [selected, setSelected] = useState<ProductInsight | null>(null)
  const [tab, setTab] = useState('Overview')
  const [page, setPage] = useState(1)
  return (
    <InsightScreenFrame kind="products" title="Top Products" subtitle="Modern analytics dashboard for product performance intelligence.">
      {({ data, prefs, setPrefs }) => {
        const rows = sortRows(data.products.filter((p) => p.name.toLowerCase().includes(prefs.search.toLowerCase()) || (p.sku ?? '').toLowerCase().includes(prefs.search.toLowerCase())), prefs.sort)
        const paged = rows.slice((page - 1) * prefs.pageSize, page * prefs.pageSize)
        return (
          <>
            <Kpis items={[
              { title: 'Best Seller', value: data.products[0]?.name ?? '-', subtitle: `${number(data.products[0]?.unitsSold ?? 0)} units`, icon: Award, accent: '#F59E0B' },
              { title: 'Highest Revenue', value: money(data.products[0]?.revenue ?? 0), subtitle: data.products[0]?.name ?? 'No product', icon: DollarSign, accent: '#16A34A' },
              { title: 'Highest Margin', value: `${Math.max(0, ...data.products.map((p) => p.margin)).toFixed(1)}%`, subtitle: 'Estimated', icon: Percent, accent: '#2563EB' },
              { title: 'Most Reviewed', value: data.products.sort((a, b) => b.reviewCount - a.reviewCount)[0]?.name ?? '-', subtitle: `${number(data.products.sort((a, b) => b.reviewCount - a.reviewCount)[0]?.reviewCount ?? 0)} reviews`, icon: Star, accent: '#7C3AED' },
              { title: 'Lowest Performing', value: data.products.filter((p) => p.revenue === 0)[0]?.name ?? '-', subtitle: 'Needs attention', icon: LineChart, accent: '#DC2626' },
              { title: 'Fastest Growing', value: `${Math.max(0, ...data.products.map((p) => p.growth)).toFixed(0)}%`, subtitle: 'Estimated trend', icon: TrendingUp, accent: '#0EA5E9' },
            ]} />
            <CardGrid minWidth={390}>
              <MiniChart title="Top Products" data={data.charts.productRevenue} />
              <MiniChart title="Revenue Contribution" data={data.charts.productRevenue.slice(0, 6)} />
              <MiniChart title="Category Distribution" data={data.charts.categoryRevenue} />
              <MiniChart title="Product Growth" data={data.products.slice(0, 8).map((p) => ({ label: p.name, value: Math.max(0, p.growth) }))} />
            </CardGrid>
            {prefs.viewMode === 'table' ? <ProductTable products={paged} onSelect={(p) => { setSelected(p); setTab('Overview') }} /> : <CardGrid minWidth={300}>{paged.map((product) => <ProductCard key={product.id} product={product} onPress={() => { setSelected(product); setTab('Overview') }} />)}</CardGrid>}
            <CatalogPagination page={page} pageSize={prefs.pageSize} totalItems={rows.length} onPageChange={setPage} onPageSizeChange={(pageSize) => setPrefs({ pageSize })} />
            <InsightsDrawer visible={!!selected} title={selected?.name ?? ''} subtitle="Product detail drawer" onClose={() => setSelected(null)}>
              {selected ? (
                <>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {['Overview', 'Revenue', 'Sales', 'Inventory', 'Reviews', 'Analytics'].map((next) => (
                      <TouchableOpacity key={next} onPress={() => setTab(next)} style={{ paddingHorizontal: 11, paddingVertical: 8, borderRadius: 999, backgroundColor: tab === next ? '#2563EB' : '#EFF6FF' }}>
                        <Text style={{ color: tab === next ? '#fff' : '#2563EB', fontWeight: '900', fontSize: 12 }}>{next}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {tab === 'Reviews' ? <ReviewList reviews={selected.reviews} /> : (
                    <>
                      <Kpis items={[
                        { title: 'Revenue', value: money(selected.revenue), icon: DollarSign, accent: '#16A34A' },
                        { title: 'Units Sold', value: number(selected.unitsSold), icon: PackageCheck, accent: '#2563EB' },
                        { title: 'Margin', value: `${selected.margin.toFixed(1)}%`, icon: Percent, accent: '#F59E0B' },
                      ]} />
                      <MiniChart title="Revenue Trend" data={[{ label: 'Revenue', value: selected.revenue }, { label: 'Inventory', value: selected.availableQty * selected.unitPrice }]} />
                      <MiniChart title="Sales Trend" data={[{ label: 'Units', value: selected.unitsSold }, { label: 'MOQ', value: selected.moq }]} />
                      <MiniChart title="Margin Trend" data={[{ label: 'Price', value: selected.unitPrice }, { label: 'Cost', value: selected.cost }, { label: 'Margin', value: selected.margin }]} />
                    </>
                  )}
                </>
              ) : null}
            </InsightsDrawer>
          </>
        )
      }}
    </InsightScreenFrame>
  )
}
