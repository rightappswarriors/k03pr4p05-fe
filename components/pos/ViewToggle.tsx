import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Grid3x3 as Grid3X3, List } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext'
interface ViewToggleProps {
  viewMode: 'grid' | 'list';
  onToggle: () => void;
}

export function ViewToggle({ viewMode, onToggle }: ViewToggleProps) {
  const { colors } = useTheme()
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background}]}>
      <TouchableOpacity
        onPress={onToggle}
        style={[
          styles.toggleButton,
          viewMode === 'grid' && [styles.activeButton, { backgroundColor: colors.background}],
          viewMode === 'grid' &&{ backgroundColor: colors.card}
        ]}
      >
        <Grid3X3 
          size={20} 
          color={viewMode === 'grid' ? colors.accent : colors.primary} 
        />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onToggle}
        style={[
          styles.toggleButton,
          viewMode === 'list' && [styles.activeButton, { backgroundColor: colors.background}],
          viewMode === 'list' &&{ backgroundColor: colors.card}
        ]}
      >
        <List 
          size={20} 
          color={viewMode === 'list' ? colors.accent : colors.primary} 
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 2,
  },
  toggleButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  activeButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
});