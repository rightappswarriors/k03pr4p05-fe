import React from 'react'
import { ScrollView, Text, View } from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { useResponsive } from '@/hooks/useResponsive'
import { RatingStars } from '@/components/supplier/catalog/RatingStars'
import { OrganizationReviewCard } from './OrganizationReviewCard'
import type { OrganizationReview } from '@/services/supplierService/supplierService'

import { DataTable, EmptyState } from '@/components/DataTable'
function label(review: OrganizationReview) {
  return review.reviewer?.name ?? review.reviewerName ?? 'Guest reviewer'
}

export function ReviewList({
  reviews,
  onEdit,
  onDelete,
}: {
  reviews: OrganizationReview[]
  onEdit?: (review: OrganizationReview) => void
  onDelete?: (review: OrganizationReview) => void
}) {
  const { colors } = useTheme()
  const { isDesktop } = useResponsive()

  if (!reviews.length) {
    return <EmptyState title="No reviews yet" message="Organization reviews will appear here once customers leave feedback." />
  }

  if (!isDesktop) {
    return <View style={{ gap: 10 }}>{reviews.map((review) => <OrganizationReviewCard key={review.id} review={review} onEdit={onEdit} onDelete={onDelete} />)}</View>
  }

  return (
    <DataTable
      columns={[
        { label: 'Reviewer', width: 210 },
        { label: 'Rating', width: 160 },
        { label: 'Comment', width: 360 },
        { label: 'Date', width: 130 },
        ...(onEdit || onDelete ? [{ label: 'Actions', width: 130 }] : []),
      ]}
      rows={reviews.map((review) => ({
        key: review.id,
        cells: [
          <Text style={{ color: colors.text, fontWeight: '800' }}>{label(review)}</Text>,
          <RatingStars rating={review.rating} size={13} showValue={false} />,
          <Text style={{ color: colors.textSecondary }} numberOfLines={2}>{review.comment || review.title || 'No comment'}</Text>,
          <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>{new Date(review.createdAt).toLocaleDateString()}</Text>,
          ...(onEdit || onDelete ? [
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {onEdit ? <Text onPress={() => onEdit(review)} style={{ color: colors.primary, fontWeight: '900' }}>Edit</Text> : null}
              {onDelete ? <Text onPress={() => onDelete(review)} style={{ color: colors.error, fontWeight: '900' }}>Delete</Text> : null}
            </View>,
          ] : []),
        ],
      }))}
      emptyState={null}
    />
  )
}
