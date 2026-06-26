import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { WebSocketProvider } from '@/contexts/WSContext';
import { router, Stack } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import React, { useEffect } from 'react';

export default function AdminTabLayout() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const canViewSeller = user?.position?.permissions?.some(
    p => p.page?.access === 'SELLER' && p.canView
  );

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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

    if (!user.orgId) {
      router.replace('/onboarding?step=organization');
      return;
    }

    if (!user.org?.subscription?.id) {
      router.replace('/onboarding?step=subscription');
      return;
    }
  }, [isAuthenticated, isLoading, user]);
  return (
    <SubscriptionProvider>
      <WebSocketProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="branch" />
          <Stack.Screen name="orderManagement" />
          <Stack.Screen name="outlets" />
          <Stack.Screen name="add-inventory-item" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="outlet-detail" />
        </Stack>
      </WebSocketProvider>
    </SubscriptionProvider>
  );
}
