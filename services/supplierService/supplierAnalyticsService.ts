import { gql } from 'graphql-request'
import { graphQLRequest } from '../apiClient'
import type { CustomerAnalytics, CustomerOptions } from './supplierCustomerAnalytics'
import type { ProductAnalytics, ProductOptions } from './supplierProductAnalytics'
import type { OrderAnalytics, OrderOptions } from './supplierOrderAnalytics'
import type { FeeAnalytics, FeeOptions, PayoutAnalytics, PayoutOptions } from './supplierFinanceAnalytics'

export interface AnalyticsRange { startDate: string; endDate: string }
export interface AnalyticsInput extends AnalyticsRange, Partial<ProductOptions>, Partial<CustomerOptions>, Partial<OrderOptions>, Partial<FeeOptions>, Partial<PayoutOptions> { search?: string }
export interface AnalyticsMetrics {
  grossSales: number; netEarnings: number; totalOrders: number
  platformFees: number; productsSold: number; customers: number
  settledOrders: number
}
export interface AnalyticsTrend { bucket: string; grossSales: number; netEarnings: number; platformFees: number; settledOrders: number }
export interface AnalyticsOrder {
  id: string; poNumber: string; date: string; buyerName: string; itemCount: number
  grossAmount: number; platformFee: number; netAmount: number; status: string
}
export interface SupplierAnalyticsData {
  range: AnalyticsRange; comparisonRange: AnalyticsRange; interval: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  environment: string; supplierName: string; search: string; kpis: AnalyticsMetrics; previousKpis: AnalyticsMetrics
  revenueTrend: AnalyticsTrend[]
  categorySales: { key: string; name: string; amount: number; percentage: number }[]
  orderStatuses: { label: string; count: number; percentage: number }[]
  topProducts: { id: string; name: string; quantity: number }[]
  topCustomers: { key: string; name: string; amount: number; orderCount: number }[]
  recentOrders: AnalyticsOrder[]
  productAnalytics: ProductAnalytics
  customerAnalytics: CustomerAnalytics
  orderAnalytics: OrderAnalytics
  feeAnalytics: FeeAnalytics
  payoutAnalytics: PayoutAnalytics
}

