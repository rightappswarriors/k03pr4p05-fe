export interface FeeTrendLineGeometry {
  marker: boolean
  value: number
  x: number
  y: number
}

export const normalizeFeeTrendValue = (value: number) => (
  Number.isFinite(value) && value > 0 ? value : 0
)

/** Renderer-independent sparse-series checks; RevenueTrendChart remains the UI. */
export const feeTrendLineGeometry = (
  values: number[],
  width = 300,
  height = 180
): FeeTrendLineGeometry[] => {
  const safeValues = values.map(normalizeFeeTrendValue)
  const safeWidth = Math.max(0, Number.isFinite(width) ? width : 0)
  const safeHeight = Math.max(0, Number.isFinite(height) ? height : 0)
  const maximum = Math.max(1, ...safeValues)
  const divisor = Math.max(1, safeValues.length - 1)

  return safeValues.map((value, index) => ({
    marker: value > 0,
    value,
    x: safeValues.length === 1 ? safeWidth / 2 : (safeWidth * index) / divisor,
    y: safeHeight - (value / maximum) * safeHeight
  }))
}
