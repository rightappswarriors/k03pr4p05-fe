export type CustomerSort = 'REVENUE' | 'NET' | 'ORDERS' | 'AVERAGE' | 'CONTRIBUTION' | 'LATEST_PURCHASE' | 'FIRST_PURCHASE'
export interface CustomerOptions { customerPage: number; customerLimit: number; customerSort: CustomerSort; customerDirection: 'ASC' | 'DESC' }
export interface CustomerMetrics {
  uniqueCustomers: number; newCustomers: number; returningCustomers: number
  revenue: number; averageOrderValue: number | null; repeatCustomerRate: number | null
}
export interface CustomerPerformance {
  customerKey: string; displayName: string; customerType: 'ORGANIZATION' | 'AGENT'; status: 'NEW' | 'RETURNING'
  revenue: number; fees: number; netEarnings: number; settledOrders: number; averageOrderValue: number
  firstPurchase: string; latestPurchase: string; contribution: number; previousRevenue: number
}
export interface CustomerAnalytics {
  metrics: CustomerMetrics; previousMetrics: CustomerMetrics
  revenueTrend: { bucket: string; revenue: number; activeCustomers: number }[]
  lifecycleTrend: { bucket: string; newCustomers: number; returningCustomers: number }[]
  topCustomers: CustomerPerformance[]
  contribution: { key: string; name: string; amount: number; percentage: number }[]
  concentration: { top1Share: number; top3Share: number; top5Share: number }
  diagnostics: { period: string; unresolvedSettlements: number; unresolvedGross: number; unresolvedFees: number; unresolvedNet: number }[]
  performance: { items: CustomerPerformance[]; total: number; page: number; limit: number; totalPages: number; sort: CustomerSort; direction: 'ASC' | 'DESC' }
}
