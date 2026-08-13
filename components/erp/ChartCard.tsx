import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function ChartCard({ title, subtitle, children }: ChartCardProps) {
  const { colors } = useTheme();
  const isLight = colors.background === '#F4F7FB';

  const styles = StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 8,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      minWidth: 0,
      shadowColor: isLight ? '#0F172A' : '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isLight ? 0.04 : 0.08,
      shadowRadius: 2,
      elevation: 1,
      marginBottom: 16,
    },
    header: {
      marginBottom: 12,
    },
    title: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    subtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginBottom: 12,
    },
    content: {
      minWidth: 0,
      overflow: 'hidden',
    },
  });

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      <View style={styles.divider} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}
