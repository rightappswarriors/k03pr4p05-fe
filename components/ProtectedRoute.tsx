// components/ProtectedRoute.tsx
import { useRouter, usePathname  } from 'expo-router';
import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname(); // ✅ get current route path

  useEffect(() => {
    if (isLoading) return; // ✅ wait until auth finishes

    // Allow access to onboarding screen for unauthenticated users
    if (pathname === '/onboarding') {
      return;
    }

    if (!isAuthenticated || !user) {
      if (pathname !== '/login') {
        router.replace('/login');
      }
    }
  }, [isLoading, user, isAuthenticated, router, pathname]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <>{children}</>;
}
