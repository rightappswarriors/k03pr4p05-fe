import React, { useRef, useEffect, useState } from 'react'
import { Animated, View, LayoutChangeEvent, StyleProp, ViewStyle } from 'react-native'

type SlideViewProps = {
  visible: boolean
  children: React.ReactNode
  duration?: number
  style?: StyleProp<ViewStyle>
}

const SlideView = ({ visible, children, duration = 300, style }: SlideViewProps) => {
  const animatedHeight = useRef(new Animated.Value(0)).current
  const contentHeight = useRef(0)
  const [isMounted, setIsMounted] = useState(visible)

  const handleLayout = (event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout
    contentHeight.current = height

    if (visible) {
      animatedHeight.setValue(0)
      Animated.timing(animatedHeight, {
        toValue: 100,
        duration,
        useNativeDriver: false,
      }).start()
    }
  }

  useEffect(() => {
    if (visible) {
      setIsMounted(true)
      Animated.timing(animatedHeight, {
        toValue: contentHeight.current,
        duration,
        useNativeDriver: false,
      }).start()
    } else {
      Animated.timing(animatedHeight, {
        toValue: 0,
        duration,
        useNativeDriver: false,
      }).start(() => {
        setIsMounted(false)
      })
    }
  }, [visible])

  return (
    <Animated.View style={[{ height: animatedHeight, overflow: 'hidden' }, style]}>
      {/* Only render children when mounted to avoid empty space after collapse */}
      {isMounted && (
        <View onLayout={handleLayout}>
          {children}
        </View>
      )}
    </Animated.View>
  )
}

export default SlideView
