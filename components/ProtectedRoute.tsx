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

  useEffect(() => {
    if (isLoading) return;

    // Allow access to onboarding screen for unauthenticated users
    if (pathname === '/onboarding') {
      return;
    }

    // Allow access to public supplier registration
    if (pathname.startsWith('/(public)/supplier')) {
      return;
    }

    // Redirect unauthenticated users to login
    if (!isAuthenticated || !user) {
      if (pathname !== '/login') {
        router.replace('/login');
      }
      return;
    }

    // Handle SUPPLIER role - redirect based on approval status
    if (user.role === 'SUPPLIER') {
      if (user.approvalStatus === 'PENDING') {
        // Pending suppliers go to pending screen
        if (pathname !== '/(supplier)/pending') {
          router.replace('/(supplier)/pending');
        }
        return;
      }
      if (user.approvalStatus === 'REJECTED') {
        // Rejected suppliers see rejection message (stay on login)
        router.replace('/login');
        return;
      }
      // Approved suppliers proceed normally
      return;
    }

    // Role-based redirects for authenticated users
    const roleRedirects: Record<string, string> = {
      ADMIN: '/(admin)',
      OWNER: '/(erp)',
      MANAGER: '/(employee)',
      STAFF: '/(employee)',
      CASHIER: '/(erp)',
      CUSTOMER: '/(customer)',
    };

    // If user is on login page and already authenticated, redirect to their default route
    if (pathname === '/login' && isAuthenticated && user) {
      const targetRoute = roleRedirects[user.role] || '/(admin)';
      router.replace(targetRoute as any);
      return;
    }
  }, [isLoading, isAuthenticated, user, pathname]);

  // Render hooks consistently - always render children structure
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
