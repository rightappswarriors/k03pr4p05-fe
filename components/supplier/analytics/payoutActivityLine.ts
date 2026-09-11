export interface PayoutActivityPoint {
  bucket: string
  requestedCount: number
  requestedAmount: number
  completedCount: number
  completedAmount: number
}

const nonNegative = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0

/** Keeps the server's zero-filled sequence intact while making chart data safe. */
export function normalizePayoutActivity(points: PayoutActivityPoint[]): PayoutActivityPoint[] {
  return points.map((point) => ({
    ...point,
    requestedCount: nonNegative(point.requestedCount),
    requestedAmount: nonNegative(point.requestedAmount),
    completedCount: nonNegative(point.completedCount),
    completedAmount: nonNegative(point.completedAmount),
  }))
}

export function payoutActivityLabelIndexes(length: number, target: number): Set<number> {
  if (length <= 0) return new Set()
  const stride = Math.max(1, Math.ceil(length / Math.max(1, target)))
  const indexes = new Set<number>()
  for (let index = 0; index < length; index += stride) indexes.add(index)
  indexes.add(length - 1)
  return indexes
}

/** Formats date-only Manila buckets and ISO timestamps without producing Invalid Date labels. */
export function formatManilaBucketLabel(bucket: string): string {
  const source = String(bucket ?? '').trim()
  const candidate = /^\d{4}-\d{2}-\d{2}$/.test(source) ? `${source}T12:00:00+08:00` : source
  const date = new Date(candidate)
  if (Number.isNaN(date.getTime())) return source || 'Unknown period'
  return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', timeZone: 'Asia/Manila' }).format(date)
}
