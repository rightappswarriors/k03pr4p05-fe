// components/ProtectedRoute.tsx
import { useRouter, usePathname } from 'expo-router';
import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // ✅ Only include dependencies that actually change
  // router object reference doesn't matter for route changes
  useEffect(() => {
    if (isLoading) return;

    // Allow access to onboarding screen for unauthenticated users
    if (pathname === '/onboarding') {
      return;
    }

    if (pathname.startsWith('/supplier')) {
      return;
    }

    if (!isAuthenticated || !user) {
      if (pathname !== '/login') {
        router.replace('/login');
      }
    }
  }, [isLoading, isAuthenticated, user, pathname]);

  // ✅ Render hooks consistently - always render children structure
  // Just conditionally show loading overlay inside
  return (
    <>
      {isLoading && (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: colors.background,
          }}
        >
          <ActivityIndicator size="large" />
        </View>
      )}
      {!isLoading && children}
    </>
  );
}
