import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Animated,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import {
  Calendar,
  ChevronDown,
  Download,
  Filter,
  LayoutGrid,
  List,
  RefreshCcw,
  Search,
  SlidersHorizontal,
  X,
  type LucideIcon,
} from 'lucide-react-native'
import DateRangePickerModal from '@/components/DateRangePickerModal'
import { useTheme } from '@/contexts/ThemeContext'
import { useResponsive } from '@/hooks/useResponsive'
import type { ChartPoint, InsightDateRange, InsightDensity, InsightSort, InsightViewMode } from '@/hooks/useSupplierInsights'
import { FinanceSectionCard } from '@/components/supplier/finance/FinanceScreenShell'
import { EmptyState,  } from '@/components/DataTable'

export const money = (value: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(value || 0)
export const number = (value: number) => new Intl.NumberFormat('en-PH').format(value || 0)
export const compact = (value: number) => new Intl.NumberFormat('en-PH', { notation: 'compact', maximumFractionDigits: 1 }).format(value || 0)


export function StatusPill({ label, tone = '#2563EB' }: { label: string; tone?: string }) {
  return (
    <View style={{ borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, backgroundColor: `${tone}18`, alignSelf: 'flex-start' }}>
      <Text style={{ color: tone, fontSize: 11, fontWeight: '900' }}>{label}</Text>
    </View>
  )
}

export function InsightHeader({
  title,
  subtitle,
  dateRange,
  onDateRange,
  onRefresh,
  refreshing,
}: {
  title: string
  subtitle: string
  dateRange: InsightDateRange
  onDateRange: (range: InsightDateRange) => void
  onRefresh: () => void
  refreshing?: boolean
}) {
  const { colors } = useTheme()
  const { isMobile } = useResponsive()
  const [dateOpen, setDateOpen] = useState(false)
  const start = new Date(dateRange.startDate)
  const end = new Date(dateRange.endDate)

  const actionStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 7,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  }

  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', gap: 12, alignItems: isMobile ? 'stretch' : 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: isMobile ? 24 : 30, fontWeight: '900' }}>{title}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4, fontWeight: '600' }}>{subtitle}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <TouchableOpacity style={actionStyle} onPress={() => setDateOpen(true)}>
            <Calendar size={16} color={colors.textSecondary} />
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 12 }}>
              {start.toLocaleDateString()} - {end.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={actionStyle}>
            <Download size={16} color={colors.textSecondary} />
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 12 }}>Export</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[actionStyle, { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={onRefresh}>
            <RefreshCcw size={16} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 12 }}>{refreshing ? 'Refreshing' : 'Refresh'}</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {['Saved filters', 'Executive summary', 'Review alerts'].map((label) => (
          <StatusPill key={label} label={label} tone={colors.primary} />
        ))}
      </View>
      <DateRangePickerModal
        visible={dateOpen}
        onClose={() => setDateOpen(false)}
        initialStart={start}
        initialEnd={end}
        onApply={(nextStart, nextEnd) => onDateRange({ startDate: nextStart.toISOString(), endDate: nextEnd.toISOString() })}
      />
    </View>
  )
}

