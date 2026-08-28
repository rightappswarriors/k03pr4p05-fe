import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TouchableNativeFeedback,
  TextInput,
  ActivityIndicator,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
  StyleSheet,
  Modal,
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
  CreditCard,
  Receipt,
  Download,
  Clock,
  CheckCircle2,
  Banknote,
  Paperclip,
  X,
  Trash2,
  FileText,
  Upload,
} from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useConversation } from '@/contexts/ConversationContext'
import {
  fetchPurchaseOrder,
  fetchPOConversation,
  sendPoMessage,
  acceptPO,
  rejectPO,
  startPOConversation,
  sendPoReceipt,
  type PurchaseOrder,
  type POStatus,
  type PaymentStatus,
  type POConversationDetail,
  type ConversationMessage,
  type ReceiptSnapshot,
} from '@/services/supplierService/supplierService'
import { MediaService } from '@/services/mediaService'
import { useImagePicker, type PickedFile } from '@/hooks/useImagePicker'
import { ConversationMessageList } from '@/components/supplier/rfq/ConversationMessageList'
import { RfqStatusBadge } from '@/components/supplier/rfq/RfqStatusBadge'

const formatPHP = (amount: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })

const BREAKPOINTS = { tablet: 768, desktop: 1100 }

const STATUS_COLORS: Record<POStatus, string> = {
  PENDING: '#F59E0B',
  ACCEPTED: '#10B981',
  REJECTED: '#EF4444',
  IN_TRANSIT: '#3B82F6',
  DELIVERED: '#22C55E',
  CANCELLED: '#6B7280',
}

const STATUS_LABELS: Record<POStatus, string> = {
  PENDING: 'Pending Review',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  IN_TRANSIT: 'In Transit',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
}

