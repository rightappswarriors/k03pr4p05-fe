import React from 'react'
import { View, Text } from 'react-native'
import { Clock } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { withAlpha } from '@/utils/color'

function daysUntil(dateIso: string): number {
  const diff = new Date(dateIso).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function RenewalCountdown({ expiresAt }: { expiresAt: string | null }) {
  const { colors } = useTheme()

  if (!expiresAt) {
    return (
      <Text style={{ fontSize: 12, color: colors.textSecondary }}>No expiration set for this verification.</Text>
    )
  }

  const days = daysUntil(expiresAt)
  const isExpired = days < 0
  const color = isExpired ? '#DC2626' : days <= 14 ? '#D97706' : '#059669'

  const label = isExpired
    ? `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`
    : `${days} day${days === 1 ? '' : 's'} remaining`

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        backgroundColor: withAlpha(color, '14'),
        alignSelf: 'flex-start',
      }}
    >
      <Clock size={13} color={color} />
      <Text style={{ fontSize: 12, fontWeight: '700', color }}>{label}</Text>
      <Text style={{ fontSize: 11, color: colors.textSecondary }}>
        · {new Date(expiresAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
      </Text>
    </View>
  )
}