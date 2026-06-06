import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

export type Theme = 'light' | 'dark';
// contexts/ThemeContext.tsx { colors } = useTheme() => colors.primary, colors.background, etc. for consistent theming across the app
interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  colors: typeof lightColors;
}

// ── Right Apps Inc. Brand Palette ──────────────────────────────
const lightColors = {
  background: '#F5F7FA', // soft off-white
  surface: '#FFFFFF',
  primary: '#1B3A6B', // navy blue (logo)
  primaryLight: '#2A5298', // lighter navy for hover/press states
  accent: '#E87722', // orange (logo)
  accentLight: '#F4A44E', // lighter orange for hover/press states
  text: '#1B3A6B', // navy for headings
  textSecondary: '#5A6A85', // muted navy-grey
  border: '#D6DCE8', // light navy-tint border
  card: '#FFFFFF',
  success: '#10B981',
  warning: '#E87722', // reuse brand orange for warnings
  error: '#EF4444',
  danger: '#EF4444',        // mirrors error; diverge later if needed
  cardBackground: '#F0F4FF', // faint navy wash — depth vs #F5F7FA bg
};

const darkColors = {
  background: '#0D1B2E', // deep navy (darker than logo navy)
  surface: '#1B3A6B', // navy (logo) as surface
  primary: '#E87722', // orange becomes primary CTA in dark mode
  primaryLight: '#F4A44E',
  accent: '#F4A44E', // lighter orange as accent
  accentLight: '#F9C07E',
  text: '#F0F4FF', // near-white with navy tint
  textSecondary: '#A8B8D8', // muted cool grey-blue
  border: '#2A4A7F', // mid-navy border
  card: '#162D52', // slightly lighter than background
  success: '#34D399',
  warning: '#FBBF24',
  error: '#F87171', 
  danger: '#F87171',         // mirrors error for dark mode
  cardBackground: '#1A3355', // slightly lighter than card (#162D52)
};

// ── Context ─────────────────────────────────────────────────────
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const THEME_KEY = 'rightapps_theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null

  // ① Initialize from system scheme immediately — no async flash
  const [theme, setTheme] = useState<Theme>(
    systemScheme === 'dark' ? 'dark' : 'light',
  );
  const saveQueued = useRef(false);

  // ② Hydrate from storage once on mount (overrides system default if user saved a preference)
  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark') setTheme(saved);
    });
  }, []);

  // ③ toggleTheme: update state instantly, save to storage in background
  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'light' ? 'dark' : 'light';

      // Fire-and-forget — don't await so UI is never blocked
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
