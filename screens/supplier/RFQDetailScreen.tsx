import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native'
import {
  ArrowLeft,
  Package,
  Tag,
  Calendar,
  MessageCircle,
  Send,
  RefreshCw,
  Building2,
} from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useConversation } from '@/contexts/ConversationContext'
import { useNotifications } from '@/contexts/NotificationContext'
import {
  fetchSupplierRfqDetail,
  replyToRFQ,
  counterOfferRFQ,
  acceptNegotiation,
  rejectNegotiation,
} from '@/services/supplierService/supplierService'
import { ConversationMessageList } from '@/components/supplier/rfq/ConversationMessageList'
import { CounterOfferModal } from '@/components/supplier/rfq/CounterOfferModal'
import { AcceptConfirmationModal } from '@/components/supplier/rfq/AcceptConfirmationModal'
import { RfqStatusBadge } from '@/components/supplier/rfq/RfqStatusBadge'
import type { AcceptNegotiationInput, CounterOfferInput, RejectNegotiationInput, RequestForQuotationDetail, RfqStatus } from '@/types'

const formatPHP = (amount: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })

const BREAKPOINTS = { tablet: 768, desktop: 1100 }

interface Props {
  rfqId: string
  onPOCreated?: (poId: string, poNumber: string) => void
  onBack?: () => void
}

