// app/(tabs)/_layout.tsx

import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { SyncService } from '@/services/syncService';
import ResponsiveTab from '@/components/dashboard/ResponsiveTabLayout';
import PrinterScreen from './printer';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
import {
  Printer,
  Settings,
  ShoppingCart,
  History,
  LayoutDashboard,
} from 'lucide-react-native';
import { CartProvider } from '@/contexts/POSContext';
import { AuthService } from '@/services/authService';

export default function TabLayout() {
  const { colors } = useTheme();

  const { isMobile } = useResponsive();
  useEffect(() => {
    SyncService.startBackgroundSync();
  }, []);


  const { isAuthenticated, isLoading, user } = useAuth();
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    // Only CASHIER-assigned staff can access tabs
    // OWNER/MANAGER/ADMIN should be in their own areas
    const allowedRoles = ['CASHIER', 'STAFF'];
    if (!allowedRoles.includes(user?.role ?? '')) {
      router.replace('/(erp)');
      return;
    }

    // Extra check: verify they actually have an outlet assignment
    AuthService.getMyOutletAssignment().then((assignment) => {
      if (!assignment || assignment.role !== 'CASHIER') {
        router.replace('/(employee)'); // no assignment → attendance only
      }
    });
  }, [isAuthenticated, isLoading]);

  if (!isMobile) {
    return <ResponsiveTab />;
  } else {
    return (
      <CartProvider>
        <Tabs
          screenOptions={{
            headerShown: false,

            tabBarActiveTintColor: colors.primary, // active icon & label color
            tabBarInactiveTintColor: colors.text, // inactive icon & label color
            tabBarStyle: {
              backgroundColor: colors.background, // tab bar background
              borderColor: colors.card, // border color
              borderTopWidth: 1, // border thickness
              elevation: 0, // remove shadow on Android
              shadowOpacity: 0, // remove shadow on iOS
            },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title:
                user?.role === 'MANAGER' || user?.role === 'OWNER'
                  ? 'Dashboard'
                  : 'POS', // the screen title
              tabBarIcon: ({ color }) =>
                user?.role === 'MANAGER' || user?.role === 'OWNER' ? (
                  <LayoutDashboard size={20} color={color} />
                ) : (
                  <ShoppingCart size={20} color={color} />
                ),
            }}
          />

          <Tabs.Screen
            name="history"
            options={{
              tabBarIcon: ({ color }) => <History size={20} color={color} />,
              title: 'Orders',
            }}
          />
          {Platform.OS !== 'web' && (
            <Tabs.Screen
              name="printer"
              options={{
                tabBarIcon: ({ color }) => <Printer size={20} color={color} />,
                title: 'Printer',
              }}
            />
          )}
          <Tabs.Screen
            name="settings"
            options={{
              tabBarIcon: ({ color }) => <Settings size={20} color={color} />,
              title: 'Settings',
            }}
          />
        </Tabs>
      </CartProvider>
    );
  }
}
