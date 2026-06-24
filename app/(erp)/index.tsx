import React, { useEffect, useState } from 'react';
import ERPLayout from '@/components/erp/ERPLayout';
import { MasterFileProvider } from '@/contexts/MasterFileContext';
import { useAuth } from '@/contexts/AuthContext';
import { HrService } from '@/services';
import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { router } from 'expo-router';

export default function LayoutScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const [hasTimeIn, setHasTimeIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const { colors } = useTheme();

  useEffect(() => {
    const checkTimeIn = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const timeInStatus = await HrService.checkUserTimeInStatus(user.id);
        setHasTimeIn(timeInStatus?.hasTimeIn || false);
      } catch (error) {
        console.error('Error checking time-in status:', error);
        setHasTimeIn(false);
      } finally {
        setLoading(false);
      }
    };

    checkTimeIn();
  }, [user?.id]);

  // ── FIX: redirect inside useEffect, never during render ──────────────────
  // Calling router.replace() inline in JSX fires during React's render phase,
  // which causes "cannot update a component while rendering a different component"
  // warnings and unpredictable navigation behavior.
  useEffect(() => {
    if (authLoading || loading) return; // wait until both checks are done

    const isOwner = user?.role === 'OWNER';
    const isManager = user?.role === 'MANAGER'; // managers skip time-in gate too
    const canSkipTimeIn = isOwner || isManager;

    if (!canSkipTimeIn && !hasTimeIn  && !__DEV__) {
      router.replace('/(employee)');
    }
  }, [authLoading, loading, user?.role, hasTimeIn]);

  // Show spinner while auth or time-in check is in flight
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

  // At this point: loading is done and redirect (if needed) has been dispatched.
  // Only OWNER/MANAGER or timed-in STAFF reach here.
  const isOwner = user?.role === 'OWNER';
  const isManager = user?.role === 'MANAGER';
  const canSkipTimeIn = isOwner || isManager;

  if (!canSkipTimeIn && !hasTimeIn  && !__DEV__) {
    // Render nothing while the redirect from useEffect is animating
    return null;
  }

  return (
    <MasterFileProvider>
      <ERPLayout />
    </MasterFileProvider>
  );
}