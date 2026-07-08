import React from 'react'
import { Text, View } from 'react-native'
import { History } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'

export function TimelineEmptyState() {
  const { colors } = useTheme()
  return (
    <View style={{ alignItems: 'center', paddingVertical: 52, paddingHorizontal: 18, gap: 10 }}>
      <View style={{ width: 52, height: 52, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight }}>
        <History size={25} color={colors.primary} />
      </View>
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', textAlign: 'center' }}>No activity yet</Text>
      <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 19, textAlign: 'center', maxWidth: 520 }}>
        Operational events from purchase orders, deliveries, wallet transactions, mandates, and inventory will appear here automatically.
      </Text>
    </View>
  )
}
