import React from 'react'
import { View, Text } from 'react-native'
import { Star } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import type { ReviewAggregate } from '@/services/supplierService/supplierService'

export function RatingBreakdown({ aggregate }: { aggregate: ReviewAggregate }) {
    const { colors } = useTheme()
    const total = aggregate.reviewCount || 1
    const byStars = new Map(aggregate.breakdown.map((b) => [b.rating, b.count]))

    return (
        <View style={{ gap: 6 }}>
            {[5, 4, 3, 2, 1].map((star) => {
                const count = byStars.get(star) ?? 0
                const pct = (count / total) * 100
                return (
                    <View key={star} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, width: 32 }}>
                            <Text style={{ fontSize: 12, color: colors.textSecondary }}>{star}</Text>
                            <Star size={11} color="#F59E0B" fill="#F59E0B" />
                        </View>
                        <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' }}>
                            <View style={{ width: `${pct}%`, height: '100%', backgroundColor: '#F59E0B' }} />
                        </View>
                        <Text style={{ fontSize: 11, color: colors.textSecondary, width: 24, textAlign: 'right' }}>{count}</Text>
                    </View>
                )
            })}
        </View>
    )
}