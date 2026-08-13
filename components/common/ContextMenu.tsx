// components/common/ContextMenu.tsx
// Reusable floating context menu component for table actions
// Uses OverlayHost system for proper positioning and avoiding clipping issues

import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ContextMenuItem {
  key: string
  label: string
  icon?: React.ReactNode
  color?: string
  disabled?: boolean
}

interface ContextMenuProps {
  visible: boolean
  anchorPosition: { x: number; y: number; width: number; height: number } | null
  items: ContextMenuItem[]
  onSelect: (key: string) => void
  onClose: () => void
  align?: 'left' | 'right' // Alignment relative to anchor
}

// ─── Context Menu Component ───────────────────────────────────────────────────

export function ContextMenu({
  visible,
  anchorPosition,
  items,
  onSelect,
  onClose,
  align = 'right',
}: ContextMenuProps) {
  const { colors } = useTheme()
  const { width: screenWidth, height: screenHeight } = useWindowDimensions()

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0.95)).current

  const handleSelect = useCallback((key: string) => {
    onSelect(key)
    onClose()
  }, [onSelect, onClose])

  // Calculate menu position - opens below-right or above if not enough room
  const getMenuPosition = useCallback(() => {
    if (!anchorPosition) return { top: 0, left: 0 }

    const menuWidth = 192
    const menuItemHeight = 40
    const menuHeightEstimate = Math.min(items.length * menuItemHeight + 16, 300)

    // Start with bottom-right of the anchor button
    let top = anchorPosition.y + anchorPosition.height
    let left = align === 'right'
      ? anchorPosition.x
      : anchorPosition.x + anchorPosition.width - menuWidth

    // Adjust if would overflow right edge
    if (left + menuWidth > screenWidth - 16) {
      left = screenWidth - menuWidth - 16
    }

    // Adjust if would overflow left edge
    if (left < 16) {
      left = 16
    }

    // If not enough room below, open above
    if (top + menuHeightEstimate > screenHeight - 16) {
      top = Math.max(16, anchorPosition.y - menuHeightEstimate)
    }

    // Ensure top doesn't go negative
    if (top < 16) {
      top = 16
    }

    return { top, left }
  }, [anchorPosition, screenWidth, screenHeight, items.length, align])

  // Animate on visibility change
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          speed: 30,
          bounciness: 4,
        }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 150,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start()
    }
  }, [visible, fadeAnim, scaleAnim])

  // Handle escape key for web
  useEffect(() => {
    if (!visible || Platform.OS !== 'web') return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [visible, onClose])

  // Find separator index (first destructive item)
  const destructiveStartIndex = items.findIndex(item =>
    item.color === '#DC2626' || item.key === 'revoke' || item.key === 'delete'
  )

  const { top, left } = getMenuPosition()

  const renderContent = () => (
    <Animated.View
      style={{
        position: 'absolute',
        top,
        left,
        minWidth: 192,
        maxWidth: 240,
        backgroundColor: colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 20,
        overflow: 'hidden',
      }}
    >
      {items.map((item, index) => (
        <TouchableOpacity
          key={item.key}
          onPress={() => !item.disabled && handleSelect(item.key)}
          disabled={item.disabled}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingHorizontal: 14,
            paddingVertical: 10,
            backgroundColor: item.disabled ? `${colors.background}80` : colors.surface,
            ...(index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }),
            ...(destructiveStartIndex === index && { borderTopWidth: 1, borderTopColor: colors.border }),
          }}
        >
          {item.icon}
          <Text style={{
            fontSize: 14,
            fontWeight: '600',
            color: item.disabled
              ? colors.textSecondary
              : (item.color ?? colors.text),
            flex: 1,
          }}>
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </Animated.View>
  )

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1 }} pointerEvents="box-none">
        <TouchableOpacity
          style={{ position: 'absolute', inset: 0 }}
          activeOpacity={1}
          onPress={onClose}
        />
        {renderContent()}
      </View>
    </Modal>
  )
}

// ─── Hook for Context Menu Management ───────────────────────────────────────────

export function useContextMenu() {
  const [visible, setVisible] = useState(false)
  const [anchorPosition, setAnchorPosition] = useState<{ x: number; y: number; width: number; height: number } | null>(null)

  const openMenu = useCallback((position: { x: number; y: number; width: number; height: number }) => {
    setAnchorPosition(position)
    setVisible(true)
  }, [])

  const closeMenu = useCallback(() => {
    setVisible(false)
    setAnchorPosition(null)
  }, [])

  const toggleMenu = useCallback((position: { x: number; y: number; width: number; height: number }) => {
    if (visible) {
      closeMenu()
    } else {
      openMenu(position)
    }
  }, [visible, openMenu, closeMenu])

  return {
    visible,
    anchorPosition,
    openMenu,
    closeMenu,
    toggleMenu,
  }
}