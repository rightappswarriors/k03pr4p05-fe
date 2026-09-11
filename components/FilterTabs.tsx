import React from 'react';
import { ScrollView, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

export type FilterTabOption = { value: string; label: string; count?: number; disabled?: boolean };

export function FilterTabs({
  value,
  onChange,
  options,
  accessibilityLabel = 'Filter options',
}: {
  value: string;
  onChange: (value: string) => void;
  options: FilterTabOption[];
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityLabel={accessibilityLabel}
      contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}
    >
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <TouchableOpacity
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected, disabled: option.disabled }}
            disabled={option.disabled}
            onPress={() => onChange(option.value)}
            style={{
              flexShrink: 0,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 34,
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 99,
              borderWidth: 1,
              borderColor: selected ? colors.primary : colors.border,
              backgroundColor: selected ? colors.primary : colors.surface,
              opacity: option.disabled ? 0.5 : 1,
            }}
          >
            <Text
              numberOfLines={1}
              style={{ color: selected ? '#fff' : colors.textSecondary, fontSize: 12, fontWeight: '800' }}
            >
              {option.label}
              {option.count === undefined ? '' : ` ${option.count}`}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}