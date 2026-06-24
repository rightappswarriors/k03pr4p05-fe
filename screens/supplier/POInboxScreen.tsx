import React, { useEffect, useState, useMemo, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  useWindowDimensions,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import {
  fetchPurchaseOrdersForSupplier,
  type PurchaseOrder,
  type POStatus,
} from '@/services/supplierService'

const STATUS_COLORS: Record<POStatus, string> = {
  PENDING:    '#F59E0B',
  ACCEPTED:   '#3B82F6',
  REJECTED:   '#EF4444',
  IN_TRANSIT: '#8B5CF6',
  DELIVERED:  '#22C55E',
  CANCELLED:  '#6B7280',
}

const STATUS_LABELS: Record<POStatus, string> = {
  PENDING:    'Pending',
  ACCEPTED:   'Accepted',
  REJECTED:   'Rejected',
  IN_TRANSIT: 'In Transit',
  DELIVERED:  'Delivered',
  CANCELLED:  'Cancelled',
}

const FILTER_OPTIONS: Array<POStatus | 'ALL'> = ['ALL', 'PENDING', 'ACCEPTED', 'IN_TRANSIT', 'DELIVERED']

// ---- Responsive breakpoints --------------------------------------------
const BREAKPOINTS = { tablet: 768, desktop: 1100 }
const VIEW_MODE_KEY = '@po_inbox_view_mode'
type ViewMode = 'cards' | 'table'

const formatPHP = (amount: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })

function StatusBadge({ status }: { status: POStatus }) {
  const color = STATUS_COLORS[status]
  return (
    <View style={{ backgroundColor: color + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start' }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color }}>{STATUS_LABELS[status]}</Text>
    </View>
  )
}

// ---- Card (mobile / compact) -------------------------------------------
function POCard({ po, onPress }: { po: PurchaseOrder; onPress: () => void }) {
  const { colors } = useTheme()
  const statusColor = STATUS_COLORS[po.status]
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 10, borderLeftWidth: 4, borderLeftColor: statusColor }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{po.poNumber}</Text>
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>{po.buyerOrg.name}</Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>{po.outlet.name}</Text>
        </View>
        <StatusBadge status={po.status} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 13, color: colors.textSecondary }}>
          {po.lineItems.length} {po.lineItems.length === 1 ? 'item' : 'items'}
        </Text>
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{formatPHP(po.totalAmount)}</Text>
      </View>
      <Text style={{ fontSize: 11, color: colors.textSecondary }}>{formatDate(po.createdAt)}</Text>
    </TouchableOpacity>
  )
}

