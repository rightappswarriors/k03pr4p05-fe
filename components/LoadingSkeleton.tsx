import React, { useEffect, useRef } from 'react'
import { Animated, View, ViewStyle } from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'

export function SkeletonBox({ style }: { style?: ViewStyle }) {
  const { colors } = useTheme()
  const opacity = useRef(new Animated.Value(0.35)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.75, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 700, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [opacity])

  return (
    <Animated.View
      style={[{ backgroundColor: colors.surface, borderRadius: 12, opacity }, style]}
    />
  )
}

export function KpiSkeletonRow({ count = 4 }: { count?: number }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonBox key={i} style={{ width: '48%', height: 88 }} />
      ))}
    </View>
  )
}

export function OrderCardSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View style={{ gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonBox key={i} style={{ height: 150 }} />
      ))}
    </View>
  )
}