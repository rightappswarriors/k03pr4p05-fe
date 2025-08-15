
import {
  TouchableOpacity,
  View,
  Text
} from 'react-native'
import React from 'react'
import { styles } from '@/styles/settings'
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext'



export default function SettingItem({
  style,
     icon,
  title,
  subtitle,
  onPress,
  showChevron = true,
  rightComponent
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  showChevron?: boolean;
  rightComponent?: React.ReactNode;
  style?:  'warning' | 'success' | 'info'
}) {
  const { colors } = useTheme()
  return ( // <== THIS IS THE FIX
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.iconContainer,
        { backgroundColor: style === 'warning' ? `${colors.warning}20` : colors.background }
        ]} >
          {icon}
        </View>
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, { color: colors.text }]} >{title}</Text>
          {subtitle && <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.settingRight} >
        {rightComponent}
        {showChevron && onPress && (
          <ChevronRight size={20} color="#9CA3AF" />
        )}
      </View>
    </TouchableOpacity>
  );
}