// ---- Card grid (tablet, when in card mode) ------------------------------
function CardGrid({ orders, columns, onSelect }: { orders: PurchaseOrder[]; columns: number; onSelect: (id: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {orders.map(po => (
        <View key={po.id} style={{ width: columns > 1 ? `${100 / columns}%` : '100%', paddingRight: columns > 1 ? 6 : 0, paddingLeft: columns > 1 ? 6 : 0 }}>
          <POCard po={po} onPress={() => onSelect(po.id)} />
        </View>
      ))}
    </View>
  )
}

// ---- Table (tablet / desktop) ------------------------------------------
const TABLE_COLUMNS = [
  { key: 'po',     label: 'PO Number', flex: 1.3 },
  { key: 'buyer',  label: 'Buyer',     flex: 1.6 },
  { key: 'outlet', label: 'Outlet',    flex: 1.4 },
  { key: 'items',  label: 'Items',     flex: 0.7, align: 'center' as const },
  { key: 'total',  label: 'Total',     flex: 1,   align: 'right' as const },
  { key: 'date',   label: 'Date',      flex: 1 },
  { key: 'status', label: 'Status',    flex: 1 },
]

function POTable({ orders, onSelect }: { orders: PurchaseOrder[]; onSelect: (id: string) => void }) {
  const { colors } = useTheme()
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)

  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          paddingVertical: 12,
          paddingHorizontal: 16,
          backgroundColor: colors.background,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        {TABLE_COLUMNS.map(col => (
          <Text
            key={col.key}
            style={{
              flex: col.flex,
              fontSize: 12,
              fontWeight: '700',
              color: colors.textSecondary,
              textTransform: 'uppercase',
              letterSpacing: 0.4,
              textAlign: col.align ?? 'left',
            }}
          >
            {col.label}
          </Text>
        ))}
      </View>

      {/* Rows */}
      {orders.map((po, idx) => {
        const isHovered = hoveredRow === po.id
        const statusColor = STATUS_COLORS[po.status]
        return (
          <TouchableOpacity
            key={po.id}
            onPress={() => onSelect(po.id)}
            onPressIn={() => setHoveredRow(po.id)}
            onPressOut={() => setHoveredRow(null)}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 14,
              paddingHorizontal: 16,
              backgroundColor: isHovered ? colors.background : idx % 2 === 0 ? colors.surface : colors.background + '40',
              borderLeftWidth: 3,
              borderLeftColor: statusColor,
              borderBottomWidth: idx === orders.length - 1 ? 0 : 1,
              borderBottomColor: colors.border,
            }}
          >
            <Text style={{ flex: 1.3, fontSize: 14, fontWeight: '700', color: colors.text }}>{po.poNumber}</Text>
            <Text style={{ flex: 1.6, fontSize: 13, color: colors.text }} numberOfLines={1}>{po.buyerOrg.name}</Text>
            <Text style={{ flex: 1.4, fontSize: 13, color: colors.textSecondary }} numberOfLines={1}>{po.outlet.name}</Text>
            <Text style={{ flex: 0.7, fontSize: 13, color: colors.textSecondary, textAlign: 'center' }}>{po.lineItems.length}</Text>
            <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: colors.text, textAlign: 'right' }}>{formatPHP(po.totalAmount)}</Text>
            <Text style={{ flex: 1, fontSize: 13, color: colors.textSecondary }}>{formatDate(po.createdAt)}</Text>
            <View style={{ flex: 1 }}>
              <StatusBadge status={po.status} />
            </View>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

// ---- View toggle ---------------------------------------------------------
function ViewToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  const { colors } = useTheme()
  const options: Array<{ key: ViewMode; label: string }> = [
    { key: 'table', label: '☰  Table' },
    { key: 'cards', label: '▦  Cards' },
  ]
  return (
    <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 10, padding: 3, borderWidth: 1, borderColor: colors.border }}>
      {options.map(opt => {
        const active = mode === opt.key
        return (
          <TouchableOpacity
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderRadius: 8,
              backgroundColor: active ? colors.primary : 'transparent',
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#fff' : colors.textSecondary }}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

interface POInboxScreenProps {
  onSelectPO?: (poId: string) => void
}

export default function POInboxScreen({ onSelectPO }: POInboxScreenProps) {
  const { colors } = useTheme()
  const { user } = useAuth()
  const { width } = useWindowDimensions()

  const isTablet = width >= BREAKPOINTS.tablet
  const isDesktop = width >= BREAKPOINTS.desktop
  const cardColumns = isDesktop ? 3 : isTablet ? 2 : 1

  const [filter, setFilter] = useState<POStatus | 'ALL'>('ALL')
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const [viewModeLoaded, setViewModeLoaded] = useState(false)

  // Load persisted view-mode preference once on mount.
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(VIEW_MODE_KEY)
        if (saved === 'table' || saved === 'cards') {
          setViewMode(saved)
        } else {
          // Sensible default: table on larger screens, cards on phones.
          setViewMode(width >= BREAKPOINTS.tablet ? 'table' : 'cards')
        }
      } catch (e) {
        console.error('Failed to load view mode preference', e)
      } finally {
        setViewModeLoaded(true)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleViewModeChange = useCallback(async (mode: ViewMode) => {
    setViewMode(mode)
    try {
      await AsyncStorage.setItem(VIEW_MODE_KEY, mode)
    } catch (e) {
      console.error('Failed to persist view mode preference', e)
    }
  }, [])

  const load = async () => {
    if (!user?.orgId) return
    try {
      const data = await fetchPurchaseOrdersForSupplier(user.orgId)
      setOrders(data)
    } catch (e) {
      console.error('purchaseOrdersForSupplier error', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [user?.orgId])

  const filtered = useMemo(
    () => (filter === 'ALL' ? orders : orders.filter(o => o.status === filter)),
    [orders, filter]
  )

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const effectiveMode: ViewMode = isTablet ? viewMode : 'cards'
  const contentMaxWidth = isDesktop ? 1200 : undefined
  const horizontalPadding = isDesktop ? 32 : isTablet ? 24 : 16

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          paddingHorizontal: horizontalPadding,
          paddingTop: 16,
          paddingBottom: 4,
          width: '100%',
          maxWidth: contentMaxWidth,
          alignSelf: 'center',
          flexDirection: isTablet ? 'row' : 'column',
          justifyContent: 'space-between',
          alignItems: isTablet ? 'center' : 'flex-start',
          gap: 8,
        }}
      >
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: isDesktop ? 26 : 20, fontWeight: '800', color: colors.text }}>PO Inbox</Text>
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>Incoming purchase orders from your buyers</Text>
        </View>

        {/* Table/Cards toggle — only meaningful once there's room to show a table */}
        {isTablet && viewModeLoaded && (
          <ViewToggle mode={viewMode} onChange={handleViewModeChange} />
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: horizontalPadding,
          gap: 8,
          paddingVertical: 12,
          width: '100%',
          maxWidth: contentMaxWidth,
          alignSelf: 'center',
        }}
      >
        {FILTER_OPTIONS.map(f => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={{
              paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
              backgroundColor: filter === f ? colors.primary : colors.surface,
              borderWidth: 1, borderColor: filter === f ? colors.primary : colors.border,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: filter === f ? '#fff' : colors.textSecondary }}>
              {f === 'ALL' ? 'All' : STATUS_LABELS[f as POStatus]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: horizontalPadding,
          paddingBottom: 24,
          width: '100%',
          maxWidth: contentMaxWidth,
          alignSelf: 'center',
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading || !viewModeLoaded ? (
          <View style={{ gap: 12 }}>
            {[0, 1, 2].map(i => (
              <View key={i} style={{ height: 100, backgroundColor: colors.surface, borderRadius: 12, opacity: 0.4 }} />
            ))}
          </View>
        ) : filtered.length === 0 ? (
          <View style={{ alignItems: 'center', padding: 48, gap: 8 }}>
            <Text style={{ fontSize: 40 }}>📭</Text>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>No orders</Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center' }}>
              {filter === 'ALL'
                ? 'Purchase orders from your buyers will appear here.'
                : `No ${STATUS_LABELS[filter as POStatus].toLowerCase()} orders.`}
            </Text>
          </View>
        ) : effectiveMode === 'table' ? (
          <POTable orders={filtered} onSelect={(id) => onSelectPO?.(id)} />
        ) : (
          <CardGrid orders={filtered} columns={cardColumns} onSelect={(id) => onSelectPO?.(id)} />
        )}
      </ScrollView>
    </View>
  )
}