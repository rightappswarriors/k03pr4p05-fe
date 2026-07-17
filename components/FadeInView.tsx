import React, { useEffect, useRef } from 'react'
import { Animated } from 'react-native'

export function FadeInView({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode
  delay?: number
  style?: any
}) {
  const opacity = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(8)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 280, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 280, delay, useNativeDriver: true }),
    ]).start()
  }, [opacity, translateY, delay])

  return <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>{children}</Animated.View>
}