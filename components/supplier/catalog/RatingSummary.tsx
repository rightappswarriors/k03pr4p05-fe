import React from 'react'
import { View, Text } from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { RatingStars } from './RatingStars'
import { RatingBreakdown } from './RatingBreakDown'
import type { ReviewAggregate } from '@/services/supplierService/supplierService'

export function RatingSummary({ aggregate }: { aggregate: ReviewAggregate }) {
  const { colors } = useTheme()
  return (
    <View style={{ flexDirection: 'row', gap: 20, backgroundColor: colors.surface, borderRadius: 14, padding: 16 }}>
      <View style={{ alignItems: 'center', justifyContent: 'center', gap: 4, minWidth: 90 }}>
        <Text style={{ fontSize: 36, fontWeight: '800', color: colors.text }}>
          {aggregate.averageRating > 0 ? aggregate.averageRating.toFixed(1) : '—'}
        </Text>
        <RatingStars rating={aggregate.averageRating} showValue={false} size={14} />
        <Text style={{ fontSize: 11, color: colors.textSecondary }}>
          {aggregate.reviewCount} {aggregate.reviewCount === 1 ? 'review' : 'reviews'}
        </Text>
        {aggregate.verifiedCount > 0 && (
          <Text style={{ fontSize: 10, color: '#22C55E', fontWeight: '600' }}>
            {aggregate.verifiedCount} verified
          </Text>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <RatingBreakdown aggregate={aggregate} />
      </View>
    </View>
  )
}