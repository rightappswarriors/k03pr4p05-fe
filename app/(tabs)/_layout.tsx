import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router'
import { ShoppingCart, History, Settings, Store } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext'
import { MockSyncService } from '@/services/mockSyncService'
import MainScreen from './index'
import HistoryScreen from './history'
import SettingsScreen from './settings';
import ResponsiveTab from '@/components/dashboard/ResponsiveTabLayout';
import PrinterScreen from './printer';
export default function TabLayout() {
  useEffect(() => {
    MockSyncService.startBackgroundSync();
  }, []);

  const [currentRoute, setCurrentRoute] = useState('index')

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
  const { isAuthenticated, isLoading } = useAuth();
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login')
    }
  }, [isAuthenticated])

  return (
    <ResponsiveTab
      currentRoute={currentRoute}
      onRouteChange={setCurrentRoute}
    >
      {renderCurrentScreen()}
    </ResponsiveTab>
  );
}