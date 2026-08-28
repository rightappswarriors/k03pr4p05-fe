import React, { useCallback, useRef } from 'react'
import { View, Text, FlatList, TouchableOpacity } from 'react-native'
import { Package, Tag, FileText, CheckCircle2, XCircle, ArrowLeftRight, PackageCheck, Clock, Calendar } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import type { NegotiationOffer, ConversationParticipant, BuyerAgent } from '@/types'

const formatPHP = (amount: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })

const formatTimestamp = (iso: string) =>
  `${new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })} • ${formatTime(iso)}`

const qtyDisplay = (qty: number) => (qty % 1 === 0 ? String(qty) : qty.toFixed(2))

// ─── Messenger-style date separators ────────────────────────────────────────
const SEPARATOR_GAP_MS = 15 * 60 * 1000

function startOfDayMs(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

function formatConversationDateSeparator(iso: string): string | null {
  const date = new Date(iso)
  if (isNaN(date.getTime())) return null
  const now = new Date()

  const time = date.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true })
  const diffDays = Math.round((startOfDayMs(now) - startOfDayMs(date)) / 86400000)

  if (diffDays <= 0) return time
  if (diffDays === 1) return `Yesterday ${time}`
  if (diffDays < 7) {
    const weekday = date.toLocaleDateString('en-PH', { weekday: 'long' })
    return `${weekday} ${time}`
  }
  if (date.getFullYear() === now.getFullYear()) {
    const monthDay = date.toLocaleDateString('en-PH', { month: 'long', day: 'numeric' })
    return `${monthDay}, ${time}`
  }
  const monthDayYear = date.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
  return `${monthDayYear}, ${time}`
}

// ─── Backend MessageType — matches the real Prisma enum values emitted by
// RfqNegotiationService (agent side) and SupplierRFQService (supplier side).
// TEXT = real chat message. Everything else is a system-generated event row.
//
// IMPORTANT: 'OFFER_ACCEPTED' (agent accepted, waiting on supplier) and
// 'SUPPLIER_CONFIRMED' (supplier confirmed — both parties agreed) are two
// DIFFERENT events with different cards. There is no 'AGENT_CONFIRMED' type
// — the backend never emits that; using it here silently dropped
// OFFER_ACCEPTED messages into a plain text bubble instead of a card.
type BackendMessageType =
  | 'TEXT'
  | 'COUNTER_OFFER'
  | 'FINAL_OFFER'
  | 'OFFER_ACCEPTED'
  | 'SUPPLIER_CONFIRMED'
  | 'OFFER_REJECTED'
  | 'ORDER_CREATED'
  | 'CONSOLIDATED_PO_CREATED'
  | 'PO_ACCEPTED'
  | 'PO_REJECTED'
  | 'RECEIPT_UPLOADED'
  | 'PAYMENT_RECEIVED'
  | 'DELIVERY_SCHEDULED'
  | 'SHIPMENT_DISPATCHED'
  | 'DELIVERY_COMPLETED'

interface ConversationMessage {
  id: string
  conversationId: string
  senderAgentId?: string | null
  senderOrgId?: number | null
  message: string
  createdAt: string
  attachments: string[]
  senderAgent?: { id: string; fullname: string } | null
  senderOrg?: { id: number; name: string } | null
  type?: BackendMessageType
  metadata?: Record<string, any> | null
}

interface Props {
  messages: ConversationMessage[]
  offers: Array<NegotiationOffer>
  participants: ConversationParticipant[]
  supplierOrgId: number
  buyerAgent?: BuyerAgent
  vatRate?: number
  isVatExempt?: boolean
  unit?: string
  onAcceptOffer?: (offer: NegotiationOffer) => void
  onCounterOffer?: (offer: NegotiationOffer) => void
  onRejectOffer?: (offer: NegotiationOffer) => void
  onReceiptPress?: (message: ConversationMessage) => void
}

