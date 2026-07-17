/** A single, root-level overlay portal shared by catalog sheets and dialogs. */
import React, {
  createContext, useCallback, useContext, useLayoutEffect,
  useMemo, useRef, useState,
} from 'react'
import { Modal, View } from 'react-native'

interface OverlayEntry {
  id: string
  node: React.ReactNode
  priority: number
  order: number
}

export interface OverlayHostValue {
  push: (node: React.ReactNode, priority: number) => string
  remove: (id: string) => void
}

interface OverlayHostInternalValue extends OverlayHostValue {
  update: (id: string, node: React.ReactNode) => void
}

const OverlayHostContext = createContext<OverlayHostInternalValue | null>(null)
const OverlayEntriesContext = createContext<OverlayEntry[] | null>(null)

export function useOverlayHost(): OverlayHostValue {
  const context = useContext(OverlayHostContext)
  if (!context) throw new Error('useOverlayHost must be used inside OverlayHostProvider')
  return { push: context.push, remove: context.remove }
}

let sequence = 0

export function OverlayHostProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<OverlayEntry[]>([])

  const push = useCallback((node: React.ReactNode, priority: number) => {
    const order = ++sequence
    const id = `overlay_${order}`
    setEntries(previous => [...previous, { id, node, priority, order }].sort(
      (a, b) => a.priority - b.priority || a.order - b.order,
    ))
    return id
  }, [])

  const remove = useCallback((id: string) => {
    setEntries(previous => previous.filter(entry => entry.id !== id))
  }, [])

  // Updating a mounted entry is intentionally private. The public host API is
  // push/remove; this prevents consumers from having to manage stack IDs.
  const update = useCallback((id: string, node: React.ReactNode) => {
    setEntries(previous => previous.map(entry => (
      entry.id === id ? { ...entry, node } : entry
    )))
  }, [])

  const value = useMemo(() => ({ push, remove, update }), [push, remove, update])

  return (
    <OverlayHostContext.Provider value={value}>
      <OverlayEntriesContext.Provider value={entries}>
        {children}
      </OverlayEntriesContext.Provider>
    </OverlayHostContext.Provider>
  )
}

/**
 * Render this once inside ThemeProvider. Keeping the portal surface in the
 * themed subtree preserves React context for overlays stored by the host.
 */
export function OverlayHostModal() {
  const entries = useContext(OverlayEntriesContext)
  if (!entries) throw new Error('OverlayHostModal must be used inside OverlayHostProvider')

  return (
      <Modal
        visible={entries.length > 0}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => {}}
      >
        <View style={{ flex: 1 }} pointerEvents="box-none">
          {entries.map(entry => (
            <View
              key={entry.id}
              style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
              pointerEvents="box-none"
            >
              {entry.node}
            </View>
          ))}
        </View>
      </Modal>
  )
}

/** Register an overlay element while visible and keep its content current. */
export function useOverlayEntry(node: React.ReactNode, priority: number, visible: boolean) {
  const host = useContext(OverlayHostContext)
  if (!host) throw new Error('useOverlayEntry must be used inside OverlayHostProvider')
  const idRef = useRef<string | null>(null)

  React.useEffect(() => {
    if (visible && !idRef.current) idRef.current = host.push(node, priority)
    if (!visible && idRef.current) {
      host.remove(idRef.current)
      idRef.current = null
    }
    return () => {
      if (idRef.current) {
        host.remove(idRef.current)
        idRef.current = null
      }
    }
  }, [host, priority, visible]) // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    if (visible && idRef.current) host.update(idRef.current, node)
  }, [host, node, visible])
}