export const SUPPLIER_ANALYTICS_QUERY = gql`
  query SupplierAnalytics($input: SupplierAnalyticsInput!) {
    supplierAnalytics(input: $input) {
      range { startDate endDate } comparisonRange { startDate endDate }
      interval environment supplierName search
      kpis { grossSales netEarnings totalOrders platformFees productsSold customers settledOrders }
      previousKpis { grossSales netEarnings totalOrders platformFees productsSold customers settledOrders }
      revenueTrend { bucket grossSales netEarnings platformFees settledOrders }
      categorySales { key name amount percentage }
      orderStatuses { label count percentage }
      topProducts { id name quantity }
      topCustomers { key name amount orderCount }
      recentOrders { id poNumber date buyerName itemCount grossAmount platformFee netAmount status }
      productAnalytics {
        metrics { revenue fees netEarnings quantity settledOrders activeSellingProducts averageSellingValue topProductContribution }
        previousMetrics { revenue fees netEarnings quantity settledOrders activeSellingProducts averageSellingValue topProductContribution }
        trend { bucket revenue quantity settledOrders }
        topProducts { ...ProductPerformanceFields }
        quantityLeaders { ...ProductPerformanceFields }
        contribution { key name amount percentage }
        diagnostics { period reason settledOrders unallocatedGross unallocatedFees unallocatedNet }
        performance { items { ...ProductPerformanceFields } total page limit totalPages sort direction }
      }
      customerAnalytics {
        metrics { uniqueCustomers newCustomers returningCustomers revenue averageOrderValue repeatCustomerRate }
        previousMetrics { uniqueCustomers newCustomers returningCustomers revenue averageOrderValue repeatCustomerRate }
        revenueTrend { bucket revenue activeCustomers }
        lifecycleTrend { bucket newCustomers returningCustomers }
        topCustomers { ...CustomerPerformanceFields }
        contribution { key name amount percentage }
        concentration { top1Share top3Share top5Share }
        diagnostics { period unresolvedSettlements unresolvedGross unresolvedFees unresolvedNet }
        performance { items { ...CustomerPerformanceFields } total page limit totalPages sort direction }
      }
      orderAnalytics {
        metrics { totalOrders completedOrders inProgressOrders cancelledRejected completionRate averageFulfillmentHours invalidDurationCount }
        previousMetrics { totalOrders completedOrders inProgressOrders cancelledRejected completionRate averageFulfillmentHours invalidDurationCount }
        volumeTrend { bucket created completed }
        statusDistribution { label count percentage }
        stageDurations { stage averageHours sampleCount }
        deliveryPerformance { deliveredOrders eligibleOrders onTimeOrders lateOrders onTimeRate averageDelayDays }
        backlog { status count }
        aging { bucket count }
        slowestOrders { ...OrderPerformanceFields }
        performance { items { ...OrderPerformanceFields } total page limit totalPages sort direction }
      }
      feeAnalytics {
        metrics { platformFees grossSettled netEarnings effectiveFeeRate averageFee settlementsWithFees settlementCount }
        previousMetrics { platformFees grossSettled netEarnings effectiveFeeRate averageFee settlementsWithFees settlementCount }
        trend { bucket grossSettled platformFees netEarnings effectiveFeeRate settlementCount }
        composition { key label settlementCount platformFees percentage }
        highestFeeSettlements { ...FeeHistoryFields }
        history { items { ...FeeHistoryFields } total page limit totalPages sort direction }
      }
      payoutAnalytics {
        metrics { requestedCount requestedAmount completedCount paidOutAmount processingPendingCount failedRejectedCount successRate averageProcessingHours reconciliationRequiredCount legacyNoAttemptCount providerAttemptCount invalidDurationCount }
        previousMetrics { requestedCount requestedAmount completedCount paidOutAmount processingPendingCount failedRejectedCount successRate averageProcessingHours reconciliationRequiredCount legacyNoAttemptCount providerAttemptCount invalidDurationCount }
        activityTrend { bucket requestedCount requestedAmount completedCount completedAmount }
        outcomeTrend { bucket completed failedRejected }
        statusDistribution { key label count percentage }
        methodBreakdown { key label completedCount completedAmount }
        history { items { id reference amount withdrawalStatus analyticsStatus requestedAt approvedAt completedAt terminalAt processingHours methodType methodLabel destinationMasked attemptCount latestAttemptStatus provider providerReference legacyNoAttempt reconciliationRequired invalidDuration periodScope environment } total page limit totalPages sort direction }
      }
    }
  }
  fragment ProductPerformanceFields on SupplierProductPerformance {
    itemId name sku unit category revenue fees netEarnings quantity settledOrders averageSellingValue previousRevenue contribution
  }
  fragment CustomerPerformanceFields on SupplierCustomerPerformance {
    customerKey displayName customerType status revenue fees netEarnings settledOrders averageOrderValue
    firstPurchase latestPurchase contribution previousRevenue
  }
  fragment OrderPerformanceFields on SupplierOrderPerformance {
    id poNumber buyerName status source supplierConfirmation paymentStatus deliveryStatus
    createdAt supplierConfirmedAt completedAt totalAmount itemCount fulfillmentHours
  }
  fragment FeeHistoryFields on SupplierFeeHistoryItem {
    id poId poNumber settledAt gross fee net effectiveRate feeRuleId snapshotRate snapshotRateType snapshotCategory snapshotUnitType environment postingState
  }
`
export async function getSupplierAnalytics(input: AnalyticsInput) {
  return (await graphQLRequest<{ supplierAnalytics: SupplierAnalyticsData }>(SUPPLIER_ANALYTICS_QUERY, { input })).supplierAnalytics
}

export function comparisonLabel(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 'No change' : 'New activity'
  const change = ((current - previous) / previous) * 100
  return change === 0 ? 'No change' : `${change > 0 ? '↑' : '↓'} ${Math.abs(change).toFixed(1)}%`
}

export function averageOrderValue(metrics: { grossSales: number; settledOrders: number }) {
  return metrics.settledOrders > 0 ? metrics.grossSales / metrics.settledOrders : null
}

