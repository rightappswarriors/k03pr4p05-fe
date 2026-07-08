import React, { useEffect, useRef } from 'react'
import { Modal, Animated, TouchableWithoutFeedback, useWindowDimensions } from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'

export function FadeDialogModal({
  visible,
  onRequestClose,
  maxWidth = 720,
  children,
}: {
  visible: boolean
  onRequestClose: () => void
  maxWidth?: number
  children: React.ReactNode
}) {
  const { colors } = useTheme()
  const { width, height } = useWindowDimensions()
  const opacity = useRef(new Animated.Value(0)).current
  const scale = useRef(new Animated.Value(0.97)).current

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 4 }),
      ]).start()
    } else {
      opacity.setValue(0)
      scale.setValue(0.97)
    }
  }, [visible])

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onRequestClose}>
      <TouchableWithoutFeedback onPress={onRequestClose}>
        <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', opacity, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <Animated.View
              style={{
                width: Math.min(maxWidth, width - 40),
                maxHeight: height - 80,
                backgroundColor: colors.background,
                borderRadius: 16,
                overflow: 'hidden',
                transform: [{ scale }],
                shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 12,
              }}
            >
              {children}
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  )
}