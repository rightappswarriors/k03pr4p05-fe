// app/(employee)/_layout.tsx
import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { SyncService } from '@/services/syncService';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
import { Settings, Clock, LayoutDashboard } from 'lucide-react-native';
import ResponsiveTab from '@/components/dashboard/ResponsiveTabLayout';
import { CartProvider } from '@/contexts/POSContext';
import { AuthService } from '@/services/authService';

export default function TabLayout() {
  const { colors } = useTheme();

  const { isMobile } = useResponsive();
  useEffect(() => {
    SyncService.startBackgroundSync();
  }, []);

  const { isAuthenticated, isLoading, user } = useAuth();
  // app/(employee)/_layout.tsx — update the useEffect
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (user?.role === 'ADMIN') {
      router.replace('/(admin)');
      return;
    }
  }, [isAuthenticated, isLoading]);

  if (!isMobile) {
    return (
      <CartProvider>
        <ResponsiveTab name={'employee'} />
      </CartProvider>
    );
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
              title: 'Attendance',
              tabBarIcon: ({ color }) => <Clock size={20} color={color} />,
            }}
          />
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
