import React from 'react'
import { View, Text } from 'react-native'
import { Star } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { RatingStars } from '@/components/supplier/catalog/RatingStars'
import { RatingDistribution } from './RatingDistribution'
import type { ReviewAggregate } from '@/services/supplierService/supplierService'

export function ReviewSummaryCard({ aggregate }: { aggregate: ReviewAggregate }) {
  const { colors } = useTheme()
  return (
    <View style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 16, padding: 16, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <View style={{ gap: 6 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' }}>Average rating</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ color: colors.text, fontSize: 34, fontWeight: '900' }}>{aggregate.averageRating ? aggregate.averageRating.toFixed(1) : '-'}</Text>
            <Star size={24} color="#F59E0B" fill="#F59E0B" />
          </View>
          <RatingStars rating={aggregate.averageRating} size={15} showValue={false} />
          <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700' }}>{aggregate.reviewCount} total reviews</Text>
        </View>
        <View style={{ flex: 1, minWidth: 170 }}>
          <RatingDistribution aggregate={aggregate} />
        </View>
      </View>
    </View>
  )
}
