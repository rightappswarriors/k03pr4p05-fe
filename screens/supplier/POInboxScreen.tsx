import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, useWindowDimensions, Alert } from 'react-native'
import { RefreshCcw, Download, ListChecks, Clock, CheckCircle2, Truck, Wallet } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import {
  fetchPurchaseOrdersForSupplier,
  rejectPO,
  type PurchaseOrder,
  type POStatus,
} from '@/services/supplierService/supplierService'
import { SectionHeader } from '@/components/supplier/purchase-order/SectionHeader'
import { OrderFilters, applyOrderFilters, type DateFilter, type SortOption } from '@/components/supplier/purchase-order/OrderFilters'
import { PurchaseOrderCard } from '@/components/supplier/purchase-order/PurchaseOrderCard'
import { EmptyOrdersCard } from '@/components/supplier/purchase-order/EmptyOrderCard'
import { OrderDetailsModal } from '@/components/supplier/purchase-order/OrderDetailsModal'
import { FadeInView } from '@/components/FadeInView'
import { OrderCardSkeletonList } from '@/components/LoadingSkeleton'
import { getOrderPriority } from '@/components/supplier/purchase-order/PriorityBadge'
import { getCardWidthPct, getKpiColumns, getUtilityColumns, SkeletonCard, StatCard } from './SupplierDashboardScreen'

const BREAKPOINTS = { tablet: 768, desktop: 1100 }

const formatPHP = (amount: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)

const isToday = (iso?: string | null) => {
  if (!iso) return false
  const d = new Date(iso)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

const PRIORITY_RANK: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 }

interface POInboxScreenProps {
  onNavigateMarketplace?: () => void
}

