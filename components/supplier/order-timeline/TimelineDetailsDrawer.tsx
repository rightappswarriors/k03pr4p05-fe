import React from 'react'
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { X } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import type { TimelineEvent } from '@/services/supplierTimelineService'
import { EventBadge } from './EventBadge'

function formatFullDate(value: string) {
  return new Date(value).toLocaleString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function TimelineDetailsDrawer({
  event,
  visible,
  onClose,
}: {
  event: TimelineEvent | null
  visible: boolean
  onClose: () => void
}) {
  const { colors } = useTheme()

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.38)', alignItems: 'flex-end' }}>
        <View style={{ width: '100%', maxWidth: 430, height: '100%', backgroundColor: colors.background, padding: 18 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Activity details</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 6 }}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          {event && (
            <ScrollView contentContainerStyle={{ gap: 16 }}>
              <View style={{ borderRadius: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 12 }}>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  <EventBadge eventType={event.eventType} />
                  <EventBadge status={event.status} />
                </View>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>{event.title}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20 }}>{event.description}</Text>
              </View>

              <View style={{ borderRadius: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 10 }}>
                {[
                  ['Created', formatFullDate(event.createdAt)],
                  ['Actor', event.actor ?? 'System'],
                  ['Organization', event.organization ?? 'Kompra'],
                  ['Reference', event.referenceId ?? 'None'],
                  ['Reference type', event.referenceType ?? 'None'],
                ].map(([label, value]) => (
                  <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 16 }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700' }}>{label}</Text>
                    <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600', flex: 1, textAlign: 'right' }}>{value}</Text>
                  </View>
                ))}
              </View>

              <View style={{ borderRadius: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 8 }}>
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '800' }}>Metadata</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 18, fontFamily: 'monospace' }}>
                  {JSON.stringify(event.metadata ?? {}, null, 2)}
                </Text>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  )
}
