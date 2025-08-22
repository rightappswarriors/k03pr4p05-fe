import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthService } from '@/services/authService';
import type { User, AuthState } from '@/types';
import { useLoading } from '@/contexts/LoadingContext'
import * as Keychain from 'react-native-keychain';
interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  loginWithBiometric: () => Promise<void>;
  logout: () => Promise<void>;
  removeUser: () => Promise<void>; 
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
  isBiometricSupported: () => Promise<boolean>;
  isBiometricEnabled: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setLoading } = useLoading()
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    accessToken: null,
    refreshToken: null,
    authenticated: null,
  });

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setLoading(true)
      const user = await AuthService.getCurrentUser();
      setAuthState({
        user,
        isLoading: false,
        isAuthenticated: !!user,
      });
    } catch (error) {
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    } finally {
      setLoading(false)
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true)
      const user = await AuthService.login(email, password);
      setAuthState({
        user,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch (error) {
      throw error;
    } finally{
      setLoading(false)
    }
  };

  const loginWithBiometric = async () => {
    try {
      setLoading(true)
      const user = await AuthService.loginWithBiometric();

      if (user) {
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

  const logout = async () => {
    try {
      setLoading(true)
      await AuthService.logout();
      await Keychain.resetGenericPassword();
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    } catch (error) {
      console.error('Logout error:', error);
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
      console.error('Logout error:', error);
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
        setBiometricEnabled,
        isBiometricSupported,
        isBiometricEnabled,
      }}
    >
      {children}
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