type SystemEventType =
  | 'agent_accepted' | 'both_confirmed' | 'rejected' | 'counter' | 'po_created'
  | 'po_accepted' | 'po_rejected' | 'receipt_uploaded' | 'payment_received'
  | 'delivery_scheduled' | 'shipment_dispatched' | 'delivery_completed'

// Structural classification driven by the real Prisma MessageType enum.
function classifySystemMessage(message: ConversationMessage): SystemEventType | null {
  switch (message.type) {
    case 'OFFER_ACCEPTED':
      // Agent accepted the supplier's offer — RFQ is now
      // WAITING_SUPPLIER_CONFIRMATION. Distinct from SUPPLIER_CONFIRMED.
      return 'agent_accepted'
    case 'SUPPLIER_CONFIRMED':
      // Supplier confirmed after the agent's acceptance — both parties
      // have now agreed, PO creation is unlocked.
      return 'both_confirmed'
    case 'OFFER_REJECTED':
      return 'rejected'
    case 'COUNTER_OFFER':
    case 'FINAL_OFFER':
      return 'counter'
    case 'ORDER_CREATED':
    case 'CONSOLIDATED_PO_CREATED':
      return 'po_created'
    case 'PO_ACCEPTED':
      return 'po_accepted'
    case 'PO_REJECTED':
      return 'po_rejected'
    case 'RECEIPT_UPLOADED':
      return 'receipt_uploaded'
    case 'PAYMENT_RECEIVED':
      return 'payment_received'
    case 'DELIVERY_SCHEDULED':
      return 'delivery_scheduled'
    case 'SHIPMENT_DISPATCHED':
      return 'shipment_dispatched'
    case 'DELIVERY_COMPLETED':
      return 'delivery_completed'
    case 'TEXT':
    default:
      return null
  }
}

