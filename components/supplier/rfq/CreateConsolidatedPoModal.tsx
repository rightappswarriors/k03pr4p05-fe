import React, { useState, useMemo } from 'react'
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
  Alert,
} from 'react-native'
import { X, Calendar as CalendarIcon, Package } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import DateTimePicker from '@/components/DateTimePicker'
import type { ConsolidatedPoLine, CreateConsolidatedPoInput, SupplierRfqInboxItem } from '@/types'
import { createConsolidatedPurchaseOrder } from '@/services/supplierService/supplierService'
import { ErrorModal } from '@/components/ErrorModal'
import { logDev } from '@/utils/logDev'
import { isStatusInGroup } from '@/types'
import { ELIGIBLE_RFQ_STATUSES } from '@/types'

const LARGE_SCREEN_BREAKPOINT = 768
const MODAL_MAX_WIDTH = 720

const formatPHP = (amount: number | null | undefined) =>
  amount != null
    ? new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)
    : 'PHP 0.00'

const labelStyle = {
  fontSize: 13 as const,
  fontWeight: '600' as const,
  color: '' as any,
  marginBottom: 6,
}

const inputContainerStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  backgroundColor: '' as any,
  borderRadius: 10,
  borderWidth: 1,
  paddingHorizontal: 12,
  gap: 8,
}

interface Props {
  visible: boolean
  selectedRfqs: SupplierRfqInboxItem[]
  onClose: () => void
  onCancel: () => void
  onRemoveRfq: (rfqId: string) => void
  onCreated: (poNumber: string) => void
}

function computeLine(rfq: SupplierRfqInboxItem): ConsolidatedPoLine {
  const unitPrice = rfq.acceptedPrice ?? rfq.targetUnitPrice ?? 0
  const qty = rfq.acceptedQuantity ?? rfq.quantity ? Number(rfq.acceptedQuantity ?? rfq.quantity) : 0
  const isVatExempt = rfq.supplierItem?.isVatExempt ?? false
  const vatRate = rfq.supplierItem?.vatRate ?? 0.12
  const lineTotal = unitPrice * qty
  const vatAmount = isVatExempt ? 0 : lineTotal * vatRate
  const lineGrandTotal = lineTotal + vatAmount

  return {
    rfqId: rfq.id,
    rfqNumber: rfq.rfqNumber,
    supplierItemId: rfq.supplierItemId ?? '',
    supplierItemName: rfq.supplierItem?.name ?? '',
    qty,
    unitPrice,
    isVatExempt,
    vatRate,
    lineTotal,
    vatAmount,
    lineGrandTotal,
  }
}

