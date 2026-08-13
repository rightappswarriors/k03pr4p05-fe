import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, useWindowDimensions, Alert } from 'react-native'
import { RefreshCcw, Clock, CheckCircle2, XCircle, Package, Bell, Eye } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import {
  fetchSupplierRFQs,
} from '@/services/supplierService/supplierService'
import { SectionHeader } from '@/components/supplier/purchase-order/SectionHeader'
import { RfqCard } from '@/components/supplier/rfq/RfqCard'
import { RfqFilters, type RfqDateFilter, applyRfqFilters } from '@/components/supplier/rfq/RfqFilters'
import { RfqStatusBadge, RFQ_STATUS_COLORS } from '@/components/supplier/rfq/RfqStatusBadge'
import { FadeInView } from '@/components/FadeInView'
import type { RfqStatus, SupplierRfqInboxItem } from '@/types'

const BREAKPOINTS = { tablet: 768, desktop: 1100 }

// ─── Status groups using ACTUAL Prisma enum values ─────────────────────────────────
const RFQ_PENDING_STATUSES: RfqStatus[] = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'RFQ_RECEIVED', 'PENDING_SUPPLIER_RESPONSE']
const RFQ_NEGOTIATING_STATUSES: RfqStatus[] = ['NEGOTIATING', 'SUPPLIER_OFFERED', 'BUYER_COUNTERED', 'COUNTER_OFFERED', 'NEGOTIATION_COMPLETED']
const RFQ_ACCEPTED_STATUSES: RfqStatus[] = ['NEGOTIATION_ACCEPTED', 'AGENT_ACCEPTED_FINAL', 'SUPPLIER_ACCEPTED_FINAL', 'WAITING_SUPPLIER_CONFIRMATION', 'PO_CREATED']
const RFQ_CLOSED_STATUSES: RfqStatus[] = ['CANCELLED', 'EXPIRED']

function isStatusInGroup(status: string, group: RfqStatus[]): boolean {
  return group.includes(status as RfqStatus)
}

interface POInboxScreenProps {
  onRfqPress: (rfqId: string) => void
}

// ─── Layout helpers (kept local so this screen is self-contained) ──────────────────

function getKpiColumns(width: number): number {
  if (width >= BREAKPOINTS.desktop) return 5
  if (width >= BREAKPOINTS.tablet) return 3
  if (width >= 420) return 2
  return 2
}

// ─── Formatting helpers (shared by table and card) ─────────────────────────────────

const formatPHP = (amount: number | null | undefined) =>
  amount != null
    ? new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)
    : '—'

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })

