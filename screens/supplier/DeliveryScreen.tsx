import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import {
  fetchPurchaseOrdersForDelivery,
  startDelivery,
  markDelivered,
  type PurchaseOrder,
} from '@/services/supplierService'

const formatPHP = (amount: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)

type DeliveryStatus = 'SCHEDULED' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED'

const STATUS_COLORS: Record<DeliveryStatus, string> = { SCHEDULED: '#F59E0B', IN_TRANSIT: '#3B82F6', DELIVERED: '#22C55E', FAILED: '#EF4444' }
const STATUS_LABELS: Record<DeliveryStatus, string> = { SCHEDULED: 'Scheduled', IN_TRANSIT: 'In Transit', DELIVERED: 'Delivered', FAILED: 'Failed' }
const STATUS_ICONS: Record<DeliveryStatus, string> = { SCHEDULED: '📅', IN_TRANSIT: '🚚', DELIVERED: '✅', FAILED: '❌' }
const FILTERS: Array<DeliveryStatus | 'ALL'> = ['ALL', 'SCHEDULED', 'IN_TRANSIT', 'DELIVERED', 'FAILED']

interface DeliveryItem {
  poId: string
  poNumber: string
  buyerName: string
  outletName: string
  scheduledDate: string
  deliveredAt?: string | null
  status: DeliveryStatus
  driverName?: string | null
  driverContact?: string | null
  totalAmount: number
}

function mapPOToDelivery(po: PurchaseOrder): DeliveryItem | null {
  if (!po.delivery) return null
  return {
    poId: po.id,
    poNumber: po.poNumber,
    buyerName: po.buyerOrg.name,
    outletName: po.outlet.name,
    scheduledDate: po.delivery.scheduledDate,
    deliveredAt: po.delivery.deliveredAt,
    status: po.delivery.status,
    driverName: po.delivery.driverName,
    driverContact: po.delivery.driverContact,
    totalAmount: po.totalAmount,
  }
}

function DeliveryCard({ delivery, onMarkInTransit, onMarkDelivered }: { delivery: DeliveryItem; onMarkInTransit: () => void; onMarkDelivered: () => void }) {
  const { colors } = useTheme()
  const color = STATUS_COLORS[delivery.status]
  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 10, borderLeftWidth: 4, borderLeftColor: color }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{STATUS_ICONS[delivery.status]} {delivery.poNumber}</Text>
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>{delivery.buyerName}</Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>{delivery.outletName}</Text>
        </View>
        <View style={{ backgroundColor: color + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start' }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color }}>{STATUS_LABELS[delivery.status]}</Text>
        </View>
      </View>

      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 12, color: colors.textSecondary }}>
          📅 Scheduled: {new Date(delivery.scheduledDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
        </Text>
        {delivery.deliveredAt && (
          <Text style={{ fontSize: 12, color: '#22C55E' }}>
            ✅ Delivered: {new Date(delivery.deliveredAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
          </Text>
        )}
        {delivery.driverName && (
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>
            🧑 Driver: {delivery.driverName}{delivery.driverContact ? ` · ${delivery.driverContact}` : ''}
          </Text>
        )}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{formatPHP(delivery.totalAmount)}</Text>
        {delivery.status === 'SCHEDULED' && (
          <TouchableOpacity onPress={onMarkInTransit} style={{ backgroundColor: '#3B82F620', borderWidth: 1, borderColor: '#3B82F6', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#3B82F6' }}>Mark In Transit</Text>
          </TouchableOpacity>
        )}
        {delivery.status === 'IN_TRANSIT' && (
          <TouchableOpacity onPress={onMarkDelivered} style={{ backgroundColor: '#22C55E20', borderWidth: 1, borderColor: '#22C55E', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#22C55E' }}>Mark Delivered</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

export default function DeliveryScreen() {
  const { colors } = useTheme()
  const { user } = useAuth()
  const [filter, setFilter] = useState<DeliveryStatus | 'ALL'>('ALL')
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([])

  const load = async () => {
    if (!user?.orgId) return
    try {
      const pos = await fetchPurchaseOrdersForDelivery(user.orgId)
      setDeliveries(pos.map(mapPOToDelivery).filter(Boolean) as DeliveryItem[])
    } catch (e) {
      if (__DEV__) console.error('fetchPurchaseOrdersForDelivery error', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [user?.orgId])

  const filtered = filter === 'ALL' ? deliveries : deliveries.filter(d => d.status === filter)

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false) }

  const handleMarkInTransit = (d: DeliveryItem) => {
    Alert.alert('Mark as In Transit', `Mark delivery for ${d.poNumber} as in transit?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm', onPress: async () => {
          try {
            await startDelivery(d.poId)
            await load()
          } catch (e: any) {
            Alert.alert('Error', e.message ?? 'Failed.')
          }
        },
      },
    ])
  }

  const handleMarkDelivered = (d: DeliveryItem) => {
    Alert.alert('Confirm Delivery', `Mark ${d.poNumber} as delivered? This will update buyer stock if item mappings are configured.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delivered', onPress: async () => {
          try {
            await markDelivered(d.poId)
            await load()
          } catch (e: any) {
            Alert.alert('Error', e.message ?? 'Failed.')
          }
        },
      },
    ])
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: 16, gap: 4 }}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>Deliveries</Text>
        <Text style={{ fontSize: 13, color: colors.textSecondary }}>Manage and track your scheduled deliveries</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 8 }}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f} onPress={() => setFilter(f)}
            style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: filter === f ? colors.primary : colors.surface, borderWidth: 1, borderColor: filter === f ? colors.primary : colors.border }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: filter === f ? '#fff' : colors.textSecondary }}>
              {f === 'ALL' ? 'All' : STATUS_LABELS[f as DeliveryStatus]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {loading ? (
          [0, 1, 2].map(i => <View key={i} style={{ height: 120, backgroundColor: colors.surface, borderRadius: 12, opacity: 0.4 }} />)
        ) : filtered.length === 0 ? (
          <View style={{ alignItems: 'center', padding: 48, gap: 8 }}>
            <Text style={{ fontSize: 40 }}>🚚</Text>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>No deliveries</Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center' }}>
              {filter === 'ALL' ? 'Accepted purchase orders will generate deliveries here.' : `No ${STATUS_LABELS[filter as DeliveryStatus].toLowerCase()} deliveries.`}
            </Text>
          </View>
        ) : (
          filtered.map(d => (
            <DeliveryCard key={d.poId} delivery={d} onMarkInTransit={() => handleMarkInTransit(d)} onMarkDelivered={() => handleMarkDelivered(d)} />
          ))
        )}
      </ScrollView>
    </View>
  )
}
