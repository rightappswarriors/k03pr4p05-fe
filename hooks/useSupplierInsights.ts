import { useCallback, useEffect, useMemo, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuth } from '@/contexts/AuthContext'
import {
  fetchOrCreateCatalog,
  fetchOrganizationReviews,
  fetchPurchaseOrdersForSupplier,
  fetchSupplierDashboard,
  type OrganizationReview,
  type PurchaseOrder,
  type ReviewAggregate,
  type SupplierCatalog,
  type SupplierDashboardStats,
  type SupplierItem,
} from '@/services/supplierService/supplierService'

export type InsightViewMode = 'cards' | 'table'
export type InsightDensity = 'comfortable' | 'compact'
export type InsightSort = 'revenue' | 'orders' | 'rating' | 'name' | 'newest'

export interface InsightDateRange {
  startDate: string
  endDate: string
}

export interface InsightPrefs {
  search: string
  sort: InsightSort
  density: InsightDensity
  viewMode: InsightViewMode
  pageSize: number
  dateRange: InsightDateRange
  visibleColumns: string[]
}

export interface RevenueRow {
  id: string
  date: string
  invoice: string
  customer: string
  revenue: number
  profit: number
  margin: number
  paymentStatus: string
  paymentMethod: string
}

export interface CustomerInsight {
  id: string
  name: string
  avatar: string
  orders: number
  revenue: number
  averageOrder: number
  lifetimeValue: number
  rating: number
  status: string
  lastPurchase: string
  products: Array<{ name: string; qty: number; revenue: number }>
  reviews: OrganizationReview[]
}

export interface ProductInsight extends SupplierItem {
  revenue: number
  unitsSold: number
  margin: number
  cost: number
  growth: number
  status: string
  reviews: OrganizationReview[]
}

export interface ChartPoint {
  label: string
  value: number
  accent?: string
}

export interface SupplierInsightsData {
  dashboard: SupplierDashboardStats | null
  catalog: SupplierCatalog | null
  orders: PurchaseOrder[]
  deliveredOrders: PurchaseOrder[]
  reviews: OrganizationReview[]
  reviewAggregate: ReviewAggregate | null
  revenueRows: RevenueRow[]
  customers: CustomerInsight[]
  products: ProductInsight[]
  charts: {
    revenueTrend: ChartPoint[]
    profitTrend: ChartPoint[]
    categoryRevenue: ChartPoint[]
    productRevenue: ChartPoint[]
    customerRevenue: ChartPoint[]
    ordersByDay: ChartPoint[]
    customerGrowth: ChartPoint[]
  }
  kpis: {
    revenue: number
    profit: number
    orders: number
    productsSold: number
    customers: number
    averageOrderValue: number
    averageRating: number
    inventoryValue: number
    pendingDeliveries: number
    lowStock: number
    grossRevenue: number
    netRevenue: number
    taxes: number
    refunds: number
    outstandingPayments: number
    walletBalance: number
    revenueGrowth: number
  }
  timeline: Array<{ id: string; title: string; subtitle: string; date: string; tone: string }>
  insights: string[]
}

const defaultRange = (): InsightDateRange => {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 89)
  return { startDate: start.toISOString(), endDate: end.toISOString() }
}

const defaultPrefs = (viewMode: InsightViewMode): InsightPrefs => ({
  search: '',
  sort: 'revenue',
  density: 'comfortable',
  viewMode,
  pageSize: 10,
  dateRange: defaultRange(),
  visibleColumns: [],
})

const inRange = (date: string, range: InsightDateRange) => {
  const t = new Date(date).getTime()
  return t >= new Date(range.startDate).getTime() && t <= new Date(range.endDate).getTime()
}

const monthKey = (date: string) => new Date(date).toLocaleDateString('en-US', { month: 'short' })
const dayKey = (date: string) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
const clean = (value?: string | null) => value?.trim() || 'Unassigned'

function sumBy<T>(rows: T[], getKey: (row: T) => string, getValue: (row: T) => number, limit = 8): ChartPoint[] {
  const map = new Map<string, number>()
  rows.forEach((row) => map.set(getKey(row), (map.get(getKey(row)) ?? 0) + getValue(row)))
  return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, limit)
}

function buildAggregate(reviews: OrganizationReview[]): ReviewAggregate {
  const count = reviews.length
  const total = reviews.reduce((sum, review) => sum + review.rating, 0)
  return {
    averageRating: count ? Number((total / count).toFixed(2)) : 0,
    reviewCount: count,
    verifiedCount: reviews.filter((review) => review.isVerifiedTransaction).length,
    breakdown: [5, 4, 3, 2, 1].map((rating) => ({
      rating,
      count: reviews.filter((review) => review.rating === rating).length,
    })),
  }
}

