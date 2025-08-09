import React from 'react';
import { Stack } from 'expo-router';

import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import "@/global.css"
import { Slot } from 'expo-router';
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { LoadingProvider } from '@/contexts/LoadingContext'
import AppLoader from '@/components/AppLoader'
import ProtectedRoute from '@/components/ProtectedRoute';
export default function RootLayout() {
  useFrameworkReady();

  return (
    <ThemeProvider>
      <LoadingProvider>
        <AuthProvider>
          <ProtectedRoute>
            <Stack screenOptions={{ headerShown: false }}>
              <Slot />
              <AppLoader />
            </Stack>
          </ProtectedRoute>
        </AuthProvider>
      </LoadingProvider>
    </ThemeProvider>
  );
}
