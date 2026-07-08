import React from 'react'
import { Text, TouchableOpacity, View } from 'react-native'
import { LayoutGrid, ListTree } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import type { TimelineLayout } from '@/services/supplierTimelineService'

export function TimelineHeader({
  layout,
  onLayoutChange,
  showLayoutToggle,
}: {
  layout: TimelineLayout
  onLayoutChange: (layout: TimelineLayout) => void
  showLayoutToggle: boolean
}) {
  const { colors } = useTheme()

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <View style={{ gap: 4, flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 26, fontWeight: '800' }}>Order Timeline</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
          Unified operational activity across orders, deliveries, payments, mandates, and inventory
        </Text>
      </View>
      {showLayoutToggle && (
        <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 8, padding: 3 }}>
          <TouchableOpacity
            onPress={() => onLayoutChange('timeline')}
            style={{ padding: 8, borderRadius: 6, backgroundColor: layout === 'timeline' ? colors.primary : 'transparent' }}
          >
            <ListTree size={16} color={layout === 'timeline' ? '#fff' : colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onLayoutChange('cards')}
            style={{ padding: 8, borderRadius: 6, backgroundColor: layout === 'cards' ? colors.primary : 'transparent' }}
          >
            <LayoutGrid size={16} color={layout === 'cards' ? '#fff' : colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}
