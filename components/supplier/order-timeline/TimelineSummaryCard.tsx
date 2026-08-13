import React from 'react'
import { Text, View } from 'react-native'
import type { LucideIcon } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'

export function TimelineSummaryCard({
  title,
  value,
  accent,
  icon: Icon,
  widthPct = '100%',
}: {
  title: string
  value: number
  accent: string
  icon: LucideIcon
  widthPct?: string
}) {
  const { colors } = useTheme()
  return (
    <View
      style={{
        width: widthPct as any,
        minHeight: 92,
        borderRadius: 8,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 14,
        justifyContent: 'space-between',
        shadowColor: '#0F172A',
        shadowOpacity: 0.06,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700' }}>{title}</Text>
        <View style={{ width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: `${accent}18` }}>
          <Icon size={17} color={accent} />
        </View>
      </View>
      <Text style={{ color: colors.text, fontSize: 26, fontWeight: '800' }}>{value}</Text>
    </View>
  )
}
