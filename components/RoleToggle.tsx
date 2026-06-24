import React from 'react'
import { TouchableOpacity, Text, View } from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'

interface RoleToggleProps {
  label: string
  subtitle: string
  selected: boolean
  onPress: () => void
}

export function RoleToggle({ label, subtitle, selected, onPress }: RoleToggleProps) {
  const { colors } = useTheme()

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flex: 1,
        borderWidth: 2,
        borderColor: selected ? colors.primary : colors.border,
        borderRadius: 12,
        padding: 16,
        backgroundColor: selected ? colors.primary + '15' : colors.surface,
        alignItems: 'center',
        gap: 4,
      }}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          borderWidth: 2,
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: selected ? colors.primary : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 4,
        }}
      >
        {selected && (
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: '#fff',
            }}
          />
        )}
      </View>
      <Text
        style={{
          fontWeight: '700',
          fontSize: 15,
          color: selected ? colors.primary : colors.text,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: 12,
          color: colors.textSecondary,
          textAlign: 'center',
        }}
      >
        {subtitle}
      </Text>
    </TouchableOpacity>
  )
}
