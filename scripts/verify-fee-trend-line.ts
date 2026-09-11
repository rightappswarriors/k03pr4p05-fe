import assert from 'node:assert/strict'
import { feeTrendLineGeometry, normalizeFeeTrendValue } from '../components/supplier/analytics/feeTrendLine'

const WIDTH = 300
const HEIGHT = 180

const assertGeometry = (name: string, values: number[], markerIndices: number[]) => {
  const geometry = feeTrendLineGeometry(values, WIDTH, HEIGHT)
  assert.equal(geometry.length, values.length, `${name}: retains every zero-filled bucket`)
  assert.deepEqual(geometry.flatMap((point, index) => point.marker ? [index] : []), markerIndices, `${name}: markers only for non-zero fees`)
  for (const point of geometry) {
    assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y), `${name}: finite point geometry`)
    assert.ok(point.x >= 0 && point.x <= WIDTH, `${name}: x is in chart bounds`)
    assert.ok(point.y >= 0 && point.y <= HEIGHT, `${name}: y is in chart bounds`)
    assert.ok(point.value >= 0, `${name}: no negative chart value`)
  }
  return geometry
}

const sparse = assertGeometry('A sparse weekly series', [0, 0, 0, 175, 0, 0, 0, 0], [3])
assert.ok(sparse[3].y < sparse[0].y, 'A: non-zero period rises above the zero baseline')

const allZero = assertGeometry('B all-zero series', [0, 0, 0, 0, 0, 0], [])
assert.ok(allZero.every(point => point.y === HEIGHT), 'B: all-zero series remains a baseline')

const oneBucket = assertGeometry('C one-bucket series', [87.5], [0])
assert.equal(oneBucket[0].x, WIDTH / 2, 'C: a single point is centred')

const uneven = assertGeometry('D uneven values', [0.01, 2500, 87.5, 100000], [0, 1, 2, 3])
assert.ok(uneven[3].y < uneven[1].y && uneven[1].y < uneven[2].y, 'D: values retain relative height')

const mixed = assertGeometry('E populated and zero buckets', [125, 0, 75, 0, 0], [0, 2])
assert.equal(mixed[0].x, 0, 'E: first bucket begins at the chart edge')
assert.equal(mixed.at(-1)?.x, WIDTH, 'E: final bucket reaches the chart edge')

assert.equal(normalizeFeeTrendValue(Number.NaN), 0, 'invalid NaN values are safe')
assert.equal(normalizeFeeTrendValue(Number.POSITIVE_INFINITY), 0, 'invalid infinite values are safe')
assert.equal(normalizeFeeTrendValue(-1), 0, 'negative values are safe')

process.stdout.write('Fee trend line geometry verification passed.\n')