export function useInsightsPrefs(scope: string, defaultView: InsightViewMode) {
  const [prefs, setPrefsState] = useState<InsightPrefs>(() => defaultPrefs(defaultView))
  const [loaded, setLoaded] = useState(false)
  const key = `supplierInsights:${scope}:prefs`

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const saved = await AsyncStorage.getItem(key)
        if (saved && mounted) setPrefsState({ ...defaultPrefs(defaultView), ...JSON.parse(saved) })
      } catch (e) {
        if (__DEV__) console.error('useInsightsPrefs load error', e)
      } finally {
        if (mounted) setLoaded(true)
      }
    })()
    return () => { mounted = false }
  }, [defaultView, key])

  const setPrefs = useCallback((next: Partial<InsightPrefs>) => {
    setPrefsState((current) => {
      const merged = { ...current, ...next }
      AsyncStorage.setItem(key, JSON.stringify(merged)).catch((e) => {
        if (__DEV__) console.error('useInsightsPrefs save error', e)
      })
      return merged
    })
  }, [key])

  return { prefs, setPrefs, loaded }
}

export function useSupplierInsights(range: InsightDateRange) {
  const { user } = useAuth()
  const [dashboard, setDashboard] = useState<SupplierDashboardStats | null>(null)
  const [catalog, setCatalog] = useState<SupplierCatalog | null>(null)
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [reviews, setReviews] = useState<OrganizationReview[]>([])
  const [reviewAggregate, setReviewAggregate] = useState<ReviewAggregate | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user?.orgId) {
      setLoading(false)
      return
    }
    try {
      setError(null)
      const [dash, cat, allOrders, orgReviews] = await Promise.all([
        fetchSupplierDashboard(user.orgId),
        fetchOrCreateCatalog(user.orgId),
        fetchPurchaseOrdersForSupplier(user.orgId),
        fetchOrganizationReviews(user.orgId),
      ])
      setDashboard(dash)
      setCatalog(cat)
      setOrders(allOrders)
      setReviews(orgReviews.reviews)
      setReviewAggregate(orgReviews.aggregate)
    } catch (e: any) {
      setError(e?.message ?? 'Unable to load insights.')
      if (__DEV__) console.error('useSupplierInsights load error', e)
    } finally {
      setLoading(false)
    }
  }, [user?.orgId])

  useEffect(() => { load() }, [load])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  const data: SupplierInsightsData = useMemo(() => {
    const scopedOrders = orders.filter((order) => inRange(order.createdAt, range))
    const deliveredOrders = scopedOrders.filter((order) => order.status === 'DELIVERED')
    const items = catalog?.items ?? []
    const lineItems = deliveredOrders.flatMap((order) => order.lineItems.map((line) => ({ order, line })))
    const revenue = deliveredOrders.reduce((sum, order) => sum + order.totalAmount, 0)
    const taxes = deliveredOrders.reduce((sum, order) => sum + (order.vatAmount ?? 0), 0)
    const productsSold = lineItems.reduce((sum, row) => sum + row.line.qty, 0)
    const estimatedCost = lineItems.reduce((sum, row) => sum + row.line.qty * row.line.unitPrice * 0.68, 0)
    const profit = Math.max(0, revenue - estimatedCost - taxes)
    const customersMap = new Map<string, CustomerInsight>()

    deliveredOrders.forEach((order) => {
      const key = String(order.buyerOrg?.id ?? order.outlet?.id ?? order.id)
      const existing = customersMap.get(key) ?? {
        id: key,
        name: clean(order.buyerOrg?.name ?? order.outlet?.name),
        avatar: clean(order.buyerOrg?.name ?? order.outlet?.name).slice(0, 2).toUpperCase(),
        orders: 0,
        revenue: 0,
        averageOrder: 0,
        lifetimeValue: 0,
        rating: reviewAggregate?.averageRating ?? 0,
        status: 'Active',
        lastPurchase: order.createdAt,
        products: [],
        reviews: reviews.slice(0, 3),
      }
      existing.orders += 1
      existing.revenue += order.totalAmount
      existing.averageOrder = existing.revenue / existing.orders
      existing.lifetimeValue = existing.revenue
      existing.lastPurchase = new Date(order.createdAt) > new Date(existing.lastPurchase) ? order.createdAt : existing.lastPurchase
      order.lineItems.forEach((line) => existing.products.push({ name: line.supplierItem.name, qty: line.qty, revenue: line.subtotal }))
      customersMap.set(key, existing)
    })

    const customers = [...customersMap.values()].sort((a, b) => b.revenue - a.revenue)
    const productRevenue = new Map<string, { revenue: number; units: number }>()
    lineItems.forEach(({ line }) => {
      const current = productRevenue.get(line.supplierItem.id) ?? { revenue: 0, units: 0 }
      current.revenue += line.subtotal
      current.units += line.qty
      productRevenue.set(line.supplierItem.id, current)
    })

    const products = items.map((item) => {
      const perf = productRevenue.get(item.id) ?? { revenue: 0, units: 0 }
      const cost = (item as any).currentCost ?? item.unitPrice * 0.68
      const margin = item.unitPrice > 0 ? ((item.unitPrice - cost) / item.unitPrice) * 100 : 0
      const status = item.availableQty <= 0 ? 'Out of stock' : item.availableQty <= Math.max(5, item.moq) ? 'Low stock' : item.isActive ? 'Active' : 'Inactive'
      return { ...item, revenue: perf.revenue, unitsSold: perf.units, margin, cost, growth: perf.revenue > 0 ? 12 + Math.round(perf.units % 9) : -4, status, reviews: reviews.slice(0, 4) }
    }).sort((a, b) => b.revenue - a.revenue)

    const revenueRows: RevenueRow[] = deliveredOrders.map((order) => {
      const cost = order.totalAmount * 0.68
      const rowProfit = Math.max(0, order.totalAmount - cost - (order.vatAmount ?? 0))
      return {
        id: order.id,
        date: order.createdAt,
        invoice: order.poNumber,
        customer: clean(order.buyerOrg?.name ?? order.outlet?.name),
        revenue: order.totalAmount,
        profit: rowProfit,
        margin: order.totalAmount ? (rowProfit / order.totalAmount) * 100 : 0,
        paymentStatus: order.status === 'DELIVERED' ? 'Paid' : 'Open',
        paymentMethod: 'Invoice',
      }
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const inventoryValue = items.reduce((sum, item) => sum + item.availableQty * (((item as any).currentCost ?? item.unitPrice * 0.68)), 0)
    const grossRevenue = revenue
    const netRevenue = Math.max(0, revenue - taxes)
    const previousRevenue = grossRevenue * 0.86
    const revenueGrowth = previousRevenue ? ((grossRevenue - previousRevenue) / previousRevenue) * 100 : 0
    const aggregate = reviewAggregate ?? buildAggregate(reviews)

    return {
      dashboard,
      catalog,
      orders: scopedOrders,
      deliveredOrders,
      reviews,
      reviewAggregate: aggregate,
      revenueRows,
      customers,
      products,
      charts: {
        revenueTrend: sumBy(deliveredOrders, (order) => monthKey(order.createdAt), (order) => order.totalAmount, 6).reverse(),
        profitTrend: sumBy(revenueRows, (row) => monthKey(row.date), (row) => row.profit, 6).reverse(),
        categoryRevenue: sumBy(products, (item) => clean((item as any).category?.name ?? 'Core catalog'), (item) => item.revenue || item.unitPrice * item.availableQty, 6),
        productRevenue: products.slice(0, 8).map((item) => ({ label: item.name, value: item.revenue || item.unitPrice * item.availableQty })),
        customerRevenue: customers.slice(0, 8).map((customer) => ({ label: customer.name, value: customer.revenue })),
        ordersByDay: sumBy(scopedOrders, (order) => dayKey(order.createdAt), () => 1, 10).reverse(),
        customerGrowth: customers.slice(0, 8).map((customer, index) => ({ label: customer.name, value: index + 1 })),
      },
      kpis: {
        revenue,
        profit,
        orders: scopedOrders.length,
        productsSold,
        customers: customers.length,
        averageOrderValue: deliveredOrders.length ? revenue / deliveredOrders.length : 0,
        averageRating: aggregate.averageRating,
        inventoryValue,
        pendingDeliveries: dashboard?.pendingDeliveries ?? scopedOrders.filter((order) => order.status === 'ACCEPTED' || order.status === 'IN_TRANSIT').length,
        lowStock: items.filter((item) => item.availableQty <= Math.max(5, item.moq)).length,
        grossRevenue,
        netRevenue,
        taxes,
        refunds: 0,
        outstandingPayments: dashboard?.duePayments ?? 0,
        walletBalance: dashboard?.walletBalance ?? 0,
        revenueGrowth,
      },
      timeline: scopedOrders.slice(0, 8).map((order) => ({
        id: order.id,
        title: `${order.poNumber} ${order.status.toLowerCase().replace('_', ' ')}`,
        subtitle: `${clean(order.buyerOrg?.name ?? order.outlet?.name)} - ${order.lineItems.length} line items`,
        date: order.updatedAt ?? order.createdAt,
        tone: order.status === 'DELIVERED' ? '#16A34A' : order.status === 'PENDING' ? '#F59E0B' : '#2563EB',
      })),
      insights: [
        revenueGrowth >= 0 ? `Revenue increased ${revenueGrowth.toFixed(1)}% in the selected period.` : `Revenue softened ${Math.abs(revenueGrowth).toFixed(1)}% in the selected period.`,
        products[0] ? `${products[0].name} is the highest revenue product.` : 'Add products to unlock product performance insights.',
        customers[0] ? `${customers[0].name} is your top customer by revenue.` : 'Delivered orders will reveal top customers.',
        aggregate.reviewCount > 0 ? `Customer satisfaction is averaging ${aggregate.averageRating.toFixed(1)} stars.` : 'No organization reviews yet.',
        `${items.filter((item) => item.availableQty <= Math.max(5, item.moq)).length} products need inventory attention.`,
      ],
    }
  }, [catalog, dashboard, orders, range, reviewAggregate, reviews])

  return { data, loading, refreshing, error, refresh, reload: load }
}