export function InsightToolbar({
  search,
  sort,
  density,
  viewMode,
  onSearch,
  onSort,
  onDensity,
  onViewMode,
}: {
  search: string
  sort: InsightSort
  density: InsightDensity
  viewMode: InsightViewMode
  onSearch: (value: string) => void
  onSort: (value: InsightSort) => void
  onDensity: (value: InsightDensity) => void
  onViewMode: (value: InsightViewMode) => void
}) {
  const { colors } = useTheme()
  const [sortOpen, setSortOpen] = useState(false)
  const sorts: Array<{ value: InsightSort; label: string }> = [
    { value: 'revenue', label: 'Revenue' },
    { value: 'orders', label: 'Orders' },
    { value: 'rating', label: 'Rating' },
    { value: 'name', label: 'Name' },
    { value: 'newest', label: 'Newest' },
  ]

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
      <View style={{ flex: 1, minWidth: 220, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 12, height: 42 }}>
        <Search size={16} color={colors.textSecondary} />
        <TextInput value={search} onChangeText={onSearch} placeholder="Search insights" placeholderTextColor={colors.textSecondary} style={{ flex: 1, color: colors.text, fontWeight: '700' }} />
      </View>
      <View>
        <TouchableOpacity onPress={() => setSortOpen((v) => !v)} style={{ height: 42, flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 12 }}>
          <Filter size={16} color={colors.textSecondary} />
          <Text style={{ color: colors.text, fontWeight: '800' }}>{sorts.find((item) => item.value === sort)?.label}</Text>
          <ChevronDown size={14} color={colors.textSecondary} />
        </TouchableOpacity>
        {sortOpen ? (
          <View style={{ position: 'absolute', top: 46, right: 0, zIndex: 20, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface, minWidth: 150, overflow: 'hidden' }}>
            {sorts.map((item) => (
              <TouchableOpacity key={item.value} onPress={() => { onSort(item.value); setSortOpen(false) }} style={{ paddingHorizontal: 12, paddingVertical: 10 }}>
                <Text style={{ color: colors.text, fontWeight: item.value === sort ? '900' : '700' }}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </View>
      <TouchableOpacity onPress={() => onDensity(density === 'comfortable' ? 'compact' : 'comfortable')} style={{ height: 42, flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 12 }}>
        <SlidersHorizontal size={16} color={colors.textSecondary} />
        <Text style={{ color: colors.text, fontWeight: '800' }}>{density === 'comfortable' ? 'Comfort' : 'Compact'}</Text>
      </TouchableOpacity>
      <View style={{ height: 42, flexDirection: 'row', borderWidth: 1, borderColor: colors.border, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.surface }}>
        <TouchableOpacity onPress={() => onViewMode('cards')} style={{ width: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: viewMode === 'cards' ? colors.primary : 'transparent' }}>
          <LayoutGrid size={17} color={viewMode === 'cards' ? '#fff' : colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onViewMode('table')} style={{ width: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: viewMode === 'table' ? colors.primary : 'transparent' }}>
          <List size={17} color={viewMode === 'table' ? '#fff' : colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

export function MiniChart({ title, subtitle, data, type = 'bar' }: { title: string; subtitle?: string; data: ChartPoint[]; type?: 'bar' | 'line' }) {
  const { colors } = useTheme()
  const max = Math.max(1, ...data.map((item) => item.value))
  const display = data.length ? data : [{ label: 'No data', value: 0 }]
  return (
    <FinanceSectionCard title={title} subtitle={subtitle}>
      <View style={{ height: 174, flexDirection: 'row', alignItems: 'flex-end', gap: 9, paddingTop: 12 }}>
        {display.map((item, index) => (
          <View key={`${item.label}-${index}`} style={{ flex: 1, alignItems: 'center', gap: 8, minWidth: 36 }}>
            <View style={{ width: '100%', height: 128, justifyContent: 'flex-end' }}>
              <View style={{ height: `${Math.max(6, (item.value / max) * 100)}%`, borderRadius: type === 'line' ? 7 : 5, backgroundColor: item.accent ?? (index % 2 ? '#0EA5E9' : '#2563EB') }} />
            </View>
            <Text numberOfLines={1} style={{ color: colors.textSecondary, fontSize: 10, fontWeight: '800', maxWidth: 72 }}>{item.label}</Text>
          </View>
        ))}
      </View>
    </FinanceSectionCard>
  )
}

export function InsightCard({ title, value, subtitle, icon: Icon, accent }: { title: string; value: string; subtitle?: string; icon: LucideIcon; accent: string }) {
  const { colors } = useTheme()
  return (
    <View style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 16, padding: 15, gap: 9, minHeight: 124 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <Text style={{ flex: 1, color: colors.textSecondary, fontSize: 12, fontWeight: '800' }}>{title}</Text>
        <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: `${accent}18`, alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={19} color={accent} />
        </View>
      </View>
      <Text style={{ color: colors.text, fontSize: 24, fontWeight: '900' }} numberOfLines={1}>{value}</Text>
      {subtitle ? <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700' }}>{subtitle}</Text> : null}
    </View>
  )
}

export function CardGrid({ children, minWidth = 260 }: { children: React.ReactNode; minWidth?: number }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {React.Children.map(children, (child, index) => (
        <View key={index} style={{ flexGrow: 1, flexBasis: minWidth, minWidth, maxWidth: '100%' }}>
          {child}
        </View>
      ))}
    </View>
  )
}

export function InsightsDrawer({ visible, title, subtitle, onClose, children }: { visible: boolean; title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  const { colors } = useTheme()
  const { isDesktop, width } = useResponsive()
  const drawerWidth = isDesktop ? 520 : width
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.36)', flexDirection: 'row', justifyContent: 'flex-end' }}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
        <View style={{ width: drawerWidth, maxWidth: '100%', backgroundColor: colors.surface, borderLeftWidth: isDesktop ? 1 : 0, borderColor: colors.border }}>
          <View style={{ padding: 18, borderBottomWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 20, fontWeight: '900' }}>{title}</Text>
              {subtitle ? <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700', marginTop: 3 }}>{subtitle}</Text> : null}
            </View>
            <TouchableOpacity onPress={onClose}><X size={21} color={colors.textSecondary} /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }}>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  )
}


export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { colors } = useTheme()
  return (
    <View style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 16, padding: 20, alignItems: 'center', gap: 10 }}>
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>Unable to load insights</Text>
      <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>{message}</Text>
      <TouchableOpacity onPress={onRetry} style={{ backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 }}>
        <Text style={{ color: '#fff', fontWeight: '900' }}>Try again</Text>
      </TouchableOpacity>
    </View>
  )
}

export function EmptyPanel({ title, message }: { title: string; message: string }) {
  return <EmptyState title={title} message={message} />
}

