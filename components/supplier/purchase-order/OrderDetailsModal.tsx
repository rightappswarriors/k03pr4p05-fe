import React, { useState } from 'react'
import { Modal, View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native'
import { X, LayoutGrid, Package, Building2, Truck, CreditCard, Activity as ActivityIcon } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { StatusBadge } from './StatusBadge'
import { OrderTimeline } from './OrderTimeline'
import {
  acceptPO,
  rejectPO,
  fetchPurchaseOrderActivity,
  type PurchaseOrder,
  type AuditLogEntry,
} from '@/services/supplierService/supplierService'

const formatPHP = (amount: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)

type TabKey = 'overview' | 'items' | 'buyer' | 'delivery' | 'payment' | 'activity'

const TABS: Array<{ key: TabKey; label: string; Icon: any }> = [
  { key: 'overview', label: 'Overview', Icon: LayoutGrid },
  { key: 'items', label: 'Items', Icon: Package },
  { key: 'buyer', label: 'Buyer', Icon: Building2 },
  { key: 'delivery', label: 'Delivery', Icon: Truck },
  { key: 'payment', label: 'Payment', Icon: CreditCard },
  { key: 'activity', label: 'Activity', Icon: ActivityIcon },
]

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
  po: PurchaseOrder | null
  visible: boolean
  onClose: () => void
  onUpdated: (po: PurchaseOrder) => void
}

