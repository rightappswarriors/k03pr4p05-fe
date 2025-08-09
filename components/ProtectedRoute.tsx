// components/ProtectedRoute.tsx
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext'
export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { colors }= useTheme()
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user && !isAuthenticated) {
      router.replace('/login');
    }
    if (!isLoading && user && isAuthenticated) {
     router.replace('/(tabs)');
   }
  }, [isLoading, user]);

  if (isLoading || (!user && !router)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background}}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <>{children}</>;
}
