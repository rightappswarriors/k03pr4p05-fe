import assert from 'node:assert/strict'
import { formatManilaBucketLabel, normalizePayoutActivity, payoutActivityLabelIndexes } from '../components/supplier/analytics/payoutActivityLine'

const base = (requested: number[], completed: number[]) => normalizePayoutActivity(requested.map((requestedCount, index) => ({ bucket: `2026-09-${String(index + 1).padStart(2, '0')}`, requestedCount, completedCount: completed[index] ?? 0, requestedAmount: requestedCount * 500, completedAmount: (completed[index] ?? 0) * 500 })))

const sparse = base([0, 0, 1, 1, 0], [0, 0, 0, 2, 0])
assert.equal(sparse.length, 5)
assert.deepEqual(sparse.map(point => point.requestedCount), [0, 0, 1, 1, 0])
assert.deepEqual(sparse.map(point => point.completedCount), [0, 0, 0, 2, 0])

const allZero = base([0, 0, 0], [0, 0, 0])
assert.ok(allZero.every(point => point.requestedCount === 0 && point.completedCount === 0))
assert.equal(base([1], [0]).length, 1)
assert.deepEqual(base([0, 0, 0], [0, 2, 0]).map(point => point.completedCount), [0, 2, 0])

const safe = normalizePayoutActivity([{ bucket: '2026-09-01', requestedCount: Number.NaN, completedCount: Infinity, requestedAmount: -1, completedAmount: 3 }])
assert.deepEqual(safe[0], { bucket: '2026-09-01', requestedCount: 0, completedCount: 0, requestedAmount: 0, completedAmount: 3 })
assert.equal(formatManilaBucketLabel('2026-09-01'), 'Sep 1')
assert.equal(formatManilaBucketLabel('2026-08-31T16:00:00.000Z'), 'Sep 1')
assert.equal(formatManilaBucketLabel('not-a-date'), 'not-a-date')
for (const width of [390, 1440]) {
  const labels = payoutActivityLabelIndexes(30, width < 400 ? 5 : 7)
  assert.ok(labels.has(29))
  assert.ok(labels.size >= 5 && labels.size <= 8)
}
process.stdout.write('Payout activity line verification passed.\n')
