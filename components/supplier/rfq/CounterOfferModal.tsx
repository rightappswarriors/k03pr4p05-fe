import React, { useEffect, useState } from 'react'
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
import { X, Tag, Package, Calendar as CalendarIcon } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import DateTimePicker from '@/components/DateTimePicker'
import type { CounterOfferInput, RequestForQuotationDetail } from '@/types'
import { logDev } from '@/utils/logDev'
import { ErrorModal } from '@/components/ErrorModal'

interface Props {
  visible: boolean
  rfq: RequestForQuotationDetail | null
  onClose: () => void
  onSubmit: (input: CounterOfferInput) => Promise<void>
}

const LARGE_SCREEN_BREAKPOINT = 768
const MODAL_MAX_WIDTH = 520

const formatPHP = (amount: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })

export function CounterOfferModal({ visible, rfq, onClose, onSubmit }: Props) {
  const { colors } = useTheme()
  const { width: windowWidth, height: windowHeight } = useWindowDimensions()
  const isLargeScreen = windowWidth >= LARGE_SCREEN_BREAKPOINT

  const [offerPrice, setOfferPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  const [message, setMessage] = useState('')
  const [deliveryDate, setDeliveryDate] = useState<Date | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [errorModalVisible, setErrorModalVisible] = useState(false)
  const [errorTitle, setErrorTitle] = useState('Error')
  const [errorText, setErrorText] = useState('')

  const showError = (title: string, text: string) => {
    setErrorTitle(title)
    setErrorText(text)
    setErrorModalVisible(true)
  }

  useEffect(() => {
    if (!visible || !rfq) return
    const latestOffer = rfq.conversation?.offers?.[rfq.conversation.offers.length - 1]
    setOfferPrice(String(latestOffer?.unitPrice ?? rfq.targetUnitPrice ?? 0))
    setQuantity(String(latestOffer?.quantity ?? (rfq.quantity ? Number(rfq.quantity) : 0)))
  }, [visible, rfq])

  if (!rfq) return null

  const moq = rfq.supplierItem?.moq ?? 1
  const targetQty = rfq.quantity ? Number(rfq.quantity) : 0
  const targetPrice = rfq.targetUnitPrice ?? 0
  const currentPrice = rfq.supplierItem?.unitPrice ?? 0

  const parseNumber = (val: string) => {
    const num = parseFloat(val.replace(/,/g, ''))
    return isNaN(num) ? 0 : num
  }

  const handleDateChange = (_: any, selectedDate?: Date) => {
    setShowDatePicker(false)
    if (selectedDate) setDeliveryDate(selectedDate)
  }

  const resetForm = () => {
    setOfferPrice('')
    setQuantity('')
    setMessage('')
    setDeliveryDate(null)
  }

  const handleSubmit = async () => {
    const price = parseNumber(offerPrice)
    const qty = parseInt(quantity, 10)

    if (isNaN(price) || price <= 0) {
      logDev('CounterOfferModal validation error: invalid price', { offerPrice, price })
      showError('Invalid Price', 'Please enter a valid offer price greater than 0.')
      return
    }

    if (isNaN(qty) || qty < targetQty) {
      logDev('CounterOfferModal validation error: invalid quantity', { quantity, qty, targetQty })
      showError('Invalid Quantity', `Quantity must be at least ${targetQty}.`)
      return
    }

    if (price > targetPrice * 3) {
      logDev('CounterOfferModal validation error: price far above target', { price, targetPrice })
      showError('Price Check', `Are you sure you want to offer ${formatPHP(price)} which is significantly above the target price of ${formatPHP(targetPrice)}?`)
      return
    }

    setSubmitting(true)
    try {
      await onSubmit({
        rfqId: rfq.id,
        quantity: qty,
        unitPrice: price,
        deliveryDate: deliveryDate ? deliveryDate.toISOString() : null,
        notes: message || null,
      })
      onClose()
      resetForm()
    } catch (e: any) {
      logDev('CounterOfferModal handleSubmit error:', e)
      showError('Error', e.message ?? 'Failed to send counter offer.')
    } finally {
      setSubmitting(false)
    }
  }

  const estimatedTotal = parseNumber(offerPrice) * parseInt(quantity, 10)
  const isValid = parseNumber(offerPrice) > 0 && parseInt(quantity, 10) >= targetQty

  const dialogWidth = isLargeScreen ? Math.min(MODAL_MAX_WIDTH, windowWidth - 64) : windowWidth
  const dialogMaxHeight = isLargeScreen ? Math.min(windowHeight * 0.85, 720) : windowHeight

  const content = (
    <>
      {/* Header */}
      <View style={{
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>Counter Offer</Text>
        <TouchableOpacity onPress={onClose} style={{ padding: 6 }}>
          <X size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ padding: 16, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* RFQ summary */}
        <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 12, gap: 6 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{rfq.rfqNumber}</Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>{rfq.supplierItem?.name}</Text>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Package size={12} color={colors.textSecondary} />
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>Target: {qtyDisplay(targetQty)} {rfq.supplierItem?.unit ?? 'pcs'}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Tag size={12} color={colors.textSecondary} />
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>Target price: {formatPHP(targetPrice)}</Text>
            </View>
          </View>
        </View>

        {/* Offer Price */}
        <View>
          <Text style={labelStyle}>Offer Price (per unit) *</Text>
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: colors.surface, borderRadius: 10,
            borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12,
          }}>
            <Text style={{ fontSize: 16, color: colors.textSecondary, marginRight: 4 }}>₱</Text>
            <TextInput
              value={offerPrice}
              onChangeText={setOfferPrice}
              placeholder="e.g. 150"
              placeholderTextColor={colors.textSecondary}
              style={{ flex: 1, paddingVertical: 12, color: colors.text, fontSize: 15 }}
              keyboardType="numeric"
            />
          </View>
          {currentPrice > 0 && (
            <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>
              Your current selling price: {formatPHP(currentPrice)}
            </Text>
          )}
        </View>

        {/* Quantity */}
        <View>
          <Text style={labelStyle}>Quantity *</Text>
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: colors.surface, borderRadius: 10,
            borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12,
          }}>
            <TextInput
              value={quantity}
              onChangeText={setQuantity}
              placeholder={`Min: ${moq} agent target quantity: ${targetQty}`}
              placeholderTextColor={colors.textSecondary}
              style={{ flex: 1, paddingVertical: 12, color: colors.text, fontSize: 15 }}
              keyboardType="numeric"
            />
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginRight: 4 }}>{rfq.supplierItem?.unit ?? 'pcs'}</Text>
          </View>
          <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>
            MOQ: {moq} {rfq.supplierItem?.unit ?? 'pcs'} | Available: {rfq.supplierItem?.availableQty ?? 0}
          </Text>
          {parseInt(quantity, 10) < targetQty && quantity !== '' && (
            <Text style={{ fontSize: 11, color: colors.error, marginTop: 2 }}>
              Quantity must be at least {targetQty}
            </Text>
          )}
        </View>

        {/* Delivery Date */}
        <View>
          <Text style={labelStyle}>Delivery Date (optional)</Text>
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 8,
              backgroundColor: colors.surface, borderRadius: 10,
              borderWidth: 1, borderColor: colors.border, padding: 12,
            }}
          >
            <CalendarIcon size={18} color={colors.textSecondary} />
            <Text style={{ fontSize: 14, color: deliveryDate ? colors.text : colors.textSecondary, flex: 1 }}>
              {deliveryDate ? formatDate(deliveryDate.toISOString()) : 'Select a date'}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={deliveryDate ?? new Date()}
              mode="date"
              display="default"
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}
          {deliveryDate && (
            <TouchableOpacity onPress={() => setDeliveryDate(null)} style={{ marginTop: 6, alignSelf: 'flex-start' }}>
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Message */}
        <View>
          <Text style={labelStyle}>Message (optional)</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Add a note to the buyer..."
            placeholderTextColor={colors.textSecondary}
            style={{
              backgroundColor: colors.surface, borderRadius: 10,
              borderWidth: 1, borderColor: colors.border, padding: 12,
              color: colors.text, fontSize: 14, minHeight: 80, textAlignVertical: 'top',
            }}
            multiline
          />
        </View>

        {/* Estimated total */}
        {isValid && (
          <View style={{
            backgroundColor: colors.surface, borderRadius: 12, padding: 14,
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>Estimated Total</Text>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>
              {formatPHP(isNaN(estimatedTotal) ? 0 : estimatedTotal)}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom actions */}
      <View style={{
        padding: 16, borderTopWidth: 1, borderTopColor: colors.border,
        flexDirection: 'row', gap: 12,
      }}>
        <TouchableOpacity onPress={onClose} style={{ flex: 1, paddingVertical: 13, alignItems: 'center' }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textSecondary }}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting || !isValid}
          style={{
            flex: 2, backgroundColor: colors.primary, paddingVertical: 13,
            borderRadius: 10, alignItems: 'center', opacity: submitting || !isValid ? 0.5 : 1,
          }}
        >
          {submitting ? <ActivityIndicator color="#fff" /> : (
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Send Counter Offer</Text>
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
              onPress={onClose}
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
