import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { View, Text, ScrollView, RefreshControl, useWindowDimensions, TouchableOpacity, Alert } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Truck, Clock, CheckCircle2, AlertTriangle, LayoutGrid, List } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import {
  fetchDeliveries,
  startDelivery,
  markDelivered,
  applyDeliveryFilters,
  isSameDay,
  isWithinLastDays,
  isOverdue,
  type DeliveryItem,
  type DeliveryStatus,
  type DeliverySort,
  type DeliveryDateRange,
} from '@/services/supplierService/deliveryService'
import { DeliverySummaryCard } from '@/components/supplier/delivery/DeliverySummaryCard'
import { DeliveryFilters } from '@/components/supplier/delivery/DeliveryFilters'
import { DeliveryCard } from '@/components/supplier/delivery/DeliveryCard'
import { DeliveryTable } from '@/components/supplier/delivery/DeliveryTable'
import { FadeInView } from '@/components/supplier/FadeInView'
import { KpiSkeletonRow, OrderCardSkeletonList } from '@/components/supplier/LoadingSkeleton'
import DeliveryDetailsScreen from './DeliveryDetailsScreen'
import { getCardWidthPct, getKpiColumns } from './SupplierDashboardScreen'

const BREAKPOINTS = { tablet: 768, desktop: 1100 }

const STORAGE_KEYS = {
  layout: 'supplierDeliveryLayout',
  dateRange: 'supplierDeliveryDateRange',
  status: 'supplierDeliveryStatus',
  sort: 'supplierDeliverySort',
} as const

type Layout = 'table' | 'cards'

const formatPHP = (amount: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)

