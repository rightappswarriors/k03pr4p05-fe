import { Tabs } from 'expo-router';
import React, { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ShoppingCart,Settings, Store } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext'

export default function TabLayout() {
  const { user, isAuthenticated, isLoading } = useAuth();
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login')
    }
  }, [isAuthenticated])
  console.log('User:', user)
  const { colors } = useTheme()

  return (

      <Tabs screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card, // tab bar background
          borderColor: colors.border
        },
      }} >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ size, color }) =>
              user?.role === 'owner' ? (
                <Store size={size} color={color} />
              ) : (
                <ShoppingCart size={size} color={color} />
              ),
          }}
        />
        <Tabs.Screen
          name="hitory"
          options={{
            title: 'hitory',
            tabBarIcon: ({ size, color }) =>
               (
                <History size={size} color={color} />
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
      </Tabs>

  );
}