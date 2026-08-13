import React from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native'
import { Search, ArrowUpDown } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { STATUS_LABELS } from './StatusBadge'
import type { POStatus } from '@/services/supplierService/supplierService'

export type DateFilter = 'ALL' | 'TODAY' | 'WEEK' | 'MONTH'
export type SortOption = 'NEWEST' | 'OLDEST' | 'HIGHEST_AMOUNT' | 'PRIORITY'

const STATUS_CHIP_OPTIONS: Array<POStatus | 'ALL'> = [
  'ALL', 'PENDING', 'ACCEPTED', 'IN_TRANSIT', 'DELIVERED', 'REJECTED', 'CANCELLED',
]
// NOTE: PREPARING / READY_FOR_PICKUP omitted — not in the current POStatus enum.

const DATE_OPTIONS: Array<{ key: DateFilter; label: string }> = [
  { key: 'ALL', label: 'All time' },
  { key: 'TODAY', label: 'Today' },
  { key: 'WEEK', label: 'This week' },
  { key: 'MONTH', label: 'This month' },
]

const SORT_OPTIONS: Array<{ key: SortOption; label: string }> = [
  { key: 'NEWEST', label: 'Newest' },
  { key: 'OLDEST', label: 'Oldest' },
  { key: 'HIGHEST_AMOUNT', label: 'Highest Amount' },
  { key: 'PRIORITY', label: 'Priority' },
]

interface OrderFiltersProps {
  search: string
  onSearchChange: (v: string) => void
  status: POStatus | 'ALL'
  onStatusChange: (v: POStatus | 'ALL') => void
  dateFilter: DateFilter
  onDateFilterChange: (v: DateFilter) => void
  sort: SortOption
  onSortChange: (v: SortOption) => void
}

export function OrderFilters({
  search, onSearchChange,
  status, onStatusChange,
  dateFilter, onDateFilterChange,
  sort, onSortChange,
}: OrderFiltersProps) {
  const { colors } = useTheme()
  const [sortMenuOpen, setSortMenuOpen] = React.useState(false)
  const [dateMenuOpen, setDateMenuOpen] = React.useState(false)

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
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
            placeholder="Search PO number or buyer…"
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
            <Text style={{ fontSize: 13, color: colors.text, fontWeight: '600' }}>
              {DATE_OPTIONS.find((d) => d.key === dateFilter)?.label}
            </Text>
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
            onPress={() => { setSortMenuOpen((v) => !v); setDateMenuOpen(false) }}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              paddingHorizontal: 12, paddingVertical: 10,
              backgroundColor: colors.surface, borderRadius: 10,
              borderWidth: 1, borderColor: colors.border,
            }}
          >
            <ArrowUpDown size={14} color={colors.text} />
          </TouchableOpacity>
          {sortMenuOpen && (
            <View style={{
              position: 'absolute', top: 44, right: 0, zIndex: 10,
              backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border,
              paddingVertical: 4, minWidth: 160,
            }}>
              {SORT_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => { onSortChange(opt.key); setSortMenuOpen(false) }}
                  style={{ paddingHorizontal: 14, paddingVertical: 10 }}
                >
                  <Text style={{ fontSize: 13, color: colors.text, fontWeight: opt.key === sort ? '700' : '400' }}>
                    {opt.label}
                  </Text>
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
              {s === 'ALL' ? 'All' : STATUS_LABELS[s as POStatus]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )
}

// ── Pure helper functions, used by the screen — no component coupling ──────

export function applyOrderFilters<T extends {
  poNumber: string
  status: POStatus
  totalAmount: number
  createdAt: string
  buyerOrg: { name: string }
}>(orders: T[], opts: {
  search: string
  status: POStatus | 'ALL'
  dateFilter: DateFilter
  sort: SortOption
  getPriorityRank: (o: T) => number
}): T[] {
  const { search, status, dateFilter, sort, getPriorityRank } = opts
  const now = new Date()

  let result = orders

  if (status !== 'ALL') result = result.filter((o) => o.status === status)

  if (search.trim()) {
    const q = search.trim().toLowerCase()
    result = result.filter(
      (o) => o.poNumber.toLowerCase().includes(q) || o.buyerOrg.name.toLowerCase().includes(q)
    )
  }

  if (dateFilter !== 'ALL') {
    const cutoffs: Record<Exclude<DateFilter, 'ALL'>, number> = {
      TODAY: 1,
      WEEK: 7,
      MONTH: 30,
    }
    const days = cutoffs[dateFilter]
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    result = result.filter((o) => new Date(o.createdAt) >= cutoff)
  }

  const sorted = [...result]
  switch (sort) {
    case 'NEWEST':
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      break
    case 'OLDEST':
      sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      break
    case 'HIGHEST_AMOUNT':
      sorted.sort((a, b) => b.totalAmount - a.totalAmount)
      break
    case 'PRIORITY':
      sorted.sort((a, b) => getPriorityRank(b) - getPriorityRank(a))
      break
  }
  return sorted
}