import React from 'react'
import { View, Text } from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { RatingStars } from './RatingStars'
import { VerifiedPurchaseBadge } from './VerifiedPurchaseBadge'
import type { SupplierItemReview } from '@/services/supplierService/supplierService'

export function ReviewCard({ review }: { review: SupplierItemReview }) {
  const { colors } = useTheme()
  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 14, gap: 8, borderWidth: 1, borderColor: colors.border }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ gap: 2 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{review.reviewer.name}</Text>
          <RatingStars rating={review.rating} showValue={false} size={12} />
        </View>
        {review.isVerifiedPurchase && <VerifiedPurchaseBadge />}
      </View>
      {review.title && <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{review.title}</Text>}
      {review.comment && <Text style={{ fontSize: 13, color: colors.textSecondary }}>{review.comment}</Text>}
      <Text style={{ fontSize: 11, color: colors.textSecondary }}>
        {new Date(review.createdAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
      </Text>
    </View>
  )
}