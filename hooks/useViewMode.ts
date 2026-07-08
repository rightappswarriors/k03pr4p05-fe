import { useState, useEffect, useCallback } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useWindowDimensions } from 'react-native'

export type ViewMode = 'table' | 'card'

const VIEW_MODE_KEY = '@catalog_view_mode'

export function useViewMode() {
  const { width } = useWindowDimensions()
  const [viewMode, setViewMode] = useState<ViewMode>('card')

  // Determine default mode based on screen size
  const getDefaultMode = useCallback((): ViewMode => {
    if (width >= 1024) return 'table' // Desktop
    if (width >= 600) return 'card' // Tablet - remember previous
    return 'card' // Mobile
  }, [width])

  useEffect(() => {
    async function loadSavedMode() {
      try {
        const saved = await AsyncStorage.getItem(VIEW_MODE_KEY)
        if (saved === 'table' || saved === 'card') {
          setViewMode(saved)
        } else {
          setViewMode(getDefaultMode())
        }
      } catch {
        setViewMode(getDefaultMode())
      }
    }
    loadSavedMode()
  }, [getDefaultMode])

  const updateViewMode = async (mode: ViewMode) => {
    setViewMode(mode)
    try {
      await AsyncStorage.setItem(VIEW_MODE_KEY, mode)
    } catch {
      // Silent fail for storage errors
    }
  }

  return {
    viewMode,
    setViewMode: updateViewMode,
    isDesktop: width >= 1024,
    isTablet: width >= 600 && width < 1024,
    isPhone: width < 600,
    width,
  }
}
