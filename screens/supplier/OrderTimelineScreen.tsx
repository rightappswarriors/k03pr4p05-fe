import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshControl, ScrollView, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { AlertTriangle, Bell, Package, ShoppingCart, Truck, WalletCards } from 'lucide-react-native'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useSupplierTimeline } from '@/hooks/useSupplierTimeline'
import { TimelineDetailsDrawer } from '@/components/supplier/order-timeline/TimelineDetailsDrawer'
import { TimelineEmptyState } from '@/components/supplier/order-timeline/TimelineEmptyState'
import { TimelineFilters } from '@/components/supplier/order-timeline/TimelineFilters'
import { TimelineGroup } from '@/components/supplier/order-timeline/TimelineGroup'
import { TimelineHeader } from '@/components/supplier/order-timeline/TimelineHeader'
import { TimelineSkeleton } from '@/components/supplier/order-timeline/TimelineSkeleton'
import { TimelineSummaryCard } from '@/components/supplier/order-timeline/TimelineSummaryCard'
import type {
  TimelineDateRange,
  TimelineEvent,
  TimelineEventType,
  TimelineLayout,
  TimelineSort,
  TimelineStatus,
} from '@/services/supplierTimelineService'

const BREAKPOINTS = { tablet: 768, desktop: 1100 }

const STORAGE_KEYS = {
  timelineDateRange: 'timelineDateRange',
  timelineEventTypes: 'timelineEventTypes',
  timelineStatus: 'timelineStatus',
  timelineLayout: 'timelineLayout',
  timelineSort: 'timelineSort',
} as const

const DEFAULT_DATE_RANGE: TimelineDateRange = { start: null, end: null }

function isTimelineLayout(value: string | null): value is TimelineLayout {
  return value === 'cards' || value === 'timeline'
}

function isTimelineStatus(value: string | null): value is TimelineStatus | 'ALL' {
  return value === 'ALL' || value === 'SUCCESS' || value === 'WARNING' || value === 'INFO' || value === 'ERROR' || value === 'PENDING'
}

function isTimelineSort(value: string | null): value is TimelineSort {
  return value === 'NEWEST' || value === 'OLDEST'
}

