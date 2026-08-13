import React, { createContext, useContext, useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import './global.css';

import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ActiveRoleProvider } from '@/contexts/ActiveRoleContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { ConfirmDialogProvider } from '@/contexts/ConfirmDialogContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { OverlayHostModal, OverlayHostProvider } from '@/contexts/OverlayHostContext';
import { SocketProvider } from '@/contexts/SocketContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { ConversationProvider } from '@/contexts/ConversationContext';

// Keep onboarding context to avoid extra changes for existing onboarding data usage
interface OnboardingContextType {
  hasOnboarded: boolean;
  setHasOnboarded: (value: boolean) => Promise<void>;
  isLoggedIn: boolean;
  setIsLoggedIn: (value: boolean) => Promise<void>;
}

export const OnboardingContext = createContext<
  OnboardingContextType | undefined
>(undefined);

export const useOnboarding = () => {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be inside OnboardingContext');
  return ctx;
};

export default function RootLayout() {
  const [hasOnboarded, setHasOnboardedState] = useState(false);
  const [isLoggedIn, setIsLoggedInState] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useFrameworkReady();

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const onboarded = await AsyncStorage.getItem('hasOnboarded');
        const loggedIn = await AsyncStorage.getItem('isLoggedIn');
        setHasOnboardedState(onboarded === 'true');
        setIsLoggedInState(loggedIn === 'true');
      } catch (error) {
        if (__DEV__) console.error('Failed to load storage items:', error);
        setHasOnboardedState(false);
        setIsLoggedInState(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkLoginStatus();
  }, []);

  const setHasOnboarded = async (value: boolean) => {
    try {
      await AsyncStorage.setItem('hasOnboarded', value.toString());
      setHasOnboardedState(value);
    } catch (error) {
      if (__DEV__) console.error('Failed to set hasOnboarded:', error);
    }
  };

  const setIsLoggedIn = async (value: boolean) => {
    try {
      await AsyncStorage.setItem('isLoggedIn', value.toString());
      setIsLoggedInState(value);
    } catch (error) {
      if (__DEV__) console.error('Failed to set isLoggedIn:', error);
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <OverlayHostProvider>
      <ThemeProvider>

        <ToastProvider>
          <AuthProvider>
            <SocketProvider><NotificationProvider><ConversationProvider>
            <OverlayHostModal />
            <ConfirmDialogProvider>
              <ActiveRoleProvider>
                <OnboardingContext.Provider
                  value={{ hasOnboarded, setHasOnboarded, isLoggedIn, setIsLoggedIn }}
                >
                  <ProtectedRoute>
                    <Stack screenOptions={{ headerShown: false }}>
                      <Stack.Screen name="(supplier)" />
                      <Stack.Screen name="(public)" />
                      <Stack.Screen name="login" />
                      <Stack.Screen name="onboarding" />
                      <Stack.Screen name="index" />
                      <Stack.Screen name="+not-found" />
                    </Stack>
                  </ProtectedRoute>
                </OnboardingContext.Provider>
              </ActiveRoleProvider>

            </ConfirmDialogProvider>
            </ConversationProvider></NotificationProvider></SocketProvider>

          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </OverlayHostProvider>
  );
}
