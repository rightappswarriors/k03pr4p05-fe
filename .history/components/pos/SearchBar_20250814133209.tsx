import React, { forwardRef, useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Search, ScanLine } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext'
import { useResponsive } from '@/hooks/useResponsive';
interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onScanPress: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

export const SearchBar = forwardRef<TextInput, SearchBarProps>(({
  value,
  onChangeText,
  onScanPress,
  onFocus,
  onBlur,
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const { colors } = useTheme()
  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };
  const { isTablet, isDesktop } = useResponsive()

  return (
    <View style={[styles.container, styles.searchContainer,{borderColor: colors.border, backgroundColor: colors.background}]}>
      <Search size={20} color="#6B7280" style={styles.searchIcon} />
      <TextInput
        ref={ref}
        style={[styles.input, , isDesktop && {outline: 'none'}, , isTablet && {outline: 'none'}]}
        placeholder="Search..."
        placeholderTextColor="#9CA3AF"
        value={value}
        onChangeText={onChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TouchableOpacity onPress={onScanPress} style={[styles.scanButton, {backgroundColor: colors.surface}]}>
        <ScanLine size={20} color="#3B82F6" />
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    
  },
  scanButton: {
    width: 40,
    height: 40,
    backgroundColor: '#EBF4FF',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
