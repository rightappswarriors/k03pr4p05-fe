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

  const iconColor = accent ? '#fff' : colors.primary;
  const iconBg = accent ? 'rgba(255,255,255,0.18)' : colors.background;

  const styles = StyleSheet.create({
    card: {
      backgroundColor: accent ? colors.primary : colors.card,
      borderRadius: 12,
      padding: 14,
      // No flex:1 here — the parent statWrap controls sizing
      borderWidth: 1,
      borderColor: accent ? 'transparent' : colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 3,
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    iconBox: {
      width: 36,
      height: 36,
      borderRadius: 9,
      backgroundColor: iconBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    trendBadge: {
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 20,
      backgroundColor: trendUp
        ? 'rgba(16, 185, 129, 0.14)'
        : 'rgba(239, 68, 68, 0.14)',
    },
    trendText: {
      fontSize: 11,
      fontWeight: '700',
      color: trendUp ? colors.success : colors.error,
    },
    value: {
      fontSize: 20,
      fontWeight: '800',
      color: accent ? '#fff' : colors.text,
      letterSpacing: -0.5,
      marginBottom: 3,
    },
    label: {
      fontSize: 12,
      color: accent ? 'rgba(255,255,255,0.72)' : colors.textSecondary,
      fontWeight: '500',
      letterSpacing: 0.1,
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
              {trendUp ? '▲' : '▼'} {trend}
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}
