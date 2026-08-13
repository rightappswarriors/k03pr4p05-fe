import React from 'react'
import { View } from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'

function Block({ width = '100%', height = 18 }: { width?: string; height?: number }) {
  const { colors } = useTheme()
  return <View style={{ width: width as any, height, borderRadius: 8, backgroundColor: colors.border, opacity: 0.58 }} />
}

export function TimelineSkeleton() {
  const { colors } = useTheme()
  return (
    <View style={{ gap: 14 }}>
      {[0, 1, 2].map((item) => (
        <View key={item} style={{ borderRadius: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Block width="38" height={38} />
            <View style={{ flex: 1, gap: 10 }}>
              <Block width="64%" height={16} />
              <Block width="92%" height={12} />
              <Block width="42%" height={12} />
            </View>
          </View>
        </View>
      ))}
    </View>
  )
}