export function RFQDetailScreen({ rfqId, onPOCreated, onBack }: Props) {
  const { colors } = useTheme()
  const { user } = useAuth()
  const { show: showToast } = useToast()
  const { width } = useWindowDimensions()

  const isTablet = width >= BREAKPOINTS.tablet
  const isDesktop = width >= BREAKPOINTS.desktop
  const horizontalPadding = isDesktop ? 32 : isTablet ? 24 : 16
  const contentMaxWidth = isDesktop ? 1440 : undefined

  const [rfq, setRfq] = useState<RequestForQuotationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [counterModalVisible, setCounterModalVisible] = useState(false)
  const [acceptModalVisible, setAcceptModalVisible] = useState(false)

  const { join, leave, events: wsEvents } = useConversation()
  const { notifications } = useNotifications()

  useEffect(() => {
    if (!rfq?.conversation?.id) return
    join(rfq.conversation.id)
    return () => leave(rfq.conversation.id)
  }, [rfq?.conversation?.id, join, leave])

  useEffect(() => {
    if (!rfq?.conversation?.id) return
    const convId = rfq.conversation.id
    const convEvents = wsEvents[convId] ?? []
    for (const ev of convEvents) {
      const { event, payload } = ev
      if (event === 'conversation:newMessage') {
        const msg = payload
        setRfq((prev) => {
          if (!prev || !prev.conversation) return prev
          const replaceIdx = prev.conversation.messages?.findIndex((m: any) => m.clientMessageId === msg.clientMessageId)
          if (msg.clientMessageId && replaceIdx !== undefined && replaceIdx >= 0) {
            const next = [...(prev.conversation.messages ?? [])]
            next[replaceIdx] = msg
            return { ...prev, conversation: { ...prev.conversation, messages: next } }
          }
          if (prev.conversation.messages?.some((m: any) => m.id === msg.id)) return prev
          return {
            ...prev,
            conversation: {
              ...prev.conversation,
              messages: [...(prev.conversation.messages ?? []), msg],
            },
          }
        })
      } else if (event === 'offer:counter') {
        const offer = payload
        setRfq((prev) => {
          if (!prev || !prev.conversation) return prev
          if (prev.conversation.offers?.some((o: any) => o.id === offer.id)) return prev
          return {
            ...prev,
            conversation: {
              ...prev.conversation,
              offers: [...(prev.conversation.offers ?? []), offer],
            },
          }
        })
      } else if (event === 'purchaseOrder:created') {
        const { po } = payload
        onPOCreated?.(po.id, po.poNumber)
        showToast(`Purchase Order ${po.poNumber} created`, 'success')
      }
    }
  }, [wsEvents, rfq?.conversation?.id, onPOCreated, showToast])

  useEffect(() => {
    const pendingToasts = notifications.filter((n) => !n.isRead)
    for (const n of pendingToasts) {
      showToast(n.title, 'info')
    }
  }, [notifications, showToast])

  const loadRfq = useCallback(async () => {
    if (!rfqId) return
    try {
      const data = await fetchSupplierRfqDetail(rfqId)
      setRfq(data)
    } catch (e: any) {
      if (__DEV__) console.error('fetchSupplierRfqDetail error', e)
    } finally {
      setLoading(false)
    }
  }, [rfqId])

  useEffect(() => {
    loadRfq()
  }, [loadRfq])

  const handleReply = async () => {
    if (!rfq?.conversation || !replyText.trim()) return
    setSending(true)
    try {
      const clientMessageId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      const msg = await replyToRFQ({
        rfqId: rfq.id,
        message: replyText.trim(),
        attachments: [],
        clientMessageId,
      })
      // Build a canonical-shaped optimistic message so the supplier sees the
      // correct sender identity immediately — matching the WebSocket payload
      // that will arrive from the backend's conversation:newMessage event.
      const optimisticMsg = {
        ...msg,
        clientMessageId,
        senderId: `org:${supplierOrgId}`,
        senderName: 'You',
        senderRole: 'SUPPLIER',
        senderAgentId: null,
        senderOrgId: supplierOrgId,
      }
      setRfq((prev) => {
        if (!prev || !prev.conversation) return prev
        // If the WebSocket event already delivered this message (id matches),
        // skip the append to prevent a duplicate — the server-confirmed version
        // via conversation:newMessage has the full canonical payload and will
        // replace this optimistic entry by clientMessageId in the WS handler.
        if (prev.conversation.messages?.some((m: any) => m.id === msg.id)) return prev
        return {
          ...prev,
          conversation: {
            ...prev.conversation,
            messages: [...prev.conversation.messages, optimisticMsg],
          },
        }
      })
      setReplyText('')
      showToast('Reply sent', 'success')
    } catch (e: any) {
      if (__DEV__) console.error('Reply error', e)
      showToast(e.message ?? 'Failed to send reply', 'error')
    } finally {
      setSending(false)
    }
  }

  const handleCounterOffer = async (input: CounterOfferInput) => {
    if (!rfq) return
    await counterOfferRFQ(input)
    setCounterModalVisible(false)
    showToast('Counter Offer sent successfully.', 'success')
    void loadRfq()
  }

  const handleAcceptNegotiation = async (input: AcceptNegotiationInput) => {
    const confirmed = await acceptNegotiation(input)
    setAcceptModalVisible(false)
    showToast('Offer confirmed. Purchase Order creation is now enabled.', 'success')
    if (confirmed) await loadRfq()
  }

  const handleRejectNegotiation = async (input: RejectNegotiationInput) => {
    await rejectNegotiation(input)
    showToast('Negotiation rejected', 'success')
    await loadRfq()
  }

  const handleReject = () => {
    if (!rfq) return
    handleRejectNegotiation({ rfqId: rfq.id })
  }

  if (loading || !rfq) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    )
  }

  const supplierItem = rfq.supplierItem
  const conversation = rfq.conversation
  const supplierOrgId = rfq.supplierOrgId ?? user?.orgId ?? 0

  const offers = conversation?.offers ?? []
  const latestOffer = offers.length > 0 ? offers[offers.length - 1] : undefined
  const targetQty = rfq.quantity ? Number(rfq.quantity) : 0
  const targetPrice = rfq.targetUnitPrice ?? 0
  const currentSellingPrice = supplierItem?.unitPrice ?? 0
  const supplierOffer = latestOffer?.unitPrice ?? currentSellingPrice
  const hasSupplierOffer = !!latestOffer

  // ─── Info panels: shared between desktop's left rail and mobile's stacked layout ───
  const buyerInfoCard = (
    <Panel title="Buyer Information" icon={Building2} colors={colors}>
      <View style={{ gap: 10 }}>
        <InfoRow label="Buyer" value={rfq.agent?.fullname ?? 'Unknown Buyer'} colors={colors} />
        <InfoRow label="Organization" value={rfq.agent?.organization?.name ?? 'N/A'} colors={colors} />
        <InfoRow label="Created" value={formatDate(rfq.createdAt)} colors={colors} />
        {rfq.agent?.organization?.location && (
          <InfoRow label="Location" value={rfq.agent.organization.location} colors={colors} />
        )}
      </View>
    </Panel>
  )

  const productCard = supplierItem && (
    <Panel title="Product" icon={Package} colors={colors}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
        {supplierItem.image ? (
          <Image source={{ uri: supplierItem.image }} style={{ width: 72, height: 72, borderRadius: 12 }} resizeMode="cover" />
        ) : (
          <View style={{ width: 72, height: 72, borderRadius: 12, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
            <Package size={26} color={colors.textSecondary} />
          </View>
        )}
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }} numberOfLines={2}>{supplierItem.name}</Text>
          {supplierItem.sku && (
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>SKU: {supplierItem.sku}</Text>
          )}
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 4 }}>
        <InfoRowCompact label="MOQ" value={String(supplierItem.moq ?? 0)} colors={colors} unit={supplierItem.unit} />
        <InfoRowCompact label="Available Qty" value={String(supplierItem.availableQty ?? 0)} colors={colors} unit={supplierItem.unit} />
        <InfoRowCompact
          label="Lead Time"
          value={supplierItem.productWholesaleSettings?.leadTime ?? '—'}
          colors={colors}
        />
        <InfoRowCompact label="Selling Price" value={formatPHP(supplierItem.unitPrice ?? 0)} colors={colors} isCurrency />
      </View>
    </Panel>
  )

  const negotiationCard = (
    <Panel title="Negotiation Summary" icon={Tag} colors={colors}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <NegotiationStat label="Buyer wants" value={`${qtyDisplay(targetQty)} ${supplierItem?.unit ?? 'pcs'}`} colors={colors} />
        <NegotiationStat label="Target Price" value={`${formatPHP(targetPrice)} / unit`} colors={colors} />
        <NegotiationStat label="Selling Price" value={`${formatPHP(currentSellingPrice)} / unit`} colors={colors} />
        {hasSupplierOffer && latestOffer && (
          <NegotiationStat label="Your Offer" value={`${formatPHP(supplierOffer)} / unit`} colors={colors} accent />
        )}
        {latestOffer && latestOffer.quantity > 0 && (
          <NegotiationStat
            label="Latest Offer Qty"
            value={`${qtyDisplay(latestOffer.quantity)} ${supplierItem?.unit ?? 'pcs'}`}
            colors={colors}
            accent
          />
        )}
      </View>
    </Panel>
  )

  const deliveryCard = rfq.expectedDeliveryDate && (
    <View style={{ backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Calendar size={16} color={colors.textSecondary} />
      <Text style={{ fontSize: 13, color: colors.textSecondary }}>Expected Delivery</Text>
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginLeft: 'auto' }}>
        {formatDate(rfq.expectedDeliveryDate)}
      </Text>
    </View>
  )

  const conversationPanel = conversation && (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
        flex: isDesktop ? 1 : undefined,
        minHeight: isDesktop ? 560 : 320,
        maxHeight: isDesktop ? 720 : 420,
      }}
    >
      <View style={{
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      }}>
        <MessageCircle size={16} color={colors.textSecondary} />
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Conversation</Text>
        {conversation.messages?.length ? (
          <View style={{
            backgroundColor: colors.primary,
            borderRadius: 10,
            paddingHorizontal: 6,
            paddingVertical: 2,
            minWidth: 20,
            alignItems: 'center',
          }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>{conversation.messages.length}</Text>
          </View>
        ) : null}
      </View>
      <View style={{ flex: 1 }}>
        <ConversationMessageList
          messages={conversation.messages ?? []}
          offers={conversation.offers ?? []}
          participants={conversation.participants ?? []}
          supplierOrgId={supplierOrgId}
          buyerAgent={rfq.agent}
          vatRate={supplierItem?.vatRate ?? 0.12}
          isVatExempt={supplierItem?.isVatExempt ?? false}
          unit={supplierItem?.unit ?? 'pcs'}
          onAcceptOffer={() => setAcceptModalVisible(true)}
          onCounterOffer={() => setCounterModalVisible(true)}
          onRejectOffer={() => handleReject()}
        />
      </View>
    </View>
  )

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: horizontalPadding,
          paddingVertical: 20,
          gap: 20,
          width: '100%',
          maxWidth: contentMaxWidth,
          alignSelf: 'center',
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={{ padding: 6, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
              <ArrowLeft size={20} color={colors.text} />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: isDesktop ? 22 : 18, fontWeight: '800', color: colors.text, letterSpacing: -0.3 }}>{rfq.rfqNumber}</Text>
            {supplierItem?.name && (
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{supplierItem.name}</Text>
            )}
          </View>
          <RfqStatusBadge status={rfq.status as RfqStatus} size={isDesktop ? 'md' : 'sm'} />
          <TouchableOpacity
            onPress={loadRfq}
            style={{ padding: 8, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
          >
            <RefreshCw size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {isDesktop ? (
          // ─── Desktop: fixed-width left rail (context) + flexible right column (conversation) ───
          <View style={{ flexDirection: 'row', gap: 20, alignItems: 'flex-start' }}>
            <View style={{ width: 380, gap: 12 }}>
              {buyerInfoCard}
              {productCard}
              {negotiationCard}
              {deliveryCard}
            </View>
            <View style={{ flex: 1 }}>
              {conversationPanel}
            </View>
          </View>
        ) : (
          // ─── Mobile/tablet: single stacked column ───
          <View style={{ gap: 20 }}>
            {buyerInfoCard}
            {productCard}
            {negotiationCard}
            {conversationPanel}
            {deliveryCard}
          </View>
        )}
      </ScrollView>

      {/* Bottom Action Bar (Reply / Counter Offer / Accept / Reject) */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: horizontalPadding,
          paddingVertical: 12,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <View style={{ flex: 1, maxWidth: contentMaxWidth, width: '100%', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TextInput
            value={replyText}
            onChangeText={setReplyText}
            placeholder="Type a reply..."
            placeholderTextColor={colors.textSecondary}
            style={{
              flex: 1,
              backgroundColor: colors.background,
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: Platform.OS === 'ios' ? 10 : 8,
              color: colors.text,
              fontSize: 14,
            }}
            multiline
            maxLength={500}
          />
          {replyText.trim() && (
            <TouchableOpacity
              onPress={handleReply}
              disabled={sending}
              style={{
                backgroundColor: colors.primary,
                borderRadius: 20,
                paddingHorizontal: 16,
                paddingVertical: 10,
                opacity: sending ? 0.6 : 1,
              }}
            >
              {sending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Send size={18} color="#fff" />
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => setCounterModalVisible(true)}
            style={{
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>Counter Offer</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setAcceptModalVisible(true)}
            style={{
              backgroundColor: '#22C55E',
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>Confirm Offer</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleReject}
            style={{
              backgroundColor: '#EF4444',
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>Reject</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Modals */}
      <CounterOfferModal
        visible={counterModalVisible}
        rfq={rfq}
        onClose={() => setCounterModalVisible(false)}
        onSubmit={handleCounterOffer}
      />
      <AcceptConfirmationModal
        visible={acceptModalVisible}
        rfq={rfq}
        onClose={() => setAcceptModalVisible(false)}
        onAccept={handleAcceptNegotiation}
        onPOCreated={() => {
          showToast('Purchase Order created successfully', 'success')
        }}
      />
    </View>
  )
}

// ─── Shared building blocks ─────────────────────────────────────────────────

function Panel({
  title,
  icon: Icon,
  colors,
  children,
}: {
  title: string
  icon: React.ComponentType<{ size?: number; color?: string }>
  colors: any
  children: React.ReactNode
}) {
  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 14 }}>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <Icon size={16} color={colors.primary} />
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{title}</Text>
      </View>
      {children}
    </View>
  )
}

function NegotiationStat({ label, value, colors, accent }: { label: string; value: string; colors: any; accent?: boolean }) {
  return (
    <View
      style={{
        flexGrow: 1,
        minWidth: 140,
        backgroundColor: accent ? colors.primary + '0F' : colors.background,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: accent ? colors.primary + '33' : colors.border,
        paddingVertical: 10,
        paddingHorizontal: 12,
        gap: 4,
      }}
    >
      <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: '700', color: accent ? colors.primary : colors.text }}>{value}</Text>
    </View>
  )
}

function InfoRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
      <Text style={{ fontSize: 13, color: colors.textSecondary, flex: 1 }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, flex: 2, textAlign: 'right' }}>{value}</Text>
    </View>
  )
}

function InfoRowCompact({
  label,
  value,
  colors,
  unit,
  isCurrency,
}: {
  label: string
  value: string
  colors: any
  unit?: string
  isCurrency?: boolean
}) {
  return (
    <View style={{ gap: 2, minWidth: 80 }}>
      <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.3 }}>
        {label}
      </Text>
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
        {value}
        {!isCurrency && unit ? ` ${unit}` : ''}
      </Text>
    </View>
  )
}

function qtyDisplay(qty: number): string {
  return qty % 1 === 0 ? String(qty) : qty.toFixed(2)
}