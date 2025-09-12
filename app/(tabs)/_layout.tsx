import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router'
import { MockSyncService } from '@/services/mockSyncService'
import MainScreen from './index'
import HistoryScreen from './history'
import SettingsScreen from './settings';
import ResponsiveTab from '@/components/dashboard/ResponsiveTabLayout';
import PrinterScreen from './printer';
import { useResponsive } from '@/hooks/useResponsive'
import { Printer, Settings, ShoppingCart, History } from 'lucide-react-native';
export default function TabLayout() {
  const { isDesktop, isMobile } = useResponsive()
  useEffect(() => {
    MockSyncService.startBackgroundSync();
  }, []);

  const [currentRoute, setCurrentRoute] = useState('index')

  const { isAuthenticated, isLoading } = useAuth();
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login')
    }
  }, [isAuthenticated])
  const renderCurrentScreen = () => {
    switch (currentRoute) {
      case 'index':
        return <MainScreen />
      case 'history':
        return <HistoryScreen />
      case 'printer':
        return <PrinterScreen />;
      case 'settings':
        return <SettingsScreen />
      default:
        break;
    }
  }
  if (!isMobile) {
    return (
      <ResponsiveTab/>
    );
  } else {
    return (
      <Tabs screenOptions={{ headerShown: false }}>
        <Tabs.Screen
          name="index"
          options={{ tabBarIcon: ({ color }) => <ShoppingCart size={20} color={color} />, title: 'POS' }}
        />
        <Tabs.Screen
          name="history"
          options={{ tabBarIcon: ({ color }) => <History size={20} color={color} />, title: 'Orders' }}
        />
        <Tabs.Screen
          name="printer"
          options={{ tabBarIcon: ({ color }) => <Printer size={20} color={color} />, title: 'Printer' }}
        />
        <Tabs.Screen
          name="settings"
          options={{ tabBarIcon: ({ color }) => <Settings size={20} color={color} />, title: 'Settings' }}
        />
      </Tabs>
    )
  }
}