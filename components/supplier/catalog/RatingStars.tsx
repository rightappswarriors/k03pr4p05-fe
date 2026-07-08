import React from 'react'
import { View, Text } from 'react-native'
import { Star } from 'lucide-react-native'

export function RatingStars({
  rating,
  size = 14,
  showValue = true,
  reviewCount,
}: {
  rating: number
  size?: number
  showValue?: boolean
  reviewCount?: number
}) {
  const rounded = Math.round(rating)
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View style={{ flexDirection: 'row' }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            size={size}
            color="#F59E0B"
            fill={i <= rounded ? '#F59E0B' : 'transparent'}
            strokeWidth={1.5}
          />
        ))}
      </View>
      {showValue && (
        <Text style={{ fontSize: size - 2, fontWeight: '700', color: '#111827' }}>
          {rating > 0 ? rating.toFixed(1) : '—'}
        </Text>
      )}
      {reviewCount !== undefined && (
        <Text style={{ fontSize: size - 3, color: '#6B7280' }}>({reviewCount})</Text>
      )}
    </View>
  )
}