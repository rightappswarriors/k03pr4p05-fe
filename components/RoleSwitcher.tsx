import React from 'react'
import { TouchableOpacity, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useActiveRole } from '@/contexts/ActiveRoleContext'
import { useTheme } from '@/contexts/ThemeContext'

interface RoleSwitcherProps {
  compact?: boolean
}

export default function RoleSwitcher({ compact = false }: RoleSwitcherProps) {
  const { activeRole, canSwitchToSupplier, switchRole } = useActiveRole()
  const { colors } = useTheme()
  const router = useRouter()

  if (!canSwitchToSupplier) return null

  const isSupplier = activeRole === 'SUPPLIER'

  const handleSwitch = async () => {
    const next = isSupplier ? 'SELLER' : 'SUPPLIER'
    await switchRole(next)
    if (next === 'SUPPLIER') {
      router.replace('/(supplier)')
    } else {
      router.replace('/(erp)')
    }
  }

  if (compact) {
    return (
      <TouchableOpacity
        onPress={handleSwitch}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          backgroundColor: isSupplier ? '#3B82F620' : '#22C55E20',
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: isSupplier ? '#3B82F6' : '#22C55E',
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: '700', color: isSupplier ? '#3B82F6' : '#22C55E' }}>
          {isSupplier ? '→ Seller Mode' : '→ Supplier Mode'}
        </Text>
      </TouchableOpacity>
    )
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 4,
        gap: 4,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      {(['SELLER', 'SUPPLIER'] as const).map((role) => (
        <TouchableOpacity
          key={role}
          onPress={async () => {
            await switchRole(role)
            if (role === 'SUPPLIER') router.replace('/(supplier)')
            else router.replace('/(erp)')
          }}
          style={{
            flex: 1,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 9,
            backgroundColor:
              activeRole === role
                ? role === 'SELLER'
                  ? '#22C55E'
                  : '#3B82F6'
                : 'transparent',
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: '700',
              color: activeRole === role ? '#fff' : colors.textSecondary,
            }}
          >
            {role === 'SELLER' ? '🏪 Seller' : '📦 Supplier'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}