export function ConversationMessageList({
  messages,
  offers,
  participants,
  supplierOrgId,
  buyerAgent,
  vatRate = 0.12,
  isVatExempt = false,
  unit = 'pcs',
  onAcceptOffer,
  onCounterOffer,
  onRejectOffer,
  onReceiptPress,
}: Props) {
  const { colors } = useTheme()
  const listRef = useRef<FlatList>(null)

  const supplierName = participants.find((p) => p.organizationId === supplierOrgId)?.organization?.name ?? 'Supplier'
  const buyerName = buyerAgent?.fullname ?? 'Buyer'

  const preparedMessages = messages
    .map((msg) => ({ msg, eventType: classifySystemMessage(msg) }))
    .filter(({ eventType }) => eventType !== 'counter')

  type CombinedItem =
    | { type: 'message'; data: ConversationMessage; id: string; showLabel: boolean }
    | { type: 'event'; data: ConversationMessage; eventType: SystemEventType; id: string }
    | { type: 'offer'; data: NegotiationOffer; id: string }
    | { type: 'separator'; label: string; id: string }

  type RawItem =
    | { type: 'message'; data: ConversationMessage; id: string }
    | { type: 'event'; data: ConversationMessage; eventType: SystemEventType; id: string }
    | { type: 'offer'; data: NegotiationOffer; id: string }
    | { type: 'separator'; label: string; id: string }

  const PO_EVENT_TYPES: SystemEventType[] = [
    'po_created', 'po_accepted', 'po_rejected',
    'receipt_uploaded', 'payment_received',
    'delivery_scheduled', 'shipment_dispatched', 'delivery_completed',
  ]

  const raw: Array<{ sortKey: string; item: RawItem }> = []
  for (const { msg, eventType } of preparedMessages) {
    if (eventType === 'agent_accepted' || eventType === 'both_confirmed' || eventType === 'rejected' || PO_EVENT_TYPES.includes(eventType as any)) {
      raw.push({ sortKey: msg.createdAt, item: { type: 'event', data: msg, eventType: eventType as SystemEventType, id: `event-${msg.id}` } })
    } else {
      raw.push({ sortKey: msg.createdAt, item: { type: 'message', data: msg, id: `msg-${msg.id}` } })
    }
  }
  for (const offer of offers) {
    raw.push({ sortKey: offer.createdAt, item: { type: 'offer', data: offer, id: `offer-${offer.id}` } })
  }
  raw.sort((a, b) => new Date(a.sortKey).getTime() - new Date(b.sortKey).getTime())

  const withSeparators: typeof raw = []
  let lastSeparatorMs: number | null = null
  for (const entry of raw) {
    const ts = new Date(entry.sortKey).getTime()
    if (!isNaN(ts)) {
      const dayChanged = lastSeparatorMs !== null && startOfDayMs(new Date(ts)) !== startOfDayMs(new Date(lastSeparatorMs))
      const gapExceeded = lastSeparatorMs === null || ts - lastSeparatorMs >= SEPARATOR_GAP_MS
      if (gapExceeded || dayChanged) {
        const label = formatConversationDateSeparator(entry.sortKey)
        if (label) {
          withSeparators.push({ sortKey: entry.sortKey, item: { type: 'separator', label, id: `sep-${entry.item.id}` } })
          lastSeparatorMs = ts
        }
      }
    }
    withSeparators.push(entry)
  }

  let lastMessageSenderKey: string | null = null
  const combinedItems: CombinedItem[] = withSeparators.map(({ item }) => {
    if (item.type !== 'message') {
      lastMessageSenderKey = null
      return item as CombinedItem
    }
    const msg = item.data as ConversationMessage
    const senderKey = msg.senderOrgId === supplierOrgId ? `supplier` : `buyer-${msg.senderAgentId ?? 'x'}`
    const showLabel = senderKey !== lastMessageSenderKey
    lastMessageSenderKey = senderKey
    return { ...item, showLabel } as CombinedItem
  })

  const scrollToBottom = useCallback((animated: boolean) => {
    listRef.current?.scrollToEnd({ animated })
  }, [])

  const renderItem = ({ item }: { item: CombinedItem }) => {
    if (item.type === 'separator') {
      return (
        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 10 }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary, opacity: 0.75, letterSpacing: 0.2 }}>
            {item.label}
          </Text>
        </View>
      )
    }
    if (item.type === 'offer') {
      const offer = item.data
      const isLatestOffer = offers.length > 0 && offers[offers.length - 1].id === offer.id
      return (
        <OfferCard
          offer={offer}
          isFromSupplier={offer.senderType === 'SUPPLIER'}
          offererName={offer.senderType === 'SUPPLIER' ? supplierName : buyerName}
          vatRate={vatRate}
          isVatExempt={isVatExempt}
          unit={unit}
          colors={colors}
          isLatest={isLatestOffer}
          onAccept={onAcceptOffer}
          onCounter={onCounterOffer}
          onReject={onRejectOffer}
        />
      )
    }
    if (item.type === 'event') {
      return <EventCard type={item.eventType} message={item.data} colors={colors} unit={unit} onReceiptPress={onReceiptPress} />
    }
    const msg = item.data
    const fromSupplier = msg.senderOrgId === supplierOrgId
    const fromBuyer = !!msg.senderAgentId
    return (
      <MessageBubble
        message={msg}
        fromSupplier={fromSupplier}
        fromBuyer={fromBuyer}
        showLabel={item.showLabel}
        supplierName={supplierName}
        buyerName={buyerName}
        colors={colors}
      />
    )
  }

  return (
    <FlatList
      ref={listRef}
      data={combinedItems}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={{ padding: 16, gap: 0, paddingBottom: 80 }}
      onContentSizeChange={() => scrollToBottom(false)}
      onLayout={() => scrollToBottom(false)}
      ListEmptyComponent={
        <View style={{ alignItems: 'center', paddingVertical: 32, gap: 8 }}>
          <Package size={32} color={colors.textSecondary} />
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>No messages yet. Start the conversation!</Text>
        </View>
      }
    />
  )
}

// ─── Offer timeline card (NegotiationOffer records) ─────────────────────────
type OfferVariant = 'accepted' | 'rejected' | 'counter'

