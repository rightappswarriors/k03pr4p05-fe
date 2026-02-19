import { useState, useEffect } from 'react';
import { AuthService } from '@/services/authService';
import { AuthState } from '@/types';


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
      const state = await AuthService.initializeAuth();
      setAuthState(state);
    } catch (error) {
      console.error('Auth initialization failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const user = await AuthService.login(email, password);
      setAuthState(prev => ({ ...prev, user, isAuthenticated: true }));
      return user;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AuthService.logout();
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
      const success = await AuthService.bindDevice(storeId);
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