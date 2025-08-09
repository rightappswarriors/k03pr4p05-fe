import React, { useRef, useEffect } from 'react'
import { Animated, View, StyleSheet } from 'react-native'

export const DropdownOverlay = ({ visible, children }: { visible: boolean, children: React.ReactNode }) => {
  const slideAnim = useRef(new Animated.Value(-100)).current  // starts above the screen
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
      style={[
        styles.dropdown,
        {
          opacity: opacityAnim,
          transform: [{ translateY: slideAnim }],
        }
      ]}
    >
      {children}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  dropdown: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    padding: 10,
    backgroundColor: '#222', // or use your theme card color
    borderBottomWidth: 1,
    borderColor: '#444',
  }
})

export default DropdownOverlay