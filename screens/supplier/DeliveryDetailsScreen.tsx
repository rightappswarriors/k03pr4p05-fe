import React, { useCallback, useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native'
import { ArrowLeft, MapPin, User, Package, Truck, CircleCheck, AlertTriangle, FileText } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import {
  fetchDeliveryByPOId,
  startDelivery,
  markDelivered,
  type DeliveryItem,
} from '@/services/supplierService/deliveryService'
import { DeliveryAgreementCountdown } from '@/components/DeliveryAgreementCountdown'

const formatPHP = (amount: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)

// Status-specific accent colors. Kept separate from the theme because each
// state (scheduled / in transit / delivered) needs a fixed, recognizable
// color regardless of light/dark theme.
const STATUS_COLORS: Record<string, { fg: string; bg: string }> = {
  SCHEDULED: { fg: '#F5A623', bg: 'rgba(245,166,35,0.14)' },
  IN_TRANSIT: { fg: '#4C8DFF', bg: 'rgba(76,141,255,0.14)' },
  DELIVERED: { fg: '#34D399', bg: 'rgba(52,211,153,0.14)' },
}

function StatusPill({ status }: { status: string }) {
  const tone = STATUS_COLORS[status] ?? STATUS_COLORS.SCHEDULED
  const label = status.charAt(0) + status.slice(1).toLowerCase().replace('_', ' ')
  return (
    <View style={[styles.pill, { backgroundColor: tone.bg }]}>
      <View style={[styles.pillDot, { backgroundColor: tone.fg }]} />
      <Text style={[styles.pillText, { color: tone.fg }]}>{label}</Text>
    </View>
  )
}

const STEPS = [
  { key: 'SCHEDULED', label: 'Scheduled' },
  { key: 'IN_TRANSIT', label: 'In Transit' },
  { key: 'DELIVERED', label: 'Delivered' },
] as const

function DeliveryStepper({ delivery }: { delivery: DeliveryItem }) {
  const { colors } = useTheme()
  const activeIndex = STEPS.findIndex((s) => s.key === delivery.status)

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, marginBottom: 14 }]}>
      <View style={styles.stepperRow}>
        <View style={[styles.connector, { backgroundColor: colors.border }]} />
        <View
          style={[
            styles.connectorFill,
            {
              backgroundColor: '#34D399',
              width: activeIndex <= 0 ? '0%' : activeIndex === 1 ? '50%' : '100%',
            },
          ]}
        />
        {STEPS.map((step, i) => {
          const done = i < activeIndex
          const current = i === activeIndex
          const tone = done ? '#34D399' : current ? STATUS_COLORS[step.key].fg : colors.textSecondary
          const timestamp = i === 0 ? delivery.scheduledAt : i === 1 ? delivery.dispatchedAt : delivery.deliveredAt

          return (
            <View key={step.key} style={styles.stepItem}>
              <View
                style={[
                  styles.stepIcon,
                  {
                    borderColor: done || current ? tone : colors.border,
                    backgroundColor: done ? tone : colors.background,
                  },
                ]}
              >
                {done ? (
                  <CircleCheck size={16} color={colors.background} strokeWidth={2.5} />
                ) : step.key === 'IN_TRANSIT' ? (
                  <Truck size={14} color={tone} />
                ) : (
                  <View style={[styles.stepDot, { backgroundColor: current ? tone : colors.border }]} />
                )}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  { color: done || current ? colors.text : colors.textSecondary, fontWeight: done || current ? '700' : '500' },
                ]}
              >
                {step.label}
              </Text>
              <Text style={[styles.stepTime, { color: colors.textSecondary }]}>{timestamp ?? '—'}</Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

function InfoRow({ icon, label, value, isLast }: { icon?: React.ReactNode; label: string; value: string; isLast?: boolean }) {
  const { colors } = useTheme()
  return (
    <View style={[styles.infoRow, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      <View style={styles.infoLabelWrap}>
        {icon}
        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
      </View>
      <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={2}>{value}</Text>
    </View>
  )
}

interface Props {
  poId: string
  initialDelivery?: DeliveryItem | null
  onBack: () => void
  onRefreshCanonical?: (poId: string) => Promise<DeliveryItem | null>
  onViewPurchaseOrder?: (poId: string) => void
  canEdit?: boolean
}

export default function DeliveryDetailsScreen({ poId, initialDelivery, onBack, onRefreshCanonical, onViewPurchaseOrder, canEdit = false }: Props) {
  const { colors } = useTheme()
  const [delivery, setDelivery] = useState<DeliveryItem | null>(initialDelivery ?? null)
  const [loading, setLoading] = useState(!initialDelivery)
  const [busy, setBusy] = useState<'in_transit' | 'delivered' | null>(null)

  const load = useCallback(async () => {
    try {
      const d = onRefreshCanonical ? await onRefreshCanonical(poId) : await fetchDeliveryByPOId(poId)
      setDelivery(d)
    } catch (e) {
      if (__DEV__) console.error('fetchDeliveryByPOId error', e)
    } finally {
      setLoading(false)
    }
  }, [onRefreshCanonical, poId])

  useEffect(() => { load() }, [load])
  useEffect(() => { if (initialDelivery) setDelivery(initialDelivery) }, [initialDelivery])

  if (loading) {
    return (
      <View style={[styles.centerFill, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }
  if (!delivery) {
    return (
      <View style={[styles.centerFill, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>Delivery not found.</Text>
      </View>
    )
  }

  const handleMarkInTransit = () => {
    Alert.alert('Mark as In Transit', `Mark delivery for ${delivery.poNumber} as in transit?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: async () => { setBusy('in_transit'); try { await startDelivery(delivery.poId); await load() } catch (e: any) { Alert.alert('Unable to start delivery', e.message ?? 'No delivery state was changed.') } finally { setBusy(null) } } },
    ])
  }

  const handleMarkDelivered = () => {
    Alert.alert('Confirm Delivery', `Mark ${delivery.poNumber} as delivered?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delivered', onPress: async () => { setBusy('delivered'); try { await markDelivered(delivery.poId); await load() } catch (e: any) { Alert.alert('Unable to complete delivery', e.message ?? 'No delivery or inventory state was changed.') } finally { setBusy(null) } } },
    ])
  }

  const handleViewPurchaseOrder = () => {
    const exactPoId = delivery.poId?.trim()
    if (!exactPoId) {
      Alert.alert('Purchase order unavailable', 'Purchase order details are unavailable.')
      return
    }
    onViewPurchaseOrder?.(exactPoId)
  }

  const isCancelled = delivery.status === 'CANCELLED' || delivery.poStatus === 'CANCELLED'
  const cancellationPending = delivery.cancellationStatus === 'REQUESTED'
  const agreementPending = delivery.deliveryDateAgreementStatus !== 'AGREED'
  const scheduledAndBlocked = delivery.status === 'SCHEDULED' && (delivery.poStatus !== 'READY_FOR_DISPATCH' || agreementPending)
  const showPurchaseOrderCard = isCancelled || cancellationPending || scheduledAndBlocked || delivery.status === 'DELIVERED'

  const blocker = isCancelled
    ? {
        title: 'Order cancelled',
        description: 'This delivery is no longer active because the purchase order was cancelled.',
        tone: '#EF4444',
      }
    : cancellationPending
      ? {
          title: 'Cancellation request pending',
          description: 'This delivery cannot advance while the order cancellation request is being reviewed.',
          tone: '#F5A623',
        }
      : agreementPending
        ? {
            title: `Delivery schedule awaiting ${delivery.deliveryDateAgreementStatus === 'PENDING_BUYER' ? 'Buyer' : 'Supplier'} confirmation`,
            description: 'Open the purchase order to review or respond to the proposed delivery date.',
            tone: '#F5A623',
          }
      : delivery.poStatus === 'PREPARING'
        ? {
            title: 'Order is being prepared',
            description: 'Mark the purchase order Ready for Dispatch before starting this delivery.',
            tone: '#F5A623',
          }
        : delivery.poStatus === 'SUPPLIER_ACCEPTED'
          ? {
              title: 'Waiting for order preparation',
              description: 'Prepare the purchase order before this delivery can be dispatched.',
              tone: '#F5A623',
            }
          : delivery.status === 'DELIVERED'
            ? {
                title: 'Delivery completed',
                description: 'This delivery is complete. View the purchase order for the full order history.',
                tone: '#34D399',
              }
            : {
                title: 'Waiting for order preparation',
                description: 'This delivery cannot be marked In Transit until the purchase order is Ready for Dispatch.',
                tone: '#F5A623',
              }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.scrollContent}>
      <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={[styles.backButton, { backgroundColor: colors.surface }]}>
          <ArrowLeft size={18} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.poNumber, { color: colors.text }]}>{delivery.poNumber}</Text>
          <View style={{ marginTop: 6 }}>
            <StatusPill status={delivery.status} />
          </View>
        </View>
      </View>

      <DeliveryStepper delivery={delivery} />

      {delivery.deliveryDateAgreementMethod === 'AUTO_BUYER_TIMEOUT' && delivery.deliveryDateAgreementStatus === 'AGREED' ? <View style={[styles.banner, { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }]}><CircleCheck size={18} color="#15803D" /><View style={{ flex: 1 }}><Text style={[styles.bannerTitle, { color: '#15803D' }]}>Delivery schedule agreed automatically</Text><Text style={[styles.bannerText, { color: '#166534' }]}>The Buyer response period expired. Normal fulfillment requirements still apply.</Text></View></View> : null}

      {delivery.cancellationStatus === 'REQUESTED' && (
        <View style={styles.banner}>
          <AlertTriangle size={18} color="#F5A623" style={{ marginTop: 1 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Cancellation requested</Text>
            <Text style={styles.bannerText}>Review the request from Purchase Order details before continuing fulfillment.</Text>
          </View>
        </View>
      )}

      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Order details</Text>
        <InfoRow icon={<User size={13} color={colors.textSecondary} />} label="Buyer" value={delivery.buyerName} />
        <InfoRow label="Outlet" value={delivery.outletName} />
        <InfoRow icon={<MapPin size={13} color={colors.textSecondary} />} label="Address" value={delivery.outletAddress} />
        {delivery.driverName && (
          <InfoRow label="Driver" value={`${delivery.driverName}${delivery.driverContact ? ` · ${delivery.driverContact}` : ''}`} />
        )}
        <InfoRow label="Notes" value={delivery.notes ?? '—'} isLast />
      </View>

      <View style={[styles.totalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Order total</Text>
        <Text style={[styles.totalValue, { color: colors.primary }]}>{formatPHP(delivery.totalAmount)}</Text>
      </View>

      {/* TODO(backend): tracking/live-location integration — no field exists yet */}
      <View style={[styles.trackingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.trackingIcon, { backgroundColor: colors.background }]}>
          <Package size={16} color={colors.textSecondary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.trackingTitle, { color: colors.text }]}>Live tracking</Text>
          <Text style={[styles.trackingSub, { color: colors.textSecondary }]}>Not yet available for this delivery</Text>
        </View>
      </View>

      {canEdit && delivery.status === 'SCHEDULED' && delivery.poStatus === 'READY_FOR_DISPATCH' && delivery.deliveryDateAgreementStatus === 'AGREED' && delivery.cancellationStatus !== 'REQUESTED' && delivery.poStatus !== 'CANCELLED' && (
        <TouchableOpacity onPress={handleMarkInTransit} disabled={Boolean(busy)} style={[styles.cta, { backgroundColor: '#4C8DFF', opacity: busy ? 0.6 : 1 }]}>
          {busy === 'in_transit' ? <ActivityIndicator color="#fff" /> : (
            <>
              <Truck size={17} color="#fff" />
              <Text style={styles.ctaText}>Mark In Transit</Text>
            </>
          )}
        </TouchableOpacity>
      )}
      {canEdit && delivery.status === 'IN_TRANSIT' && !cancellationPending && !isCancelled && (
        <TouchableOpacity onPress={handleMarkDelivered} disabled={Boolean(busy)} style={[styles.cta, { backgroundColor: '#34D399', opacity: busy ? 0.6 : 1 }]}>
          {busy === 'delivered' ? <ActivityIndicator color="#06281c" /> : (
            <>
              <CircleCheck size={17} color="#06281c" />
              <Text style={[styles.ctaText, { color: '#06281c' }]}>Mark Delivered</Text>
            </>
          )}
        </TouchableOpacity>
      )}
      {showPurchaseOrderCard && (
        <View style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.actionIcon, { backgroundColor: `${blocker.tone}18` }]}>
            {isCancelled ? <AlertTriangle size={18} color={blocker.tone} /> : <FileText size={18} color={blocker.tone} />}
          </View>
          <View style={styles.actionCopy}>
            <Text style={[styles.actionTitle, { color: colors.text }]}>{blocker.title}</Text>
            <Text style={[styles.actionDescription, { color: colors.textSecondary }]}>{blocker.description}</Text>
            {agreementPending && delivery.deliveryDateAgreementStatus === 'PENDING_BUYER' && delivery.deliveryDateResponseDeadlineAt ? <View style={{ marginTop: 8 }}><DeliveryAgreementCountdown deadline={delivery.deliveryDateResponseDeadlineAt} audience="DELIVERY" color="#B45309" onExpired={() => void load()} /></View> : null}
            {onViewPurchaseOrder && (
              <TouchableOpacity onPress={handleViewPurchaseOrder} style={[styles.poButton, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <FileText size={15} color={colors.primary} />
                <Text style={[styles.poButtonText, { color: colors.primary }]}>View Purchase Order</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  // scrollContent centers the column on wide/web viewports; container caps
  // the line length so cards don't stretch edge-to-edge on tablet/desktop.
  scrollContent: { flexGrow: 1, alignItems: 'center', padding: 16, paddingBottom: 32 },
  container: { width: '100%', maxWidth: 480 },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  backButton: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  poNumber: { fontSize: 21, fontWeight: '800', letterSpacing: -0.3 },

  pill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 100 },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 12.5, fontWeight: '700' },

  card: { borderRadius: 20, padding: 18, marginBottom: 14 },
  cardTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },

  stepperRow: { flexDirection: 'row', justifyContent: 'space-between', position: 'relative', paddingTop: 4 },
  connector: { position: 'absolute', top: 20, left: '17%', right: '17%', height: 2, borderRadius: 1 },
  connectorFill: { position: 'absolute', top: 20, left: '17%', height: 2, borderRadius: 1 },
  stepItem: { flex: 1, alignItems: 'center', gap: 6, zIndex: 1 },
  stepIcon: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  stepDot: { width: 6, height: 6, borderRadius: 3 },
  stepLabel: { fontSize: 12.5, textAlign: 'center' },
  stepTime: { fontSize: 10.5, textAlign: 'center' },

  banner: { flexDirection: 'row', gap: 10, backgroundColor: 'rgba(245,166,35,0.12)', borderWidth: 1, borderColor: 'rgba(245,166,35,0.3)', borderRadius: 16, padding: 14, marginBottom: 14 },
  bannerTitle: { fontSize: 13.5, fontWeight: '700', color: '#F5A623', marginBottom: 3 },
  bannerText: { fontSize: 12.5, color: '#D9A857', lineHeight: 18 },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, paddingVertical: 11 },
  infoLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 0 },
  infoLabel: { fontSize: 13 },
  infoValue: { fontSize: 13.5, fontWeight: '600', textAlign: 'right', flex: 1, marginLeft: 8 },

  totalCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 20, borderWidth: 1, padding: 18, marginBottom: 14 },
  totalLabel: { fontSize: 13, fontWeight: '500' },
  totalValue: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },

  trackingCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20, borderWidth: 1, borderStyle: 'dashed', padding: 16, marginBottom: 20 },
  trackingIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  trackingTitle: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  trackingSub: { fontSize: 12 },

  actionCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 18, borderWidth: 1, padding: 16, marginTop: 4 },
  actionIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  actionCopy: { flex: 1, minWidth: 0 },
  actionTitle: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  actionDescription: { fontSize: 12.5, lineHeight: 18 },
  poButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, marginTop: 12 },
  poButtonText: { fontSize: 12.5, fontWeight: '800' },

  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, padding: 16, marginTop: 4 },
  ctaText: { fontSize: 15, fontWeight: '700', color: '#fff' },
})
