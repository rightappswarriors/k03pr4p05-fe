import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'
import {
  fetchPurchaseOrder,
  acceptPO,
  rejectPO,
  type PurchaseOrder,
  type POStatus,
} from '@/services/supplierService'

const formatPHP = (amount: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)

const STATUS_COLORS: Record<POStatus, string> = {
  PENDING:    '#F59E0B',
  ACCEPTED:   '#3B82F6',
  REJECTED:   '#EF4444',
  IN_TRANSIT: '#8B5CF6',
  DELIVERED:  '#22C55E',
  CANCELLED:  '#6B7280',
}

const STATUS_LABELS: Record<POStatus, string> = {
  PENDING:    'Pending Review',
  ACCEPTED:   'Accepted',
  REJECTED:   'Rejected',
  IN_TRANSIT: 'In Transit',
  DELIVERED:  'Delivered',
  CANCELLED:  'Cancelled',
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme()
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
      <Text style={{ fontSize: 13, color: colors.textSecondary, flex: 1 }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, flex: 2, textAlign: 'right' }}>{value}</Text>
    </View>
  )
}

interface PODetailScreenProps {
  poId?: string
  onBack?: () => void
  onAccepted?: () => void
  onRejected?: () => void
}

export default function PODetailScreen({ poId, onBack, onAccepted, onRejected }: PODetailScreenProps) {
  const { colors } = useTheme()
  const [po, setPo] = useState<PurchaseOrder | null>(null)
  const [loading, setLoading] = useState(!!poId)
  const [accepting, setAccepting] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [deliveryDate, setDeliveryDate] = useState('')
  const [driverName, setDriverName] = useState('')
  const [driverContact, setDriverContact] = useState('')

  useEffect(() => {
    if (!poId) return
    fetchPurchaseOrder(poId)
      .then(data => setPo(data))
      .catch(e => console.error('fetchPurchaseOrder error', e))
      .finally(() => setLoading(false))
  }, [poId])

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.primary} /></View>
  }

  if (!po) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.textSecondary }}>Select a purchase order to view details.</Text>
      </View>
    )
  }

  const isPending = po.status === 'PENDING'
  const statusColor = STATUS_COLORS[po.status]

  const handleAccept = async () => {
    if (!deliveryDate.trim()) {
      Alert.alert('Delivery Date Required', 'Please enter a delivery date (YYYY-MM-DD).')
      return
    }
    const isoDate = new Date(deliveryDate).toISOString()
    setAccepting(true)
    try {
      const updated = await acceptPO(po.id, isoDate, driverName || undefined, driverContact || undefined)
      setPo(updated)
      onAccepted?.()
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to accept PO.')
    } finally {
      setAccepting(false)
    }
  }

  const handleReject = () => {
    Alert.alert(
      'Reject Purchase Order',
      `Are you sure you want to reject ${po.poNumber}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setRejecting(true)
            try {
              const updated = await rejectPO(po.id)
              setPo(updated)
              onRejected?.()
            } catch (e: any) {
              Alert.alert('Error', e.message ?? 'Failed to reject PO.')
            } finally {
              setRejecting(false)
            }
          },
        },
      ]
    )
  }

  const inputStyle = { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, backgroundColor: colors.background, color: colors.text, fontSize: 14 }
  const labelStyle = { fontSize: 12, fontWeight: '600' as const, color: colors.textSecondary, marginBottom: 4 }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={{ padding: 4 }}>
            <Text style={{ fontSize: 20, color: colors.primary }}>←</Text>
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{po.poNumber}</Text>
          <View style={{ flexDirection: 'row', marginTop: 4 }}>
            <View style={{ backgroundColor: statusColor + '20', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: statusColor }}>{STATUS_LABELS[po.status]}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 10 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 4 }}>Order Information</Text>
        <InfoRow label="Buyer" value={po.buyerOrg.name} />
        <InfoRow label="Outlet" value={po.outlet.name} />
        <InfoRow label="Address" value={po.outlet.address} />
        {po.requestedDate && (
          <InfoRow label="Requested Date" value={new Date(po.requestedDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })} />
        )}
        <InfoRow label="Order Date" value={new Date(po.createdAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })} />
        {po.notes && <InfoRow label="Notes" value={po.notes} />}
      </View>

      <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 10 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 4 }}>Line Items ({po.lineItems.length})</Text>
        {po.lineItems.map((li, idx) => (
          <View key={li.id}>
            {idx > 0 && <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 8 }} />}
            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{li.supplierItem.name}</Text>
              {li.supplierItem.sku && <Text style={{ fontSize: 12, color: colors.textSecondary }}>SKU: {li.supplierItem.sku}</Text>}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, color: colors.textSecondary }}>{li.qty} {li.supplierItem.unit} × {formatPHP(li.unitPrice)}</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{formatPHP(li.subtotal)}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 8 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 4 }}>Summary</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>VAT (12% BIR)</Text>
          <Text style={{ fontSize: 13, color: colors.text }}>{formatPHP(po.vatAmount)}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>Total</Text>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.primary }}>{formatPHP(po.totalAmount)}</Text>
        </View>
      </View>

      {po.delivery && (
        <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 4 }}>Delivery Info</Text>
          <InfoRow label="Scheduled" value={new Date(po.delivery.scheduledDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })} />
          {po.delivery.driverName && <InfoRow label="Driver" value={po.delivery.driverName} />}
          {po.delivery.driverContact && <InfoRow label="Contact" value={po.delivery.driverContact} />}
          <InfoRow label="Status" value={po.delivery.status} />
        </View>
      )}

      {isPending && (
        <View style={{ gap: 10 }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 12 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Accept Details</Text>
            <View>
              <Text style={labelStyle}>Delivery Date * (YYYY-MM-DD)</Text>
              <TextInput value={deliveryDate} onChangeText={setDeliveryDate} placeholder="e.g. 2026-07-15" placeholderTextColor={colors.textSecondary} style={inputStyle} />
            </View>
            <View>
              <Text style={labelStyle}>Driver Name (optional)</Text>
              <TextInput value={driverName} onChangeText={setDriverName} placeholder="e.g. Juan dela Cruz" placeholderTextColor={colors.textSecondary} style={inputStyle} />
            </View>
            <View>
              <Text style={labelStyle}>Driver Contact (optional)</Text>
              <TextInput value={driverContact} onChangeText={setDriverContact} placeholder="e.g. 09171234567" placeholderTextColor={colors.textSecondary} style={inputStyle} keyboardType="phone-pad" />
            </View>
          </View>

          <TouchableOpacity onPress={handleAccept} disabled={accepting || rejecting}
            style={{ backgroundColor: '#22C55E', padding: 15, borderRadius: 10, alignItems: 'center', opacity: accepting || rejecting ? 0.6 : 1 }}>
            {accepting ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>✓ Accept PO</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={handleReject} disabled={accepting || rejecting}
            style={{ backgroundColor: '#EF444420', borderWidth: 1, borderColor: '#EF4444', padding: 15, borderRadius: 10, alignItems: 'center', opacity: accepting || rejecting ? 0.6 : 1 }}>
            {rejecting ? <ActivityIndicator color="#EF4444" /> : <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 15 }}>✗ Reject PO</Text>}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  )
}
