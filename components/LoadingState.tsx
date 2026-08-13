import { useTheme } from "@/contexts/ThemeContext"
import React from "react"
import { useEffect, useRef } from "react"
import { Animated, View } from "react-native"

export function LoadingState() {
  const { colors } = useTheme()
  const opacity = useRef(new Animated.Value(0.35)).current
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 0.75, duration: 720, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.35, duration: 720, useNativeDriver: true }),
    ]))
    loop.start()
    return () => loop.stop()
  }, [opacity])
  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {Array.from({ length: 8 }).map((_, index) => <Animated.View key={index} style={{ opacity, flexGrow: 1, flexBasis: 210, height: 124, borderRadius: 16, backgroundColor: colors.surface }} />)}
      </View>
      {Array.from({ length: 3 }).map((_, index) => <Animated.View key={index} style={{ opacity, height: 230, borderRadius: 16, backgroundColor: colors.surface }} />)}
    </View>
  )
}