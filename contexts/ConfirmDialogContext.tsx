/**
 * ConfirmDialogContext — cross-platform async confirmation dialog.
 *
 * Registers into the shared OverlayHost at priority 300, so it always renders
 * above FadeDialogModal sheets (100) and SavingOverlay (200) on both web and native.
 *
 * Public API is unchanged:
 *   const confirm = useConfirm()
 *   const ok = await confirm({ title, message, confirmLabel, cancelLabel, destructive })
 */
import React, {
  createContext, useCallback, useContext,
  useRef, useState,
} from 'react'
import {
  Animated, Text, TouchableOpacity,
  TouchableWithoutFeedback, useWindowDimensions, View,
} from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { useOverlayEntry } from '@/contexts/OverlayHostContext'

const PRIORITY = 300

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmDialogContext = createContext<ConfirmFn | null>(null)

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmDialogContext)
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmDialogProvider')
  return ctx
}

// ─── Inner component — holds animation state ──────────────────────────────────
// Separated so hooks run unconditionally regardless of `visible`.

function ConfirmDialogLayer({
  visible,
  options,
  onHandle,
}: {
  visible: boolean
  options: ConfirmOptions | null
  onHandle: (result: boolean) => void
}) {
  const { colors } = useTheme()
  const { width }  = useWindowDimensions()

  const opacity = useRef(new Animated.Value(0)).current
  const scale   = useRef(new Animated.Value(0.94)).current

  // Animate in/out when visibility changes.
  React.useEffect(() => {
    if (visible) {
      opacity.setValue(0)
      scale.setValue(0.94)
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
          Animated.spring(scale,   { toValue: 1, useNativeDriver: true, speed: 28, bounciness: 4 }),
        ]).start()
      })
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 140, useNativeDriver: true }),
        Animated.timing(scale,   { toValue: 0.94, duration: 140, useNativeDriver: true }),
      ]).start()
    }
  }, [visible, opacity, scale])

  // The JSX pushed into the host — rebuilt each render so animated refs stay live.
  const node = (
    <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.50)', opacity }}>
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={() => onHandle(false)}>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }} />
      </TouchableWithoutFeedback>

      {/* Centered card */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', zIndex: 1 }}>
        <TouchableWithoutFeedback onPress={() => {}}>
          <Animated.View style={{
            position: 'relative',
            zIndex: 1,
            width: Math.min(420, width - 48),
            backgroundColor: colors.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            overflow: 'hidden',
            transform: [{ scale }],
            shadowColor: '#000',
            shadowOpacity: 0.3,
            shadowRadius: 28,
            shadowOffset: { width: 0, height: 14 },
            elevation: 20,
          }}>
            {options && (
              <View style={{ padding: 22, gap: 14 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>
                  {options.title}
                </Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 20 }}>
                  {options.message}
                </Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                  <TouchableOpacity
                    onPress={() => onHandle(false)}
                    style={{
                      flex: 1, padding: 13, borderRadius: 10,
                      alignItems: 'center',
                      borderWidth: 1, borderColor: colors.border,
                    }}
                  >
                    <Text style={{ fontWeight: '700', color: colors.text }}>
                      {options.cancelLabel ?? 'Cancel'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => onHandle(true)}
                    style={{
                      flex: 1, padding: 13, borderRadius: 10,
                      alignItems: 'center',
                      backgroundColor: options.destructive ? '#EF4444' : colors.primary,
                    }}
                  >
                    <Text style={{ fontWeight: '700', color: '#fff' }}>
                      {options.confirmLabel ?? 'Confirm'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Animated.View>
        </TouchableWithoutFeedback>
      </View>
    </Animated.View>
  )

  useOverlayEntry(node, PRIORITY, visible)
  return null
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible]   = useState(false)
  const [options, setOptions]   = useState<ConfirmOptions | null>(null)
  const resolver = useRef<((v: boolean) => void) | undefined>(undefined)

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts)
    setVisible(true)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const handle = useCallback((result: boolean) => {
    // Hide first, then resolve so the dialog animates out before callers act.
    setVisible(false)
    // Small delay lets the fade-out animate (140 ms) before the promise settles.
    setTimeout(() => {
      resolver.current?.(result)
      resolver.current = undefined
    }, 150)
  }, [])

  return (
    <ConfirmDialogContext.Provider value={confirm}>
      {children}
      <ConfirmDialogLayer visible={visible} options={options} onHandle={handle} />
    </ConfirmDialogContext.Provider>
  )
}
