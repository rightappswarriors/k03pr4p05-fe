import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { PackageCheck, RefreshCw, Store } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'

export function EmptyOrdersCard({ onRefresh, onMarketplace }: { onRefresh: () => void; onMarketplace?: () => void }) {
  const { colors } = useTheme()
  return (
    <View style={{ alignItems: 'center', padding: 48, gap: 10 }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
        <PackageCheck size={28} color={colors.primary} />
      </View>
      <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>You're all caught up</Text>
      <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', maxWidth: 280 }}>
        New purchase orders from retailers will automatically appear here.
      </Text>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
        <TouchableOpacity
          onPress={onRefresh}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 }}
        >
          <RefreshCw size={14} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Refresh</Text>
        </TouchableOpacity>
        {onMarketplace && (
          <TouchableOpacity
            onPress={onMarketplace}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 }}
          >
            <Store size={14} color={colors.text} />
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>Marketplace</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}