/**
 * ToastContext — lightweight toast notifications.
 *
 * Registers into the shared OverlayHost at priority 400 (highest), so toasts
 * always render above confirm dialogs (300), saving overlays (200), and sheets (100).
 *
 * Public API is unchanged:
 *   const toast = useToast()
 *   toast.show('Saved!', 'success', 3000)
 */
import React, {
  createContext, useCallback, useContext,
  useRef, useState,
} from 'react'
import { Animated, Text, View } from 'react-native'
import { CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react-native'
import { useOverlayEntry } from '@/contexts/OverlayHostContext'

const PRIORITY = 400

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastVariant = 'success' | 'error' | 'warning' | 'info'

interface ToastContextValue {
  show: (message: string, variant?: ToastVariant, duration?: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

// ─── Style maps ───────────────────────────────────────────────────────────────

const VARIANT_STYLES: Record<ToastVariant, { bg: string; border: string; fg: string }> = {
  success: { bg: '#ECFDF5', border: '#6EE7B7', fg: '#065F46' },
  error:   { bg: '#FEF2F2', border: '#FCA5A5', fg: '#7F1D1D' },
  warning: { bg: '#FFFBEB', border: '#FDE68A', fg: '#78350F' },
  info:    { bg: '#EFF6FF', border: '#BFDBFE', fg: '#1E3A8A' },
}
const VARIANT_ICONS: Record<ToastVariant, React.FC<any>> = {
  success: CheckCircle2, error: XCircle, warning: AlertTriangle, info: Info,
}
const ICON_COLORS: Record<ToastVariant, string> = {
  success: '#059669', error: '#DC2626', warning: '#D97706', info: '#2563EB',
}

// ─── Inner layer component ────────────────────────────────────────────────────

interface ToastState {
  message: string
  variant: ToastVariant
}

function ToastLayer({
  visible, state,
}: {
  visible: boolean
  state: ToastState
}) {
  const translateY = useRef(new Animated.Value(-80)).current
  const opacity    = useRef(new Animated.Value(0)).current

  React.useEffect(() => {
    if (visible) {
      translateY.setValue(-80)
      opacity.setValue(0)
      Animated.parallel([
        Animated.timing(opacity,    { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 24, bounciness: 5 }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(opacity,    { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -80, duration: 200, useNativeDriver: true }),
      ]).start()
    }
  }, [visible, opacity, translateY])

  const style    = VARIANT_STYLES[state.variant]
  const Icon     = VARIANT_ICONS[state.variant]
  const iconColor = ICON_COLORS[state.variant]

  const node = (
    // pointerEvents="none" so toast never blocks touches on dialogs beneath it.
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 56, left: 0, right: 0,
        alignItems: 'center',
        opacity,
        transform: [{ translateY }],
      }}
    >
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 10,
        maxWidth: 480, marginHorizontal: 20,
        backgroundColor: style.bg,
        borderWidth: 1, borderColor: style.border,
        borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 12,
        shadowColor: '#000', shadowOpacity: 0.14,
        shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
        elevation: 8,
      }}>
        <Icon size={17} color={iconColor} strokeWidth={2.2} />
        <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: style.fg }}>
          {state.message}
        </Text>
      </View>
    </Animated.View>
  )

  useOverlayEntry(node, PRIORITY, visible)
  return null
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false)
  const [state, setState]     = useState<ToastState>({ message: '', variant: 'success' })
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hide = useCallback(() => {
    setVisible(false)
  }, [])

  const show = useCallback((
    message: string,
    variant: ToastVariant = 'success',
    duration = 3000,
  ) => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    setState({ message, variant })
    setVisible(true)
    hideTimer.current = setTimeout(hide, duration)
  }, [hide])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <ToastLayer visible={visible} state={state} />
    </ToastContext.Provider>
  )
}
