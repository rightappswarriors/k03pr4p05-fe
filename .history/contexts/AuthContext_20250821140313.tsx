// components/ProtectedRoute.tsx
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return; // ✅ wait until auth finishes

    if (!isAuthenticated || !user) {
      // only redirect if not already on login
      if (router.pathname !== '/login') {
        router.replace('/login');
      }
    } else {
      // authenticated: go to tabs if not already there
      if (!router.pathname.startsWith('/(tabs)')) {
        router.replace('/(tabs)');
      }
    }
  }, [isLoading, user, isAuthenticated, router]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <>{children}</>;
}
