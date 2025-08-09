import React, { useRef, useEffect, useState } from 'react'
import {
  Animated,
  View,
  LayoutChangeEvent,
  StyleProp,
  ViewStyle
} from 'react-native'

type SlideViewProps = {
  visible: boolean
  children: React.ReactNode
  duration?: number
  style?: StyleProp<ViewStyle>
  slide?: boolean
}

const SlideView = ({ visible, children, duration = 300, style, slide}: SlideViewProps) => {
  const animatedHeight = useRef(new Animated.Value(0)).current
  const [contentHeight, setContentHeight] = useState(0)
  const [shouldRenderChildren, setShouldRenderChildren] = useState(false)

  const handleLayout = (event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout
    setContentHeight(height)
  }

  useEffect(() => {
    if (visible) {
      Animated.timing(animatedHeight, {
        toValue: contentHeight,
        duration,
        useNativeDriver: false,
      }).start(() => {
        // show children after slide-down completes
        setShouldRenderChildren(true)
      })
    } else {
      // hide children first
      setShouldRenderChildren(false)
      Animated.timing(animatedHeight, {
        toValue: 0,
        duration,
        useNativeDriver: false,
      }).start()
    }
  }, [visible, contentHeight])

  return (
    <>
      {/* This hidden View is used to measure real height */}
      <View
        style={{ position: 'absolute', opacity: 0, left: -9999 }}
        onLayout={handleLayout}
      >
        {children}
      </View>

      {/* Animated container with dynamic height */}
      <Animated.View
        style={[{ height: animatedHeight, overflow: 'hidden' }, style]}
      >
        {shouldRenderChildren && children}
      </Animated.View>
    </>
  )
}

export default SlideView