export function CreateConsolidatedPoModal({ visible, selectedRfqs, onClose, onCancel, onRemoveRfq, onCreated }: Props) {
  const { colors } = useTheme()
  const { width: windowWidth, height: windowHeight } = useWindowDimensions()
  const isLargeScreen = windowWidth >= LARGE_SCREEN_BREAKPOINT
  const [deliveryDate, setDeliveryDate] = useState<Date | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [otherCharges, setOtherCharges] = useState('')
  const [driverName, setDriverName] = useState('')
  const [driverContact, setDriverContact] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [errorModalVisible, setErrorModalVisible] = useState(false)
  const [errorTitle, setErrorTitle] = useState('Error')
  const [errorText, setErrorText] = useState('')

  const showError = (title: string, text: string) => {
    setErrorTitle(title)
    setErrorText(text)
    setErrorModalVisible(true)
  }

  // ─── Financial breakdown ──────────────────────────────────────────────────────────

  const lines = useMemo(() => selectedRfqs.map(computeLine), [selectedRfqs])

  const subtotal = useMemo(() => lines.reduce((sum, l) => sum + l.lineTotal, 0), [lines])
  const totalVat = useMemo(() => lines.reduce((sum, l) => sum + l.vatAmount, 0), [lines])
  const hasVat = totalVat > 0
  const charges = useMemo(() => {
    const val = parseFloat(otherCharges.replace(/,/g, ''))
    return isNaN(val) ? 0 : val
  }, [otherCharges])
  const grandTotal = subtotal + totalVat + charges

  // ─── Handlers ─────────────────────────────────────────────────────────────────────

  const handleDateChange = (_: any, selectedDate?: Date) => {
    setShowDatePicker(false)
    if (selectedDate) setDeliveryDate(selectedDate)
  }

  // ─── Defensive cross-buyer validation (backend is authoritative) ─────────────────
  const hasMixedBuyers = useMemo(() => {
    const buyerIds = new Set<number>()
    for (const rfq of selectedRfqs) {
      if (!isStatusInGroup(rfq.status, ELIGIBLE_RFQ_STATUSES)) continue
      const orgId = rfq.agent?.organizationId ?? rfq.agent?.organization?.id ?? null
      if (orgId !== null && orgId !== undefined) buyerIds.add(orgId)
    }
    return buyerIds.size > 1
  }, [selectedRfqs])
  const handleOtherChargesChange = (text: string) => {
    // Strip anything that isn't a digit or a decimal point
    let cleaned = text.replace(/[^0-9.]/g, '')

    // Allow only one decimal point — keep the first, drop the rest
    const firstDotIndex = cleaned.indexOf('.')
    if (firstDotIndex !== -1) {
      cleaned =
        cleaned.slice(0, firstDotIndex + 1) +
        cleaned.slice(firstDotIndex + 1).replace(/\./g, '')
    }

    // Optional: cap to 2 decimal places (currency)
    if (firstDotIndex !== -1) {
      const [whole, decimal] = cleaned.split('.')
      cleaned = decimal !== undefined ? `${whole}.${decimal.slice(0, 2)}` : cleaned
    }

    setOtherCharges(cleaned)
  }
  const handleSubmit = async () => {
    if (!deliveryDate) {
      showError('Missing Delivery Date', 'Please select a delivery date.')
      return
    }

    // Block submission when RFQs span multiple buyers
    if (hasMixedBuyers) {
      Alert.alert(
        'Cannot create PO',
        'The selected RFQs belong to different buyers. A single purchase order can only include RFQs from one buyer. Please adjust your selection.',
      )
      return
    }

    setSubmitting(true)
    try {
      const input: CreateConsolidatedPoInput = {
        rfqIds: selectedRfqs.map((r) => r.id),
        deliveryDate: deliveryDate.toISOString(),
        notes: notes || null,
        otherCharges: charges > 0 ? charges : null,
        driverName: driverName || null,
        driverContact: driverContact || null,
      }

      logDev('[CreateConsolidatedPoModal] submitting', input)
      const result = await createConsolidatedPurchaseOrder(input)
      onCreated(result.poNumber)
    } catch (e: any) {
      logDev('[CreateConsolidatedPoModal] error', e)
      showError('Error', e.message ?? 'Failed to create purchase order.')
    } finally {
      setSubmitting(false)
    }
  }

  const dialogWidth = isLargeScreen ? Math.min(MODAL_MAX_WIDTH, windowWidth - 64) : windowWidth
  const dialogMaxHeight = isLargeScreen ? Math.min(windowHeight * 0.85, 720) : windowHeight - 80

  // ─── Render ───────────────────────────────────────────────────────────────────────

  if (!visible) return null

  return (
    <>
      <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{
            width: dialogWidth,
            maxHeight: dialogMaxHeight,
            backgroundColor: colors.surface,
            borderRadius: isLargeScreen ? 18 : 0,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: colors.border,
          }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View style={{
                flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border,
              }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>
                  Create Purchase Order ({selectedRfqs.length} RFQ{selectedRfqs.length !== 1 ? 's' : ''})
                </Text>
                <TouchableOpacity onPress={onClose} style={{ padding: 6 }}>
                  <X size={22} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={{ padding: 16, gap: 16 }}>
                {/* Buyer / Supplier info */}
                <View style={{ backgroundColor: colors.background, borderRadius: 12, padding: 12, gap: 6 }}>
                  <View style={{ flexDirection: 'row', gap: 16 }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ fontSize: 11, color: colors.textSecondary }}>Buyer</Text>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                        {selectedRfqs[0]?.agent?.organization?.name ?? selectedRfqs[0]?.agent?.fullname ?? '—'}
                      </Text>
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ fontSize: 11, color: colors.textSecondary }}>Supplier</Text>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                        {selectedRfqs[0]?.supplierOrg?.name ?? '—'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Line items */}
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 10 }}>
                    Line Items
                  </Text>
                  <View style={{ gap: 10 }}>
                    {lines.map((line) => (
                      <View
                        key={line.rfqId}
                        style={{
                          backgroundColor: colors.background, borderRadius: 12, padding: 12, gap: 8,
                          borderWidth: 1, borderColor: colors.border,
                        }}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <View style={{ flex: 1, gap: 2 }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>{line.rfqNumber}</Text>
                            <Text style={{ fontSize: 12, color: colors.textSecondary }} numberOfLines={1}>
                              {line.supplierItemName || '—'}
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => onRemoveRfq(line.rfqId)}
                            style={{ padding: 6, marginLeft: 8 }}
                          >
                            <Text style={{ fontSize: 11, color: colors.textSecondary }}>✕</Text>
                          </TouchableOpacity>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
                          <View style={{ flex: 1, gap: 2 }}>
                            <Text style={{ fontSize: 10, color: colors.textSecondary }}>Unit Price</Text>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>{formatPHP(line.unitPrice)}</Text>
                          </View>
                          <View style={{ flex: 1, gap: 2 }}>
                            <Text style={{ fontSize: 10, color: colors.textSecondary }}>Quantity</Text>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>{line.qty}</Text>
                          </View>
                          <View style={{ flex: 1, gap: 2 }}>
                            <Text style={{ fontSize: 10, color: colors.textSecondary }}>Line Total</Text>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>{formatPHP(line.lineTotal)}</Text>
                          </View>
                        </View>

                        {/* VAT info */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                          <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                            {line.isVatExempt ? 'Non-VAT (exempt)' : `VAT (${Math.round(line.vatRate * 100)}%)`}
                          </Text>
                          <Text style={{ fontSize: 11, color: colors.textSecondary }}>{formatPHP(line.vatAmount)}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Financial breakdown */}
                <View style={{
                  backgroundColor: colors.background, borderRadius: 12, padding: 14, gap: 10,
                  borderWidth: 1, borderColor: colors.border,
                }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 4 }}>
                    Financial Summary
                  </Text>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>Subtotal</Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>{formatPHP(subtotal)}</Text>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                      {hasVat ? 'VAT (12%)' : 'VAT'}
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>{formatPHP(totalVat)}</Text>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>Other Charges</Text>
                    <View style={{
                      flexDirection: 'row', alignItems: 'center',
                      backgroundColor: colors.surface, borderRadius: 8,
                      borderWidth: 1, borderColor: colors.border,
                      paddingHorizontal: 10, width: 150,
                      overflow: 'hidden',
                    }}>
                      <Text style={{ fontSize: 13, color: colors.textSecondary, marginRight: 4 }}>₱</Text>
                      <TextInput
                        value={otherCharges}
                        onChangeText={handleOtherChargesChange}
                        placeholder="0.00"
                        placeholderTextColor={colors.textSecondary}
                        style={{
                          flex: 1,
                          paddingVertical: 6,
                          color: colors.text,
                          fontSize: 13,
                          textAlign: 'right',
                          minWidth: 0,
                        }}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>

                  <View style={{
                    flexDirection: 'row', justifyContent: 'space-between',
                    borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10,
                  }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Grand Total</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary }}>{formatPHP(grandTotal)}</Text>
                  </View>
                </View>

                {/* Delivery date */}
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 }}>
                    Delivery Date *
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(true)}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 10,
                      backgroundColor: colors.background, borderRadius: 10,
                      borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 12,
                    }}
                  >
                    <CalendarIcon size={16} color={colors.textSecondary} />
                    <Text style={{ fontSize: 13, color: colors.text, flex: 1 }}>
                      {deliveryDate ? deliveryDate.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Select delivery date'}
                    </Text>
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={deliveryDate ?? new Date()}
                      mode="date"
                      onChange={handleDateChange}
                      minimumDate={new Date()}
                    />
                  )}
                </View>

                {/* Driver info */}
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 }}>
                      Driver Name
                    </Text>
                    <View style={[inputContainerStyle, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <TextInput
                        value={driverName}
                        onChangeText={setDriverName}
                        placeholder="e.g. Juan Dela Cruz"
                        placeholderTextColor={colors.textSecondary}
                        style={{ flex: 1, paddingVertical: 12, color: colors.text, fontSize: 13 }}
                      />
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 }}>
                      Driver Contact
                    </Text>
                    <View style={[inputContainerStyle, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <TextInput
                        value={driverContact}
                        onChangeText={setDriverContact}
                        placeholder="e.g. 0917-123-4567"
                        placeholderTextColor={colors.textSecondary}
                        style={{ flex: 1, paddingVertical: 12, color: colors.text, fontSize: 13 }}
                        keyboardType="phone-pad"
                      />
                    </View>
                  </View>
                </View>

                {/* Notes */}
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 }}>
                    Notes (optional)
                  </Text>
                  <View style={{ backgroundColor: colors.background, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12 }}>
                    <TextInput
                      value={notes}
                      onChangeText={setNotes}
                      placeholder="Additional instructions..."
                      placeholderTextColor={colors.textSecondary}
                      style={{ paddingVertical: 12, color: colors.text, fontSize: 13 }}
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                </View>
              </View>

              {/* Footer buttons */}
              <View style={{
                flexDirection: 'row', gap: 12, padding: 16,
                borderTopWidth: 1, borderTopColor: colors.border,
              }}>
                <TouchableOpacity
                  onPress={onCancel}
                  style={{ flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}
                  disabled={submitting}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={submitting || !deliveryDate || hasMixedBuyers}
                  style={{
                    flex: 1, paddingVertical: 14, borderRadius: 10,
                    backgroundColor: colors.primary, alignItems: 'center',
                    opacity: submitting || !deliveryDate ? 0.5 : 1,
                  }}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>
                      Create PO
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ErrorModal
        visible={errorModalVisible}
        title={errorTitle}
        text={errorText}
        onClose={() => setErrorModalVisible(false)}
      />
    </>
  )
}
