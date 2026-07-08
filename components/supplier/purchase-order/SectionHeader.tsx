import React from 'react'
import { View, Text } from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'

export function SectionHeader({
  title,
  subtitle,
  right,
}: {
  title: string
  subtitle?: string
  right?: React.ReactNode
}) {
  const { colors } = useTheme()
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
      <View style={{ gap: 4, flex: 1 }}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>{title}</Text>
        {subtitle && <Text style={{ fontSize: 13, color: colors.textSecondary }}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  )
}