import React, { useRef, useEffect, useState } from 'react'
import {
  Animated,
  View,
  LayoutChangeEvent,
  StyleProp,
  ViewStyle,
} from 'react-native'

type SlideViewProps = {
  visible: boolean
  children: React.ReactNode
  duration?: number
  style?: StyleProp<ViewStyle>
  slide?: boolean
}

const SlideView = ({
  visible,
  children,
  duration = 300,
  style,
  slide,
}: SlideViewProps) => {
  const animatedHeight = useRef(new Animated.Value(0)).current
  const [contentHeight, setContentHeight] = useState(0)
  const [renderChildren, setRenderChildren] = useState(false)

  const handleLayout = (event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout
    setContentHeight(height)
  }

  // Animate height on visibility change
  useEffect(() => {
    if (visible) {
      Animated.timing(animatedHeight, {
        toValue: contentHeight,
        duration,
        useNativeDriver: slide ? true :false,
      }).start(() => {
        setRenderChildren(true)
      })
    } else {
      setRenderChildren(false)
      Animated.timing(animatedHeight, {
        toValue: 0,
        duration,
        useNativeDriver: slide ? true :false,
      }).start()
    }
  }, [visible, contentHeight])

  return (
    <>
      {/* Hidden layout to measure content height */}
      <View
        style={{ position: 'absolute', opacity: 0, left: -9999 }}
        onLayout={handleLayout}
      >
        {children}
      </View>

      {/* Animated container */}
      <Animated.View style={[{ height: animatedHeight, overflow: 'hidden' }, style]}>
        {renderChildren && children}
      </Animated.View>
    </>
  )
}

export default SlideView
