export type OrderSort = 'CREATED' | 'COMPLETED' | 'FULFILLMENT' | 'STATUS' | 'AMOUNT'
export interface OrderOptions { orderPage: number; orderLimit: number; orderSort: OrderSort; orderDirection: 'ASC' | 'DESC' }
export interface OrderMetrics {
  totalOrders: number; completedOrders: number; inProgressOrders: number; cancelledRejected: number
  completionRate: number | null; averageFulfillmentHours: number | null; invalidDurationCount: number
}
export interface OrderPerformance {
  id: string; poNumber: string; buyerName: string; status: string; source: string
  supplierConfirmation: string; paymentStatus: string; deliveryStatus: string
  createdAt: string; supplierConfirmedAt: string | null; completedAt: string | null; totalAmount: number; itemCount: number; fulfillmentHours: number | null
}
export interface OrderAnalytics {
  metrics: OrderMetrics; previousMetrics: OrderMetrics
  volumeTrend: { bucket: string; created: number; completed: number }[]
  statusDistribution: { label: string; count: number; percentage: number }[]
  stageDurations: { stage: string; averageHours: number; sampleCount: number }[]
  deliveryPerformance: { deliveredOrders: number; eligibleOrders: number; onTimeOrders: number; lateOrders: number; onTimeRate: number | null; averageDelayDays: number | null }
  backlog: { status: string; count: number }[]
  aging: { bucket: string; count: number }[]
  slowestOrders: OrderPerformance[]
  performance: { items: OrderPerformance[]; total: number; page: number; limit: number; totalPages: number; sort: OrderSort; direction: 'ASC' | 'DESC' }
}
