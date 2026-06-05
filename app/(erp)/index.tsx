import React, { useEffect, useState } from 'react';
import ERPLayout from '@/components/erp/ERPLayout';
import HRScreen from '@/screens/HRScreen';
import { MasterFileProvider } from '@/contexts/MasterFileContext';
import { useAuth } from '@/hooks/useAuth';
import { HrService } from '@/services';
import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

export default function LayoutScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const [hasTimeIn, setHasTimeIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const { colors } = useTheme();

  // Check if user has timed in today
  useEffect(() => {
    const checkTimeIn = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Call backend mutation to check if user has timed in today
        const timeInStatus = await HrService.checkUserTimeInStatus(user.id);
        setHasTimeIn(timeInStatus?.hasTimeIn || false);
      } catch (error) {
        console.error('Error checking time-in status:', error);
        // Default to false if check fails
        setHasTimeIn(false);
      } finally {
        setLoading(false);
      }
    };

    checkTimeIn();
  }, [user?.id]);

  // Loading state
  if (authLoading || loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Access control: if NOT owner AND has NOT timed in, show HR screen.
  // HRScreen also uses master file hooks, so it must be inside MasterFileProvider.
  const isOwner = user?.role === 'OWNER';

  return (
    <MasterFileProvider>
      {!isOwner && !hasTimeIn ? <HRScreen /> : <ERPLayout />}
    </MasterFileProvider>
  );
}
