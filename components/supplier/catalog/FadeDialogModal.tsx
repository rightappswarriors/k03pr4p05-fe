/**
 * FadeDialogModal — animated sheet that registers into the shared OverlayHost
 * (priority 100) instead of owning its own <Modal>.
 *
 * Public API is unchanged: <FadeDialogModal visible onRequestClose maxWidth>
 */
import React, { useEffect, useRef } from 'react'
import { Animated, TouchableWithoutFeedback, useWindowDimensions, View } from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { useOverlayEntry } from '@/contexts/OverlayHostContext'

const PRIORITY = 100

interface Props {
  visible: boolean
  onRequestClose: () => void
  maxWidth?: number
  children: React.ReactNode
}

export function FadeDialogModal({ visible, onRequestClose, maxWidth = 720, children }: Props) {
  const { colors } = useTheme()
  const { width, height } = useWindowDimensions()
  const opacity = useRef(new Animated.Value(0)).current
  const scale   = useRef(new Animated.Value(0.97)).current

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(scale,   { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 4 }),
      ]).start()
    } else {
      opacity.setValue(0)
      scale.setValue(0.97)
    }
  }, [visible, opacity, scale])

  // The JSX we push into the host — rebuilt each render so animated values stay live.
  const overlayNode = (
    <Animated.View
      style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        opacity,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      // Let touch events through to the backdrop
    >
      {/* Backdrop tap dismisses */}
      <TouchableWithoutFeedback onPress={onRequestClose}>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }} />
      </TouchableWithoutFeedback>

      {/* Card — stop touch propagation to backdrop */}
      <TouchableWithoutFeedback onPress={() => {}}>
        <Animated.View
          style={{
            position: 'relative',
            zIndex: 1,
            width: Math.min(maxWidth, width - 40),
            maxHeight: height - 80,
            backgroundColor: colors.background,
            borderRadius: 16,
            overflow: 'hidden',
            transform: [{ scale }],
            shadowColor: '#000',
            shadowOpacity: 0.25,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 12 },
            elevation: 12,
          }}
        >
          {children}
        </Animated.View>
      </TouchableWithoutFeedback>
    </Animated.View>
  )

  // Register/deregister with the shared host.
  useOverlayEntry(overlayNode, PRIORITY, visible)

  // Render nothing here — the host renders everything.
  return null
}
