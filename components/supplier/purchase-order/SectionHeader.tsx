import React from 'react'
import { View, Text, useWindowDimensions } from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'

const STACK_BREAKPOINT = 480 // below this width, stack title above `right` content

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
  const { width } = useWindowDimensions()
  const shouldStack = width < STACK_BREAKPOINT

  return (
    <View
      style={{
        flexDirection: shouldStack ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: shouldStack ? 'stretch' : 'flex-start',
        gap: shouldStack ? 10 : 12,
      }}
    >
      {/* minWidth: 0 lets the text box shrink below its content size so long
          words wrap normally instead of forcing the row to overflow / squeeze
          this column down to almost nothing. */}
      <View style={{ gap: 4, flex: shouldStack ? undefined : 1, minWidth: 0 }}>
        <Text
          style={{
            fontSize: shouldStack ? 17 : 20,
            fontWeight: '800',
            color: colors.text,
          }}
          numberOfLines={1}
          adjustsFontSizeToFit={shouldStack}
          minimumFontScale={0.8}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={{ fontSize: 13, color: colors.textSecondary }}
            numberOfLines={shouldStack ? 2 : 1}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {right && (
        <View style={shouldStack ? { alignItems: 'flex-start' } : undefined}>
          {right}
        </View>
      )}
    </View>
  )
}