import { Animated } from 'react-native'
import React,{ useRef, useEffect } from 'react'

const SlideView = ({ visible, children }) => {
  const height = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(height, {
      toValue: visible ? 100 : 0, // replace with actual height
      duration: 300,
      useNativeDriver: false,
    }).start()
  }, [visible])

  return (
    <Animated.View style={{ height }}>
      {children}
    </Animated.View>
  )
}

export default SlideView