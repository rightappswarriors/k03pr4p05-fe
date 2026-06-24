import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { WebSocketProvider } from '@/contexts/WSContext';
import { useAuth } from '@/contexts/AuthContext';
import { router, Tabs } from 'expo-router';
import {
  BarChart3,
  Store,
  ShoppingCart,
  Settings,
  Users,
  Building2,
} from 'lucide-react-native';
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
          }}
        >

          <Tabs.Screen
            name="index" // can I do this? erp { isGold ? "erp" : "basic"}
            options={{
              title: 'Dashboard', // can I do this? erp { isGold ? "ERP" : "Something somthing name"}
              tabBarIcon: ({ size, color }) => (
                <Building2 size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="branch"
            options={{
              title: 'Branch & Outlet',
              tabBarIcon: ({ size, color }) => (
                <BarChart3 size={size} color={color} />
              ),
            }}
          />
          {/*
          isGold ?(
            <Tabs.Screen // this will dynamically change which to obscure.
            name="basic" erp { isGold ? "erp" : "basic"}
            options={{
              title: 'ERP', // can I do this? erp { isGold ? "ERP" : "Something somthing name"}
              
              href: null,
              tabBarIcon: ({ size, color }) => (
              
                <Building2 size={size} color={color} />
              ),
            }}
          />) :
          
          
          */}
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
            name="add-inventory-item"
            options={{
              title: 'Inventory',
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
        </Tabs>
      </WebSocketProvider>
    </SubscriptionProvider>
  );
}
