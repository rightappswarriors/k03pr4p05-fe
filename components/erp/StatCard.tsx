import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  PhilippinePeso,
  Package,
  Users,
  TrendingUp,
  LucideProps,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

// Icon key → Lucide component map
type IconKey = 'sales' | 'inventory' | 'hr' | 'profit';

const ICON_MAP: Record<IconKey, React.FC<LucideProps>> = {
  sales: PhilippinePeso,
  inventory: Package,
  hr: Users,
  profit: TrendingUp,
};

interface StatCardProps {
  label: string;
  value: string | number;
  icon: IconKey;
  trend?: string | number;
  trendUp?: boolean;
  accent?: boolean;
  onPress?: () => void;
  onHoverIn?: () => void;
  onHoverOut?: () => void;
}

export default function StatCard({
  label,
  value,
  icon,
  trend,
  trendUp,
  accent,
  onPress,
  onHoverIn,
  onHoverOut,
}: StatCardProps) {
  const { colors } = useTheme();
  const IconComponent = ICON_MAP[icon] ?? PhilippinePeso;
  const isLight = colors.background === '#F4F7FB';

  const iconColor = colors.primary;
  const iconBg = colors.primaryLight;

  const styles = StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 8,
      padding: 16,
      minHeight: 124,
      // No flex:1 here — the parent statWrap controls sizing
      borderWidth: 1,
      borderColor: accent ? colors.primary : colors.border,
      borderLeftWidth: accent ? 3 : 1,
      shadowColor: isLight ? '#0F172A' : '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isLight ? 0.04 : 0.08,
      shadowRadius: 2,
      elevation: 1,
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    iconBox: {
      width: 40,
      height: 40,
      borderRadius: 8,
      backgroundColor: iconBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    trendBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: trendUp
        ? 'rgba(16, 185, 129, 0.12)'
        : 'rgba(239, 68, 68, 0.12)',
    },
    trendText: {
      fontSize: 11,
      fontWeight: '600',
      color: trendUp ? colors.success : colors.error,
    },
    value: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 6,
    },
    label: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
  });

  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
      onHoverIn={onHoverIn}
      onHoverOut={onHoverOut}
    >
      <View style={styles.topRow}>
        <View style={styles.iconBox}>
          <IconComponent size={18} color={iconColor} strokeWidth={2} />
        </View>
        {trend !== undefined && (
          <View style={styles.trendBadge}>
            <Text style={styles.trendText}>
              {trendUp ? '+' : '-'}{trend}
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}
