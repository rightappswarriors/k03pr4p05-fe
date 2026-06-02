import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Theme = 'light' | 'dark';

const lightColors = {
  background: '#F4F7FB',
  surface: '#FFFFFF',
  primary: '#1D4ED8',
  primaryLight: '#DBEAFE',
  accent: '#E87722',
  accentLight: '#FED7AA',
  text: '#0F172A',
  textSecondary: '#64748B',
  border: '#E2E8F0',
  card: '#FFFFFF',
  header: '#FFFFFF',
  sidebar: '#FFFFFF',
  sidebarMuted: '#F1F5F9',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
};

const darkColors = {
  background: '#07111F',
  surface: '#0D1B2F',
  primary: '#60A5FA',
  primaryLight: '#1D4E89',
  accent: '#E87722',
  accentLight: '#FED7AA',
  text: '#F8FAFC',
  textSecondary: '#A8B7CC',
  border: '#1E3556',
  card: '#10243E',
  header: '#0B182A',
  sidebar: '#0B182A',
  sidebarMuted: '#10243E',
  success: '#34D399',
  warning: '#FBBF24',
  error: '#F87171',
};

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  colors: typeof lightColors;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const THEME_KEY = 'rightapps_theme_v3';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const saveQueued = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark') setTheme(saved);
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'light' ? 'dark' : 'light';

      if (!saveQueued.current) {
        saveQueued.current = true;
        AsyncStorage.setItem(THEME_KEY, next).finally(() => {
          saveQueued.current = false;
        });
      }

      return next;
    });
  }, []);

  const colors = theme === 'light' ? lightColors : darkColors;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}
