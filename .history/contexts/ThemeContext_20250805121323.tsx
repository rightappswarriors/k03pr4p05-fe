import React, { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type Theme = 'light' | 'dark'

interface ThemeContextType {
     theme: Theme;
     toggleTheme: () => void
     colors: {
          background: string,
          surface: string,
          primary: string,
          text: string,
          textSecondary: string,
          border: string,
          card: string,
          success: string,
          warning: string,
          error: string,
     }
}

const lightColors = {
     background: "#F9FAFB",
     surface: '#FFFFFF',
     primary: '#3B82F6',
     text: '#1F2937',
     textSecondary: '#6B7280',
     border: '#E5E7EB',
     card: '#FFFFFF',
     success: '#10B981',
     warning: '#F59E0B',
     error: '#EF4444',

}

const darkColors = {
     background: '#111827',
     surface: '#1F2937',
     primary: '#60A5FA',
     text: '#D1D5DB',
     textSecondary: '#9CA3AF',
     border: '#374151',
     card: '#1F2937',
     success: '#34D399',
     warning: '#FBBF24',
     error: '#F87171',

}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);


const THEME_STORAGE_KEY = 'app_theme'

export function ThemeProvider({ children }: { children: React.ReactNode }) {

     const [theme, setTheme] = useState<Theme>('light')

     useEffect(() => {
          loadTheme()
     }, [])

     const loadTheme = async () => {
          try {
               const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY)
               if (savedTheme === 'light' || savedTheme === 'dark') {
                    setTheme(savedTheme)
               }
          } catch (error) {
               console.error('Error loading theme:', error)
          }
     }
     const toggleTheme = async () => {
          try {
               const newTheme: Theme = theme === 'light' ? 'dark' : 'light'
               setTheme(newTheme)
               await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme)
          } catch (error) {
               console.error('Error saving theme:', error)
          }
     }

     const colors = theme === 'light' ? lightColors : darkColors


     return (
          <ThemeContext.Provider
               value={{
                    theme,
                    toggleTheme,
                    colors
               }}

          >
               {children}
          </ThemeContext.Provider>
     );
}

export function useTheme() {
     const context = useContext(ThemeContext)
     if (context === undefined) {
          throw new Error('UseTheme must be within a ThemeProvider')
     }
     return context
}