// app/(supplier)/pending.tsx
// Screen shown to suppliers with pending/approval status

import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Clock } from 'lucide-react-native';

export default function SupplierPendingScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, maxWidth: isTablet ? 500 : '100%' }]}>
        <Clock size={48} color={colors.primary} strokeWidth={1.5} />
        <Text style={[styles.title, { color: colors.text, fontSize: isTablet ? 28 : 22 }]}>
          Application Pending Review
        </Text>
        <Text style={[styles.message, { color: colors.textSecondary, fontSize: isTablet ? 16 : 14 }]}>
          Your supplier registration has been submitted and is currently under review.
        </Text>
        <Text style={[styles.note, { color: colors.textSecondary, fontSize: isTablet ? 14 : 12 }]}>
          You will receive an email notification once your application has been approved.
          This usually takes 1-2 business days.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    width: '90%',
  },
  title: {
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  note: {
    textAlign: 'center',
    lineHeight: 20,
  },
});