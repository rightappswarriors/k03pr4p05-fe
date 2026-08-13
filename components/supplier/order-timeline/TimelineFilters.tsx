import React, { useState } from 'react'
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { CalendarDays, Search, X } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import DateRangePickerModal from '@/components/DateRangePickerModal'
import type { TimelineDateRange, TimelineEventType, TimelineSort, TimelineStatus } from '@/services/supplierTimelineService'
import { EVENT_LABELS } from './EventBadge'

const EVENT_TYPES = Object.keys(EVENT_LABELS) as TimelineEventType[]
const STATUS_OPTIONS: Array<TimelineStatus | 'ALL'> = ['ALL', 'PENDING', 'INFO', 'SUCCESS', 'WARNING', 'ERROR']

function toIsoStart(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next.toISOString()
}

function toIsoEnd(date: Date) {
  const next = new Date(date)
  next.setHours(23, 59, 59, 999)
  return next.toISOString()
}

function shortDate(value?: string | null) {
  if (!value) return null
  return new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
}

function Chip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  const { colors } = useTheme()
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
        backgroundColor: active ? colors.primaryLight : colors.surface,
      }}
    >
      <Text style={{ color: active ? colors.primary : colors.textSecondary, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </TouchableOpacity>
  )
}

export function TimelineFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  eventTypes,
  onEventTypesChange,
  dateRange,
  onDateRangeChange,
  sort,
  onSortChange,
}: {
  search: string
  onSearchChange: (value: string) => void
  status: TimelineStatus | 'ALL'
  onStatusChange: (value: TimelineStatus | 'ALL') => void
  eventTypes: TimelineEventType[]
  onEventTypesChange: (value: TimelineEventType[]) => void
  dateRange: TimelineDateRange
  onDateRangeChange: (value: TimelineDateRange) => void
  sort: TimelineSort
  onSortChange: (value: TimelineSort) => void
}) {
  const { colors } = useTheme()
  const [datePickerVisible, setDatePickerVisible] = useState(false)
  const selectedAllTypes = eventTypes.length === 0

  const toggleEventType = (type: TimelineEventType) => {
    const current = selectedAllTypes ? EVENT_TYPES : eventTypes
    const next = current.includes(type) ? current.filter((item) => item !== type) : [...current, type]
    onEventTypesChange(next.length === EVENT_TYPES.length ? [] : next)
  }

  return (
    <View style={{ gap: 12 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 8,
          paddingHorizontal: 12,
          minHeight: 46,
        }}
      >
        <Search size={17} color={colors.textSecondary} />
        <TextInput
          value={search}
          onChangeText={onSearchChange}
          placeholder="Search activity"
          placeholderTextColor={colors.textSecondary}
          style={{ flex: 1, color: colors.text, fontSize: 14, outlineStyle: 'none' } as any}
        />
        {!!search && (
          <TouchableOpacity onPress={() => onSearchChange('')}>
            <X size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {STATUS_OPTIONS.map((item) => (
          <Chip key={item} label={item === 'ALL' ? 'All status' : item.toLowerCase()} active={status === item} onPress={() => onStatusChange(item)} />
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Chip label="All events" active={selectedAllTypes} onPress={() => onEventTypesChange([])} />
        {EVENT_TYPES.map((type) => (
          <Chip
            key={type}
            label={EVENT_LABELS[type]}
            active={!selectedAllTypes && eventTypes.includes(type)}
            onPress={() => toggleEventType(type)}
          />
        ))}
      </ScrollView>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <TouchableOpacity
          onPress={() => setDatePickerVisible(true)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 9 }}
        >
          <CalendarDays size={15} color={colors.textSecondary} />
          <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>
            {dateRange.start && dateRange.end ? `${shortDate(dateRange.start)} - ${shortDate(dateRange.end)}` : 'Any date'}
          </Text>
        </TouchableOpacity>
        {(dateRange.start || dateRange.end) && (
          <Chip label="Clear date" active={false} onPress={() => onDateRangeChange({ start: null, end: null })} />
        )}
        <Chip label="Newest" active={sort === 'NEWEST'} onPress={() => onSortChange('NEWEST')} />
        <Chip label="Oldest" active={sort === 'OLDEST'} onPress={() => onSortChange('OLDEST')} />
      </View>

      <DateRangePickerModal
        visible={datePickerVisible}
        onClose={() => setDatePickerVisible(false)}
        initialStart={dateRange.start ? new Date(dateRange.start) : undefined}
        initialEnd={dateRange.end ? new Date(dateRange.end) : undefined}
        onApply={(start, end) => onDateRangeChange({ start: toIsoStart(start), end: toIsoEnd(end) })}
      />
    </View>
  )
}