function getOfferVariant(status: string | undefined | null): OfferVariant {
  const s = (status ?? '').toUpperCase()
  if (s === 'ACCEPTED') return 'accepted'
  if (s === 'REJECTED') return 'rejected'
  return 'counter'
}

// Palettes derived from theme success/error/primary/warning colors with alpha,
// so tints blend correctly in both light and dark mode.
//
// Distinct event kinds now:
//   RFQ negotiation events:
//     counter        → blue, buyer/supplier sent a counter offer
//     accepted       → green, a specific NegotiationOffer record was accepted
//     rejected       → red, an offer/negotiation was rejected
//     agent_accepted → amber/warning, agent accepted — WAITING on supplier
//     both_confirmed → green (distinct icon/label from `accepted`), supplier
//                      confirmed — BOTH parties have now agreed
//   PO lifecycle events (ORDER-type conversations):
//     po_created           → primary, Purchase Order created
//     po_accepted          → green, PO accepted by supplier
//     po_rejected          → red, PO rejected by supplier
//     receipt_uploaded     → blue, receipt uploaded
//     payment_received     → teal, payment received
//     delivery_scheduled   → amber, delivery scheduled
//     shipment_dispatched  → purple, shipment dispatched
//     delivery_completed   → green, delivery completed
function getEventPalette(
  colors: any,
  kind: 'accepted' | 'rejected' | 'counter' | 'agent_accepted' | 'both_confirmed' | 'po_created'
    | 'po_accepted' | 'po_rejected' | 'receipt_uploaded' | 'payment_received'
    | 'delivery_scheduled' | 'shipment_dispatched' | 'delivery_completed',
) {
  const byKind = {
    accepted: { base: colors.success, icon: CheckCircle2, label: 'Offer Accepted' },
    rejected: { base: colors.error, icon: XCircle, label: 'Offer Rejected' },
    counter: { base: colors.primary, icon: ArrowLeftRight, label: 'Counter Offer' },
    agent_accepted: { base: colors.warning ?? '#F59E0B', icon: Clock, label: 'Awaiting Supplier Confirmation' },
    both_confirmed: { base: colors.success, icon: CheckCircle2, label: 'Both Parties Confirmed' },
    po_created: { base: colors.primary, icon: PackageCheck, label: 'Purchase Order Created' },
    po_accepted: { base: colors.success, icon: PackageCheck, label: 'PO Accepted' },
    po_rejected: { base: colors.error, icon: XCircle, label: 'PO Rejected' },
    receipt_uploaded: { base: colors.primary, icon: FileText, label: 'Receipt Uploaded' },
    payment_received: { base: colors.success, icon: CheckCircle2, label: 'Payment Received' },
    delivery_scheduled: { base: colors.warning ?? '#F59E0B', icon: Calendar, label: 'Delivery Scheduled' },
    shipment_dispatched: { base: colors.primary, icon: Package, label: 'Shipment Dispatched' },
    delivery_completed: { base: colors.success, icon: PackageCheck, label: 'Delivery Completed' },
  }[kind]
  return {
    bg: byKind.base + '26',
    border: byKind.base + '55',
    accent: byKind.base,
    icon: byKind.icon,
    label: byKind.label,
  }
}

