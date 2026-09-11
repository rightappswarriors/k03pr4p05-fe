export type ProductSort = 'REVENUE' | 'NET' | 'QUANTITY' | 'ORDERS' | 'AVERAGE' | 'CONTRIBUTION'
export interface ProductOptions { productPage: number; productLimit: number; productSort: ProductSort; productDirection: 'ASC' | 'DESC' }
export interface ProductMetrics {
  revenue: number; fees: number; netEarnings: number; quantity: number; settledOrders: number
  activeSellingProducts: number; averageSellingValue: number | null; topProductContribution: number
}
export interface ProductPerformance {
  itemId: string; name: string; sku: string; unit: string; category: string
  revenue: number; fees: number; netEarnings: number; quantity: number; settledOrders: number
  averageSellingValue: number | null; previousRevenue: number; contribution: number
}
export interface ProductAnalytics {
  metrics: ProductMetrics; previousMetrics: ProductMetrics
  trend: { bucket: string; revenue: number; quantity: number; settledOrders: number }[]
  topProducts: ProductPerformance[]; quantityLeaders: ProductPerformance[]
  contribution: { key: string; name: string; amount: number; percentage: number }[]
  diagnostics: { period: string; reason: string; settledOrders: number; unallocatedGross: number; unallocatedFees: number; unallocatedNet: number }[]
  performance: { items: ProductPerformance[]; total: number; page: number; limit: number; totalPages: number; sort: ProductSort; direction: 'ASC' | 'DESC' }
}
