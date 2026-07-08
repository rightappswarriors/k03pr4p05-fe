import React from 'react'
import { View, Text } from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'

export function StockIndicator({
  available, reserved, incoming, unit,
}: { available: number; reserved: number; incoming: number; unit: string }) {
  const { colors } = useTheme()
  const total = available + reserved || 1
  const availablePct = (available / total) * 100
  const reservedPct = (reserved / total) * 100

  return (
    <View style={{ gap: 4, minWidth: 100 }}>
      <View style={{ flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: colors.border }}>
        <View style={{ width: `${availablePct}%`, backgroundColor: '#22C55E' }} />
        <View style={{ width: `${reservedPct}%`, backgroundColor: '#F59E0B' }} />
      </View>
      <Text style={{ fontSize: 11, color: colors.textSecondary }}>
        {available} avail{reserved > 0 ? ` · ${reserved} reserved` : ''}{incoming > 0 ? ` · +${incoming} incoming` : ''} {unit}
      </Text>
    </View>
  )
}