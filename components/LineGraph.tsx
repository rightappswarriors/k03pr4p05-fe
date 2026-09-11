import React, { useState } from 'react'
import { Text, View } from 'react-native'
import { LineChart } from 'react-native-chart-kit'
import { useTheme } from '@/contexts/ThemeContext'

export interface LineGraphSeries<T> {
  key: string
  label: string
  color: string
  value: (point: T) => number
}

const finiteNonNegative = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0

/** Theme-aware line chart for zero-filled timeline data. It never removes source points. */
export function LineGraph<T>({ points, series, labelForPoint, detailForPoint, emptyMessage, accessibilityLabel, labelTarget }: {
  points: T[]
  series: LineGraphSeries<T>[]
  labelForPoint: (point: T) => string
  detailForPoint: (point: T | null) => string
  emptyMessage: string
  accessibilityLabel: string
  labelTarget?: { compact: number; regular: number }
}) {
  const { colors } = useTheme()
  const [width, setWidth] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const target = width < 400 ? (labelTarget?.compact ?? 5) : (labelTarget?.regular ?? 7)
  const stride = Math.max(1, Math.ceil(points.length / Math.max(1, target)))
  const hasActivity = points.some((point) => series.some((line) => finiteNonNegative(line.value(point)) > 0))
  const active = selected === null ? null : points[selected] ?? null
  return <View style={{ gap: 12, minWidth: 0 }} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 14 }}>{series.map((line) => <Text key={line.key} style={{ color: line.color, fontSize: 12 }}>● {line.label}</Text>)}</View>
    {width > 0 && points.length > 0 ? <View accessibilityLabel={accessibilityLabel} style={{ overflow: 'hidden' }}><LineChart width={width} height={220} fromZero segments={4} withOuterLines={false} withVerticalLines={false} withShadow={hasActivity} withDots={hasActivity} formatYLabel={(value) => Number(value).toFixed(0)} data={{ labels: points.map((point, index) => index % stride === 0 || index === points.length - 1 ? labelForPoint(point) : ''), datasets: series.map((line) => ({ data: points.map((point) => finiteNonNegative(line.value(point))), color: () => line.color })) }} chartConfig={{ backgroundGradientFrom: colors.surface, backgroundGradientTo: colors.surface, color: () => colors.primary, labelColor: () => colors.textSecondary, decimalPlaces: 0, propsForBackgroundLines: { stroke: colors.border }, propsForLabels: { fontSize: width < 400 ? 10 : 11 }, useShadowColorFromDataset: true, fillShadowGradientOpacity: 0.1 }} onDataPointClick={({ index }) => setSelected(index)} /></View> : null}
    <Text accessibilityLiveRegion="polite" style={{ minHeight: 32, color: colors.textSecondary, fontSize: 12 }}>{!hasActivity ? emptyMessage : detailForPoint(active)}</Text>
  </View>
}
