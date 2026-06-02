import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { WebSocketProvider } from '@/contexts/WSContext';
import { useAuth } from '@/hooks/useAuth';
import { router, Stack } from 'expo-router';
import React, { useEffect } from 'react';

export default function AdminTabLayout() {
  const { isAuthenticated, isLoading, user } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    } else if (
      !isLoading &&
      isAuthenticated &&
      (user?.role === 'CASHIER' || user?.role === 'STAFF')
    ) {
      router.replace('/(tabs)');
    } else if (
      !isLoading &&
      isAuthenticated &&
      (user?.role === 'MANAGER' || user?.role === 'OWNER') &&
      !user?.orgId
    ) {
      // User has admin/owner role but no organization - redirect to onboarding
      router.replace('/onboarding?step=organization');
    } else if (
      !isLoading &&
      isAuthenticated &&
      (user?.role === 'MANAGER' || user?.role === 'OWNER') &&
      user?.orgId &&
      !user?.org?.subscription?.id
    ) {
      // User has organization but no subscription - redirect to subscription step
      router.replace('/onboarding?step=subscription');
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
