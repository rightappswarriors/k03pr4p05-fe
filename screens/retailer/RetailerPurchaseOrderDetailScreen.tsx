import React, { useCallback, useEffect, useState } from 'react'
import { Alert, Modal, Platform, Pressable, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import { ArrowLeft, Banknote, Calendar, CheckCircle2, CreditCard, MapPin, MessageCircle, RefreshCw, Send } from 'lucide-react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'

import { EmptyState } from '@/components/DataTable'
import { OrderCardSkeletonList } from '@/components/LoadingSkeleton'
import { LocationMapPreview } from '@/components/LocationMapPreview'
import { MapPinPicker } from '@/components/MapPinPicker'
import DateTimePicker, { type DateTimePickerChangeEvent } from '@/components/DateTimePicker'
import { ConversationMessageList } from '@/components/supplier/rfq/ConversationMessageList'
import { useConversation } from '@/contexts/ConversationContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useToast } from '@/contexts/ToastContext'
import { useSocket } from '@/contexts/SocketContext'
import { acceptSupplierPurchaseOrderDeliveryDate, cancelRetailerPurchaseOrder, confirmRetailerPurchaseOrderDeliveryLocation, createRetailerMayaCheckout, getPurchaseOrderCancellationState, getRetailerPurchaseOrder, getRetailerPurchaseOrderPaymentEligibility, reconcileRetailerMayaPayment, requestDifferentPurchaseOrderDeliveryDate, setRetailerPurchaseOrderPaymentMethod, type MayaCheckoutResult, type PurchaseOrderCancellationState, type RetailerPurchaseOrder, type RetailerPurchaseOrderPaymentEligibility } from '@/services/retailerOrderingService'
import { fetchPOConversation, sendPoMessage, type POConversationDetail } from '@/services/supplierService/supplierService'
import { DeliveryAgreementCountdown, formatDeliveryAgreementDeadline } from '@/components/DeliveryAgreementCountdown'

const money = (value: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value)
const displayStatus = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
const formatDate = (value: string) => new Date(value).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
const toDateOnly = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const toPickerDate = (value?: string | null) => value ? new Date(`${value.slice(0, 10)}T00:00:00`) : new Date()

export default function RetailerPurchaseOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { colors } = useTheme()
  const toast = useToast()
  const { subscribe } = useSocket()
  const { events, join, leave } = useConversation()
  const { width } = useWindowDimensions()
  const [po, setPo] = useState<RetailerPurchaseOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [paying, setPaying] = useState(false)
  const [attempt, setAttempt] = useState<MayaCheckoutResult | null>(null)
  const [conversation, setConversation] = useState<POConversationDetail | null>(null)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [eligibility, setEligibility] = useState<RetailerPurchaseOrderPaymentEligibility | null>(null)
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [deliveryInstructions, setDeliveryInstructions] = useState('')
  const [deliveryPin, setDeliveryPin] = useState<{ latitude: number; longitude: number } | null>(null)
  const [savingLocation, setSavingLocation] = useState(false)
  const [selectingCod, setSelectingCod] = useState(false)
  const [cancellation, setCancellation] = useState<PurchaseOrderCancellationState | null>(null)
  const [showCancellation, setShowCancellation] = useState(false)
  const [cancellationReason, setCancellationReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [agreementBusy, setAgreementBusy] = useState(false)
  const [showDateRequest, setShowDateRequest] = useState(false)
  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState('')
  const load = useCallback(async () => {
    if (!id) return
    try {
      const [nextPo, nextConversation, nextEligibility, nextCancellation] = await Promise.all([getRetailerPurchaseOrder(id), fetchPOConversation(id), getRetailerPurchaseOrderPaymentEligibility(id), getPurchaseOrderCancellationState(id).catch(() => null)])
      setPo(nextPo)
      setConversation(nextConversation)
      setEligibility(nextEligibility)
      setCancellation(nextCancellation)
      setDeliveryAddress(nextPo.delivery?.address ?? nextPo.outlet?.address ?? '')
      setDeliveryInstructions(nextPo.delivery?.notes ?? '')
      const latitude = nextPo.delivery?.latitude ?? nextPo.outlet?.latitude
      const longitude = nextPo.delivery?.longitude ?? nextPo.outlet?.longitude
      setDeliveryPin(typeof latitude === 'number' && typeof longitude === 'number' ? { latitude, longitude } : null)
    }
    catch (error: any) { Alert.alert('Unable to load Purchase Order', error?.message ?? 'Please try again.') }
    finally { setLoading(false); setRefreshing(false) }
  }, [id])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    const unsubscribe = subscribe((event) => {
      if (event.event?.startsWith('purchaseOrder:') && event.payload?.poId === id) void load()
    })
    return () => { unsubscribe() }
  }, [id, load, subscribe])
  useEffect(() => {
    if (!po?.conversationId) return
    join(po.conversationId)
    return () => leave(po.conversationId!)
  }, [po?.conversationId, join, leave])
  useEffect(() => {
    if (!po?.conversationId) return
    for (const item of events[po.conversationId] ?? []) {
      if (item.event !== 'conversation:newMessage' || !item.payload?.id) continue
      setConversation((current) => current && !current.messages.some((candidate) => candidate.id === item.payload.id)
        ? { ...current, messages: [...current.messages, item.payload] }
        : current)
    }
  }, [events, po?.conversationId])
  const reconciliationPending = attempt?.reconciliationRequired || po?.paymentAttemptStatus === 'RECONCILIATION_REQUIRED'
  const processing = attempt?.transactionStatus === 'PROCESSING' || po?.paymentAttemptStatus === 'PROCESSING'
  const eligible = Boolean(eligibility?.mayaEligible && !reconciliationPending && po?.paymentStatus !== 'PAID')
  const paymentLabel = po?.paymentStatus === 'PAID' || attempt?.transactionStatus === 'SUCCEEDED'
    ? 'Payment Confirmed'
    : reconciliationPending ? 'Payment verification pending'
      : paying ? 'Creating checkout…'
        : attempt?.checkoutReusable ? 'Continue Payment'
          : attempt?.canRetry ? 'Retry Payment'
            : processing ? 'Check / Retry Payment'
              : eligible ? 'Proceed to Payment'
          : 'Awaiting Supplier Confirmation'
  const pay = async () => {
    if (!po) return
    try {
      setPaying(true)
      let next = await createRetailerMayaCheckout(po.id)
      setAttempt(next)
      if (next.checkoutReusable && next.checkoutUrl) {
        if (Platform.OS === 'web') {
          window.location.assign(next.checkoutUrl)
          return
        }
        await WebBrowser.openBrowserAsync(next.checkoutUrl)
        next = await reconcileRetailerMayaPayment(next.transactionId)
        setAttempt(next)
      }
      if (next.transactionStatus === 'SUCCEEDED') { toast.show('Payment confirmed.', 'success'); await load() }
      else if (next.reconciliationRequired) toast.show('Maya payment verification is pending.', 'warning')
      else if (next.canRetry) toast.show('The payment was not completed. You may safely retry.', 'warning')
    } catch (error: any) { Alert.alert('Unable to start payment', error?.message ?? 'Please try again.') }
    finally { setPaying(false) }
  }
  const sendMessage = async () => {
    if (!po || !message.trim() || sending) return
    try {
      setSending(true)
      const sent = await sendPoMessage(po.id, message.trim(), undefined, `retailer-${Date.now()}`)
      setConversation((current) => current ? { ...current, messages: [...current.messages, sent] } : current)
      setMessage('')
    } catch (error: any) { Alert.alert('Unable to send message', error?.message ?? 'Please try again.') }
    finally { setSending(false) }
  }
  const confirmLocation = async () => {
    if (!po || !deliveryPin || !deliveryAddress.trim()) {
      Alert.alert('Delivery location required', 'Select a map pin and enter the delivery address.')
      return
    }
    try {
      setSavingLocation(true)
      await confirmRetailerPurchaseOrderDeliveryLocation({ purchaseOrderId: po.id, address: deliveryAddress.trim(), latitude: deliveryPin.latitude, longitude: deliveryPin.longitude, instructions: deliveryInstructions.trim() || undefined })
      toast.show('Delivery address confirmed.', 'success')
      await load()
    } catch (error: any) { Alert.alert('Unable to confirm delivery address', error?.message ?? 'Please try again.') }
    finally { setSavingLocation(false) }
  }
  const chooseCod = async () => {
    if (!po) return
    try {
      setSelectingCod(true)
      setPo(await setRetailerPurchaseOrderPaymentMethod(po.id, 'CASH'))
      setEligibility(await getRetailerPurchaseOrderPaymentEligibility(po.id))
      toast.show('Cash on Delivery selected.', 'success')
    } catch (error: any) { Alert.alert('Cash on Delivery unavailable', error?.message ?? 'Please choose prepaid payment.') }
    finally { setSelectingCod(false) }
  }
  const submitCancellation = async () => {
    if (!po || cancelling || cancellationReason.trim().length < 5) return
    try {
      setCancelling(true)
      const next = await cancelRetailerPurchaseOrder(po.id, cancellationReason.trim())
      setCancellation(next)
      await load()
      setShowCancellation(false)
      toast.show(next.orderStatus === 'CANCELLED' ? 'Purchase Order cancelled.' : 'Cancellation request sent to the Supplier.', 'success')
    } catch (error: any) { Alert.alert('Unable to cancel Purchase Order', error?.message ?? 'No order or payment state was changed. Please try again.') }
    finally { setCancelling(false) }
  }
  const acceptDeliveryDate = async () => {
    if (!po || agreementBusy) return
    try {
      setAgreementBusy(true)
      await acceptSupplierPurchaseOrderDeliveryDate(po.id)
      toast.show('Delivery schedule accepted.', 'success')
      await load()
    } catch (error: any) { Alert.alert('Unable to accept delivery date', error?.message ?? 'No delivery schedule was changed.') }
    finally { setAgreementBusy(false) }
  }
  const requestDifferentDate = async () => {
    if (!po || !requestedDeliveryDate || agreementBusy) return
    try {
      setAgreementBusy(true)
      await requestDifferentPurchaseOrderDeliveryDate(po.id, new Date(`${requestedDeliveryDate}T00:00:00.000Z`).toISOString())
      setShowDateRequest(false)
      toast.show('Delivery date request sent to the Supplier.', 'success')
      await load()
    } catch (error: any) { Alert.alert('Unable to request delivery date', error?.message ?? 'No delivery schedule was changed.') }
    finally { setAgreementBusy(false) }
  }

  if (loading) return <View style={{ flex: 1, padding: 20, backgroundColor: colors.background }}><OrderCardSkeletonList count={3} /></View>
  if (!po) return <View style={{ flex: 1, padding: 20, backgroundColor: colors.background }}><EmptyState title="Purchase Order not found" message="You may no longer have access to this record." /></View>
  const supplierAccepted = Boolean(eligibility?.supplierAccepted)
  const addressConfirmed = Boolean(eligibility?.deliveryAddressConfirmed)
  const deliveryDateAgreed = Boolean(eligibility?.deliveryDateAgreed)
  const directCancellation = ['PENDING', 'SUPPLIER_ACCEPTED', 'ACCEPTED'].includes(po.status)
  const requestCancellation = ['PREPARING', 'READY_FOR_DISPATCH'].includes(po.status)
  const canStartCancellation = !cancellation?.cancellation || cancellation.cancellation.status === 'REJECTED'
  const cancellationLabel = directCancellation && po.paymentStatus === 'PAID' ? 'Cancel & Request Refund' : directCancellation ? 'Cancel Order' : 'Request Cancellation'
  return <><ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: width >= 1024 ? 28 : 16, gap: 16, maxWidth: 1100, width: '100%', alignSelf: 'center' }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><TouchableOpacity accessibilityLabel="Back to Purchase Orders" onPress={() => router.back()} style={{ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.sidebarMuted }}><ArrowLeft size={18} color={colors.text} /></TouchableOpacity><View style={{ flex: 1 }}><Text style={{ color: colors.text, fontSize: 25, fontWeight: '900' }}>{po.poNumber}</Text><Text style={{ color: colors.textSecondary }}>{po.supplierOrg.name} · {po.outlet?.name ?? 'Retailer outlet unavailable'}</Text></View><TouchableOpacity accessibilityLabel="Refresh Purchase Order" onPress={load} style={{ padding: 10 }}><RefreshCw size={18} color={colors.text} /></TouchableOpacity></View>
    <View style={{ flexDirection: width < 700 ? 'column' : 'row', gap: 10 }}>{[['Order status', displayStatus(po.status)], ['Supplier review', displayStatus(po.supplierConfirmation)], ['Payment status', po.paymentStatus === 'PAID' ? 'Payment Confirmed' : displayStatus(po.paymentAttemptStatus ?? po.paymentStatus)]].map(([label, value]) => <View key={label} style={{ flex: 1, padding: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.card }}><Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '800' }}>{label.toUpperCase()}</Text><Text style={{ color: colors.text, fontWeight: '900', marginTop: 5 }}>{value}</Text></View>)}</View>
    {po.rejectionReason ? <View style={{ borderWidth: 1, borderColor: '#FCA5A5', backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12 }}><Text style={{ color: '#991B1B', fontWeight: '900' }}>Supplier declined this PO</Text><Text style={{ color: '#7F1D1D', marginTop: 4 }}>{po.rejectionReason}</Text></View> : null}
    <View style={{ padding: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.card, gap: 10 }}>
      <Text style={{ color: colors.text, fontSize: 17, fontWeight: '900' }}>Order changes</Text>
      {cancellation?.cancellation ? <><View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}><Text style={{ color: colors.textSecondary }}>Cancellation</Text><Text style={{ color: cancellation.cancellation.status === 'REQUESTED' ? '#D97706' : colors.text, fontWeight: '900' }}>{displayStatus(cancellation.cancellation.status)}</Text></View><Text style={{ color: colors.textSecondary }}>{cancellation.cancellation.reason}</Text></> : null}
      {cancellation?.refund ? <View style={{ borderRadius: 10, padding: 12, backgroundColor: colors.sidebarMuted, gap: 5 }}><Text style={{ color: colors.text, fontWeight: '900' }}>Refund: {displayStatus(cancellation.refund.status)}</Text><Text style={{ color: colors.textSecondary }}>{money(cancellation.refund.amount)} remains tied to the original successful payment. Supplier escrow is not released as available funds while an authoritative refund is pending.</Text></View> : null}
      {(directCancellation || requestCancellation) && canStartCancellation ? <TouchableOpacity disabled={cancelling} onPress={() => setShowCancellation(true)} style={{ minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#DC2626' }}><Text style={{ color: '#DC2626', fontWeight: '900' }}>{cancellationLabel}</Text></TouchableOpacity> : null}
      {cancellation?.cancellation?.status === 'REQUESTED' ? <Text style={{ color: '#D97706' }}>The Supplier must approve or decline this request before fulfillment can continue.</Text> : null}
      {['IN_TRANSIT', 'DELIVERED', 'COMPLETED'].includes(po.status) ? <Text style={{ color: colors.textSecondary }}>Ordinary cancellation is closed at this stage. Use the secured PO conversation below to report a delivery issue and begin the return, refund, or dispute process.</Text> : null}
    </View>
    <View style={{ padding: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.card, gap: 12 }}><Text style={{ color: colors.text, fontSize: 17, fontWeight: '900' }}>Order progress</Text>{[['Supplier Confirmation', supplierAccepted ? 'Accepted' : po.supplierConfirmation === 'DECLINED' ? 'Declined' : 'Waiting for Supplier'], ['Delivery Address', addressConfirmed ? 'Confirmed' : supplierAccepted ? 'Action required' : 'Locked'], ['Delivery Date', displayStatus(po.deliveryDateAgreementStatus)], ['Payment', po.paymentStatus === 'PAID' ? 'Confirmed' : po.paymentMethod === 'CASH' ? 'Cash on Delivery' : addressConfirmed ? 'Action required' : 'Locked'], ['Fulfillment', displayStatus(po.status)], ['Receipt', po.receiptSnapshot ? 'Available' : 'Not available']].map(([label, value]) => <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}><Text style={{ color: colors.textSecondary }}>{label}</Text><Text style={{ color: value === 'Action required' ? '#D97706' : colors.text, fontWeight: '800' }}>{value}</Text></View>)}</View>
    {supplierAccepted ? <View style={{ padding: 16, borderWidth: 1, borderColor: deliveryDateAgreed ? '#22C55E' : '#F59E0B', borderRadius: 14, backgroundColor: colors.card, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Calendar size={18} color={deliveryDateAgreed ? '#16A34A' : '#D97706'} /><Text style={{ color: colors.text, fontSize: 17, fontWeight: '900' }}>Delivery Schedule</Text>{deliveryDateAgreed ? <CheckCircle2 size={17} color="#16A34A" /> : null}</View>
      {po.deliveryDateAgreementStatus === 'PENDING_BUYER' ? <><Text style={{ color: colors.textSecondary }}>Supplier proposed</Text><Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>{po.supplierExpectedDeliveryAt ? formatDate(po.supplierExpectedDeliveryAt) : 'Date unavailable'}</Text>{po.deliveryDateResponseDeadlineAt ? <><Text style={{ color: colors.textSecondary }}>Please respond by {formatDeliveryAgreementDeadline(po.deliveryDateResponseDeadlineAt)}.</Text><DeliveryAgreementCountdown deadline={po.deliveryDateResponseDeadlineAt} audience="BUYER" color="#B45309" onExpired={() => void load()} /><Text style={{ color: colors.textSecondary }}>If you do not respond before the deadline, this delivery schedule will be automatically accepted. Chat messages do not change the agreement.</Text></> : <Text style={{ color: '#B91C1C' }}>{po.buyerOrg.id === po.supplierOrg.id ? 'Delivery agreement requires account review.' : 'This legacy delivery agreement has no automatic response deadline and requires your response.'}</Text>}<View style={{ flexDirection: width < 600 ? 'column' : 'row', gap: 10 }}><TouchableOpacity disabled={agreementBusy || !po.supplierExpectedDeliveryAt || cancellation?.cancellation?.status === 'REQUESTED'} onPress={acceptDeliveryDate} style={{ flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#16A34A', opacity: agreementBusy || !po.supplierExpectedDeliveryAt ? .5 : 1 }}><Text style={{ color: '#fff', fontWeight: '900' }}>{agreementBusy ? 'Saving...' : 'Accept Delivery Date'}</Text></TouchableOpacity><TouchableOpacity disabled={agreementBusy || cancellation?.cancellation?.status === 'REQUESTED'} onPress={() => { setRequestedDeliveryDate((po.supplierExpectedDeliveryAt ?? po.requestedDate ?? '').slice(0, 10)); setShowDateRequest(true) }} style={{ flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: colors.primary }}><Text style={{ color: colors.primary, fontWeight: '900' }}>Request Different Date</Text></TouchableOpacity></View></> : po.deliveryDateAgreementStatus === 'PENDING_SUPPLIER' ? <><Text style={{ color: colors.textSecondary }}>You proposed</Text><Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>{po.requestedDate ? formatDate(po.requestedDate) : 'Date unavailable'}</Text><Text style={{ color: '#D97706', fontWeight: '700' }}>Waiting for Supplier confirmation. A Buyer proposal does not time out into agreement.</Text></> : <><Text style={{ color: '#15803D', fontWeight: '800' }}>{po.deliveryDateAgreementMethod === 'AUTO_BUYER_TIMEOUT' ? '✓ Automatically agreed' : 'Delivery schedule agreed'}</Text><Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>{po.supplierExpectedDeliveryAt ? formatDate(po.supplierExpectedDeliveryAt) : po.requestedDate ? formatDate(po.requestedDate) : 'Date unavailable'}</Text>{po.deliveryDateAgreementMethod === 'AUTO_BUYER_TIMEOUT' ? <Text style={{ color: colors.textSecondary }}>This schedule was automatically accepted after the response period expired.</Text> : null}<TouchableOpacity disabled={agreementBusy || cancellation?.cancellation?.status === 'REQUESTED' || ['IN_TRANSIT', 'DELIVERED', 'COMPLETED', 'CANCELLED'].includes(po.status)} onPress={() => { setRequestedDeliveryDate((po.requestedDate ?? po.supplierExpectedDeliveryAt ?? '').slice(0, 10)); setShowDateRequest(true) }} style={{ alignSelf: 'flex-start', minHeight: 42, justifyContent: 'center' }}><Text style={{ color: colors.primary, fontWeight: '800' }}>Request a Different Date</Text></TouchableOpacity></>}
    </View> : null}
    {supplierAccepted ? <View style={{ padding: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.card, gap: 12 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><MapPin size={18} color={colors.primary} /><Text style={{ color: colors.text, fontSize: 17, fontWeight: '900' }}>{addressConfirmed ? 'Delivery Address' : 'Set Delivery Address'}</Text>{addressConfirmed ? <CheckCircle2 size={17} color="#16A34A" /> : null}</View>{addressConfirmed && po.delivery?.latitude != null && po.delivery?.longitude != null ? <View style={{ height: 180, borderRadius: 10, overflow: 'hidden' }}><LocationMapPreview lat={po.delivery.latitude} lng={po.delivery.longitude} address={po.delivery.address ?? undefined} colors={colors} /></View> : null}<TextInput value={deliveryAddress} onChangeText={setDeliveryAddress} placeholder="Complete delivery address" placeholderTextColor={colors.textSecondary} multiline style={{ minHeight: 64, color: colors.text, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 11, textAlignVertical: 'top' }} /><TextInput value={deliveryInstructions} onChangeText={setDeliveryInstructions} placeholder="Delivery instructions (optional)" placeholderTextColor={colors.textSecondary} multiline style={{ minHeight: 58, color: colors.text, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 11, textAlignVertical: 'top' }} /><View style={{ flexDirection: width < 600 ? 'column' : 'row', gap: 10 }}><TouchableOpacity onPress={() => setShowLocationPicker(true)} style={{ flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.primary, borderRadius: 10 }}><Text style={{ color: colors.primary, fontWeight: '800' }}>{deliveryPin ? 'Change Map Pin' : 'Select Map Pin'}</Text></TouchableOpacity><TouchableOpacity disabled={!deliveryPin || !deliveryAddress.trim() || savingLocation} onPress={confirmLocation} style={{ flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: 10, opacity: !deliveryPin || !deliveryAddress.trim() || savingLocation ? .5 : 1 }}><Text style={{ color: '#fff', fontWeight: '900' }}>{savingLocation ? 'Saving…' : 'Confirm Delivery Address'}</Text></TouchableOpacity></View></View> : null}
    <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.card, overflow: 'hidden' }}><Text style={{ color: colors.text, fontSize: 17, fontWeight: '900', padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>Items</Text>{po.lineItems.map((line) => <View key={line.id} style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', gap: 10 }}><View style={{ flex: 1 }}><Text style={{ color: colors.text, fontWeight: '800' }}>{line.itemName ?? line.supplierItem.name}</Text><Text style={{ color: colors.textSecondary, fontSize: 12 }}>{line.variantName ?? 'Base item'}{line.variantSku || line.itemSku ? ` · ${line.variantSku ?? line.itemSku}` : ''}</Text><Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 3 }}>{line.qty} {line.supplierItem.unit} × {money(line.unitPrice)}</Text></View><Text style={{ color: colors.text, fontWeight: '900' }}>{money(line.subtotal)}</Text></View>)}</View>
    <View style={{ alignSelf: width < 700 ? 'stretch' : 'flex-end', width: width < 700 ? '100%' : 380, gap: 8, padding: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.card }}><Total label="Subtotal" value={po.subtotalAmount} colors={colors} /><Total label="VAT" value={po.vatAmount} colors={colors} /><Total label="Other charges" value={po.extraChargesTotal} colors={colors} /><View style={{ height: 1, backgroundColor: colors.border }} /><Total label="Total" value={po.totalAmount} colors={colors} strong /></View>
    <View style={{ minHeight: 380, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.card, overflow: 'hidden' }}>
      <View style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 8 }}><MessageCircle size={18} color={colors.primary} /><Text style={{ color: colors.text, fontSize: 17, fontWeight: '900' }}>PO Conversation</Text></View>
      <View style={{ flex: 1, minHeight: 280 }}><ConversationMessageList messages={(conversation?.messages ?? []) as any[]} offers={(conversation?.offers ?? []) as any[]} participants={(conversation?.participants ?? []) as any[]} supplierOrgId={po.supplierOrg.id} vatRate={0.12} isVatExempt={false} unit="pcs" onAcceptOffer={() => {}} onCounterOffer={() => {}} onRejectOffer={() => {}} /></View>
      <View style={{ flexDirection: 'row', gap: 8, padding: 10, borderTopWidth: 1, borderTopColor: colors.border }}><TextInput accessibilityLabel="Message Supplier" value={message} onChangeText={setMessage} placeholder="Message Supplier about this PO" placeholderTextColor={colors.textSecondary} multiline style={{ flex: 1, minHeight: 42, maxHeight: 110, color: colors.text, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 }} /><TouchableOpacity accessibilityLabel="Send PO message" disabled={!message.trim() || sending || !conversation} onPress={sendMessage} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, opacity: !message.trim() || sending || !conversation ? .45 : 1 }}><Send size={18} color="#fff" /></TouchableOpacity></View>
    </View>
    <View style={{ padding: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.card, gap: 12 }}><Text style={{ color: colors.text, fontSize: 17, fontWeight: '900' }}>Payment Method</Text>{po.paymentStatus === 'PAID' ? <><Text style={{ color: '#16A34A', fontWeight: '800' }}>Payment Confirmed</Text>{!deliveryDateAgreed ? <Text style={{ color: '#D97706' }}>Payment received. Fulfillment will begin after the delivery schedule is accepted. Supplier funds remain held in escrow.</Text> : null}</> : !supplierAccepted ? <Text style={{ color: colors.textSecondary }}>Locked until the Supplier accepts this Purchase Order.</Text> : !deliveryDateAgreed ? <><Text style={{ color: '#D97706', fontWeight: '800' }}>Payment unavailable</Text><Text style={{ color: colors.textSecondary }}>Agree on the delivery schedule with the Supplier before selecting a payment method.</Text></> : !addressConfirmed ? <Text style={{ color: colors.textSecondary }}>Locked until the delivery address is confirmed.</Text> : <><TouchableOpacity disabled={!eligibility?.codEligible || selectingCod} onPress={chooseCod} style={{ minHeight: 48, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: eligibility?.codEligible ? colors.primary : colors.border, backgroundColor: po.paymentMethod === 'CASH' ? colors.sidebarMuted : 'transparent', opacity: eligibility?.codEligible ? 1 : .5 }}><Banknote size={18} color={eligibility?.codEligible ? colors.primary : colors.textSecondary} /><Text style={{ color: eligibility?.codEligible ? colors.primary : colors.textSecondary, fontWeight: '900' }}>{selectingCod ? 'Selecting…' : po.paymentMethod === 'CASH' ? 'Cash on Delivery Selected' : 'Cash on Delivery'}</Text></TouchableOpacity>{!eligibility?.codEligible ? <Text style={{ color: colors.textSecondary }}>Cash on Delivery is available only for orders up to {money(eligibility?.codMaximumAmount ?? 25000)}.</Text> : null}<TouchableOpacity disabled={!eligible || paying} onPress={pay} style={{ minHeight: 50, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: eligible ? colors.primary : colors.sidebarMuted, opacity: paying ? .65 : 1 }}><CreditCard size={18} color={eligible ? '#fff' : colors.textSecondary} /><Text style={{ color: eligible ? '#fff' : colors.textSecondary, fontWeight: '900' }}>{paymentLabel}</Text></TouchableOpacity>{!eligibility?.bankTransferSupported ? <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Bank transfer is not currently configured as a separate Supplier PO payment rail.</Text> : null}</>}</View>
    {reconciliationPending ? <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>Your order remains unpaid until Maya confirms the provider result. No fulfillment action is enabled from a browser return alone.</Text> : null}
  </ScrollView><MapPinPicker visible={showLocationPicker} onClose={() => setShowLocationPicker(false)} onConfirm={(latitude, longitude) => setDeliveryPin({ latitude, longitude })} colors={colors} initialLatitude={deliveryPin?.latitude ?? po.outlet?.latitude ?? undefined} initialLongitude={deliveryPin?.longitude ?? po.outlet?.longitude ?? undefined} title="Pin Delivery Location" />
    <Modal transparent visible={showDateRequest} animationType="fade" onRequestClose={() => !agreementBusy && setShowDateRequest(false)}>
      <Pressable onPress={() => !agreementBusy && setShowDateRequest(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.55)', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 440, padding: 20, gap: 14, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ color: colors.text, fontSize: 19, fontWeight: '900' }}>Request Different Date</Text>
          <Text style={{ color: colors.textSecondary }}>Choose a proposed date. The Supplier must explicitly accept it before payment or fulfillment can continue.</Text>
          <DateTimePicker value={toPickerDate(requestedDeliveryDate)} mode="date" minimumDate={new Date()} onChange={(_event: DateTimePickerChangeEvent, selectedDate?: Date) => { if (selectedDate) setRequestedDeliveryDate(toDateOnly(selectedDate)) }} />
          <View style={{ flexDirection: width < 500 ? 'column-reverse' : 'row', gap: 10 }}><TouchableOpacity disabled={agreementBusy} onPress={() => setShowDateRequest(false)} style={{ flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.sidebarMuted }}><Text style={{ color: colors.text, fontWeight: '800' }}>Cancel</Text></TouchableOpacity><TouchableOpacity disabled={agreementBusy || !requestedDeliveryDate} onPress={requestDifferentDate} style={{ flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.primary, opacity: agreementBusy || !requestedDeliveryDate ? .5 : 1 }}><Text style={{ color: '#fff', fontWeight: '900' }}>{agreementBusy ? 'Sending...' : 'Send Date Request'}</Text></TouchableOpacity></View>
        </Pressable>
      </Pressable>
    </Modal>
    <Modal transparent visible={showCancellation} animationType="fade" onRequestClose={() => !cancelling && setShowCancellation(false)}>
      <Pressable onPress={() => !cancelling && setShowCancellation(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.55)', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 480, padding: 20, gap: 12, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ color: colors.text, fontSize: 19, fontWeight: '900' }}>{cancellationLabel}</Text>
          <Text style={{ color: colors.textSecondary }}>{requestCancellation ? 'Fulfillment has started, so the Supplier must approve this request.' : po.paymentStatus === 'PAID' ? 'The order will be cancelled, but the successful payment remains recorded until an authoritative refund completes.' : 'This order has no confirmed prepaid payment, so cancellation will not create a refund.'}</Text>
          <TextInput editable={!cancelling} value={cancellationReason} onChangeText={setCancellationReason} placeholder="Reason for cancellation" placeholderTextColor={colors.textSecondary} multiline maxLength={500} style={{ minHeight: 90, color: colors.text, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 11, textAlignVertical: 'top' }} />
          <View style={{ flexDirection: width < 500 ? 'column-reverse' : 'row', gap: 10 }}><TouchableOpacity disabled={cancelling} onPress={() => setShowCancellation(false)} style={{ flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.sidebarMuted }}><Text style={{ color: colors.text, fontWeight: '800' }}>Keep Order</Text></TouchableOpacity><TouchableOpacity disabled={cancelling || cancellationReason.trim().length < 5} onPress={submitCancellation} style={{ flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#DC2626', opacity: cancelling || cancellationReason.trim().length < 5 ? .5 : 1 }}><Text style={{ color: '#fff', fontWeight: '900' }}>{cancelling ? 'Submitting...' : cancellationLabel}</Text></TouchableOpacity></View>
        </Pressable>
      </Pressable>
    </Modal>
  </>
}

function Total({ label, value, colors, strong = false }: { label: string; value: number; colors: any; strong?: boolean }) { return <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.textSecondary, fontWeight: strong ? '900' : '600' }}>{label}</Text><Text style={{ color: colors.text, fontSize: strong ? 18 : 14, fontWeight: '900' }}>{money(value)}</Text></View> }
