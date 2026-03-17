import { WebSocketProvider } from '@/contexts/WSContext';
import { useAuth } from '@/hooks/useAuth';
import { router, Tabs } from 'expo-router';
import { BarChart3, Store,ShoppingCart, Settings, Users } from 'lucide-react-native';
import React, { useEffect } from 'react';

export default function AdminTabLayout() {

  const { isAuthenticated, isLoading, user } = useAuth();
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login')
    } else if (!isLoading && isAuthenticated && (user?.role === "CASHIER" || user?.role === "STAFF")) {
      router.replace('/(tabs)')
    }
  }, [isAuthenticated])
  return (

    <WebSocketProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#1F2937',
            borderTopColor: '#374151',
            height: 60,
          },
          tabBarActiveTintColor: '#3B82F6',
          tabBarInactiveTintColor: '#9CA3AF',
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ size, color }) => (
              <BarChart3 size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="orderManagement"
          options={{
            title: 'Orders',
            tabBarIcon: ({ size, color }) => (
              <ShoppingCart size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="outlets"
          options={{
            title: 'Outlets',
            href: null,
            tabBarIcon: ({ size, color }) => (
              <Store size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ size, color }) => (
              <Settings size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="outlet-detail"
          options={{
            href: null,
            title: 'Outlet Details',
            tabBarIcon: ({ size, color }) => (
              <BarChart3 size={size} color={color} />
            ),
          }}
        />
      </Tabs></WebSocketProvider>
  );
}