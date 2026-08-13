import React from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native'
import { Search, Calendar, Filter, X } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import type { RfqStatus } from '@/types'

export type RfqDateFilter = 'ALL' | 'TODAY' | 'WEEK' | 'MONTH'

export const RFQ_STATUS_FILTERS: Array<{ key: string; label: string }> = [
  { key: 'ALL', label: 'All RFQs' },
  { key: 'SUBMITTED', label: 'New (Pending)' },
  { key: 'NEGOTIATING', label: 'Negotiating' },
  { key: 'NEGOTIATION_ACCEPTED', label: 'Accepted' },
  { key: 'CANCELLED', label: 'Cancelled' },
]

const DATE_OPTIONS: Array<{ key: RfqDateFilter; label: string }> = [
  { key: 'ALL', label: 'All time' },
  { key: 'TODAY', label: 'Today' },
  { key: 'WEEK', label: 'This week' },
  { key: 'MONTH', label: 'This month' },
]

interface Props {
  search: string
  onSearchChange: (v: string) => void
  statusFilter: string
  onStatusChange: (v: string) => void
  dateFilter: RfqDateFilter
  onDateFilterChange: (v: RfqDateFilter) => void
  unreadOnly: boolean
  onUnreadOnlyChange: (v: boolean) => void
}

export function RfqFilters({
  search, onSearchChange,
  statusFilter, onStatusChange,
  dateFilter, onDateFilterChange,
  unreadOnly, onUnreadOnlyChange,
}: Props) {
  const { colors } = useTheme()
  const [sortMenuOpen, setSortMenuOpen] = React.useState(false)
  const [dateMenuOpen, setDateMenuOpen] = React.useState(false)

  return (
    <View style={{ gap: 10 }}>
      {/* Search + Filters row */}
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surface,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: 12,
            gap: 8,
          }}
        >
          <Search size={16} color={colors.textSecondary} />
          <TextInput
            value={search}
            onChangeText={onSearchChange}
            placeholder="Search RFQ number or product…"
            placeholderTextColor={colors.textSecondary}
            style={{ flex: 1, paddingVertical: 10, color: colors.text, fontSize: 14 }}
          />
        </View>

        <View>
          <TouchableOpacity
            onPress={() => { setDateMenuOpen((v) => !v); setSortMenuOpen(false) }}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              paddingHorizontal: 12, paddingVertical: 10,
              backgroundColor: colors.surface, borderRadius: 10,
              borderWidth: 1, borderColor: colors.border,
            }}
          >
            <Calendar size={14} color={colors.text} />
          </TouchableOpacity>
          {dateMenuOpen && (
            <View style={{
              position: 'absolute', top: 44, right: 0, zIndex: 10,
              backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border,
              paddingVertical: 4, minWidth: 140,
            }}>
              {DATE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => { onDateFilterChange(opt.key); setDateMenuOpen(false) }}
                  style={{ paddingHorizontal: 14, paddingVertical: 10 }}
                >
                  <Text style={{ fontSize: 13, color: colors.text, fontWeight: opt.key === dateFilter ? '700' : '400' }}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View>
          <TouchableOpacity
            onPress={() => setSortMenuOpen((v) => !v)}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              paddingHorizontal: 12, paddingVertical: 10,
              backgroundColor: colors.surface, borderRadius: 10,
              borderWidth: 1, borderColor: colors.border,
            }}
          >
            <Filter size={14} color={colors.text} />
          </TouchableOpacity>
          {sortMenuOpen && (
            <View style={{
              position: 'absolute', top: 44, right: 0, zIndex: 10,
              backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border,
              paddingVertical: 4, minWidth: 160,
            }}>
              {RFQ_STATUS_FILTERS.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => { onStatusChange(opt.key); setSortMenuOpen(false) }}
                  style={{ paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}
                >
                  <View style={{
                    width: 8, height: 8, borderRadius: 4,
                    backgroundColor: statusFilter === opt.key ? colors.primary : 'transparent',
                  }} />
                  <Text style={{ fontSize: 13, color: colors.text, fontWeight: statusFilter === opt.key ? '700' : '400' }}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
              <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 4 }} />
              <TouchableOpacity
                onPress={() => { onUnreadOnlyChange(!unreadOnly); setSortMenuOpen(false) }}
                style={{ paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <View style={{
                  width: 16, height: 16, borderRadius: 3,
                  backgroundColor: unreadOnly ? colors.primary : 'transparent',
                  borderWidth: unreadOnly ? 0 : 1,
                  borderColor: colors.border,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {unreadOnly && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary }} />}
                </View>
                <Text style={{ fontSize: 13, color: colors.text, fontWeight: '600' }}>
                  Unread only
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Status chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {RFQ_STATUS_FILTERS.map((s) => (
          <TouchableOpacity
            key={s.key}
            onPress={() => onStatusChange(s.key)}
            style={{
              paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
              backgroundColor: statusFilter === s.key ? colors.primary : colors.surface,
              borderWidth: 1, borderColor: statusFilter === s.key ? colors.primary : colors.border,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: statusFilter === s.key ? '#fff' : colors.textSecondary }}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )
}

export function applyRfqFilters<T extends {
  rfqNumber: string
  status: string
  createdAt: string
  supplierOrgId: number
  supplierItem?: { name?: string }
}>(rfqs: T[], opts: {
  search: string
  statusFilter: string
  dateFilter: RfqDateFilter
  unreadOnly: boolean
  unreadPredicate: (r: T) => boolean
}): T[] {
  const { search, statusFilter, dateFilter, unreadOnly, unreadPredicate } = opts
  const now = new Date()

  let result = rfqs

  if (unreadOnly) {
    result = result.filter(unreadPredicate)
  }

  if (statusFilter !== 'ALL') {
    result = result.filter((r) => r.status === statusFilter)
  }

  if (search.trim()) {
    const q = search.trim().toLowerCase()
    result = result.filter(
      (r) => r.rfqNumber.toLowerCase().includes(q) || (r.supplierItem?.name?.toLowerCase().includes(q) ?? false)
    )
  }

  if (dateFilter !== 'ALL') {
    const cutoffs: Record<Exclude<RfqDateFilter, 'ALL'>, number> = {
      TODAY: 1,
      WEEK: 7,
      MONTH: 30,
    }
    const days = cutoffs[dateFilter]
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    result = result.filter((r) => new Date(r.createdAt) >= cutoff)
  }

  return [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}