export default function DeliveryScreen() {
  const { colors } = useTheme()
  const { user } = useAuth()
  const { width } = useWindowDimensions()

  const isTablet = width >= BREAKPOINTS.tablet
  const isDesktop = width >= BREAKPOINTS.desktop
  const horizontalPadding = isDesktop ? 32 : isTablet ? 24 : 16
  const contentMaxWidth = isDesktop ? 1680 : undefined
  
  const cardColumns = getKpiColumns(width)
  const cardWidthPct = getCardWidthPct(cardColumns)

  const kpiColumns = getKpiColumns(width)
  const kpiWidthPct = getCardWidthPct(kpiColumns)

  const availableWidth =
    (contentMaxWidth ?? width) - horizontalPadding * 2

  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [prefsLoaded, setPrefsLoaded] = useState(false)

  const [layout, setLayout] = useState<Layout>('cards')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<DeliveryStatus | 'ALL'>('ALL')
  const [dateRange, setDateRange] = useState<DeliveryDateRange>({ start: null, end: null })
  const [sort, setSort] = useState<DeliverySort>('NEWEST')

  const [selectedPOId, setSelectedPOId] = useState<string | null>(null)

  // ── Load persisted preferences once ───────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [savedLayout, savedDateRange, savedStatus, savedSort] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.layout),
          AsyncStorage.getItem(STORAGE_KEYS.dateRange),
          AsyncStorage.getItem(STORAGE_KEYS.status),
          AsyncStorage.getItem(STORAGE_KEYS.sort),
        ])

        if (savedLayout === 'table' || savedLayout === 'cards') {
          setLayout(savedLayout)
        } else {
          // First-time default: desktop = table, tablet/phone = cards.
          setLayout(width >= BREAKPOINTS.desktop ? 'table' : 'cards')
        }
        if (savedDateRange) {
          try { setDateRange(JSON.parse(savedDateRange)) } catch {}
        }
        if (savedStatus) setStatus(savedStatus as DeliveryStatus | 'ALL')
        if (savedSort) setSort(savedSort as DeliverySort)
      } catch (e) {
        if (__DEV__) console.error('Failed to load delivery screen preferences', e)
      } finally {
        setPrefsLoaded(true)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const persistLayout = useCallback(async (v: Layout) => {
    setLayout(v)
    try { await AsyncStorage.setItem(STORAGE_KEYS.layout, v) } catch (e) { if (__DEV__) console.error(e) }
  }, [])
  const persistDateRange = useCallback(async (v: DeliveryDateRange) => {
    setDateRange(v)
    try { await AsyncStorage.setItem(STORAGE_KEYS.dateRange, JSON.stringify(v)) } catch (e) { if (__DEV__) console.error(e) }
  }, [])
  const persistStatus = useCallback(async (v: DeliveryStatus | 'ALL') => {
    setStatus(v)
    try { await AsyncStorage.setItem(STORAGE_KEYS.status, v) } catch (e) { if (__DEV__) console.error(e) }
  }, [])
  const persistSort = useCallback(async (v: DeliverySort) => {
    setSort(v)
    try { await AsyncStorage.setItem(STORAGE_KEYS.sort, v) } catch (e) { if (__DEV__) console.error(e) }
  }, [])

  const load = useCallback(async () => {
    if (!user?.orgId) return
    try {
      const data = await fetchDeliveries(user.orgId)
      setDeliveries(data)
    } catch (e) {
      if (__DEV__) console.error('fetchDeliveries error', e)
    } finally {
      setLoading(false)
    }
  }, [user?.orgId])

  useEffect(() => { load() }, [load])

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false) }

  // Tablet always renders cards per spec, regardless of the persisted preference
  // (the toggle is only meaningful — and only shown — on desktop widths).
  const effectiveLayout: Layout = isDesktop ? layout : 'cards'

  const kpis = useMemo(() => {
    const scheduledToday = deliveries.filter((d) => d.status === 'SCHEDULED' && isSameDay(d.scheduledDate)).length
    const inTransit = deliveries.filter((d) => d.status === 'IN_TRANSIT').length
    const deliveredThisWeek = deliveries.filter((d) => d.status === 'DELIVERED' && isWithinLastDays(d.deliveredAt, 7)).length
    const failedOrOverdue = deliveries.filter((d) => d.status === 'FAILED' || isOverdue(d)).length
    return { scheduledToday, inTransit, deliveredThisWeek, failedOrOverdue }
  }, [deliveries])

  const filtered = useMemo(
    () => applyDeliveryFilters(deliveries, { search, status, dateRange, sort }),
    [deliveries, search, status, dateRange, sort]
  )

  const handleMarkInTransit = (d: DeliveryItem) => {
    Alert.alert('Mark as In Transit', `Mark delivery for ${d.poNumber} as in transit?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: async () => { try { await startDelivery(d.poId); await load() } catch (e: any) { Alert.alert('Error', e.message ?? 'Failed.') } } },
    ])
  }

  const handleMarkDelivered = (d: DeliveryItem) => {
    Alert.alert('Confirm Delivery', `Mark ${d.poNumber} as delivered?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delivered', onPress: async () => { try { await markDelivered(d.poId); await load() } catch (e: any) { Alert.alert('Error', e.message ?? 'Failed.') } } },
    ])
  }

  if (selectedPOId) {
    return (
      <DeliveryDetailsScreen
        poId={selectedPOId}
        onBack={() => setSelectedPOId(null)}
        onUpdated={load}
      />
    )
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingHorizontal: horizontalPadding, paddingVertical: 16, gap: 20, width: '100%', maxWidth: contentMaxWidth, alignSelf: 'center' }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <View style={{ flexDirection: isTablet ? 'row' : 'column', justifyContent: 'space-between', alignItems: isTablet ? 'center' : 'flex-start', gap: 8 }}>
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: isDesktop ? 26 : 20, fontWeight: '800', color: colors.text }}>Deliveries</Text>
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>Track and manage every delivery from schedule to doorstep</Text>
        </View>
        {isDesktop && prefsLoaded && (
          <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 10, padding: 3, borderWidth: 1, borderColor: colors.border }}>
            <TouchableOpacity
              onPress={() => persistLayout('table')}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, backgroundColor: layout === 'table' ? colors.primary : 'transparent' }}
            >
              <List size={13} color={layout === 'table' ? '#fff' : colors.textSecondary} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: layout === 'table' ? '#fff' : colors.textSecondary }}>Table</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => persistLayout('cards')}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, backgroundColor: layout === 'cards' ? colors.primary : 'transparent' }}
            >
              <LayoutGrid size={13} color={layout === 'cards' ? '#fff' : colors.textSecondary} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: layout === 'cards' ? '#fff' : colors.textSecondary }}>Cards</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── KPIs ─────────────────────────────────────────────────────────── */}
      {loading ? (
        <KpiSkeletonRow />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <FadeInView delay={0} style={{ width: kpiWidthPct }}>
            <DeliverySummaryCard title="Scheduled Today" value={kpis.scheduledToday} accent="#F59E0B" icon={Clock} subtitle={""} widthPct="100%" />
          </FadeInView>
          <FadeInView delay={40} style={{ width: kpiWidthPct }}>
            <DeliverySummaryCard title="In Transit" value={kpis.inTransit} accent="#3B82F6" icon={Truck} subtitle={""} widthPct="100%" />
          </FadeInView>
          <FadeInView delay={80} style={{ width: kpiWidthPct }}>
            <DeliverySummaryCard title="Delivered This Week" value={kpis.deliveredThisWeek} accent="#22C55E" subtitle={""} icon={CheckCircle2} widthPct="100%" />
          </FadeInView>
          <FadeInView delay={120} style={{ width: kpiWidthPct }}>
            <DeliverySummaryCard title="Failed / Overdue" value={kpis.failedOrOverdue} accent="#EF4444" subtitle={""} icon={AlertTriangle} widthPct="100%" />
          </FadeInView>
        </View>
      )}

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <DeliveryFilters
        search={search} onSearchChange={setSearch}
        status={status} onStatusChange={persistStatus}
        dateRange={dateRange} onDateRangeChange={persistDateRange}
        sort={sort} onSortChange={persistSort}
      />

      {/* ── List ─────────────────────────────────────────────────────────── */}
      {loading || !prefsLoaded ? (
        <OrderCardSkeletonList />
      ) : filtered.length === 0 ? (
        <View style={{ alignItems: 'center', padding: 48, gap: 8 }}>
          <Truck size={36} color={colors.textSecondary} />
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>No deliveries</Text>
          <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center' }}>
            {status === 'ALL' ? 'Accepted purchase orders will generate deliveries here.' : `No matching deliveries for the current filters.`}
          </Text>
        </View>
      ) : effectiveLayout === 'table' ? (
        <DeliveryTable
          deliveries={filtered}
          onSelect={setSelectedPOId}
          onMarkInTransit={handleMarkInTransit}
          onMarkDelivered={handleMarkDelivered}
        />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
          {filtered.map((d, idx) => (
            <FadeInView key={d.poId} delay={Math.min(idx, 8) * 30} style={{ width: cardWidthPct }}>
              <DeliveryCard
                delivery={d}
                onPress={() => setSelectedPOId(d.poId)}
                onMarkInTransit={() => handleMarkInTransit(d)}
                onMarkDelivered={() => handleMarkDelivered(d)}
              />
            </FadeInView>
          ))}
        </View>
      )}
    </ScrollView>
  )
}