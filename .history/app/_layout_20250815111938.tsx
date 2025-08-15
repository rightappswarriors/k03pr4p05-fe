import React from 'react';
import { Stack } from 'expo-router';

import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import "@/global.css"
import { Slot } from 'expo-router';
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { LoadingProvider } from '@/contexts/LoadingContext'
import ProtectedRoute from '@/components/ProtectedRoute';
import BadgeWithDialog  from '@/components/BadgeWithDialog'
export default function RootLayout() {
  useFrameworkReady();

  return (
    <ThemeProvider>
      <LoadingProvider>
        <AuthProvider>
          <ProtectedRoute>
            <Stack screenOptions={{ headerShown: false }}>
              <Slot />
              
            </Stack>
          </ProtectedRoute>
        </AuthProvider>
      </LoadingProvider>
      <BadgeWithDialog/>
    </ThemeProvider>
  );
}
