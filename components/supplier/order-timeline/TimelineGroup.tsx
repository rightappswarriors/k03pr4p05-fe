import React from 'react'
import { Text, View } from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'
import type { TimelineEvent, TimelineGroup as TimelineGroupType, TimelineLayout } from '@/services/supplierTimelineService'
import { TimelineEventCard } from './TimelineEventCard'

export function TimelineGroup({
  group,
  layout,
  onSelectEvent,
  cardWidth,
}: {
  group: TimelineGroupType
  layout: TimelineLayout
  onSelectEvent: (event: TimelineEvent) => void
  cardWidth: string
}) {
  const { colors } = useTheme()

  if (layout === 'cards') {
    return (
      <View style={{ gap: 12 }}>
        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '800' }}>{group.label}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {group.events.map((event) => (
            <View key={event.id} style={{ width: cardWidth as any }}>
              <TimelineEventCard event={event} onPress={onSelectEvent} compact />
            </View>
          ))}
        </View>
      </View>
    )
  }

  return (
    <View style={{ gap: 12 }}>
      <Text style={{ color: colors.text, fontSize: 14, fontWeight: '800' }}>{group.label}</Text>
      <View style={{ gap: 0 }}>
        {group.events.map((event, index) => (
          <View key={event.id} style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ alignItems: 'center', width: 18 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: event.color, marginTop: 20 }} />
              {index < group.events.length - 1 && <View style={{ width: 1, flex: 1, backgroundColor: colors.border }} />}
            </View>
            <View style={{ flex: 1, paddingBottom: 12 }}>
              <TimelineEventCard event={event} onPress={onSelectEvent} />
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}
