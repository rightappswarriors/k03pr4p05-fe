import React, { useRef, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, Platform } from 'react-native'
import { Search, Calendar, Filter, X } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import type { RfqStatus } from '@/types'
import { RFQ_STATUS_FILTERS, getStatusesForFilter, isStatusInGroup } from '@/types'
import DateRangePickerModal from '@/components/DateRangePickerModal'

export type RfqDateFilter = 'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM'

/** The filter group keys used in the UI — mirrors {@link RFQ_STATUS_FILTERS}. */
export type RfqStatusFilterKey = (typeof RFQ_STATUS_FILTERS)[number]['key']

export interface CustomDateRange {
  start: string // ISO
  end: string // ISO
}

const DATE_OPTIONS: Array<{ key: Exclude<RfqDateFilter, 'CUSTOM'>; label: string }> = [
  { key: 'ALL', label: 'All time' },
  { key: 'TODAY', label: 'Today' },
  { key: 'WEEK', label: 'This week' },
  { key: 'MONTH', label: 'This month' },
]

const formatShort = (iso: string) =>
  new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })

interface Props {
  search: string
  onSearchChange: (v: string) => void
  statusFilter: RfqStatusFilterKey
  onStatusChange: (v: RfqStatusFilterKey) => void
  dateFilter: RfqDateFilter
  onDateFilterChange: (v: RfqDateFilter) => void
  unreadOnly: boolean
  onUnreadOnlyChange: (v: boolean) => void
  /** Custom date range — only meaningful when dateFilter === 'CUSTOM'. */
  customRange?: CustomDateRange | null
  onCustomRangeChange?: (range: CustomDateRange | null) => void
}

export function RfqFilters({
  search, onSearchChange,
  statusFilter, onStatusChange,
  dateFilter, onDateFilterChange,
  unreadOnly, onUnreadOnlyChange,
  customRange, onCustomRangeChange,
}: Props) {
  const { colors } = useTheme()
  const [filterMenuOpen, setFilterMenuOpen] = React.useState(false)
  const [dateRangeModalVisible, setDateRangeModalVisible] = useState(false)

  // ─── Fix: dropdown was fixed at top:80/right:16 regardless of where the
  // filter button actually renders (breaks in web layouts with different
  // header heights — see the overlapping-with-tabs screenshot). Measure the
  // button's real screen position instead and anchor the dropdown to it.
  const filterBtnRef = useRef<View>(null)
  const [dropdownAnchor, setDropdownAnchor] = useState<{ top: number; left: number }>({ top: 80, left: 16 })
  const DROPDOWN_WIDTH = 240

  const openFilterMenu = () => {
    filterBtnRef.current?.measureInWindow((x, y, width, height) => {
      // Align the dropdown's right edge with the button's right edge,
      // clamped so it never renders off the left side of the screen.
      const left = Math.max(8, x + width - DROPDOWN_WIDTH)
      setDropdownAnchor({ top: y + height + 6, left })
      setFilterMenuOpen(true)
    })
  }

  const hasActiveFilters = unreadOnly || statusFilter !== 'ALL' || dateFilter !== 'ALL'

  const handleApplyDateRange = (start: Date, end: Date) => {
    onCustomRangeChange?.({ start: start.toISOString(), end: end.toISOString() })
    onDateFilterChange('CUSTOM')
    setDateRangeModalVisible(false)
  }

  const clearCustomRange = () => {
    onCustomRangeChange?.(null)
    onDateFilterChange('ALL')
  }

  return (
    <View style={{ gap: 10 }}>
      {/* Search + Filters row */}
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        {/* RFQ / Product / Buyer search — buyer matching now lives here instead
            of a separate dropdown, since it's the same "find this RFQ" intent. */}
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
            placeholder="Search RFQ number or Product or Buyer"
            placeholderTextColor={colors.textSecondary}
            style={{ flex: 1, paddingVertical: 10, color: colors.text, fontSize: 14 }}
          />
        </View>

        {/* Date button — opens the range/single-date picker directly, rather
            than the quick-preset dropdown (that's still available inside the
            Filter dropdown for the common cases). */}
        <TouchableOpacity
          onPress={() => setDateRangeModalVisible(true)}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            paddingHorizontal: 12, paddingVertical: 10,
            backgroundColor: colors.surface, borderRadius: 10,
            borderWidth: 1, borderColor: dateFilter === 'CUSTOM' ? colors.primary : colors.border,
          }}
        >
          <Calendar size={14} color={dateFilter === 'CUSTOM' ? colors.primary : colors.text} />
        </TouchableOpacity>

        {/* Combined Filter dropdown (Status, quick Date presets, Unread) */}
        <View ref={filterBtnRef} collapsable={false}>
          <TouchableOpacity
            onPress={openFilterMenu}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              paddingHorizontal: 12, paddingVertical: 10,
              backgroundColor: colors.surface, borderRadius: 10,
              borderWidth: 1, borderColor: hasActiveFilters ? colors.primary : colors.border,
            }}
          >
            <View style={{
              width: 8, height: 8, borderRadius: 4,
              backgroundColor: hasActiveFilters ? colors.primary : 'transparent',
              borderWidth: hasActiveFilters ? 0 : 1, borderColor: colors.border,
            }} />
            <Filter size={14} color={hasActiveFilters ? colors.primary : colors.text} />
          </TouchableOpacity>
        </View>

        {/* Filter modal — anchored to the button's measured position */}
        <Modal
          visible={filterMenuOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setFilterMenuOpen(false)}
        >
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
            activeOpacity={1}
            onPress={() => setFilterMenuOpen(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => {}}
              style={{
                position: 'absolute',
                top: dropdownAnchor.top,
                left: dropdownAnchor.left,
                backgroundColor: colors.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                paddingVertical: 6,
                width: DROPDOWN_WIDTH,
                maxHeight: '70%',
                shadowColor: '#000',
                shadowOpacity: 0.15,
                shadowRadius: 20,
                shadowOffset: { width: 0, height: 8 },
                elevation: 20,
              }}
            >
              <ScrollView>
                {/* Date filter section (quick presets) */}
                <View style={{ paddingHorizontal: 6, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 14, paddingVertical: 6 }}>
                    Date
                  </Text>
                  {DATE_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.key}
                      onPress={() => {
                        onDateFilterChange(opt.key)
                        onCustomRangeChange?.(null)
                        setFilterMenuOpen(false)
                      }}
                      style={{
                        paddingHorizontal: 14, paddingVertical: 10,
                        backgroundColor: dateFilter === opt.key ? `${colors.primary}1A` : 'transparent',
                      }}
                    >
                      <Text style={{ fontSize: 13, color: colors.text, fontWeight: dateFilter === opt.key ? '700' : '400' }}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 4 }} />

                {/* Status filter section */}
                <View style={{ paddingHorizontal: 6, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 14, paddingVertical: 6 }}>
                    Status
                  </Text>
                  {RFQ_STATUS_FILTERS.map((opt) => (
                    <TouchableOpacity
                      key={opt.key}
                      onPress={() => { onStatusChange(opt.key); setFilterMenuOpen(false) }}
                      style={{ paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: statusFilter === opt.key ? `${colors.primary}1A` : 'transparent' }}
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
                </View>

                <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 4 }} />

                {/* Unread only section */}
                <TouchableOpacity
                  onPress={() => { onUnreadOnlyChange(!unreadOnly); setFilterMenuOpen(false) }}
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
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </View>

      {/* Active custom-range chip, shown only when one is applied */}
      {dateFilter === 'CUSTOM' && customRange && (
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity
            onPress={clearCustomRange}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
              backgroundColor: `${colors.primary}1A`, borderWidth: 1, borderColor: colors.primary,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>
              {formatShort(customRange.start)} – {formatShort(customRange.end)}
            </Text>
            <X size={12} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}

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

      <DateRangePickerModal
        visible={dateRangeModalVisible}
        onClose={() => setDateRangeModalVisible(false)}
        onApply={handleApplyDateRange}
        initialStart={customRange ? new Date(customRange.start) : undefined}
        initialEnd={customRange ? new Date(customRange.end) : undefined}
      />
    </View>
  )
}