export function OrderDetailsModal({ po, visible, onClose, onUpdated }: Props) {
  const { colors } = useTheme()
  const [tab, setTab] = useState<TabKey>('overview')
  const [accepting, setAccepting] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [deliveryDate, setDeliveryDate] = useState('')
  const [driverName, setDriverName] = useState('')
  const [driverContact, setDriverContact] = useState('')
  const [activity, setActivity] = useState<AuditLogEntry[] | null>(null)
  const [activityLoading, setActivityLoading] = useState(false)

  if (!po) return null

  const loadActivity = async () => {
    setActivityLoading(true)
    try {
      const entries = await fetchPurchaseOrderActivity(po.id)
      setActivity(entries)
    } catch (e) {
      if (__DEV__) console.error('fetchPurchaseOrderActivity error', e)
      setActivity([])
    } finally {
      setActivityLoading(false)
    }
  }

  const handleTabPress = (key: TabKey) => {
    setTab(key)
    if (key === 'activity' && activity === null) loadActivity()
  }

  const handleAccept = async () => {
    if (!deliveryDate.trim()) {
      Alert.alert('Delivery Date Required', 'Please enter a delivery date (YYYY-MM-DD).')
      return
    }
    setAccepting(true)
    try {
      const updated = await acceptPO(po.id, new Date(deliveryDate).toISOString(), driverName || undefined, driverContact || undefined)
      onUpdated(updated)
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to accept PO.')
    } finally {
      setAccepting(false)
    }
  }

  const handleReject = () => {
    Alert.alert('Reject Purchase Order', `Reject ${po.poNumber}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject', style: 'destructive',
        onPress: async () => {
          setRejecting(true)
          try {
            const updated = await rejectPO(po.id)
            onUpdated(updated)
          } catch (e: any) {
            Alert.alert('Error', e.message ?? 'Failed to reject PO.')
          } finally {
            setRejecting(false)
          }
        },
      },
    ])
  }

  const inputStyle = { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, backgroundColor: colors.background, color: colors.text, fontSize: 14 }
  const labelStyle = { fontSize: 12, fontWeight: '600' as const, color: colors.textSecondary, marginBottom: 4 }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{
          flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
          padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border,
        }}>
          <View>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{po.poNumber}</Text>
            <View style={{ marginTop: 4 }}><StatusBadge status={po.status} /></View>
          </View>
          <TouchableOpacity onPress={onClose} style={{ padding: 6 }}>
            <X size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ borderBottomWidth: 1, borderBottomColor: colors.border, flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 4 }}>
          {TABS.map(({ key, label, Icon }) => {
            const active = tab === key
            return (
              <TouchableOpacity
                key={key}
                onPress={() => handleTabPress(key)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  paddingVertical: 12, paddingHorizontal: 10,
                  borderBottomWidth: 2, borderBottomColor: active ? colors.primary : 'transparent',
                }}
              >
                <Icon size={14} color={active ? colors.primary : colors.textSecondary} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: active ? colors.primary : colors.textSecondary }}>{label}</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          {tab === 'overview' && (
            <>
              <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 10 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Order Timeline</Text>
                <OrderTimeline po={po} />
              </View>
              <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 8 }}>
                <InfoRow label="Buyer" value={po.buyerOrg.name} />
                <InfoRow label="Outlet" value={po.outlet.name} />
                <InfoRow label="Total" value={formatPHP(po.totalAmount)} />
                {po.notes && <InfoRow label="Notes" value={po.notes} />}
              </View>
            </>
          )}

          {tab === 'items' && (
            <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 10 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Line Items ({po.lineItems.length})</Text>
              {/* TODO(backend): SupplierItem has no image field — showing a placeholder icon slot until that exists */}
              {po.lineItems.map((li, idx) => (
                <View key={li.id}>
                  {idx > 0 && <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 8 }} />}
                  <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                    <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
                      <Package size={18} color={colors.textSecondary} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{li.supplierItem.name}</Text>
                      <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                        {li.qty} {li.supplierItem.unit} × {formatPHP(li.unitPrice)}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{formatPHP(li.subtotal)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {tab === 'buyer' && (
            <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 8 }}>
              <InfoRow label="Company" value={po.buyerOrg.name} />
              <InfoRow label="Outlet / Branch" value={po.outlet.name} />
              {/* TODO(backend): extend PURCHASE_ORDER_FIELDS' buyerOrg fragment with
                  contactNumber/email if you want them shown here — Organization
                  already has both fields, they're just not selected in the query yet. */}
              <Text style={{ fontSize: 11, color: colors.textSecondary, fontStyle: 'italic' }}>
                Contact details pending: extend buyerOrg query fragment.
              </Text>
            </View>
          )}

          {tab === 'delivery' && (
            <View style={{ gap: 16 }}>
              <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 8 }}>
                <InfoRow label="Address" value={po.outlet.address} />
                {po.delivery ? (
                  <>
                    <InfoRow label="Scheduled" value={new Date(po.delivery.scheduledDate).toLocaleDateString('en-PH')} />
                    <InfoRow label="Driver" value={po.delivery.driverName ?? '—'} />
                    <InfoRow label="Contact" value={po.delivery.driverContact ?? '—'} />
                    <InfoRow label="Status" value={po.delivery.status} />
                    {/* TODO(backend): no tracking/courier-integration field yet — placeholder */}
                    <InfoRow label="Tracking" value="Not yet available" />
                  </>
                ) : (
                  <Text style={{ fontSize: 13, color: colors.textSecondary }}>No delivery scheduled yet.</Text>
                )}
              </View>

              {po.status === 'PENDING' && (
                <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Accept & Schedule</Text>
                  <View>
                    <Text style={labelStyle}>Delivery Date * (YYYY-MM-DD)</Text>
                    <TextInput value={deliveryDate} onChangeText={setDeliveryDate} placeholder="2026-07-15" placeholderTextColor={colors.textSecondary} style={inputStyle} />
                  </View>
                  <View>
                    <Text style={labelStyle}>Driver Name (optional)</Text>
                    <TextInput value={driverName} onChangeText={setDriverName} placeholderTextColor={colors.textSecondary} style={inputStyle} />
                  </View>
                  <View>
                    <Text style={labelStyle}>Driver Contact (optional)</Text>
                    <TextInput value={driverContact} onChangeText={setDriverContact} keyboardType="phone-pad" placeholderTextColor={colors.textSecondary} style={inputStyle} />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity onPress={handleReject} disabled={accepting || rejecting}
                      style={{ flex: 1, backgroundColor: '#EF444420', borderWidth: 1, borderColor: '#EF4444', padding: 13, borderRadius: 10, alignItems: 'center', opacity: accepting || rejecting ? 0.6 : 1 }}>
                      {rejecting ? <ActivityIndicator color="#EF4444" /> : <Text style={{ color: '#EF4444', fontWeight: '700' }}>Reject</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleAccept} disabled={accepting || rejecting}
                      style={{ flex: 1, backgroundColor: '#22C55E', padding: 13, borderRadius: 10, alignItems: 'center', opacity: accepting || rejecting ? 0.6 : 1 }}>
                      {accepting ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Accept</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}

          {tab === 'payment' && (
            <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 8 }}>
              <InfoRow label="Status" value={po.status} />
              <InfoRow label="VAT (12% BIR)" value={formatPHP(po.vatAmount)} />
              <InfoRow label="Total" value={formatPHP(po.totalAmount)} />
              {/* TODO(backend): once Wallet/PaymentTransaction ship (Phase 3), surface
                  the actual settlement status here instead of just the PO status. */}
            </View>
          )}

          {tab === 'activity' && (
            <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 10 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Activity</Text>
              {activityLoading ? (
                <ActivityIndicator color={colors.primary} />
              ) : activity && activity.length > 0 ? (
                activity.map((entry) => (
                  <View key={entry.id} style={{ gap: 2 }}>
                    <Text style={{ fontSize: 13, color: colors.text }}>{entry.action} by {entry.userFullname ?? 'System'}</Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                      {new Date(entry.createdAt).toLocaleString('en-PH')}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={{ fontSize: 13, color: colors.textSecondary }}>No activity recorded yet.</Text>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  )
}