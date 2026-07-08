import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native'
import { Search, Calendar, ArrowUpDown } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { DELIVERY_STATUS_LABELS } from './DeliveryStatusBadge'
import type { DeliveryStatus, DeliveryDateRange, DeliverySort } from '@/services/supplierService/deliveryService'
// ASSUMPTION: adjust this import + prop names to match your actual component.
import DateRangePickerModal from '@/components/DateRangePickerModal'

const STATUS_CHIP_OPTIONS: Array<DeliveryStatus | 'ALL'> = ['ALL', 'SCHEDULED', 'IN_TRANSIT', 'DELIVERED', 'FAILED']

const SORT_OPTIONS: Array<{ key: DeliverySort; label: string }> = [
  { key: 'NEWEST', label: 'Newest' },
  { key: 'OLDEST', label: 'Oldest' },
  { key: 'NEAREST_DELIVERY', label: 'Nearest Delivery' },
  { key: 'HIGHEST_AMOUNT', label: 'Highest Amount' },
]

interface Props {
  search: string
  onSearchChange: (v: string) => void
  status: DeliveryStatus | 'ALL'
  onStatusChange: (v: DeliveryStatus | 'ALL') => void
  dateRange: DeliveryDateRange
  onDateRangeChange: (v: DeliveryDateRange) => void
  sort: DeliverySort
  onSortChange: (v: DeliverySort) => void
}

export function DeliveryFilters({
  search, onSearchChange,
  status, onStatusChange,
  dateRange, onDateRangeChange,
  sort, onSortChange,
}: Props) {
  const { colors } = useTheme()
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [sortMenuOpen, setSortMenuOpen] = useState(false)

  const dateRangeLabel = dateRange.start || dateRange.end
    ? `${dateRange.start ? new Date(dateRange.start).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : '…'} – ${dateRange.end ? new Date(dateRange.end).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : '…'}`
    : 'Date range'

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{
          flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
          backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12,
        }}>
          <Search size={16} color={colors.textSecondary} />
          <TextInput
            value={search}
            onChangeText={onSearchChange}
            placeholder="Search PO number or buyer…"
            placeholderTextColor={colors.textSecondary}
            style={{ flex: 1, paddingVertical: 10, color: colors.text, fontSize: 14 }}
          />
        </View>

        <TouchableOpacity
          onPress={() => setDatePickerOpen(true)}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            paddingHorizontal: 12, paddingVertical: 10,
            backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border,
          }}
        >
          <Calendar size={14} color={colors.text} />
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>{dateRangeLabel}</Text>
        </TouchableOpacity>

        <View>
          <TouchableOpacity
            onPress={() => setSortMenuOpen((v) => !v)}
            style={{ padding: 10, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}
          >
            <ArrowUpDown size={14} color={colors.text} />
          </TouchableOpacity>
          {sortMenuOpen && (
            <View style={{
              position: 'absolute', top: 44, right: 0, zIndex: 10,
              backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border,
              paddingVertical: 4, minWidth: 170,
            }}>
              {SORT_OPTIONS.map((opt) => (
                <TouchableOpacity key={opt.key} onPress={() => { onSortChange(opt.key); setSortMenuOpen(false) }} style={{ paddingHorizontal: 14, paddingVertical: 10 }}>
                  <Text style={{ fontSize: 13, color: colors.text, fontWeight: opt.key === sort ? '700' : '400' }}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {STATUS_CHIP_OPTIONS.map((s) => (
          <TouchableOpacity
            key={s}
            onPress={() => onStatusChange(s)}
            style={{
              paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
              backgroundColor: status === s ? colors.primary : colors.surface,
              borderWidth: 1, borderColor: status === s ? colors.primary : colors.border,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: status === s ? '#fff' : colors.textSecondary }}>
              {s === 'ALL' ? 'All' : DELIVERY_STATUS_LABELS[s as DeliveryStatus]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ASSUMPTION: prop names (visible/initialRange/onClose/onApply) — adjust to match your real component. */}
      <DateRangePickerModal
        visible={datePickerOpen}
        initialStart={dateRange.start ? new Date(dateRange.start) : undefined}
        initialEnd={dateRange.end ? new Date(dateRange.end) : undefined}
        onClose={() => setDatePickerOpen(false)}
        onApply={(startDate, endDate) => {
          onDateRangeChange({
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          })
          setDatePickerOpen(false)
        }}
      />
    </View>
  )
}