export default function POInboxScreen({ onNavigateMarketplace }: POInboxScreenProps) {
  const { colors } = useTheme()
  const { user } = useAuth()
  const { width } = useWindowDimensions()

  const cardColumns = getKpiColumns(width)
  const cardWidthPct = cardColumns === 1 ? '100%' : '49%'
  const kpiColumns = getKpiColumns(width)
  const kpiWidthPct = getCardWidthPct(kpiColumns)

  const gap = width >= BREAKPOINTS.tablet ? 16 : 12
  const horizontalPadding = width >= BREAKPOINTS.desktop ? 32 : width >= BREAKPOINTS.tablet ? 24 : 16
  const contentMaxWidth = width >= BREAKPOINTS.desktop ? 1680 : undefined
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<POStatus | 'ALL'>('ALL')
  const [dateFilter, setDateFilter] = useState<DateFilter>('ALL')
  const [sort, setSort] = useState<SortOption>('NEWEST')

  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const [activePO, setActivePO] = useState<PurchaseOrder | null>(null)
  const [modalVisible, setModalVisible] = useState(false)

  const load = useCallback(async () => {
    if (!user?.orgId) return
    try {
      const data = await fetchPurchaseOrdersForSupplier(user.orgId)
      setOrders(data)
    } catch (e) {
      if (__DEV__) console.error('purchaseOrdersForSupplier error', e)
    } finally {
      setLoading(false)
    }
  }, [user?.orgId])

  useEffect(() => { load() }, [load])

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  // ── KPIs computed from already-fetched data — no extra network call ──────
  const kpis = useMemo(() => {
    const pending = orders.filter((o) => o.status === 'PENDING').length
    const accepted = orders.filter((o) => o.status === 'ACCEPTED').length
    const deliveriesToday = orders.filter((o) => isToday(o.delivery?.scheduledDate)).length
    const revenueInPipeline = orders
      .filter((o) => !['DELIVERED', 'CANCELLED', 'REJECTED'].includes(o.status))
      .reduce((sum, o) => sum + o.totalAmount, 0)
    return { pending, accepted, deliveriesToday, revenueInPipeline }
  }, [orders])

  const filtered = useMemo(
    () => applyOrderFilters(orders, {
      search, status, dateFilter, sort,
      getPriorityRank: (o) => PRIORITY_RANK[getOrderPriority(o)],
    }),
    [orders, search, status, dateFilter, sort]
  )

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleBulkReject = () => {
    Alert.alert('Reject Selected Orders', `Reject ${selectedIds.size} order(s)? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject All', style: 'destructive',
        onPress: async () => {
          await Promise.all([...selectedIds].map((id) => rejectPO(id).catch(() => null)))
          setSelectedIds(new Set())
          setSelectionMode(false)
          load()
        },
      },
    ])
  }

  // TODO: bulk Accept needs a per-order delivery date — needs its own flow/modal.
  const handleBulkAccept = () => Alert.alert('Coming soon', 'Bulk accept requires setting a delivery date per order.')
  const handleBulkAssignDriver = () => Alert.alert('Coming soon', 'Driver assignment is not wired up yet.')
  const handleExport = () => Alert.alert('Coming soon', 'CSV export is not wired up yet.') // TODO(backend/export service)

  const openDetails = (po: PurchaseOrder) => { setActivePO(po); setModalVisible(true) }
  const handleQuickAccept = (po: PurchaseOrder) => openDetails(po) // delivery date is required, so route to the modal's Delivery tab
  const handleQuickReject = (po: PurchaseOrder) => {
    Alert.alert('Reject Purchase Order', `Reject ${po.poNumber}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: async () => { await rejectPO(po.id); load() } },
    ])
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: horizontalPadding, paddingVertical: 16, gap: 20, width: '100%', maxWidth: contentMaxWidth, alignSelf: 'center' }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <SectionHeader
          title="Purchase Orders"
          subtitle="Manage incoming orders, monitor fulfillment, and keep deliveries on schedule."
          right={
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={onRefresh} style={{ padding: 8, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                <RefreshCcw size={16} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleExport} style={{ padding: 8, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                <Download size={16} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setSelectionMode((v) => !v); setSelectedIds(new Set()) }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: 8, backgroundColor: selectionMode ? colors.primary : colors.surface, borderWidth: 1, borderColor: colors.border }}
              >
                <ListChecks size={16} color={selectionMode ? '#fff' : colors.text} />
              </TouchableOpacity>
            </View>
          }
        />

        {loading ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
            {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} widthPct={kpiWidthPct} />)}
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <FadeInView delay={0} style={{ width: kpiWidthPct }}>
              <StatCard title="Pending Orders" subtitle="" value={kpis.pending} accent="#F59E0B" icon={Clock} widthPct="100%" />
            </FadeInView>
            <FadeInView delay={40} style={{ width: kpiWidthPct }}>
              <StatCard title="Accepted Orders" subtitle={""} value={kpis.accepted} accent="#3B82F6" icon={CheckCircle2} widthPct="100%" />
            </FadeInView>
            <FadeInView delay={80} style={{ width: kpiWidthPct }}>
              <StatCard title="Deliveries Today" subtitle={""} value={kpis.deliveriesToday} accent="#8B5CF6" icon={Truck} widthPct="100%" />
            </FadeInView>
            <FadeInView delay={120} style={{ width: kpiWidthPct }}>
              <StatCard title="Revenue in Pipeline" subtitle={""} value={formatPHP(kpis.revenueInPipeline)} accent="#22C55E" icon={Wallet} widthPct="100%" />
            </FadeInView>
          </View>
        )}

        <OrderFilters
          search={search} onSearchChange={setSearch}
          status={status} onStatusChange={setStatus}
          dateFilter={dateFilter} onDateFilterChange={setDateFilter}
          sort={sort} onSortChange={setSort}
        />

        {selectionMode && selectedIds.size > 0 && (
          <View style={{ flexDirection: 'row', gap: 8, backgroundColor: colors.surface, padding: 12, borderRadius: 10, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginRight: 'auto' }}>
              {selectedIds.size} selected
            </Text>
            <TouchableOpacity onPress={handleBulkAccept} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#22C55E15' }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#22C55E' }}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleBulkReject} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#EF444415' }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#EF4444' }}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleBulkAssignDriver} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.background }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>Assign Driver</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleExport} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.background }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>Export</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading ? (
          <OrderCardSkeletonList />
        ) : filtered.length === 0 ? (
          <EmptyOrdersCard onRefresh={onRefresh} onMarketplace={onNavigateMarketplace} />
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
            {filtered.map((po, idx) => (
              <FadeInView key={po.id} delay={Math.min(idx, 8) * 30} style={{ width: cardWidthPct }}>
                <PurchaseOrderCard
                  po={po}
                  selected={selectedIds.has(po.id)}
                  selectionMode={selectionMode}
                  onPress={() => openDetails(po)}
                  onToggleSelect={() => toggleSelect(po.id)}
                  onAccept={() => handleQuickAccept(po)}
                  onReject={() => handleQuickReject(po)}
                />
              </FadeInView>
            ))}
          </View>
        )}
      </ScrollView>

      <OrderDetailsModal
        po={activePO}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onUpdated={(updated) => {
          setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))
          setActivePO(updated)
        }}
      />
    </View>
  )
}