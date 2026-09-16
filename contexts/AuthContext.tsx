import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform, View } from 'react-native';
import { usePathname } from 'expo-router';
import { AuthService } from '@/services/authService';
import type { AuthState } from '@/types';
import { useLoading } from '@/contexts/LoadingContext'
import { useToast } from '@/contexts/ToastContext'
import {
  flushSessionActivity,
  isSessionInactive,
  recordSessionActivity,
  recordSessionActivityIfActive,
  restoreSessionActivity,
  startSessionActivity,
} from '@/services/sessionInactivity'

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  loginWithBiometric: () => Promise<void>;
  logout: (outletId: number) => Promise<void>;
  removeUser: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
  isBiometricSupported: () => Promise<boolean>;
  isBiometricEnabled: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setLoading } = useLoading()
  const { show: showToast } = useToast()
  const pathname = usePathname()
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    accessToken: null,
    refreshToken: null,
  });
  const authStateRef = useRef(authState)
  const expiryInProgress = useRef(false)
  const foregroundInProgress = useRef(false)

  useEffect(() => { authStateRef.current = authState }, [authState])

  // ─── Initial auth check on mount ───────────────────────────────────────────
  const expireInactiveSession = useCallback(async () => {
    if (expiryInProgress.current) return
    expiryInProgress.current = true
    try {
      await AuthService.removeUser()
      setAuthState({ user: null, isLoading: false, isAuthenticated: false, accessToken: null, refreshToken: null })
      showToast('Your session expired after 30 minutes of inactivity. Please sign in again.', 'warning', 7000)
    } finally {
      expiryInProgress.current = false
    }
  }, [showToast])

  const checkInactivity = useCallback(async (reloadStored = false) => {
    if (!authStateRef.current.isAuthenticated) return false
    if (await isSessionInactive(Date.now(), reloadStored)) {
      await expireInactiveSession()
      return true
    }
    return false
  }, [expireInactiveSession])

  const refreshForegroundSession = useCallback(async () => {
    if (foregroundInProgress.current || !authStateRef.current.isAuthenticated) return
    foregroundInProgress.current = true
    try {
      if (await checkInactivity(true)) return
      const updated = await AuthService.onAppForeground()
      if (updated) {
        setAuthState(updated)
        return
      }
      const tokens = await AuthService.getTokens()
      if (!tokens.accessToken && !tokens.refreshToken) {
        setAuthState({ user: null, isLoading: false, isAuthenticated: false, accessToken: null, refreshToken: null })
      }
    } finally {
      foregroundInProgress.current = false
    }
  }, [checkInactivity])

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') void refreshForegroundSession()
      else void flushSessionActivity().catch(() => {})
    })
    return () => sub.remove()
  }, [refreshForegroundSession])

  useEffect(() => {
    if (!authState.isAuthenticated) return
    const timer = setInterval(() => { void checkInactivity() }, 30 * 1000)
    return () => clearInterval(timer)
  }, [authState.isAuthenticated, checkInactivity])

  useEffect(() => {
    if (!authState.isAuthenticated || Platform.OS !== 'web' || typeof document === 'undefined') return
    const onActivity = () => {
      const now = Date.now()
      if (recordSessionActivityIfActive(now)) return
      void isSessionInactive(now, true).then((inactive) => {
        if (inactive) void expireInactiveSession()
        else recordSessionActivity(now)
      })
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void refreshForegroundSession()
      else void flushSessionActivity().catch(() => {})
    }
    const events = ['pointerdown', 'keydown', 'touchstart', 'scroll'] as const
    events.forEach((event) => document.addEventListener(event, onActivity, { capture: true, passive: true }))
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('focus', refreshForegroundSession)
    return () => {
      events.forEach((event) => document.removeEventListener(event, onActivity, { capture: true }))
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('focus', refreshForegroundSession)
    }
  }, [authState.isAuthenticated, expireInactiveSession, refreshForegroundSession])

  useEffect(() => {
    if (authState.isAuthenticated && !recordSessionActivityIfActive()) void expireInactiveSession()
  }, [authState.isAuthenticated, expireInactiveSession, pathname])

  // ───────────────────────────────────────────────────────────────────────────

  const checkAuthStatus = useCallback(async () => {
    try {
      setLoading(true);
      const tokens = await AuthService.getTokens()
      const restoredActivity = await restoreSessionActivity()
      if ((tokens.accessToken || tokens.refreshToken) && restoredActivity != null && await isSessionInactive()) {
        await expireInactiveSession()
        return
      }
      const authState = await AuthService.initializeAuth();
      setAuthState(authState);
      if (authState.isAuthenticated && restoredActivity == null) await startSessionActivity()
    } catch (error) {
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        accessToken: null,
        refreshToken: null,
      });
    } finally {
      setLoading(false);
    }
  }, [expireInactiveSession, setLoading]);

  useEffect(() => {
    void checkAuthStatus()
  }, [checkAuthStatus])

  const refreshUser = async () => {
    try {
      setLoading(true);
      const authState = await AuthService.initializeAuth();
      setAuthState(authState);
    } catch (error) {
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        accessToken: null,
        refreshToken: null,
      });
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const user = await AuthService.login(email, password);
      const { accessToken, refreshToken } = await AuthService.getTokens();
      await startSessionActivity()

      setAuthState({
        user,
        isLoading: false,
        isAuthenticated: true,
        accessToken,
        refreshToken,
      });
    } finally {
      setLoading(false);
    }
  };

  const loginWithBiometric = async () => {
    try {
      setLoading(true)
      const user = await AuthService.loginWithBiometric();

      if (user) {
        await startSessionActivity()
        setAuthState({
          user,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        throw new Error('Biometric authentication failed');
      }
    } catch (error) {
      throw error;
    } finally {
      setLoading(false)
    }
  };

  const logout = async (outletId: number) => {
    try {
      setLoading(true)
      await AuthService.logout(outletId);
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        accessToken: null,
        refreshToken: null,
      });
    } catch (error) {
      if (__DEV__) console.error('Logout error:', error);
    } finally {
      setLoading(false)
    }
  };

  const setBiometricEnabled = async (enabled: boolean) => {
    await AuthService.setBiometricEnabled(enabled);
  };

  const removeUser = async () => {
    try {
      setLoading(true)
      await AuthService.removeUser()
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    } catch (error) {
      if (__DEV__) console.error('Logout error:', error);
    } finally {
      setLoading(false)
    }
  }

  const isBiometricSupported = async () => {
    return await AuthService.isBiometricSupported();
  };

  const isBiometricEnabled = async () => {
    return await AuthService.isBiometricEnabled();
  };

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        loginWithBiometric,
        logout,
        removeUser,
        refreshUser,
        setBiometricEnabled,
        isBiometricSupported,
        isBiometricEnabled,
      }}
    >
      <View style={{ flex: 1 }} onTouchStart={() => {
        if (authStateRef.current.isAuthenticated && !recordSessionActivityIfActive()) void expireInactiveSession()
      }}>
        {children}
      </View>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