export default function OrderTimelineScreen() {
  const { colors } = useTheme()
  const { user } = useAuth()
  const { width } = useWindowDimensions()

  const isTablet = width >= BREAKPOINTS.tablet
  const isDesktop = width >= BREAKPOINTS.desktop
  const horizontalPadding = isDesktop ? 32 : isTablet ? 24 : 16
  const contentMaxWidth = isDesktop ? 1680 : undefined
  const cardColumns = isDesktop ? 2 : isTablet ? 2 : 1
  const cardWidth = cardColumns === 1 ? '100%' : '48.8%'

  const [prefsLoaded, setPrefsLoaded] = useState(false)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<TimelineStatus | 'ALL'>('ALL')
  const [eventTypes, setEventTypes] = useState<TimelineEventType[]>([])
  const [dateRange, setDateRange] = useState<TimelineDateRange>(DEFAULT_DATE_RANGE)
  const [layout, setLayout] = useState<TimelineLayout>(isDesktop ? 'timeline' : 'cards')
  const [sort, setSort] = useState<TimelineSort>('NEWEST')
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const [savedDateRange, savedEventTypes, savedStatus, savedLayout, savedSort] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.timelineDateRange),
          AsyncStorage.getItem(STORAGE_KEYS.timelineEventTypes),
          AsyncStorage.getItem(STORAGE_KEYS.timelineStatus),
          AsyncStorage.getItem(STORAGE_KEYS.timelineLayout),
          AsyncStorage.getItem(STORAGE_KEYS.timelineSort),
        ])

        if (savedDateRange) {
          try {
            setDateRange(JSON.parse(savedDateRange))
          } catch {}
        }
        if (savedEventTypes) {
          try {
            const parsed = JSON.parse(savedEventTypes)
            if (Array.isArray(parsed)) setEventTypes(parsed)
          } catch {}
        }
        if (isTimelineStatus(savedStatus)) setStatus(savedStatus)
        if (isTimelineLayout(savedLayout)) setLayout(savedLayout)
        else setLayout(width >= BREAKPOINTS.desktop ? 'timeline' : 'cards')
        if (isTimelineSort(savedSort)) setSort(savedSort)
      } catch (e) {
        if (__DEV__) console.error('Failed to load timeline preferences', e)
      } finally {
        setPrefsLoaded(true)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const persistDateRange = useCallback(async (value: TimelineDateRange) => {
    setDateRange(value)
    try { await AsyncStorage.setItem(STORAGE_KEYS.timelineDateRange, JSON.stringify(value)) } catch (e) { if (__DEV__) console.error(e) }
  }, [])

  const persistEventTypes = useCallback(async (value: TimelineEventType[]) => {
    setEventTypes(value)
    try { await AsyncStorage.setItem(STORAGE_KEYS.timelineEventTypes, JSON.stringify(value)) } catch (e) { if (__DEV__) console.error(e) }
  }, [])

  const persistStatus = useCallback(async (value: TimelineStatus | 'ALL') => {
    setStatus(value)
    try { await AsyncStorage.setItem(STORAGE_KEYS.timelineStatus, value) } catch (e) { if (__DEV__) console.error(e) }
  }, [])

  const persistLayout = useCallback(async (value: TimelineLayout) => {
    setLayout(value)
    try { await AsyncStorage.setItem(STORAGE_KEYS.timelineLayout, value) } catch (e) { if (__DEV__) console.error(e) }
  }, [])

  const persistSort = useCallback(async (value: TimelineSort) => {
    setSort(value)
    try { await AsyncStorage.setItem(STORAGE_KEYS.timelineSort, value) } catch (e) { if (__DEV__) console.error(e) }
  }, [])

  const effectiveLayout: TimelineLayout = isDesktop ? layout : 'cards'
  const {
    data,
    loading,
    refreshing,
    loadingMore,
    error,
    refresh,
    loadMore,
  } = useSupplierTimeline({
    supplierOrgId: user?.orgId,
    search,
    status,
    eventTypes,
    dateRange,
    sort,
  })

  const summaryCards = useMemo(() => [
    { title: 'Total events', value: data.summary.total, accent: colors.primary, icon: ShoppingCart },
    { title: 'Deliveries', value: data.summary.deliveries, accent: '#0EA5E9', icon: Truck },
    { title: 'Wallet', value: data.summary.wallet, accent: '#16A34A', icon: WalletCards },
    { title: 'Inventory', value: data.summary.inventory, accent: '#F59E0B', icon: Package },
    { title: 'Notifications', value: data.summary.notifications, accent: '#DC2626', icon: Bell },
    { title: 'Needs attention', value: data.summary.attention, accent: '#EF4444', icon: AlertTriangle },
  ], [colors.primary, data.summary])

  const summaryWidth = isDesktop ? '15.75%' : isTablet ? '31.8%' : '48%'

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{
          width: '100%',
          maxWidth: contentMaxWidth,
          alignSelf: 'center',
          paddingHorizontal: horizontalPadding,
          paddingVertical: 18,
          gap: 18,
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <TimelineHeader
          layout={layout}
          onLayoutChange={persistLayout}
          showLayoutToggle={prefsLoaded && isDesktop}
        />

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {summaryCards.map((card) => (
            <TimelineSummaryCard
              key={card.title}
              title={card.title}
              value={card.value}
              accent={card.accent}
              icon={card.icon}
              widthPct={summaryWidth}
            />
          ))}
        </View>

        <TimelineFilters
          search={search}
          onSearchChange={setSearch}
          status={status}
          onStatusChange={persistStatus}
          eventTypes={eventTypes}
          onEventTypesChange={persistEventTypes}
          dateRange={dateRange}
          onDateRangeChange={persistDateRange}
          sort={sort}
          onSortChange={persistSort}
        />

        {error && (
          <View style={{ borderRadius: 8, borderWidth: 1, borderColor: '#FCA5A5', backgroundColor: '#FEF2F2', padding: 12 }}>
            <Text style={{ color: '#B91C1C', fontSize: 13, fontWeight: '700' }}>{error}</Text>
          </View>
        )}

        {loading || !prefsLoaded ? (
          <TimelineSkeleton />
        ) : data.groups.length === 0 ? (
          <TimelineEmptyState />
        ) : (
          <View style={{ gap: 18 }}>
            {data.groups.map((group) => (
              <TimelineGroup
                key={group.label}
                group={group}
                layout={effectiveLayout}
                cardWidth={cardWidth}
                onSelectEvent={setSelectedEvent}
              />
            ))}
            {data.hasNextPage && (
              <TouchableOpacity
                onPress={loadMore}
                disabled={loadingMore}
                style={{
                  alignSelf: 'center',
                  borderRadius: 8,
                  backgroundColor: colors.primary,
                  paddingHorizontal: 18,
                  paddingVertical: 11,
                  opacity: loadingMore ? 0.7 : 1,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>
                  {loadingMore ? 'Loading more' : 'Load more'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      <TimelineDetailsDrawer
        visible={!!selectedEvent}
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </>
  )
}
