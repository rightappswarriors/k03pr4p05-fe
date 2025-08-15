import React from 'react';
import { Stack } from 'expo-router';

import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import "@/global.css"
import { Slot } from 'expo-router';
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { LoadingProvider } from '@/contexts/LoadingContext'
import ProtectedRoute from '@/components/ProtectedRoute';
import FloatingBadge from '@/components/FloatingBadge'
export default function RootLayout() {
  useFrameworkReady();

  return (
    <ThemeProvider>
      <LoadingProvider>
        <AuthProvider>
          <ProtectedRoute>
            <Stack screenOptions={{ headerShown: false }}>
              <Slot />
              <FloatingBadge/>
            </Stack>
          </ProtectedRoute>
        </AuthProvider>
      </LoadingProvider>
     
    </ThemeProvider>
  );
}