/**
 * Client-side filtering helper.
 *
 * Search now matches RFQ number, product name, AND buyer (name/email/org
 * name) in one field — the standalone buyer dropdown was removed since it
 * duplicated what typing the buyer's name in search already does.
 */
export function applyRfqFilters<T extends {
  rfqNumber: string
  status: string
  createdAt: string
  supplierOrgId: number
  supplierItem?: { name?: string }
  agent?: {
    organizationId?: number | null
    organization?: { id: number; name?: string } | null
    fullname?: string
    email?: string
  } | null
}>(rfqs: T[], opts: {
  search: string
  statusFilter: string
  dateFilter: RfqDateFilter
  unreadOnly: boolean
  unreadPredicate: (r: T) => boolean
  customRange?: CustomDateRange | null
}): T[] {
  const { search, statusFilter, dateFilter, unreadOnly, unreadPredicate, customRange } = opts
  const now = new Date()

  let result = rfqs

  if (unreadOnly) {
    result = result.filter(unreadPredicate)
  }

  if (statusFilter !== 'ALL') {
    const groupStatuses = getStatusesForFilter(statusFilter as any) as RfqStatus[]
    result = result.filter((r) => isStatusInGroup(r.status, groupStatuses))
  }

  if (search.trim()) {
    const q = search.trim().toLowerCase()
    result = result.filter(
      (r) =>
        r.rfqNumber.toLowerCase().includes(q) ||
        (r.supplierItem?.name?.toLowerCase().includes(q) ?? false) ||
        (r.agent?.fullname?.toLowerCase().includes(q) ?? false) ||
        (r.agent?.email?.toLowerCase().includes(q) ?? false) ||
        (r.agent?.organization?.name?.toLowerCase().includes(q) ?? false)
    )
  }

  if (dateFilter === 'CUSTOM' && customRange) {
    const start = new Date(customRange.start)
    const end = new Date(customRange.end)
    result = result.filter((r) => {
      const d = new Date(r.createdAt)
      return d >= start && d <= end
    })
  } else if (dateFilter !== 'ALL' && dateFilter !== 'CUSTOM') {
    const cutoffs: Record<'TODAY' | 'WEEK' | 'MONTH', number> = {
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