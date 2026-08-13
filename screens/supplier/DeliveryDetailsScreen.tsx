import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { ArrowLeft, MapPin, User, Package } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { DeliveryStatusBadge } from '@/components/supplier/delivery/DeliveryStatusBadge'
import { DeliveryTimeline } from '@/components/supplier/delivery/DeliveryTimeline'
import {
  fetchDeliveryByPOId,
  startDelivery,
  markDelivered,
  type DeliveryItem,
} from '@/services/supplierService/deliveryService'

const formatPHP = (amount: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)

function InfoRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme()
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
      <Text style={{ fontSize: 13, color: colors.textSecondary, flex: 1 }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, flex: 2, textAlign: 'right' }}>{value}</Text>
    </View>
  )
}

interface Props {
  poId: string
  onBack: () => void
  onUpdated?: () => void
}

export default function DeliveryDetailsScreen({ poId, onBack, onUpdated }: Props) {
  const { colors } = useTheme()
  const [delivery, setDelivery] = useState<DeliveryItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    try {
      const d = await fetchDeliveryByPOId(poId)
      setDelivery(d)
    } catch (e) {
      if (__DEV__) console.error('fetchDeliveryByPOId error', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [poId])

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.primary} /></View>
  }
  if (!delivery) {
    return <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.textSecondary }}>Delivery not found.</Text></View>
  }

  const handleMarkInTransit = () => {
    Alert.alert('Mark as In Transit', `Mark delivery for ${delivery.poNumber} as in transit?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: async () => { setBusy(true); try { await startDelivery(delivery.poId); await load(); onUpdated?.() } finally { setBusy(false) } } },
    ])
  }

  const handleMarkDelivered = () => {
    Alert.alert('Confirm Delivery', `Mark ${delivery.poNumber} as delivered?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delivered', onPress: async () => { setBusy(true); try { await markDelivered(delivery.poId); await load(); onUpdated?.() } finally { setBusy(false) } } },
    ])
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity onPress={onBack} style={{ padding: 4 }}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{delivery.poNumber}</Text>
          <View style={{ marginTop: 4 }}><DeliveryStatusBadge status={delivery.status} /></View>
        </View>
      </View>

      <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 10 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Delivery Timeline</Text>
        <DeliveryTimeline delivery={delivery} />
      </View>

      <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 10 }}>
        <InfoRow label="Buyer" value={delivery.buyerName} />
        <InfoRow label="Outlet" value={delivery.outletName} />
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
          <MapPin size={14} color={colors.textSecondary} style={{ marginTop: 2 }} />
          <Text style={{ fontSize: 13, color: colors.text, flex: 1 }}>{delivery.outletAddress}</Text>
        </View>
        {delivery.driverName && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <User size={14} color={colors.textSecondary} />
            <Text style={{ fontSize: 13, color: colors.text }}>{delivery.driverName}{delivery.driverContact ? ` · ${delivery.driverContact}` : ''}</Text>
          </View>
        )}
        {delivery.notes && <InfoRow label="Notes" value={delivery.notes} />}
        <View style={{ paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>Total</Text>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.primary }}>{formatPHP(delivery.totalAmount)}</Text>
        </View>
      </View>

      {/* TODO(backend): tracking/live-location integration — no field exists yet */}
      <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Package size={14} color={colors.textSecondary} />
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>Live Tracking</Text>
        </View>
        <Text style={{ fontSize: 12, color: colors.textSecondary }}>Not yet available.</Text>
      </View>

      {delivery.status === 'SCHEDULED' && (
        <TouchableOpacity onPress={handleMarkInTransit} disabled={busy} style={{ backgroundColor: '#3B82F6', padding: 15, borderRadius: 10, alignItems: 'center', opacity: busy ? 0.6 : 1 }}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Mark In Transit</Text>}
        </TouchableOpacity>
      )}
      {delivery.status === 'IN_TRANSIT' && (
        <TouchableOpacity onPress={handleMarkDelivered} disabled={busy} style={{ backgroundColor: '#22C55E', padding: 15, borderRadius: 10, alignItems: 'center', opacity: busy ? 0.6 : 1 }}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Mark Delivered</Text>}
        </TouchableOpacity>
      )}
    </ScrollView>
  )
}