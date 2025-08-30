import React from 'react';
import { Stack } from 'expo-router';

import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import "@/global.css"
import { Slot } from 'expo-router';
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { StoreProvider } from '@/contexts/StoreContext'
import { LoadingProvider } from '@/contexts/LoadingContext'
import ProtectedRoute from '@/components/ProtectedRoute';
import FloatingBadge from '@/components/FloatingBadge'
export default function RootLayout() {
  useFrameworkReady();

  return (
    <ThemeProvider>

      <AuthProvider>
        <ProtectedRoute>
          <StoreProvider>
            <Stack screenOptions={{ headerShown: false }}>

            </Stack>
          </StoreProvider>
        </ProtectedRoute>
        <FloatingBadge />
      </AuthProvider>


    </ThemeProvider>
  );
}
