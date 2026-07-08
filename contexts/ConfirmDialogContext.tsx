import React, { createContext, useCallback, useContext, useRef, useState } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { FadeDialogModal } from '@/components/supplier/catalog/FadeDialogModal'

interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmDialogContext = createContext<ConfirmFn | null>(null)

/**
 * Cross-platform replacement for Alert.alert(title, message, buttons).
 * Alert.alert's multi-button form has no real implementation on web (RN Web
 * can't render native OS buttons in a browser), so anything using it for
 * Confirm/Cancel silently breaks there. This renders an actual modal instead,
 * via the same FadeDialogModal used elsewhere, so it works identically on
 * native and web.
 *
 * Usage: const confirm = useConfirm(); const ok = await confirm({ title, message }); if (!ok) return;
 */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmDialogContext)
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmDialogProvider')
  return ctx
}

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme()
  const [visible, setVisible] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<((v: boolean) => void) | undefined>(undefined)

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts)
    setVisible(true)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const handle = (result: boolean) => {
    setVisible(false)
    resolver.current?.(result)
    resolver.current = undefined
  }

  return (
    <ConfirmDialogContext.Provider value={confirm}>
      {children}
      <FadeDialogModal visible={visible} onRequestClose={() => handle(false)} maxWidth={420}>
        {options && (
          <View style={{ padding: 20, gap: 14 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>{options.title}</Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 19 }}>{options.message}</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
              <TouchableOpacity
                onPress={() => handle(false)}
                style={{ flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}
              >
                <Text style={{ fontWeight: '700', color: colors.text }}>{options.cancelLabel ?? 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handle(true)}
                style={{ flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', backgroundColor: options.destructive ? '#EF4444' : colors.primary }}
              >
                <Text style={{ fontWeight: '700', color: '#fff' }}>{options.confirmLabel ?? 'Confirm'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </FadeDialogModal>
    </ConfirmDialogContext.Provider>
  )
}