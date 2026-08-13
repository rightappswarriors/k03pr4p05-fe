import React, { useState } from 'react'
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
} from 'react-native'
import { X, Package, Tag, Calendar as CalendarIcon, Info } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import DateTimePicker from '@/components/DateTimePicker'
import type { AcceptNegotiationInput, RequestForQuotationDetail } from '@/types'
import type { PurchaseOrder as POSupplierOrder } from '@/services/supplierService/supplierService'
import { logDev } from '@/utils/logDev'
import { ErrorModal } from '@/components/ErrorModal'

interface Props {
  visible: boolean
  rfq: RequestForQuotationDetail | null
  onClose: () => void
  onAccept: (input: AcceptNegotiationInput) => Promise<POSupplierOrder>
  onPOCreated: (po: POSupplierOrder) => void
}

const LARGE_SCREEN_BREAKPOINT = 768
const MODAL_MAX_WIDTH = 520

const formatPHP = (amount: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })

export function AcceptConfirmationModal({ visible, rfq, onClose, onAccept, onPOCreated }: Props) {
  const { colors } = useTheme()
  const { width: windowWidth, height: windowHeight } = useWindowDimensions()
  const isLargeScreen = windowWidth >= LARGE_SCREEN_BREAKPOINT

  const [deliveryDate, setDeliveryDate] = useState<Date | null>(null)
  const [driverName, setDriverName] = useState('')
  const [driverContact, setDriverContact] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [accepting, setAccepting] = useState(false)

  const [errorModalVisible, setErrorModalVisible] = useState(false)
  const [errorTitle, setErrorTitle] = useState('Error')
  const [errorText, setErrorText] = useState('')

  const showError = (title: string, text: string) => {
    setErrorTitle(title)
    setErrorText(text)
    setErrorModalVisible(true)
  }

  if (!rfq) return null

  // Determine the final offer details
  const latestOffer = rfq.conversation?.offers?.[rfq.conversation.offers.length - 1]
  const latestMessage = rfq.conversation?.messages?.[rfq.conversation.messages.length - 1]

  const acceptedPrice = rfq.acceptedPrice ?? latestOffer?.unitPrice ?? rfq.targetUnitPrice ?? rfq.supplierItem?.unitPrice ?? 0
  const acceptedQty = rfq.acceptedQuantity ?? latestOffer?.quantity ?? (rfq.quantity ? Number(rfq.quantity) : 0)
  const subtotal = acceptedPrice * acceptedQty
  const vatRate = rfq.supplierItem?.vatRate ?? 0.12
  const isVatExempt = rfq.supplierItem?.isVatExempt ?? false
  const vatAmount = isVatExempt ? 0 : subtotal * vatRate
  const total = subtotal + vatAmount

  // Default delivery date: use expected delivery date or 7 days from now
  const defaultDate = rfq.expectedDeliveryDate
    ? new Date(rfq.expectedDeliveryDate)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const handleDateChange = (_: any, selectedDate?: Date) => {
    setShowDatePicker(false)
    if (selectedDate) setDeliveryDate(selectedDate)
  }

  const handleAccept = async () => {
    if (!deliveryDate) {
      logDev('AcceptConfirmationModal validation error: missing delivery date')
      showError('Delivery Date Required', 'Please select a delivery date.')
      return
    }

    setAccepting(true)
    try {
      const po = await onAccept({
        rfqId: rfq.id,
        deliveryDate: deliveryDate.toISOString(),
        driverName: driverName || null,
        driverContact: driverContact || null,
      })
      onPOCreated(po)
      onClose()
      // Reset form
      setDeliveryDate(null)
      setDriverName('')
      setDriverContact('')
    } catch (e: any) {
      logDev('AcceptConfirmationModal handleAccept error:', e)
      showError('Error', e.message ?? 'Failed to create purchase order.')
    } finally {
      setAccepting(false)
    }
  }

  const dialogWidth = isLargeScreen ? Math.min(MODAL_MAX_WIDTH, windowWidth - 64) : windowWidth
  const dialogMaxHeight = isLargeScreen ? Math.min(windowHeight * 0.85, 720) : windowHeight

  const content = (
    <>
      {/* Header */}
      <View style={{
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>Confirm Acceptance</Text>
        <TouchableOpacity onPress={onClose} style={{ padding: 6 }} disabled={accepting}>
          <X size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ padding: 16, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* RFQ Summary */}
        <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 14, gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Package size={16} color={colors.textSecondary} />
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{rfq.rfqNumber}</Text>
          </View>
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>{rfq.supplierItem?.name}</Text>
          {rfq.supplierItem?.sku && (
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>SKU: {rfq.supplierItem.sku}</Text>
          )}
        </View>

        {/* Final Offer Summary */}
        <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Tag size={16} color={colors.textSecondary} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Final Offer Summary</Text>
          </View>

          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>Unit Price</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{formatPHP(acceptedPrice)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>Quantity</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{qtyDisplay(acceptedQty)} {rfq.supplierItem?.unit ?? 'pcs'}</Text>
            </View>
            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 4 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>Subtotal</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{formatPHP(subtotal)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                VAT ({isVatExempt ? 'Exempt' : (vatRate * 100).toFixed(0) + '%'})
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{formatPHP(vatAmount)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Total Amount</Text>
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>{formatPHP(total)}</Text>
            </View>
          </View>
        </View>

        {/* Delivery Info */}
        <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <CalendarIcon size={16} color={colors.textSecondary} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Delivery Schedule</Text>
          </View>

          <View>
            <Text style={labelStyle}>Scheduled Delivery Date *</Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 8,
                backgroundColor: colors.background, borderRadius: 10,
                borderWidth: 1, borderColor: colors.border, padding: 12,
              }}
            >
              <CalendarIcon size={18} color={colors.textSecondary} />
              <Text style={{ fontSize: 14, color: deliveryDate ? colors.text : colors.textSecondary, flex: 1 }}>
                {deliveryDate ? formatDate(deliveryDate.toISOString()) : formatDate(defaultDate.toISOString())}
              </Text>
            </TouchableOpacity>
            {!deliveryDate && (
              <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>
                Default: {formatDate(defaultDate.toISOString())}
              </Text>
            )}
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={deliveryDate ?? defaultDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}

          <View>
            <Text style={labelStyle}>Driver Name (optional)</Text>
            <TextInput
              value={driverName}
              onChangeText={setDriverName}
              placeholder="e.g. Juan dela Cruz"
              placeholderTextColor={colors.textSecondary}
              style={inputStyle}
            />
          </View>

          <View>
            <Text style={labelStyle}>Driver Contact (optional)</Text>
            <TextInput
              value={driverContact}
              onChangeText={setDriverContact}
              placeholder="e.g. 09171234567"
              placeholderTextColor={colors.textSecondary}
              style={inputStyle}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Info note */}
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: colors.surface, borderRadius: 10, padding: 12 }}>
          <Info size={16} color={colors.primary} style={{ marginTop: 2 }} />
          <Text style={{ fontSize: 12, color: colors.textSecondary, flex: 1, lineHeight: 16 }}>
            Accepting will create a Purchase Order (PO-{new Date().getFullYear()}-XXXX) and schedule delivery. The buyer will be notified.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom actions */}
      <View style={{
        padding: 16, borderTopWidth: 1, borderTopColor: colors.border,
        flexDirection: 'row', gap: 12,
      }}>
        <TouchableOpacity
          onPress={onClose}
          disabled={accepting}
          style={{ flex: 1, paddingVertical: 13, alignItems: 'center' }}
        >
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textSecondary }}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleAccept}
          disabled={accepting}
          style={{
            flex: 2, backgroundColor: colors.primary, paddingVertical: 13,
            borderRadius: 10, alignItems: 'center', opacity: accepting ? 0.6 : 1,
          }}
        >
          {accepting ? <ActivityIndicator color="#fff" /> : (
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Create Purchase Order</Text>
          )}
        </TouchableOpacity>
      </View>
    </>
  )

  return (
    <>
      {isLargeScreen ? (
        // Large screens: fade in a centered, max-width dialog over a dimmed backdrop.
        <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <TouchableOpacity
              activeOpacity={1}
              onPress={accepting ? undefined : onClose}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
            <View
              style={{
                width: dialogWidth,
                maxHeight: dialogMaxHeight,
                backgroundColor: colors.background,
                borderRadius: 16,
                overflow: 'hidden',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.2,
                shadowRadius: 24,
                elevation: 12,
              }}
            >
              {content}
            </View>
          </View>
        </Modal>
      ) : (
        // Mobile: fade in as a full-screen sheet.
        <Modal visible={visible} animationType="fade" presentationStyle="pageSheet" onRequestClose={onClose}>
          <View style={{ flex: 1, backgroundColor: colors.background }}>
            {content}
          </View>
        </Modal>
      )}

      <ErrorModal
        visible={errorModalVisible}
        title={errorTitle}
        text={errorText}
        onClose={() => setErrorModalVisible(false)}
      />
    </>
  )
}

function qtyDisplay(qty: number): string {
  return qty % 1 === 0 ? String(qty) : qty.toFixed(2)
}

const labelStyle = { fontSize: 12, fontWeight: '600' as const, color: '#64748B' as const, marginBottom: 4 }

const inputStyle = {
  borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 12,
  backgroundColor: '#F8fafc', color: '#0F172A', fontSize: 14,
}