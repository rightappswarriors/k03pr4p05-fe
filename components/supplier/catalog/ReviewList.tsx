import React from 'react'
import { View, Text, ActivityIndicator } from 'react-native'
import { MessageSquareOff } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { RatingSummary } from './RatingSummary'
import { ReviewCard } from './ReviewCard'
import type { SupplierItemReviewPayload } from '@/services/supplierService/supplierService'

export function ReviewList({ payload, loading }: { payload: SupplierItemReviewPayload | null; loading: boolean }) {
  const { colors } = useTheme()

  if (loading) {
    return <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
  }
  if (!payload || payload.aggregate.reviewCount === 0) {
    return (
      <View style={{ alignItems: 'center', padding: 32, gap: 8 }}>
        <MessageSquareOff size={28} color={colors.textSecondary} />
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>No reviews yet</Text>
        <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center' }}>
          Reviews from buyers who've ordered this item will appear here.
        </Text>
      </View>
    )
  }

  return (
    <View style={{ gap: 12 }}>
      <RatingSummary aggregate={payload.aggregate} />
      {payload.reviews.map((r) => (
        <ReviewCard key={r.id} review={r} />
      ))}
    </View>
  )
}