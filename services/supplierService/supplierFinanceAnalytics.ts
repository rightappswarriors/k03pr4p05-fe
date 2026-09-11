export type FeeSort = 'SETTLED' | 'GROSS' | 'FEE' | 'NET' | 'RATE'
export interface FeeOptions { feePage: number; feeLimit: number; feeSort: FeeSort; feeDirection: 'ASC' | 'DESC' }
export interface FeeMetrics { platformFees: number; grossSettled: number; netEarnings: number; effectiveFeeRate: number | null; averageFee: number | null; settlementsWithFees: number; settlementCount: number }
export interface FeeHistoryItem {
  id: string; poId: string; poNumber: string; settledAt: string; gross: number; fee: number; net: number
  effectiveRate: number | null; feeRuleId: string | null; snapshotRate: number | null; snapshotRateType: string | null
  snapshotCategory: string | null; snapshotUnitType: string | null; environment: string; postingState: string
}
export interface FeeAnalytics {
  metrics: FeeMetrics; previousMetrics: FeeMetrics
  trend: { bucket: string; grossSettled: number; platformFees: number; netEarnings: number; effectiveFeeRate: number | null; settlementCount: number }[]
  composition: { key: string; label: string; settlementCount: number; platformFees: number; percentage: number }[]
  highestFeeSettlements: FeeHistoryItem[]
  history: { items: FeeHistoryItem[]; total: number; page: number; limit: number; totalPages: number; sort: FeeSort; direction: 'ASC' | 'DESC' }
}

export type PayoutSort = 'REQUESTED' | 'COMPLETED' | 'AMOUNT' | 'STATUS' | 'PROCESSING'
export interface PayoutOptions { payoutPage: number; payoutLimit: number; payoutSort: PayoutSort; payoutDirection: 'ASC' | 'DESC' }
export interface PayoutMetrics {
  requestedCount: number; requestedAmount: number; completedCount: number; paidOutAmount: number
  processingPendingCount: number; failedRejectedCount: number; successRate: number | null; averageProcessingHours: number | null
  reconciliationRequiredCount: number; legacyNoAttemptCount: number; providerAttemptCount: number; invalidDurationCount: number
}
export interface PayoutHistoryItem {
  id: number; reference: string; amount: number; withdrawalStatus: string; analyticsStatus: string; requestedAt: string
  approvedAt: string | null; completedAt: string | null; terminalAt: string | null; processingHours: number | null
  methodType: string; methodLabel: string; destinationMasked: string | null; attemptCount: number
  latestAttemptStatus: string | null; provider: string | null; providerReference: string | null
  legacyNoAttempt: boolean; reconciliationRequired: boolean; invalidDuration: boolean; periodScope: string; environment: string
}
export interface PayoutAnalytics {
  metrics: PayoutMetrics; previousMetrics: PayoutMetrics
  activityTrend: { bucket: string; requestedCount: number; requestedAmount: number; completedCount: number; completedAmount: number }[]
  outcomeTrend: { bucket: string; completed: number; failedRejected: number }[]
  statusDistribution: { key: string; label: string; count: number; percentage: number }[]
  methodBreakdown: { key: string; label: string; completedCount: number; completedAmount: number }[]
  history: { items: PayoutHistoryItem[]; total: number; page: number; limit: number; totalPages: number; sort: PayoutSort; direction: 'ASC' | 'DESC' }
}
