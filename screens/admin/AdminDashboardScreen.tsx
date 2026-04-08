// screens/admin/AdminDashboardScreen.tsx
// Blank admin dashboard — placeholder for future analytics/stats.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Shield } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

export default function AdminDashboardScreen() {
  const { colors } = useTheme();

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[s.iconWrap, { backgroundColor: '#7C3AED18' }]}>
          <Shield size={32} color="#7C3AED" strokeWidth={1.5} />
        </View>
        <Text style={[s.title, { color: colors.text }]}>Admin Dashboard</Text>
        <Text style={[s.sub, { color: colors.textSecondary }]}>
          Manage global categories, groups, and system-wide settings from the sidebar.
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    maxWidth: 400,
    width: '100%',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  sub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
});