const getTimeAgo = (iso: string) => {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 60) return `${diffMins}m`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d`
}

// ─── Stat Card (rebuilt: more breathing room, softer shadow, subtle accent glow) ───

function StatCard({
  title,
  value,
  accent,
  icon: Icon,
  width,
}: {
  title: string
  value: number | string
  accent: string
  icon: React.ComponentType<{ size?: number; color?: string }>
  width: number | string
}) {
  const { colors } = useTheme()
  return (
    <View
      style={{
        width,
        backgroundColor: colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 18,
        gap: 14,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 1,
      }}
    >
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: accent }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>{title}</Text>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            backgroundColor: `${accent}1A`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={16} color={accent} />
        </View>
      </View>
      <Text style={{ fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.5 }}>{value}</Text>
    </View>
  )
}

// ─── Skeleton primitives (replaces the cramped imported skeleton) ─────────────────

function SkeletonBlock({ width, height, radius = 8 }: { width: number | `${number}%`; height: number; radius?: number }) {
  const { colors } = useTheme()
  return (
    <View
      style={{
        width,
        height,
        borderRadius: radius,
        backgroundColor: colors.border,
        opacity: 0.6,
      }}
    />
  )
}

function SkeletonStatCard({ width }: { width: number | string }) {
  const { colors } = useTheme()
  return (
    <View
      style={{
        width,
        backgroundColor: colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 18,
        gap: 16,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <SkeletonBlock width={70} height={12} radius={6} />
        <SkeletonBlock width={34} height={34} radius={10} />
      </View>
      <SkeletonBlock width={56} height={26} radius={6} />
    </View>
  )
}

function SkeletonRfqCard() {
  const { colors } = useTheme()
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 20,
        gap: 18,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <SkeletonBlock width={90} height={16} radius={6} />
        <SkeletonBlock width={72} height={22} radius={11} />
      </View>
      <View style={{ gap: 8 }}>
        <SkeletonBlock width="55%" height={13} radius={6} />
        <SkeletonBlock width="35%" height={11} radius={6} />
      </View>
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        <SkeletonBlock width={52} height={52} radius={12} />
        <View style={{ flex: 1, gap: 8 }}>
          <SkeletonBlock width="70%" height={13} radius={6} />
          <SkeletonBlock width="40%" height={11} radius={6} />
        </View>
      </View>
      <View style={{ gap: 10 }}>
        <SkeletonBlock width="100%" height={11} radius={6} />
        <SkeletonBlock width="80%" height={11} radius={6} />
      </View>
    </View>
  )
}

function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View style={{ gap: 16 }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRfqCard key={i} />
      ))}
    </View>
  )
}

const RFQ_TABLE_COLUMNS: Record<string, { width: number; grow: number }> = {
  RFQ: { width: 110, grow: 0.6 },
  Agent: { width: 160, grow: 1.2 },
  Item: { width: 180, grow: 1.2 },
  Quantity: { width: 90, grow: 0.6 },
  'Requested Price': { width: 140, grow: 1 },
  'Expected Delivery': { width: 140, grow: 1 },
  Status: { width: 150, grow: 0.8 },
  'Last Activity': { width: 130, grow: 0.6 },
  Action: { width: 80, grow: 0 },
}

// ─── Desktop Table ─────────────────────────────────────────────────────────────────

function RfqDesktopTable({ rfqs, onRfqPress }: { rfqs: SupplierRfqInboxItem[]; onRfqPress: (rfqId: string) => void }) {
  const { colors } = useTheme()

  return (
    <View style={{ flex: 1, width: '100%', backgroundColor: colors.background }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1, width: '100%' }}
        contentContainerStyle={{ minWidth: '100%' }}
      >
        <View style={{ width: '100%' }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            backgroundColor: colors.surface,
            paddingVertical: 14,
            paddingHorizontal: 20,
            gap: 12,
            minWidth: 1100,
            width: '100%',
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}>
            {(['RFQ', 'Agent', 'Item', 'Quantity', 'Requested Price', 'Expected Delivery', 'Status', 'Last Activity', 'Action'] as const).map((label, i) => {
              const col = RFQ_TABLE_COLUMNS[label]
              return (
                <View key={i} style={{ flexGrow: col.grow, flexShrink: 0, flexBasis: col.width, minWidth: col.width, justifyContent: 'center' }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {label}
                  </Text>
                </View>
              )
            })}
          </View>

          {/* Body rows */}
          <View style={{ minWidth: 1100, width: '100%' }}>
            {rfqs.map((rfq, idx) => {
              const buyerName = rfq.agent?.fullname ?? 'Unknown Buyer'
              const buyerOrgName = rfq.agent?.organization?.name ?? `Org #${rfq.agent?.organizationId ?? '?'}`
              const productName = rfq.supplierItem?.name ?? 'Unknown Product'
              const productSku = rfq.supplierItem?.sku
              const qty = rfq.quantity ? Number(rfq.quantity) : 0
              const targetPrice = rfq.targetUnitPrice
              const expectedDelivery = rfq.expectedDeliveryDate ? formatDate(rfq.expectedDeliveryDate) : '—'
              const lastActivity = rfq.conversation?.updatedAt ?? rfq.latestMessage?.createdAt ?? rfq.updatedAt
              const lastActivityTime = lastActivity ? getTimeAgo(lastActivity) : '—'
              const hasUnread = (rfq.unreadCount ?? 0) > 0

              return (
                <TouchableOpacity
                  key={rfq.id}
                  onPress={() => onRfqPress(rfq.id)}
                  style={{
                    backgroundColor: idx % 2 === 0 ? colors.surface : colors.background,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                    paddingVertical: 14,
                    paddingHorizontal: 20,
                    flexDirection: 'row',
                    gap: 12,
                    alignItems: 'center',
                    minWidth: 1100,
                    width: '100%',
                  }}
                >
                  <View style={{ flexGrow: RFQ_TABLE_COLUMNS.RFQ.grow, flexShrink: 0, flexBasis: RFQ_TABLE_COLUMNS.RFQ.width, minWidth: RFQ_TABLE_COLUMNS.RFQ.width }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{rfq.rfqNumber}</Text>
                      {hasUnread && (
                        <View style={{
                          backgroundColor: colors.primary,
                          minWidth: 18,
                          height: 18,
                          borderRadius: 9,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <Text style={{ fontSize: 9, fontWeight: '700', color: '#fff' }}>
                            {rfq.unreadCount > 99 ? '99+' : rfq.unreadCount}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={{ flexGrow: RFQ_TABLE_COLUMNS.Agent.grow, flexShrink: 0, flexBasis: RFQ_TABLE_COLUMNS.Agent.width, minWidth: RFQ_TABLE_COLUMNS.Agent.width, gap: 2 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }} numberOfLines={1}>
                      {buyerName}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary }} numberOfLines={1}>
                      {buyerOrgName}
                    </Text>
                  </View>

                  <View style={{ flexGrow: RFQ_TABLE_COLUMNS.Item.grow, flexShrink: 0, flexBasis: RFQ_TABLE_COLUMNS.Item.width, minWidth: RFQ_TABLE_COLUMNS.Item.width, gap: 2 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }} numberOfLines={1}>
                      {productName}
                    </Text>
                    {productSku && (
                      <Text style={{ fontSize: 10, color: colors.textSecondary }}>SKU: {productSku}</Text>
                    )}
                  </View>

                  <View style={{ flexGrow: RFQ_TABLE_COLUMNS.Quantity.grow, flexShrink: 0, flexBasis: RFQ_TABLE_COLUMNS.Quantity.width, minWidth: RFQ_TABLE_COLUMNS.Quantity.width }}>
                    <Text style={{ fontSize: 12, color: colors.text }}>
                      {qty > 0 ? `${qty} ${rfq.supplierItem?.unit ?? 'pcs'}` : '—'}
                    </Text>
                  </View>

                  <View style={{ flexGrow: RFQ_TABLE_COLUMNS['Requested Price'].grow, flexShrink: 0, flexBasis: RFQ_TABLE_COLUMNS['Requested Price'].width, minWidth: RFQ_TABLE_COLUMNS['Requested Price'].width }}>
                    <Text style={{ fontSize: 12, color: colors.text }}>
                      {formatPHP(targetPrice)}
                    </Text>
                  </View>

                  <View style={{ flexGrow: RFQ_TABLE_COLUMNS['Expected Delivery'].grow, flexShrink: 0, flexBasis: RFQ_TABLE_COLUMNS['Expected Delivery'].width, minWidth: RFQ_TABLE_COLUMNS['Expected Delivery'].width }}>
                    <Text style={{ fontSize: 12, color: colors.text }}>
                      {expectedDelivery}
                    </Text>
                  </View>

                  <View style={{ flexGrow: RFQ_TABLE_COLUMNS.Status.grow, flexShrink: 0, flexBasis: RFQ_TABLE_COLUMNS.Status.width, minWidth: RFQ_TABLE_COLUMNS.Status.width }}>
                    <RfqStatusBadge status={rfq.status} size="sm" />
                  </View>

                  <View style={{ flexGrow: RFQ_TABLE_COLUMNS['Last Activity'].grow, flexShrink: 0, flexBasis: RFQ_TABLE_COLUMNS['Last Activity'].width, minWidth: RFQ_TABLE_COLUMNS['Last Activity'].width }}>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                      {lastActivityTime}
                    </Text>
                  </View>

                  <View style={{ flexGrow: RFQ_TABLE_COLUMNS.Action.grow, flexShrink: 0, flexBasis: RFQ_TABLE_COLUMNS.Action.width, minWidth: RFQ_TABLE_COLUMNS.Action.width, alignItems: 'flex-end' }}>
                    <View
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        backgroundColor: colors.background,
                        borderWidth: 1,
                        borderColor: colors.border,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Eye size={15} color={colors.textSecondary} />
                    </View>
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────────

export default function POInboxScreen({ onRfqPress }: POInboxScreenProps) {
  const { colors } = useTheme()
  const { user } = useAuth()
  const { width } = useWindowDimensions()

  const kpiColumns = getKpiColumns(width)
  const gap = width >= BREAKPOINTS.tablet ? 16 : 12
  // Tightened outer padding — content now sits closer to the edges.
  const horizontalPadding = width >= BREAKPOINTS.desktop ? 20 : width >= BREAKPOINTS.tablet ? 16 : 12
  const contentMaxWidth = width >= BREAKPOINTS.desktop ? 1680 : undefined
  // Minimum width per KPI card before it wraps to a new row. Sizing is left to
  // flexbox (flexGrow + minWidth) rather than a computed pixel width, because
  // this screen doesn't own the full window width — it renders inside a shell
  // with a sidebar, so `useWindowDimensions()` isn't the real available space.
  // flexGrow lets each card size itself against whatever container it actually
  // ends up in.
  const kpiMinWidth = kpiColumns >= 5 ? 170 : kpiColumns >= 3 ? 200 : 150

  const [rfqs, setRfqs] = useState<SupplierRfqInboxItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [dateFilter, setDateFilter] = useState<RfqDateFilter>('ALL')
  const [unreadOnly, setUnreadOnly] = useState(false)

  const isDesktop = width >= BREAKPOINTS.desktop

  const load = useCallback(async () => {
    if (!user?.orgId) return
    let dateFrom: string | null = null
    let dateTo: string | null = null
    const now = new Date()
    if (dateFilter === 'TODAY') {
      dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      dateTo = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()
    } else if (dateFilter === 'WEEK') {
      const day = now.getDay()
      dateFrom = new Date(now.getTime() - day * 24 * 60 * 60 * 1000).toISOString()
      dateTo = new Date().toISOString()
    } else if (dateFilter === 'MONTH') {
      dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      dateTo = new Date().toISOString()
    }

    const status = statusFilter === 'ALL' ? undefined : statusFilter
    try {
      const data = await fetchSupplierRFQs(user.orgId, {
        status: status ?? null,
        search: search || null,
        unreadOnly: unreadOnly ? true : null,
        dateFrom: dateFrom,
        dateTo: dateTo,
      })
      setRfqs(data)
    } catch (e: any) {
      if (__DEV__) console.error('fetchSupplierRFQs error', e)
      Alert.alert('Error', e.message ?? 'Failed to load RFQs.')
    } finally {
      setLoading(false)
    }
  }, [user?.orgId, search, statusFilter, dateFilter, unreadOnly])

  useEffect(() => { load() }, [load])

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const unreadPredicate = (rfq: SupplierRfqInboxItem) => (rfq.unreadCount ?? 0) > 0

  // List actually rendered — respects the selected status tab.
  const filtered = useMemo(
    () => applyRfqFilters(rfqs, {
      search, statusFilter, dateFilter, unreadOnly, unreadPredicate,
    }),
    [rfqs, search, statusFilter, dateFilter, unreadOnly]
  )

  // ─── FIX: KPI counts must NOT collapse to 0 when a status tab is selected. ───────
  // Previously, pending/negotiating/accepted/closed counts were derived from
  // `filtered`, which already had the active tab's statusFilter applied — so
  // selecting e.g. "Negotiating" zeroed out every other card. KPIs should always
  // reflect the full picture (respecting only search/date/unread), independent
  // of which status tab is currently active.
  const filteredForCounts = useMemo(
    () => applyRfqFilters(rfqs, {
      search, statusFilter: 'ALL', dateFilter, unreadOnly, unreadPredicate,
    }),
    [rfqs, search, dateFilter, unreadOnly]
  )

  const pendingRfqs = useMemo(() => filteredForCounts.filter((r) => isStatusInGroup(r.status, RFQ_PENDING_STATUSES)), [filteredForCounts])
  const negotiatingRfqs = useMemo(() => filteredForCounts.filter((r) => isStatusInGroup(r.status, RFQ_NEGOTIATING_STATUSES)), [filteredForCounts])
  const acceptedRfqs = useMemo(() => filteredForCounts.filter((r) => isStatusInGroup(r.status, RFQ_ACCEPTED_STATUSES)), [filteredForCounts])
  const closedRfqs = useMemo(() => filteredForCounts.filter((r) => isStatusInGroup(r.status, RFQ_CLOSED_STATUSES)), [filteredForCounts])

  const totalUnread = useMemo(() => filteredForCounts.reduce((sum, r) => sum + (r.unreadCount ?? 0), 0), [filteredForCounts])
  const totalPending = pendingRfqs.length
  const totalNegotiating = negotiatingRfqs.length
  const totalAccepted = acceptedRfqs.length
  const totalClosed = closedRfqs.length

  // Sectioned groups for the mobile view respect the active tab, same as before,
  // but now sourced consistently from `filtered`.
  const sectionPending = useMemo(() => filtered.filter((r) => isStatusInGroup(r.status, RFQ_PENDING_STATUSES)), [filtered])
  const sectionNegotiating = useMemo(() => filtered.filter((r) => isStatusInGroup(r.status, RFQ_NEGOTIATING_STATUSES)), [filtered])
  const sectionAccepted = useMemo(() => filtered.filter((r) => isStatusInGroup(r.status, RFQ_ACCEPTED_STATUSES)), [filtered])
  const sectionClosed = useMemo(() => filtered.filter((r) => isStatusInGroup(r.status, RFQ_CLOSED_STATUSES)), [filtered])

  const handleCardPress = (rfq: SupplierRfqInboxItem) => {
    onRfqPress(rfq.id)
  }

  const renderSection = (rfqs: SupplierRfqInboxItem[], emptyMsg: string) => {
    if (rfqs.length === 0) {
      return (
        <View style={{ alignItems: 'center', paddingVertical: 32, gap: 10 }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
            <Package size={22} color={colors.textSecondary} />
          </View>
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>{emptyMsg}</Text>
        </View>
      )
    }
    return (
      <View style={{ gap: 14 }}>
        {rfqs.map((rfq, idx) => (
          <FadeInView key={rfq.id} delay={Math.min(idx, 6) * 30}>
            <RfqCard rfq={rfq} onPress={() => handleCardPress(rfq)} />
          </FadeInView>
        ))}
      </View>
    )
  }

  const kpiRow = (
    loading ? (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} style={{ flexGrow: 1, flexBasis: kpiMinWidth, minWidth: kpiMinWidth }}>
            <SkeletonStatCard width="100%" />
          </View>
        ))}
      </View>
    ) : (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
        <FadeInView delay={0} style={{ flexGrow: 1, flexBasis: kpiMinWidth, minWidth: kpiMinWidth }}>
          <StatCard title="Pending" value={totalPending} accent={RFQ_STATUS_COLORS.SUBMITTED} icon={Clock} width="100%" />
        </FadeInView>
        <FadeInView delay={40} style={{ flexGrow: 1, flexBasis: kpiMinWidth, minWidth: kpiMinWidth }}>
          <StatCard title="Negotiating" value={totalNegotiating} accent={RFQ_STATUS_COLORS.NEGOTIATING} icon={CheckCircle2} width="100%" />
        </FadeInView>
        <FadeInView delay={80} style={{ flexGrow: 1, flexBasis: kpiMinWidth, minWidth: kpiMinWidth }}>
          <StatCard title="Accepted" value={totalAccepted} accent={RFQ_STATUS_COLORS.NEGOTIATION_ACCEPTED} icon={Package} width="100%" />
        </FadeInView>
        <FadeInView delay={120} style={{ flexGrow: 1, flexBasis: kpiMinWidth, minWidth: kpiMinWidth }}>
          <StatCard title="Closed" value={totalClosed} accent={RFQ_STATUS_COLORS.CANCELLED} icon={XCircle} width="100%" />
        </FadeInView>
        <FadeInView delay={160} style={{ flexGrow: 1, flexBasis: kpiMinWidth, minWidth: kpiMinWidth }}>
          <StatCard title="Unread" value={totalUnread > 99 ? '99+' : totalUnread} accent={colors.primary} icon={Bell} width="100%" />
        </FadeInView>
      </View>
    )
  )

  // ─── Desktop: flat table with all RFQs ─────────────────────────────────────────
  if (isDesktop) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{
          paddingHorizontal: horizontalPadding,
          paddingVertical: 16,
          gap: 18,
          maxWidth: contentMaxWidth,
          alignSelf: 'center',
          width: '100%',
        }}>
          <SectionHeader
            title="RFQ Inbox"
            subtitle="Review RFQs from buyers, negotiate offers, and create purchase orders."
            right={
              <TouchableOpacity onPress={onRefresh} style={{ padding: 8, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                <RefreshCcw size={16} color={colors.text} />
              </TouchableOpacity>
            }
          />

          {kpiRow}

          <RfqFilters
            search={search} onSearchChange={setSearch}
            statusFilter={statusFilter} onStatusChange={setStatusFilter}
            dateFilter={dateFilter} onDateFilterChange={setDateFilter}
            unreadOnly={unreadOnly} onUnreadOnlyChange={setUnreadOnly}
          />

          {loading ? (
            <SkeletonList count={4} />
          ) : filtered.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 48, gap: 10 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                <Package size={26} color={colors.textSecondary} />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>No RFQs match your filters</Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>Try adjusting your search or filters.</Text>
            </View>
          ) : (
            <View style={{ backgroundColor: colors.surface, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
              <RfqDesktopTable rfqs={filtered} onRfqPress={onRfqPress} />
            </View>
          )}
        </View>
      </View>
    )
  }

  // ─── Mobile/Tablet: card layout ─────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: horizontalPadding,
          paddingVertical: 16,
          gap: 18,
          width: '100%',
          maxWidth: contentMaxWidth,
          alignSelf: 'center',
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <SectionHeader
          title="RFQ Inbox"
          subtitle="Review RFQs from buyers, negotiate offers, and create purchase orders."
          right={
            <TouchableOpacity onPress={onRefresh} style={{ padding: 8, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
              <RefreshCcw size={16} color={colors.text} />
            </TouchableOpacity>
          }
        />

        {kpiRow}

        <RfqFilters
          search={search} onSearchChange={setSearch}
          statusFilter={statusFilter} onStatusChange={setStatusFilter}
          dateFilter={dateFilter} onDateFilterChange={setDateFilter}
          unreadOnly={unreadOnly} onUnreadOnlyChange={setUnreadOnly}
        />

        {loading ? (
          <SkeletonList count={3} />
        ) : (
          <View style={{ gap: 24 }}>
            <View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 10 }}>
                Pending RFQs ({totalPending})
              </Text>
              {renderSection(sectionPending, 'No pending RFQs.')}
            </View>

            <View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 10 }}>
                Negotiating ({totalNegotiating})
              </Text>
              {renderSection(sectionNegotiating, 'No RFQs in negotiation.')}
            </View>

            <View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 10 }}>
                Accepted ({totalAccepted})
              </Text>
              {renderSection(sectionAccepted, 'No accepted RFQs.')}
            </View>

            <View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 10 }}>
                Closed ({totalClosed})
              </Text>
              {renderSection(sectionClosed, 'No closed RFQs.')}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  )
}