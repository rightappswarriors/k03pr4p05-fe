import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { MessageSquare, Reply, ShieldCheck } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { RatingStars } from '@/components/supplier/catalog/RatingStars'
import type { OrganizationReview } from '@/services/supplierService/supplierService'

function reviewerLabel(review: OrganizationReview) {
  return review.reviewer?.name ?? review.reviewerName ?? (review.reviewerCustomerId ? `Customer #${review.reviewerCustomerId}` : 'Guest reviewer')
}

export function OrganizationReviewCard({
  review,
  onEdit,
  onDelete,
}: {
  review: OrganizationReview
  onEdit?: (review: OrganizationReview) => void
  onDelete?: (review: OrganizationReview) => void
}) {
  const { colors } = useTheme()
  const label = reviewerLabel(review)

  return (
    <View style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 14, padding: 14, gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
        <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: `${colors.primary}18`, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.primary, fontWeight: '900' }}>{label.slice(0, 2).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: '900' }} numberOfLines={1}>{label}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700' }}>{new Date(review.createdAt).toLocaleDateString()}</Text>
          </View>
          <RatingStars rating={review.rating} size={14} showValue={false} />
        </View>
      </View>

      {review.title ? <Text style={{ color: colors.text, fontSize: 13, fontWeight: '800' }}>{review.title}</Text> : null}
      <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 19 }}>
        {review.comment || 'No written comment was added.'}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {review.isVerifiedTransaction ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, backgroundColor: '#DCFCE7' }}>
            <ShieldCheck size={13} color="#15803D" />
            <Text style={{ color: '#15803D', fontSize: 11, fontWeight: '800' }}>Verified</Text>
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.background }}>
          <MessageSquare size={13} color={colors.textSecondary} />
          <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '800' }}>Helpful</Text>
        </View>
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5 }}>
          <Reply size={13} color={colors.primary} />
          <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '800' }}>Reply</Text>
        </TouchableOpacity>
        {onEdit ? <TouchableOpacity onPress={() => onEdit(review)}><Text style={{ color: colors.primary, fontSize: 11, fontWeight: '800' }}>Edit</Text></TouchableOpacity> : null}
        {onDelete ? <TouchableOpacity onPress={() => onDelete(review)}><Text style={{ color: colors.error, fontSize: 11, fontWeight: '800' }}>Delete</Text></TouchableOpacity> : null}
      </View>
    </View>
  )
}