const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  PENDING: '#F59E0B',
  PREPARING: '#3B82F6',
  PARTIAL: '#F59E0B',
  PAID: '#10B981',
  REFUNDED: '#8B5CF6',
}

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'Pending Payment',
  PREPARING: 'Payment Prepared · Awaiting Payment',
  PARTIAL: 'Partially Paid',
  PAID: 'Fully Paid',
  REFUNDED: 'Refunded',
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

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: React.ComponentType<{ size?: number; color?: string }>
  children: React.ReactNode
}) {
  const { colors } = useTheme()
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

interface PODetailScreenProps {
  poId?: string
  onBack?: () => void
  onAccepted?: () => void
  onRejected?: () => void
}

export default function PODetailScreen({ poId, onBack, onAccepted, onRejected }: PODetailScreenProps) {
  const { colors } = useTheme()
  const { user } = useAuth()
  const { show: showToast } = useToast()
  const { width } = useWindowDimensions()

  const isTablet = width >= BREAKPOINTS.tablet
  const isDesktop = width >= BREAKPOINTS.desktop
  const horizontalPadding = isDesktop ? 32 : isTablet ? 24 : 16
  const contentMaxWidth = isDesktop ? 1440 : undefined

  const [po, setPo] = useState<PurchaseOrder | null>(null)
  const [loading, setLoading] = useState(!!poId)
  const [accepting, setAccepting] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [deliveryDate, setDeliveryDate] = useState('')
  const [driverName, setDriverName] = useState('')
  const [driverContact, setDriverContact] = useState('')

  const [activeTab, setActiveTab] = useState<'details' | 'conversation'>('details')
  const [poConv, setPoConv] = useState<POConversationDetail | null>(null)
  const [convLoading, setConvLoading] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)

  // Receipt upload modal state
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [receiptAmount, setReceiptAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [paymentReference, setPaymentReference] = useState('')
  const [receiptFile, setReceiptFile] = useState<PickedFile | null>(null)
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null)
  const [uploadingReceipt, setUploadingReceipt] = useState(false)

  // Message composer attachment state
  const [selectedAttachment, setSelectedAttachment] = useState<PickedFile | null>(null)
  const [attachmentUploading, setAttachmentUploading] = useState(false)

  const { pickImage } = useImagePicker()
  const { join, leave, events: wsEvents } = useConversation()

  const loadPo = useCallback(async () => {
    if (!poId) return
    setLoading(true)
    try {
      const data = await fetchPurchaseOrder(poId)
      setPo(data)
    } catch (e: any) {
      if (__DEV__) console.error('fetchPurchaseOrder error', e)
    } finally {
      setLoading(false)
    }
  }, [poId])

  const loadConv = useCallback(async () => {
    if (!poId) return
    setConvLoading(true)
    try {
      const data = await fetchPOConversation(poId)
      setPoConv(data)
    } catch (e: any) {
      if (__DEV__) console.error('fetchPOConversation error', e)
    } finally {
      setConvLoading(false)
    }
  }, [poId])

  useEffect(() => {
    loadPo()
  }, [loadPo])

  useEffect(() => {
    if (isDesktop || activeTab === 'conversation') {
      loadConv()
    }
  }, [isDesktop, activeTab, loadConv])

  // ─── WebSocket: join / leave PO conversation ──────────────────────────────────
  useEffect(() => {
    if (!po?.conversationId) return
    const convId = po.conversationId
    join(convId)
    return () => leave(convId)
  }, [po?.conversationId, join, leave])

  // ─── WebSocket: handle realtime events ────────────────────────────────────────
  useEffect(() => {
    if (!po?.conversationId) return
    const convId = po.conversationId
    const convEvents = wsEvents[convId] ?? []
    for (const ev of convEvents) {
      const { event, payload } = ev
      if (event === 'conversation:newMessage') {
        const msg = payload as ConversationMessage
        setPoConv((prev) => {
          if (!prev) return prev
          const replaceIdx = prev.messages?.findIndex(
            (m: any) => m.clientMessageId === (msg as any).clientMessageId
          )
          if ((msg as any).clientMessageId && replaceIdx !== undefined && replaceIdx >= 0) {
            const next = [...(prev.messages ?? [])]
            next[replaceIdx] = msg
            return { ...prev, messages: next }
          }
          if (prev.messages?.some((m: any) => m.id === msg.id)) return prev
          return { ...prev, messages: [...(prev.messages ?? []), msg] }
        })
      }
    }
  }, [wsEvents, po?.conversationId])

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.primary} size="large" /></View>
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
  const paymentStatus = po.paymentStatus ?? 'PENDING'
  const paymentColor = PAYMENT_STATUS_COLORS[paymentStatus]
  const receipt = po.receiptSnapshot
  const conversation = po.conversation ?? poConv

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

  const openReceiptPdf = () => {
    if (receipt?.pdfUrl) {
      Linking.openURL(receipt.pdfUrl)
    }
  }

  const downloadReceipt = () => {
    if (!receipt) {
      Alert.alert('No Receipt', 'Receipt is not yet available.')
      return
    }
    if (receipt.pdfUrl) {
      Linking.openURL(receipt.pdfUrl)
    } else {
      Alert.alert('No PDF', 'PDF download is not available.')
    }
  }

  // ─── Scenario B: Start a conversation on this PO ──────────────────────────────────
  const handleStartConversation = async () => {
    if (!poId) return
    try {
      const result = await startPOConversation(poId)
      if (result.success && result.conversationId) {
        setPo((prev) => prev ? { ...prev, conversationId: result.conversationId } as PurchaseOrder : prev)
        showToast('Conversation started', 'success')
      }
    } catch (e: any) {
      if (__DEV__) console.error('startPOConversation error', e)
      showToast(e.message ?? 'Failed to start conversation', 'error')
    }
  }

  // ─── Scenario C: Prepare & Send Receipt ──────────────────────────────────────────
  const handleSendReceipt = async () => {
    if (!poId || !receiptAmount || !paymentMethod) {
      Alert.alert('Missing Fields', 'Please enter an amount and payment method.')
      return
    }

    // Upload the selected receipt file if we haven't already
    let pdfUrl = receiptUrl
    if (receiptFile && !pdfUrl) {
      setUploadingReceipt(true)
      try {
        const orgId = String(po.supplierOrg?.id ?? user?.orgId ?? 0)
        const result = await MediaService.uploadMedia(receiptFile, orgId)
        pdfUrl = result.publicUrl
        setReceiptUrl(pdfUrl)
      } catch (e: any) {
        if (__DEV__) console.error('Receipt upload error', e)
        showToast(e.message ?? 'Failed to upload receipt PDF', 'error')
        return
      } finally {
        setUploadingReceipt(false)
      }
    }

    try {
      const updated = await sendPoReceipt({
        poId: po.id,
        totalAmount: Number(receiptAmount),
        paymentMethod,
        paymentReference: paymentReference || undefined,
        pdfUrl: pdfUrl || undefined,
      })
      setPo(updated)
      setShowReceiptModal(false)
      showToast('Receipt sent and uploaded to conversation', 'success')
    } catch (e: any) {
      if (__DEV__) console.error('sendPoReceipt error', e)
      showToast(e.message ?? 'Failed to send receipt', 'error')
    }
  }

  // ─── Scenario E: Pick an attachment for a chat message ────────────────────────────
  const handlePickAttachment = async () => {
    try {
      const file = await pickImage()
      if (file) {
        setSelectedAttachment(file)
      }
    } catch (e: any) {
      if (__DEV__) console.error('pickImage error', e)
      showToast(e.message ?? 'Failed to pick file', 'error')
    }
  }

  const handleRemoveAttachment = () => {
    setSelectedAttachment(null)
  }

  // ─── Scenario C: View receipt details from a conversation event ──────────────────
  const handleViewReceiptFromMessage = (msg: any) => {
    const meta = msg.metadata ?? {}
    const snapshot: ReceiptSnapshot = {
      receiptId: meta.receiptId ?? null,
      totalAmount: meta.totalAmount ?? 0,
      paymentMethod: meta.paymentMethod ?? 'Unknown',
      paymentReference: meta.paymentReference ?? null,
      paidAt: meta.paidAt ?? null,
      pdfUrl: meta.receiptUrl ?? meta.pdfUrl ?? null,
    }
    setPo((prev) => prev ? { ...prev, receiptSnapshot: snapshot, paymentStatus: 'PAID' } as PurchaseOrder : prev)
  }

  // ─── Update sendMessage to include selected attachment ──────────────────────────
  const handleSendMessageWithAttachment = async () => {
    if (!poId) return
    if (!messageText.trim() && !selectedAttachment) return

    let attachmentUrls: string[] = []

    if (selectedAttachment) {
      setAttachmentUploading(true)
      try {
        const orgId = String(po.supplierOrg?.id ?? user?.orgId ?? 0)
        const result = await MediaService.uploadMedia(selectedAttachment, orgId)
        attachmentUrls = [result.publicUrl]
        setSelectedAttachment(null)
      } catch (e: any) {
        if (__DEV__) console.error('Attachment upload error', e)
        showToast(e.message ?? 'Failed to upload attachment', 'error')
        setAttachmentUploading(false)
        return
      } finally {
        setAttachmentUploading(false)
      }
    }

    setSending(true)
    const clientMessageId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    try {
      const msg = await sendPoMessage(poId, messageText.trim(), attachmentUrls, clientMessageId)

      // Canonical-shaped optimistic message — mirrors the WS payload shape
      // so identity (sender name/role) renders correctly right away.
      const optimisticMsg = {
        ...msg,
        clientMessageId,
        senderId: `org:${supplierOrgId}`,
        senderName: 'You',
        senderRole: 'SUPPLIER',
        senderAgentId: null,
        senderOrgId: supplierOrgId,
      }

      setPoConv((prev) => {
        const base = prev ?? { ...(conversation as any), messages: conversation?.messages ?? [] }
        // Skip if the WS event already delivered this exact message.
        if (base.messages?.some((m: any) => m.id === msg.id)) return base
        return { ...base, messages: [...(base.messages ?? []), optimisticMsg] }
      })

      setMessageText('')
      showToast('Message sent', 'success')
    } catch (e: any) {
      if (__DEV__) console.error('sendPoMessage error', e)
      showToast(e.message ?? 'Failed to send message', 'error')
    } finally {
      setSending(false)
    }
  }

  const inputStyle = { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, backgroundColor: colors.background, color: colors.text, fontSize: 14 }
  const labelStyle = { fontSize: 12, fontWeight: '600' as const, color: colors.textSecondary, marginBottom: 4 }
  const supplierOrgId = po.supplierOrg?.id ?? user?.orgId ?? 0

  // ─── Info panels ───────────────────────────────────────────────────────────────

  const buyerInfoCard = (
    <Panel title="Buyer Information" icon={Building2}>
      <View style={{ gap: 10 }}>
        <InfoRow label="Buyer" value={po.agent?.fullname ?? po.buyerOrg?.name ?? 'Unknown Buyer'} />
        <InfoRow label="Organization" value={po.buyerOrg?.name ?? '—'} />
        <InfoRow label="Outlet" value={po.outlet?.name ?? '—'} />
        <InfoRow label="Address" value={po.outlet?.address ?? '—'} />
        <InfoRow label="Order Date" value={formatDate(po.createdAt)} />
        {po.requestedDate && <InfoRow label="Requested Date" value={formatDate(po.requestedDate)} />}
      </View>
    </Panel>
  )

  const paymentCard = (
    <Panel title="Payment" icon={Banknote}>
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>Status</Text>
          <View style={{
            backgroundColor: `${paymentColor}20`,
            paddingHorizontal: 10,
            paddingVertical: 3,
            borderRadius: 20,
          }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: paymentColor }}>{PAYMENT_STATUS_LABELS[paymentStatus]}</Text>
          </View>
        </View>
        <InfoRow label="Merchandise Subtotal" value={formatPHP(po.subtotalAmount)} />
        {po.vatAmount > 0 && <InfoRow label="VAT" value={formatPHP(po.vatAmount)} />}
        <InfoRow label="Additional Charges" value={formatPHP(po.extraChargesTotal)} />
        {(po.extraCharges ?? []).map((charge, index) => <InfoRow key={`${charge.code}-${index}`} label={charge.label} value={formatPHP(charge.amount)} />)}
        <InfoRow label="Grand Total" value={formatPHP(po.totalAmount)} />
        {receipt?.paymentReference && <InfoRow label="Payment Ref" value={String(receipt.paymentReference)} />}
        {receipt?.paidAt && <InfoRow label="Paid At" value={formatDate(receipt.paidAt)} />}
      </View>
    </Panel>
  )

  const receiptCard = receipt ? (
    <Panel title="Receipt" icon={Receipt}>
      <View style={{ gap: 12 }}>
        {receipt.receiptId && <InfoRow label="Receipt #" value={receipt.receiptId} />}
        {receipt.totalAmount != null && <InfoRow label="Amount Paid" value={formatPHP(receipt.totalAmount)} />}
        {receipt.paymentMethod && <InfoRow label="Method" value={receipt.paymentMethod} />}
        {receipt.paymentReference && <InfoRow label="Reference" value={receipt.paymentReference} />}
        {receipt.paidAt && <InfoRow label="Date" value={formatDate(receipt.paidAt)} />}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {receipt.pdfUrl && (
            <TouchableOpacity
              onPress={() => Linking.openURL(receipt.pdfUrl!)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingVertical: 10,
                paddingHorizontal: 14,
                backgroundColor: colors.primary + '10',
                borderRadius: 10,
              }}
            >
              <Download size={16} color={colors.primary} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>View Receipt</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={downloadReceipt}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingVertical: 10,
              paddingHorizontal: 14,
              backgroundColor: colors.surface,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Download size={16} color={colors.textSecondary} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>Download PDF</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Panel>
  ) : (
    <Panel title="Receipt" icon={Receipt}>
      {!po.conversationId ? (
        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>
            This PO has no conversation yet. Start a conversation to upload receipts.
          </Text>
          <TouchableOpacity
            onPress={handleStartConversation}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingVertical: 10,
              paddingHorizontal: 16,
              backgroundColor: colors.primary,
              borderRadius: 10,
              alignSelf: 'flex-start',
            }}
          >
            <MessageCircle size={16} color="#fff" />
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>Start Conversation</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          onPress={() => {
            setReceiptAmount(String(po.totalAmount))
            setPaymentMethod('Cash')
            setPaymentReference('')
            setReceiptFile(null)
            setReceiptUrl(null)
            setShowReceiptModal(true)
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingVertical: 10,
          }}
        >
          <Receipt size={16} color={colors.primary} />
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>Prepare & Send Receipt</Text>
        </TouchableOpacity>
      )}
    </Panel>
  )

  const renderConversationPanel = (fill: boolean) => (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
        flex: 1,
        minHeight: fill ? undefined : isDesktop ? 560 : 320,
        maxHeight: fill ? undefined : isDesktop ? 720 : 420,
      }}
    >
      {/* Header */}
      <View style={{
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      }}>
        <View style={{
          width: 28, height: 28, borderRadius: 14,
          backgroundColor: colors.primary + '15',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <MessageCircle size={14} color={colors.primary} />
        </View>
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Conversation</Text>
        {(conversation?.messages?.length ?? 0) > 0 && (
          <View style={{
            backgroundColor: colors.primary,
            borderRadius: 10,
            paddingHorizontal: 6,
            paddingVertical: 2,
            minWidth: 20,
            alignItems: 'center',
          }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>
              {conversation?.messages?.length ?? 0}
            </Text>
          </View>
        )}
      </View>

      {/* Message list */}
      <View style={{ flex: 1, backgroundColor: colors.background + '40' }}>
        {convLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={colors.primary} size="small" />
          </View>
        ) : (
          <ConversationMessageList
            messages={(conversation?.messages ?? []) as any[]}
            offers={(conversation?.offers ?? []) as any[]}
            participants={(conversation?.participants ?? []) as any[]}
            supplierOrgId={supplierOrgId}
            buyerAgent={po.agent as any}
            vatRate={0.12}
            isVatExempt={false}
            unit="pcs"
            onAcceptOffer={() => { }}
            onCounterOffer={() => { }}
            onRejectOffer={() => { }}
            onReceiptPress={handleViewReceiptFromMessage}
          />
        )}
      </View>

      {/* Composer — modern pill-shaped, iMessage-style */}
      {conversation && (
        <View style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: 8,
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
        }}>
          <TouchableOpacity
            onPress={handlePickAttachment}
            disabled={attachmentUploading}
            style={{
              width: 38, height: 38, borderRadius: 19,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: colors.background,
            }}
          >
            {attachmentUploading ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <Paperclip size={17} color={colors.textSecondary} />
            )}
          </TouchableOpacity>

          <View style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'flex-end',
            backgroundColor: colors.background,
            borderRadius: 22,
            borderWidth: 1,
            borderColor: colors.border,
            paddingLeft: 16,
            paddingRight: 6,
            paddingVertical: 4,
            gap: 8,
          }}>
            {selectedAttachment && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                backgroundColor: colors.surface, borderRadius: 10,
                paddingHorizontal: 8, paddingVertical: 4, maxWidth: 110, marginBottom: 6,
              }}>
                <FileText size={11} color={colors.textSecondary} />
                <Text style={{ fontSize: 10, color: colors.textSecondary }} numberOfLines={1}>
                  {selectedAttachment.name}
                </Text>
                <TouchableOpacity onPress={handleRemoveAttachment}>
                  <X size={11} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}

            <TextInput
              value={messageText}
              onChangeText={setMessageText}
              placeholder="Type a message..."
              placeholderTextColor={colors.textSecondary}
              style={{
                flex: 1,
                color: colors.text,
                fontSize: 14,
                paddingVertical: Platform.OS === 'ios' ? 10 : 8,
                maxHeight: 100,
              }}
              multiline
              maxLength={500}
            />

            <TouchableOpacity
              onPress={handleSendMessageWithAttachment}
              disabled={sending || attachmentUploading || (!messageText.trim() && !selectedAttachment)}
              style={{
                width: 34, height: 34, borderRadius: 17, marginBottom: 3,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: colors.primary,
                opacity: sending || attachmentUploading || (!messageText.trim() && !selectedAttachment) ? 0.35 : 1,
              }}
            >
              {sending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Send size={15} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  )

  // ─── Prepare & Send Receipt Modal ──────────────────────────────────────────────
  const receiptModal = (
    <Modal
      visible={showReceiptModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowReceiptModal(false)}
    >
      <View style={{ flex: 1, backgroundColor: '#00000040', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <View style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 20, width: '100%', maxWidth: 420, maxHeight: '80%' }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 16 }}>Prepare & Send Receipt</Text>

          <View style={{ gap: 14 }}>
            <View>
              <Text style={labelStyle}>Amount Paid *</Text>
              <TextInput
                value={receiptAmount}
                onChangeText={setReceiptAmount}
                placeholder={String(po.totalAmount)}
                placeholderTextColor={colors.textSecondary}
                style={inputStyle}
                keyboardType="numeric"
              />
            </View>

            <View>
              <Text style={labelStyle}>Payment Method *</Text>
              <TextInput
                value={paymentMethod}
                onChangeText={setPaymentMethod}
                placeholder="e.g. Cash, GCash, Bank Transfer"
                placeholderTextColor={colors.textSecondary}
                style={inputStyle}
              />
            </View>

            <View>
              <Text style={labelStyle}>Reference Number (optional)</Text>
              <TextInput
                value={paymentReference}
                onChangeText={setPaymentReference}
                placeholder="e.g. OR-12345"
                placeholderTextColor={colors.textSecondary}
                style={inputStyle}
              />
            </View>

            <View>
              <Text style={labelStyle}>Receipt PDF / Photo</Text>
              {receiptFile ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.background, borderRadius: 10, padding: 10 }}>
                  <FileText size={16} color={colors.textSecondary} />
                  <Text style={{ fontSize: 12, color: colors.text, flex: 1 }} numberOfLines={1}>{receiptFile.name}</Text>
                  <TouchableOpacity onPress={() => { setReceiptFile(null); setReceiptUrl(null) }}>
                    <X size={14} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={async () => {
                    const file = await pickImage()
                    if (file) {
                      setReceiptFile(file)
                    }
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    backgroundColor: colors.background,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderStyle: 'dashed',
                    borderColor: colors.border,
                    justifyContent: 'center',
                  }}
                >
                  <Upload size={18} color={colors.textSecondary} />
                  <Text style={{ fontSize: 13, color: colors.textSecondary }}>Choose Receipt Image</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
            <TouchableOpacity
              onPress={() => setShowReceiptModal(false)}
              style={{ flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSendReceipt}
              disabled={uploadingReceipt || !receiptAmount || !paymentMethod}
              style={{ flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: colors.primary, opacity: uploadingReceipt || !receiptAmount || !paymentMethod ? 0.5 : 1 }}
            >
              {uploadingReceipt ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Send Receipt</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header — always visible, never scrolls or gets pushed out */}
      <View style={{
        paddingHorizontal: horizontalPadding,
        paddingTop: 20,
        paddingBottom: 12,
        width: '100%',
        maxWidth: contentMaxWidth,
        alignSelf: 'center',
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={{ padding: 6, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
              <ArrowLeft size={20} color={colors.text} />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: isDesktop ? 22 : 18, fontWeight: '800', color: colors.text, letterSpacing: -0.3 }}>{po.poNumber}</Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{STATUS_LABELS[po.status]}</Text>
          </View>
          <View style={{ backgroundColor: `${statusColor}20`, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: statusColor }}>{STATUS_LABELS[po.status]}</Text>
          </View>
          <TouchableOpacity onPress={loadPo} style={{ padding: 8, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
            <RefreshCw size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {!isDesktop && (
          <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginTop: 16 }}>
            <TouchableOpacity
              onPress={() => setActiveTab('details')}
              style={{ flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: activeTab === 'details' ? colors.primary : 'transparent' }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: activeTab === 'details' ? '#fff' : colors.textSecondary }}>Details</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab('conversation')}
              style={{ flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: activeTab === 'conversation' ? colors.primary : 'transparent' }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: activeTab === 'conversation' ? '#fff' : colors.textSecondary }}>Conversation</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Details (mobile) / always (desktop): normal scrollable content */}
      {(isDesktop || activeTab === 'details') && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: horizontalPadding,
            paddingBottom: 24,
            gap: 20,
            width: '100%',
            maxWidth: contentMaxWidth,
            alignSelf: 'center',
          }}
          showsVerticalScrollIndicator={false}
        >
          {isDesktop ? (
            <View style={{ flexDirection: 'row', gap: 20, alignItems: 'flex-start' }}>
              {/* Left rail: all info cards, scrolls together, fixed width */}
              <View style={{ width: 380, gap: 12 }}>
                {po.notes && (
                  <Panel title="Notes" icon={Tag}>
                    <Text style={{ fontSize: 13, color: colors.text }}>{po.notes}</Text>
                  </Panel>
                )}
                {buyerInfoCard}
                {paymentCard}
                {receiptCard}

                {/* Line Items */}
                <View style={{ backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 10 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 4 }}>
                    Line Items ({po.lineItems?.length ?? 0})
                  </Text>
                  {(po.lineItems ?? []).map((li, idx) => (
                    <View key={li.id}>
                      {idx > 0 && <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 8 }} />}
                      <View style={{ gap: 4 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                          {li.supplierItem?.name ?? li.itemName ?? 'Unknown Item'}
                        </Text>
                        {li.supplierItem?.sku && <Text style={{ fontSize: 12, color: colors.textSecondary }}>SKU: {li.supplierItem.sku}</Text>}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 13, color: colors.textSecondary }}>{li.qty} × {formatPHP(li.unitPrice)}</Text>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{formatPHP(li.subtotal)}</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Summary */}
                <View style={{ backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 8 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 4 }}>Summary</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 13, color: colors.textSecondary }}>VAT</Text>
                    <Text style={{ fontSize: 13, color: colors.text }}>{formatPHP(po.vatAmount)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>Total</Text>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.primary }}>{formatPHP(po.totalAmount)}</Text>
                  </View>
                </View>

                {/* Delivery Info */}
                {po.delivery && (
                  <Panel title="Delivery Info" icon={Calendar}>
                    <InfoRow label="Scheduled" value={formatDate(po.delivery.scheduledDate)} />
                    {po.delivery.driverName && <InfoRow label="Driver" value={po.delivery.driverName} />}
                    {po.delivery.driverContact && <InfoRow label="Contact" value={po.delivery.driverContact} />}
                    {po.delivery.recipientName && <InfoRow label="Recipient" value={po.delivery.recipientName} />}
                    {po.delivery.recipientContact && <InfoRow label="Recipient contact" value={po.delivery.recipientContact} />}
                    <InfoRow label="Status" value={po.delivery.status} />
                    {po.delivery.address && <InfoRow label="Address" value={po.delivery.address} />}
                    {po.delivery.notes && <InfoRow label="Instructions" value={po.delivery.notes} />}
                    {po.delivery.latitude != null && po.delivery.longitude != null && <TouchableOpacity onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${po.delivery!.latitude},${po.delivery!.longitude}`)}><Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>View on Map</Text></TouchableOpacity>}
                  </Panel>
                )}

                {/* Accept / Reject */}
                {isPending && (
                  <View style={{ gap: 10 }}>
                    <View style={{ backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 12 }}>
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

                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity onPress={handleAccept} disabled={accepting || rejecting}
                        style={{ flex: 1, backgroundColor: '#22C55E', paddingVertical: 13, borderRadius: 10, alignItems: 'center', opacity: accepting || rejecting ? 0.6 : 1 }}>
                        {accepting ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>✓ Accept</Text>}
                      </TouchableOpacity>

                      <TouchableOpacity onPress={handleReject} disabled={accepting || rejecting}
                        style={{ flex: 1, backgroundColor: '#EF444420', borderWidth: 1, borderColor: '#EF4444', paddingVertical: 13, borderRadius: 10, alignItems: 'center', opacity: accepting || rejecting ? 0.6 : 1 }}>
                        {rejecting ? <ActivityIndicator color="#EF4444" /> : <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 14 }}>✗ Reject</Text>}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              {/* Right column: conversation, full height matching the row */}
              <View style={{ flex: 1, alignSelf: 'stretch', minHeight: 700 }}>
                {renderConversationPanel(true)}
              </View>
            </View>
          ) : (
            // Mobile/tablet: unchanged — Details tab shows info cards only, no conversation
            <View style={{ gap: 20 }}>
              {po.notes && (
                <Panel title="Notes" icon={Tag}>
                  <Text style={{ fontSize: 13, color: colors.text }}>{po.notes}</Text>
                </Panel>
              )}
              {buyerInfoCard}
              {paymentCard}
              {receiptCard}
              <View style={{ backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 10 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 4 }}>
                  Line Items ({po.lineItems?.length ?? 0})
                </Text>
                {(po.lineItems ?? []).map((li, idx) => (
                  <View key={li.id}>
                    {idx > 0 && <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 8 }} />}
                    <View style={{ gap: 4 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                        {li.supplierItem?.name ?? li.itemName ?? 'Unknown Item'}
                      </Text>
                      {li.supplierItem?.sku && <Text style={{ fontSize: 12, color: colors.textSecondary }}>SKU: {li.supplierItem.sku}</Text>}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 13, color: colors.textSecondary }}>{li.qty} × {formatPHP(li.unitPrice)}</Text>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{formatPHP(li.subtotal)}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
              <View style={{ backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 4 }}>Summary</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, color: colors.textSecondary }}>VAT</Text>
                  <Text style={{ fontSize: 13, color: colors.text }}>{formatPHP(po.vatAmount)}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>Total</Text>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.primary }}>{formatPHP(po.totalAmount)}</Text>
                </View>
              </View>
              {po.delivery && (
                <Panel title="Delivery Info" icon={Calendar}>
                  <InfoRow label="Scheduled" value={formatDate(po.delivery.scheduledDate)} />
                  {po.delivery.driverName && <InfoRow label="Driver" value={po.delivery.driverName} />}
                  {po.delivery.driverContact && <InfoRow label="Contact" value={po.delivery.driverContact} />}
                  {po.delivery.recipientName && <InfoRow label="Recipient" value={po.delivery.recipientName} />}
                  {po.delivery.recipientContact && <InfoRow label="Recipient contact" value={po.delivery.recipientContact} />}
                  <InfoRow label="Status" value={po.delivery.status} />
                  {po.delivery.address && <InfoRow label="Address" value={po.delivery.address} />}
                  {po.delivery.notes && <InfoRow label="Instructions" value={po.delivery.notes} />}
                  {po.delivery.latitude != null && po.delivery.longitude != null && <TouchableOpacity onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${po.delivery!.latitude},${po.delivery!.longitude}`)}><Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>View on Map</Text></TouchableOpacity>}
                </Panel>
              )}
              {isPending && (
                <View style={{ gap: 10 }}>
                  <View style={{ backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 12 }}>
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
            </View>
          )}
        </ScrollView>
      )}

      {/* Conversation tab (mobile only): true flex:1, fills remaining screen height */}
      {!isDesktop && activeTab === 'conversation' && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, paddingHorizontal: horizontalPadding, paddingBottom: 12 }}
        >
          {renderConversationPanel(true)}
        </KeyboardAvoidingView>
      )}

      {receiptModal}
    </View>
  )
}
