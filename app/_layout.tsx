import React from 'react';
import { Stack } from 'expo-router';

import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import "@/global.css"
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import ProtectedRoute from '@/components/ProtectedRoute';
import FloatingBadge from '@/components/FloatingBadge'
export default function RootLayout() {
  useFrameworkReady();

  return (
    <ThemeProvider>

      <AuthProvider>
        <ProtectedRoute>
            <Stack screenOptions={{ headerShown: false }}>
            </Stack>
        </ProtectedRoute>
        {/**<FloatingBadge /> */}
      </AuthProvider>
    </ThemeProvider>
  );
}
