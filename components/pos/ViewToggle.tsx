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
          viewMode === 'grid' && styles.activeButton,
          viewMode === 'grid' &&{ backgroundColor: colors.card}
        ]}
      >
        <Grid3X3 
          size={20} 
          color={viewMode === 'grid' ? '#3B82F6' : '#6B7280'} 
        />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onToggle}
        style={[
          styles.toggleButton,
          viewMode === 'list' && styles.activeButton,
          viewMode === 'list' &&{ backgroundColor: colors.card}
        ]}
      >
        <List 
          size={20} 
          color={viewMode === 'list' ? '#3B82F6' : '#6B7280'} 
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
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
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
});