// app/(erp)/_layout.tsx
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router, Stack } from 'expo-router';
import ERPLayout from '@/components/erp/ERPLayout';
import { MasterFileProvider } from '@/contexts/MasterFileContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { WebSocketProvider } from '@/contexts/WSContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { HrService } from '@/services';

export default function ErpLayout() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { colors } = useTheme();
  const [hasTimeIn, setHasTimeIn] = useState(false);
  const [timeInLoading, setTimeInLoading] = useState(true);

  const canViewSeller = user?.position?.permissions?.some(
    p => p.page?.access === 'SELLER' && p.canView
  );

  // ── time-in check ──────────────────────────────────────────
  useEffect(() => {
    const checkTimeIn = async () => {
      if (!user?.id) {
        setTimeInLoading(false);
        return;
      }
      try {
        setTimeInLoading(true);
        const timeInStatus = await HrService.checkUserTimeInStatus(user.id);
        setHasTimeIn(timeInStatus?.hasTimeIn || false);
      } catch (error) {
        if (__DEV__) console.error('Error checking time-in status:', error);
        setHasTimeIn(false);
      } finally {
        setTimeInLoading(false);
      }
    };
    checkTimeIn();
  }, [user?.id]);

  // ── auth / org / subscription / role / time-in redirects ──────
  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
  
    if (!user) return;

    const canAccessERP =
      user.role === 'OWNER' ||
      user.role === 'MANAGER' ||
      user.role === 'STAFF' ||
      canViewSeller;

    if (!canAccessERP) {
      router.replace('/(tabs)');
      return;
    }
    if (!user.org?.roles?.includes('SELLER')) {
      router.replace('/(supplier)')
    }
    if (!user.orgId) {
      router.replace('/onboarding?step=organization');
      return;
    }

    if (!user.org?.subscription?.id) {
      router.replace('/onboarding?step=subscription');
      return;
    }

    if (timeInLoading) return; // wait for time-in check before gating on it

    const isOwner = user.role === 'OWNER';
    const isManager = user.role === 'MANAGER';
    const canSkipTimeIn = isOwner || isManager;

    if (!canSkipTimeIn && !hasTimeIn && !__DEV__) {
      router.replace('/(employee)');
    }
  }, [authLoading, isAuthenticated, user, canViewSeller, timeInLoading, hasTimeIn]);

  // ── loading state ──────────────────────────────────────────
  if (authLoading || timeInLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated || !user || !user.orgId || !user.org?.subscription?.id) {
    return null; // redirect in flight
  }

  const isOwner = user.role === 'OWNER';
  const isManager = user.role === 'MANAGER';
  const canSkipTimeIn = isOwner || isManager;

  if (!canSkipTimeIn && !hasTimeIn && !__DEV__) {
    return null; // redirect in flight
  }

  return (
    <SubscriptionProvider>
      <WebSocketProvider>
        <MasterFileProvider>
          <ERPLayout>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="branch" />
              <Stack.Screen name="orderManagement" />
              <Stack.Screen name="outlets" />
              <Stack.Screen name="add-inventory-item" />
              <Stack.Screen name="settings" />
              <Stack.Screen name="outlet-detail" />
            </Stack>
          </ERPLayout>
        </MasterFileProvider>
      </WebSocketProvider>
    </SubscriptionProvider>
  );
}