/** CSV uses the returned range/search, never a newer, still-loading filter selection. */
export function analyticsCSV(data: SupplierAnalyticsData, supplier: string) {
  const rows: (string | number)[][] = [
    ['Kompra Supplier Analytics'], ['Supplier', supplier], ['Environment', data.environment],
    ['From', data.range.startDate], ['To', data.range.endDate], ['Timezone', 'Asia/Manila'],
    ['Generated', new Date().toISOString()], ['Search', data.search],
    ['Comparison from', data.comparisonRange.startDate], ['Comparison to', data.comparisonRange.endDate], [],
    ['Metric', 'Current', 'Previous'],
    ...Object.entries(data.kpis).map(([key, value]) => [key, value, data.previousKpis[key as keyof AnalyticsMetrics]]), [],
    ['Average Order Value PHP', averageOrderValue(data.kpis) ?? 'N/A', averageOrderValue(data.previousKpis) ?? 'N/A'], [],
    ['Revenue trend (bucket start; edge periods may be partial)', 'Gross sales PHP', 'Net earnings PHP', 'Platform fees PHP', 'Settled orders', 'Average Order Value PHP'],
    ...data.revenueTrend.map(p => [p.bucket, p.grossSales, p.netEarnings, p.platformFees, p.settledOrders, averageOrderValue(p) ?? 'N/A']), [],
    ['Category (current assignment)', 'Product subtotal PHP', 'Percentage'],
    ...data.categorySales.map(c => [c.name, c.amount, c.percentage]), [],
    ['Order status (created in range)', 'Count', 'Percentage'],
    ...data.orderStatuses.map(s => [s.label, s.count, s.percentage]), [],
    ['Top products', 'Units sold'], ...data.topProducts.map(p => [p.name, p.quantity]), [],
    ['Top buyers', 'Settled gross PHP', 'Order count'], ...data.topCustomers.map(b => [b.name, b.amount, b.orderCount]), [],
    ['Recent settled orders (up to 5)', 'Settlement date', 'Buyer', 'Line items', 'Gross PHP', 'Fee PHP', 'Net PHP', 'Status'],
    ...data.recentOrders.map(o => [o.poNumber, o.date, o.buyerName, o.itemCount, o.grossAmount, o.platformFee, o.netAmount, o.status]),
    [], ['PRODUCT ANALYTICS'], ['Allocation', 'Historical line subtotal weights; fees and net allocated in centavos; gross = fees + net'],
    ['Quantity', 'Sum of saved line counts; units and categories are current catalog metadata, not historical snapshots'],
    ['Product metric', 'Current', 'Previous'],
    ...Object.entries(data.productAnalytics.metrics).map(([key, value]) => [key, value ?? 'N/A', data.productAnalytics.previousMetrics[key as keyof ProductAnalytics['metrics']] ?? 'N/A']), [],
    ['Product revenue trend (bucket start)', 'Revenue PHP', 'Quantity', 'Settled orders'],
    ...data.productAnalytics.trend.map(p => [p.bucket, p.revenue, p.quantity, p.settledOrders]), [],
    ['Revenue contribution', 'Revenue PHP', 'Percentage'],
    ...data.productAnalytics.contribution.map(p => [p.name, p.amount, p.percentage]), [],
    ['Product Performance — loaded page only', data.productAnalytics.performance.page, 'of', data.productAnalytics.performance.totalPages,
      'Page size', data.productAnalytics.performance.limit, 'Total products', data.productAnalytics.performance.total,
      'Sort', data.productAnalytics.performance.sort, data.productAnalytics.performance.direction],
    ['Product', 'SKU', 'Category (current)', 'Revenue PHP', 'Platform Fees PHP', 'Net Earnings PHP', 'Quantity Sold', 'Unit (current)', 'Settled Orders', 'Average Selling Value PHP', 'Contribution %', 'Previous Revenue PHP', 'Revenue trend'],
    ...data.productAnalytics.performance.items.map(p => [p.name, p.sku, p.category, p.revenue, p.fees, p.netEarnings, p.quantity, p.unit, p.settledOrders, p.averageSellingValue ?? 'N/A', p.contribution, p.previousRevenue, comparisonLabel(p.revenue, p.previousRevenue)]), [],
    ['Allocation diagnostics', 'Reason', 'Settled orders', 'Unallocated gross PHP', 'Unallocated fees PHP', 'Unallocated net PHP'],
    ...data.productAnalytics.diagnostics.map(d => [d.period, d.reason, d.settledOrders, d.unallocatedGross, d.unallocatedFees, d.unallocatedNet]),
    [], ['CUSTOMER ANALYTICS'], ['Identity', 'Organization ID first; otherwise Agent ID. Unresolved settlements are reported separately.'],
    ['Customer metric', 'Current', 'Previous'],
    ...Object.entries(data.customerAnalytics.metrics).map(([key, value]) => [key, value ?? 'N/A', data.customerAnalytics.previousMetrics[key as keyof CustomerAnalytics['metrics']] ?? 'N/A']), [],
    ['Customer revenue trend (bucket start)', 'Revenue PHP', 'Unique active customers'],
    ...data.customerAnalytics.revenueTrend.map(p => [p.bucket, p.revenue, p.activeCustomers]), [],
    ['New vs Returning (bucket start)', 'New customers', 'Returning customers'],
    ...data.customerAnalytics.lifecycleTrend.map(p => [p.bucket, p.newCustomers, p.returningCustomers]), [],
    ['Customer concentration', 'Share %'], ['Top 1', data.customerAnalytics.concentration.top1Share], ['Top 3', data.customerAnalytics.concentration.top3Share], ['Top 5', data.customerAnalytics.concentration.top5Share], [],
    ['Customer Performance — loaded page only', data.customerAnalytics.performance.page, 'of', data.customerAnalytics.performance.totalPages,
      'Page size', data.customerAnalytics.performance.limit, 'Total customers', data.customerAnalytics.performance.total,
      'Sort', data.customerAnalytics.performance.sort, data.customerAnalytics.performance.direction],
    ['Customer', 'Type', 'New/Returning', 'Revenue PHP', 'Platform Fees PHP', 'Net Earnings PHP', 'Settled Orders', 'Average Order Value PHP', 'First Purchase', 'Latest Purchase', 'Contribution %', 'Previous Revenue PHP', 'Trend'],
    ...data.customerAnalytics.performance.items.map(c => [c.displayName, c.customerType, c.status, c.revenue, c.fees, c.netEarnings, c.settledOrders, c.averageOrderValue, c.firstPurchase, c.latestPurchase, c.contribution, c.previousRevenue, comparisonLabel(c.revenue, c.previousRevenue)]), [],
    ['Unresolved customer diagnostics', 'Settlements', 'Gross PHP', 'Platform Fees PHP', 'Net Earnings PHP'],
    ...data.customerAnalytics.diagnostics.map(d => [d.period, d.unresolvedSettlements, d.unresolvedGross, d.unresolvedFees, d.unresolvedNet]),
    [], ['ORDER ANALYTICS'], ['Population', 'Orders created in the selected Manila dates; backlog is current and date-range independent.'],
    ['Order metric', 'Current', 'Previous'],
    ...Object.entries(data.orderAnalytics.metrics).map(([key, value]) => [key, value ?? 'N/A', data.orderAnalytics.previousMetrics[key as keyof OrderAnalytics['metrics']] ?? 'N/A']), [],
    ['Order volume trend (bucket start)', 'Orders created', 'Orders completed (buyer confirmation date)'],
    ...data.orderAnalytics.volumeTrend.map(p => [p.bucket, p.created, p.completed]), [],
    ['Order status', 'Count', 'Percentage'], ...data.orderAnalytics.statusDistribution.map(s => [s.label, s.count, s.percentage]), [],
    ['Fulfillment stage duration', 'Average hours', 'Sample count'], ...data.orderAnalytics.stageDurations.map(s => [s.stage, s.averageHours, s.sampleCount]), [],
    ['Delivery performance', 'Value'], ['Delivered orders', data.orderAnalytics.deliveryPerformance.deliveredOrders], ['Eligible agreed-date deliveries', data.orderAnalytics.deliveryPerformance.eligibleOrders],
    ['On time', data.orderAnalytics.deliveryPerformance.onTimeOrders], ['Late', data.orderAnalytics.deliveryPerformance.lateOrders], ['On-time rate', data.orderAnalytics.deliveryPerformance.onTimeRate ?? 'N/A'], ['Average delay days', data.orderAnalytics.deliveryPerformance.averageDelayDays ?? 'N/A'], [],
    ['Current backlog (not date-range constrained)', 'Count'], ...data.orderAnalytics.backlog.map(b => [b.status, b.count]), [],
    ['Current backlog age since creation', 'Count'], ...data.orderAnalytics.aging.map(a => [a.bucket, a.count]), [],
    ['Order Performance — loaded page only', data.orderAnalytics.performance.page, 'of', data.orderAnalytics.performance.totalPages, 'Page size', data.orderAnalytics.performance.limit, 'Total orders', data.orderAnalytics.performance.total, 'Sort', data.orderAnalytics.performance.sort, data.orderAnalytics.performance.direction],
    ['PO #', 'Buyer', 'Created', 'Current status', 'Source', 'Supplier confirmation', 'Payment', 'Delivery', 'Items', 'Fulfillment hours'],
    ...data.orderAnalytics.performance.items.map(o => [o.poNumber, o.buyerName, o.createdAt, o.status, o.source, o.supplierConfirmation, o.paymentStatus, o.deliveryStatus, o.itemCount, o.fulfillmentHours ?? 'N/A']),
    [], ['FEES ANALYTICS'], ['Source', 'Immutable PurchaseOrderSettlement amounts and historical fee snapshot'],
    ['Fee metric', 'Current', 'Previous'],
    ...Object.entries(data.feeAnalytics.metrics).map(([key, value]) => [key, value ?? 'N/A', data.feeAnalytics.previousMetrics[key as keyof FeeAnalytics['metrics']] ?? 'N/A']), [],
    ['Fee trend', 'Gross settled PHP', 'Platform fees PHP', 'Supplier net PHP', 'Effective rate %', 'Settlements'],
    ...data.feeAnalytics.trend.map(p => [p.bucket, p.grossSettled, p.platformFees, p.netEarnings, p.effectiveFeeRate ?? 'N/A', p.settlementCount]), [],
    ['Fee History — loaded page only', data.feeAnalytics.history.page, 'of', data.feeAnalytics.history.totalPages, 'Page size', data.feeAnalytics.history.limit, 'Total settlements', data.feeAnalytics.history.total, 'Sort', data.feeAnalytics.history.sort, data.feeAnalytics.history.direction],
    ['PO', 'Settled at', 'Gross PHP', 'Fee PHP', 'Net PHP', 'Effective rate %', 'Historical rule type', 'Historical rate', 'Posting state'],
    ...data.feeAnalytics.history.items.map(f => [f.poNumber, f.settledAt, f.gross, f.fee, f.net, f.effectiveRate ?? 'N/A', f.snapshotRateType ?? 'Unavailable', f.snapshotRate ?? 'N/A', f.postingState]),
    [], ['PAYOUTS ANALYTICS'], ['Money source', 'One Withdrawal row per payout; provider attempts are evidence only and never multiply amounts'],
    ['Success rate denominator', 'Completed + Failed + Rejected terminal outcomes'],
    ['Payout metric', 'Current', 'Previous'],
    ...Object.entries(data.payoutAnalytics.metrics).map(([key, value]) => [key, value ?? 'N/A', data.payoutAnalytics.previousMetrics[key as keyof PayoutAnalytics['metrics']] ?? 'N/A']), [],
    ['Payout activity', 'Requested count', 'Requested PHP', 'Completed count', 'Paid out PHP'],
    ...data.payoutAnalytics.activityTrend.map(p => [p.bucket, p.requestedCount, p.requestedAmount, p.completedCount, p.completedAmount]), [],
    ['Payout History — loaded page only', data.payoutAnalytics.history.page, 'of', data.payoutAnalytics.history.totalPages, 'Page size', data.payoutAnalytics.history.limit, 'Total events', data.payoutAnalytics.history.total, 'Sort', data.payoutAnalytics.history.sort, data.payoutAnalytics.history.direction],
    ['Reference', 'Amount PHP', 'Status', 'Requested', 'Completed/terminal', 'Processing hours', 'Method', 'Masked destination', 'Attempts', 'Evidence'],
    ...data.payoutAnalytics.history.items.map(p => [p.reference, p.amount, p.analyticsStatus, p.requestedAt, p.completedAt ?? p.terminalAt ?? '', p.processingHours ?? 'N/A', p.methodLabel, p.destinationMasked ?? '', p.attemptCount, p.legacyNoAttempt ? 'Legacy sandbox completion — provider attempt evidence unavailable' : p.latestAttemptStatus ?? 'No attempt']),
  ]
  return '\uFEFF' + rows.map(row => row.map(value => {
    // Neutralise spreadsheet formula injection in supplier/product/buyer names.
    const s = typeof value === 'string' && /^[\s]*[=+@-]/.test(value) ? `'${value}` : String(value)
    return `"${s.replace(/"/g, '""')}"`
  }).join(',')).join('\r\n')
}
