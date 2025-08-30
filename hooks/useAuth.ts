import { useState, useEffect } from 'react';
import { MockAuthService } from '@/services/mockAuthService';
import { AuthState } from '@/types';
import { useWiFiAuth } from './useWifiAuth';

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    accessToken: null,
    refreshToken: null,
    isLoading: false,
    isAuthenticated: false,
    deviceBound: false,
    wifiAuthorized: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      const state = await MockAuthService.initializeAuth();
      setAuthState(state);
    } catch (error) {
      console.error('Auth initialization failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const state = await MockAuthService.login(email, password);
      setAuthState(state);
      return state;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await MockAuthService.logout();
      setAuthState({
          user: null,
          accessToken: null,
          refreshToken: null,
          isLoading: false,
          isAuthenticated: false,
          deviceBound: false,
          wifiAuthorized: false,
      });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const bindDevice = async (storeId: string) => {
    try {
      const success = await MockAuthService.bindDevice(storeId);
      if (success) {
        setAuthState(prev => ({ ...prev, deviceBound: true }));
      }
      return success;
    } catch (error) {
      console.error('Device binding failed:', error);
      return false;
    }
  };

  return {
    isAuthenticated: authState.isAuthenticated,
    isDeviceBound: authState.deviceBound,
    isWiFiAuthorized: authState.wifiAuthorized,
    user: authState.user,
    token: authState.accessToken,
    isLoading,
    login,
    logout,
    bindDevice,
  };
}