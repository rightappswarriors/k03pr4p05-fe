import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useLoading } from '@/contexts/LoadingContext';
import { useTheme } from '@/contexts/ThemeContext';
import React from 'react'

export default function AppLoader() {
  const { isLoading } = useLoading();
  const { colors } = useTheme();

  if (!isLoading) return null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color="#6366F1" />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
});