function OfferCard({
  offer,
  isFromSupplier,
  offererName,
  vatRate,
  isVatExempt,
  unit,
  colors,
  isLatest = false,
  onAccept,
  onCounter,
  onReject,
}: {
  offer: NegotiationOffer
  isFromSupplier: boolean
  offererName: string
  vatRate: number
  isVatExempt: boolean
  unit: string
  colors: any
  isLatest?: boolean
  onAccept?: (offer: NegotiationOffer) => void
  onCounter?: (offer: NegotiationOffer) => void
  onReject?: (offer: NegotiationOffer) => void
}) {
  const variant = getOfferVariant((offer as any).status)
  const palette = getEventPalette(colors, variant)
  const Icon = palette.icon
  const qty = offer.quantity ?? 0
  const unitPrice = offer.unitPrice ?? 0
  const subtotal = qty * unitPrice
  const vatAmount = isVatExempt ? 0 : subtotal * vatRate
  const total = subtotal + vatAmount

  const canRespond = isLatest && !isFromSupplier && variant === 'counter' && (onAccept || onCounter || onReject)

  return (
    <View
      style={{
        alignSelf: isFromSupplier ? 'flex-end' : 'flex-start',
        maxWidth: '86%',
        minWidth: 280,
        marginVertical: 4,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.bg,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 14,
          paddingTop: 12,
          paddingBottom: 8,
        }}
      >
        <Icon size={16} color={palette.accent} />
        <Text style={{ fontSize: 13, fontWeight: '800', color: palette.accent, flex: 1 }}>
          {variant === 'counter' ? `${offererName} sent a ${palette.label.toLowerCase()}` : palette.label}
        </Text>
      </View>

      {variant !== 'counter' && (
        <View style={{ paddingHorizontal: 14 }}>
          <Text style={{ fontSize: 11, color: colors.textSecondary }}>{isFromSupplier ? 'Supplier' : 'Agent'}</Text>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginTop: 1 }}>{offererName}</Text>
        </View>
      )}

      <View style={{ paddingHorizontal: 14, paddingTop: 10 }}>
        <Text style={{ fontSize: 12, color: colors.textSecondary }}>
          {qtyDisplay(qty)} {unit} × {formatPHP(unitPrice)}
        </Text>
        <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text, marginTop: 2 }}>
          {formatPHP(subtotal)}
        </Text>
      </View>

      <View style={{ paddingHorizontal: 14, paddingTop: 10, gap: 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 11, color: colors.textSecondary }}>Subtotal</Text>
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>{formatPHP(subtotal)}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 11, color: colors.textSecondary }}>
            VAT {isVatExempt ? '(Exempt)' : `(${Math.round(vatRate * 100)}%)`}
          </Text>
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>{formatPHP(vatAmount)}</Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            borderTopWidth: 1,
            borderTopColor: palette.border,
            paddingTop: 6,
            marginTop: 2,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text }}>Total</Text>
          <Text style={{ fontSize: 13, fontWeight: '800', color: palette.accent }}>{formatPHP(total)}</Text>
        </View>
      </View>

      {offer.deliveryDate && (
        <Text style={{ fontSize: 11, color: colors.textSecondary, paddingHorizontal: 14, paddingTop: 8 }}>
          Delivery: {new Date(offer.deliveryDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
        </Text>
      )}
      {offer.notes && (
        <Text style={{ fontSize: 11, color: colors.textSecondary, paddingHorizontal: 14, paddingTop: 6 }}>{offer.notes}</Text>
      )}

      <Text
        style={{
          fontSize: 10,
          color: colors.textSecondary,
          opacity: 0.7,
          textAlign: 'right',
          paddingHorizontal: 14,
          paddingTop: 10,
          paddingBottom: 12,
        }}
      >
        {formatTimestamp(offer.createdAt)}
      </Text>
      {canRespond && (
        <View
          style={{
            flexDirection: 'row',
            gap: 8,
            paddingHorizontal: 14,
            paddingTop: 12,
            paddingBottom: 12,
            borderTopWidth: 1,
            borderTopColor: palette.border,
            marginTop: 4,
          }}
        >
          <TouchableOpacity
            onPress={() => onReject?.(offer)}
            style={{ flex: 1, backgroundColor: '#EF4444', borderRadius: 8, paddingVertical: 8, alignItems: 'center' }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onCounter?.(offer)}
            style={{
              flex: 1,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 8,
              paddingVertical: 8,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>Counter</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onAccept?.(offer)}
            style={{ flex: 1, backgroundColor: '#22C55E', borderRadius: 8, paddingVertical: 8, alignItems: 'center' }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>Accept</Text>
          </TouchableOpacity>
        </View>
      )}
      {/* Resolution message — replaces the action buttons once the offer is
      no longer pending. Distinguishes "you" (the supplier, viewing this
      screen) from the other party, and reads as a settled outcome. */}
      {variant !== 'counter' && (
        <View
          style={{
            paddingHorizontal: 14,
            paddingTop: 4,
            paddingBottom: 12,
            borderTopWidth: 1,
            borderTopColor: palette.border,
            marginTop: 4,
          }}
        >
          <Text style={{ fontSize: 12, color: colors.text, paddingTop: 10, lineHeight: 17 }}>
            {variant === 'accepted'
              ? isFromSupplier
                ? `You accepted this offer from ${offererName}.`
                : `${offererName} accepted your offer.`
              : isFromSupplier
                ? `You declined this offer from ${offererName}.`
                : `${offererName} declined your offer.`}
          </Text>
        </View>
      )}
    </View>
  )
}

function MessageBubble({
  message, fromSupplier, fromBuyer, showLabel,
  supplierName, buyerName, colors,
}: {
  message: ConversationMessage
  fromSupplier: boolean
  fromBuyer: boolean
  showLabel: boolean
  supplierName: string
  buyerName: string
  colors: any
}) {
  const align: 'flex-start' | 'flex-end' = fromSupplier ? 'flex-end' : 'flex-start'
  const bg = fromSupplier ? colors.primary + '15' : colors.surface
  const borderColor = fromSupplier ? colors.primary + '40' : colors.border
  const label = fromSupplier ? supplierName : buyerName

  const borderRadStyle: any =
    align === 'flex-end'
      ? { borderTopLeftRadius: 16, borderTopRightRadius: 4 }
      : { borderTopLeftRadius: 4, borderTopRightRadius: 16 }

  return (
    <View style={{ alignSelf: align, maxWidth: '78%', marginTop: showLabel ? 10 : 2, marginBottom: 0 }}>
      {showLabel && (
        <Text style={{ fontSize: 10, fontWeight: '600', color: colors.textSecondary, marginBottom: 2, marginLeft: 4 }}>
          {label}
        </Text>
      )}
      <View style={{
        backgroundColor: bg,
        borderRadius: 16,
        ...borderRadStyle,
        borderWidth: 1, borderColor, padding: 12, gap: 6,
      }}>
        <Text style={{ fontSize: 13, color: colors.text, lineHeight: 18 }}>
          {message.message}
        </Text>
        {message.attachments && message.attachments.length > 0 && (
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
            {message.attachments.map((url, i) => (
              <TouchableOpacity key={i} onPress={() => { }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.background, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <FileText size={12} color={colors.textSecondary} />
                  <Text style={{ fontSize: 11, color: colors.textSecondary }}>Attachment</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <Text style={{ fontSize: 10, color: colors.textSecondary, opacity: 0.6, textAlign: 'right', marginTop: 4 }}>
          {formatTime(message.createdAt)}
        </Text>
      </View>
    </View>
  )
}

// ─── Compact event card ─────────────────────────────────────────────────────
// Renders system event messages. Reads real backend `metadata` fields for each
// type — see RfqNegotiationService.acceptOffer / supplierRFQService.* /
// purchaseOrder.mutation.ts for the exact shapes.
function EventCard({
  type,
  message,
  colors,
  unit,
  onReceiptPress,
}: {
  type: SystemEventType
  message: ConversationMessage
  colors: any
  unit: string
  onReceiptPress?: (message: ConversationMessage) => void
}) {
  const palette = getEventPalette(colors, type)
  const Icon = palette.icon
  const meta = message.metadata ?? {}

  let detail: string | null = null
  let subDetail: string | null = null

  if (type === 'agent_accepted') {
    // metadata: { offerId, unitPrice, quantity, deliveryDate, subtotal, vatAmount, vatRate, isVatExempt, total }
    if (meta.quantity != null && meta.unitPrice != null) {
      detail = `${qtyDisplay(Number(meta.quantity))} ${unit} × ${formatPHP(Number(meta.unitPrice))}`
    }
    if (meta.total != null) {
      subDetail = `Total: ${formatPHP(Number(meta.total))} — waiting for supplier to confirm`
    } else {
      subDetail = 'Waiting for supplier to confirm'
    }
  } else if (type === 'both_confirmed') {
    // metadata: { rfqId, supplierOrgId, confirmedAt, acceptedPrice, acceptedQuantity }
    if (meta.acceptedQuantity != null && meta.acceptedPrice != null) {
      detail = `${qtyDisplay(Number(meta.acceptedQuantity))} ${unit} × ${formatPHP(Number(meta.acceptedPrice))}`
    }
    subDetail = 'Both parties have confirmed. You can now generate the PO.'
  } else if (type === 'rejected' && meta.reason) {
    detail = `Reason: ${meta.reason}`
  } else if (type === 'po_created' && meta.poNumber) {
    // metadata: { poId, poNumber, rfqId, deliveryDate, totalAmount, vatAmount }
    detail = meta.totalAmount != null ? `${meta.poNumber} • ${formatPHP(Number(meta.totalAmount))}` : meta.poNumber
  } else if (type === 'po_accepted' && meta.poNumber) {
    detail = meta.poNumber
  } else if (type === 'po_rejected') {
    detail = meta.reason ? `Reason: ${meta.reason}` : null
  } else if (type === 'receipt_uploaded') {
    // metadata: { poId, poNumber, receiptId, totalAmount, paymentMethod, receiptUrl, paidAt }
    detail = meta.poNumber ?? null
    if (meta.receiptUrl) {
      subDetail = 'Receipt PDF has been uploaded'
    }
  } else if (type === 'payment_received') {
    // metadata: { poId, poNumber, amount, method }
    detail = meta.poNumber ?? null
    if (meta.amount != null) {
      subDetail = `${formatPHP(Number(meta.amount))} ${meta.method ? `via ${meta.method}` : ''}`
    }
  } else if (type === 'delivery_scheduled') {
    // metadata: { poId, poNumber, scheduledDate, driverName }
    detail = meta.poNumber ?? null
    if (meta.scheduledDate) {
      subDetail = `Scheduled for ${new Date(meta.scheduledDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}`
    }
    if (meta.driverName) {
      subDetail = subDetail ? `${subDetail} • ${meta.driverName}` : `Driver: ${meta.driverName}`
    }
  } else if (type === 'shipment_dispatched') {
    // metadata: { poId, poNumber, trackingNumber }
    detail = meta.poNumber ?? null
    if (meta.trackingNumber) {
      subDetail = `Tracking: ${meta.trackingNumber}`
    }
  } else if (type === 'delivery_completed' && meta.poNumber) {
    detail = meta.poNumber
    subDetail = 'Delivery completed'
  }

  return (
    <View
      style={{
        alignSelf: 'center',
        maxWidth: '90%',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.bg,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginVertical: 4,
        gap: 2,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon size={14} color={palette.accent} />
        <Text style={{ fontSize: 12, fontWeight: '700', color: palette.accent, flexShrink: 1 }}>{palette.label}</Text>
        <Text style={{ fontSize: 10, color: colors.textSecondary, opacity: 0.7, marginLeft: 'auto' }}>{formatTime(message.createdAt)}</Text>
      </View>
      {detail && (
        type === 'receipt_uploaded' && meta?.receiptUrl && onReceiptPress ? (
          <TouchableOpacity onPress={() => onReceiptPress(message)} style={{ marginLeft: 22 }}>
            <Text style={{ fontSize: 11, color: palette.accent, fontWeight: '600', textDecorationLine: 'underline' }}>{detail}</Text>
          </TouchableOpacity>
        ) : (
          <Text style={{ fontSize: 11, color: colors.text, marginLeft: 22 }}>{detail}</Text>
        )
      )}
      {subDetail && (
        <Text style={{ fontSize: 10, color: colors.textSecondary, marginLeft: 22, marginTop: 1 }}>{subDetail}</Text>
      )}
    </View>
  )
}