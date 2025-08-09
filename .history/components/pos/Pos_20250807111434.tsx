import { View, Text, Animated } from 'react-native'
import React, { useEffect, useRef, } from 'react'
 
export default function CategoryDropdown({children, visible}: { children: React.ReactNode, visible: boolean}) {

  const slideAnim = useRef(new Animated.Value(-100)).current
  const opacityAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start()
    }
  }, [visible])

  return (
 

      <Animated.View
        style={{
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        }}
        className="absolute top-10 left-0 w-full bg-slate-800 z-50 p-2 rounded"
      >
        { children }
        <Text className="text-white">Hello</Text>
        <Text className="text-white">Hello</Text>
        <Text className="text-white">Hello</Text>
        <Text className="text-white">Hello</Text>
      </Animated.View>
  )
}
