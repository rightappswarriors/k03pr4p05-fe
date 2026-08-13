import React from 'react'
import { View, Text } from 'react-native'
import { Star } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import type { ReviewAggregate } from '@/services/supplierService/supplierService'

export function RatingDistribution({ aggregate }: { aggregate: ReviewAggregate }) {
  const { colors } = useTheme()
  const max = Math.max(1, ...aggregate.breakdown.map((item) => item.count))

  return (
    <View style={{ gap: 9 }}>
      {aggregate.breakdown.map((item) => (
        <View key={item.rating} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 58, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Text style={{ color: colors.text, fontSize: 12, fontWeight: '800' }}>{item.rating}</Text>
            <Star size={12} color="#F59E0B" fill="#F59E0B" />
          </View>
          <View style={{ flex: 1, height: 8, borderRadius: 999, overflow: 'hidden', backgroundColor: colors.background }}>
            <View style={{ width: `${(item.count / max) * 100}%`, height: '100%', backgroundColor: '#F59E0B', borderRadius: 999 }} />
          </View>
          <Text style={{ width: 34, textAlign: 'right', color: colors.textSecondary, fontSize: 12, fontWeight: '700' }}>{item.count}</Text>
        </View>
      ))}
    </View>
  )
}
