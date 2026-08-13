import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native'
import { Package, Calendar, FileText, Check, Trash2 } from 'lucide-react-native'
import { useRouter } from 'expo-router'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import {
  fetchSupplierRFQs,
  createConsolidatedPurchaseOrder,
} from '@/services/supplierService/supplierService'
import type { SupplierRfqInboxItem } from '@/types'
import { RfqStatusBadge } from '@/components/supplier/rfq/RfqStatusBadge'
import { formatPHP } from '@/utils/financial'
import type { RfqStatus } from '@/types'

const BREAKPOINTS = { tablet: 768, desktop: 1100 }

// RFQ statuses that are eligible for consolidated PO creation
// These are RFQs where negotiation has concluded and the supplier can create a PO
const CONSOLIDATABLE_STATUSES: RfqStatus[] = [
  'NEGOTIATION_ACCEPTED',
  'AGENT_ACCEPTED_FINAL',
  'SUPPLIER_ACCEPTED_FINAL',
  'WAITING_SUPPLIER_CONFIRMATION',
  'NEGOTIATION_COMPLETED',
  'PO_CREATED',
]

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })

export function ConsolidatedPODashboardScreen() {
  const { colors } = useTheme()
  const { user } = useAuth()
  const { showToast } = useToast()
  const router = useRouter()
  const { width } = useWindowDimensions()

  const horizontalPadding =
    width >= BREAKPOINTS.desktop ? 32 : width >= BREAKPOINTS.tablet ? 24 : 16

  const [rfqs, setRfqs] = useState<SupplierRfqInboxItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRfqIds, setSelectedRfqIds] = useState<string[]>([])
  const [deliveryDate, setDeliveryDate] = useState('')
  const [isCreatingPo, setIsCreatingPo] = useState(false)

  // Load all RFQs that are negotiable/consolidatable
  const load = useCallback(async () => {
    if (!user?.orgId) return
    try {
      // Fetch RFQs one status at a time since the backend filter is single-status
      // We need to check which statuses are available from the API
      const allRfqs: SupplierRfqInboxItem[] = []
      for (const status of CONSOLIDATABLE_STATUSES) {
        try {
          const data = await fetchSupplierRFQs(user.orgId, {
            status,
            search: null,
            unreadOnly: null,
            dateFrom: null,
            dateTo: null,
          })
          allRfqs.push(...data)
        } catch {
          // Ignore status-specific errors, try other statuses
        }
      }
      // Deduplicate and filter to only those with accepted offers/negotiations
      const unique = allRfqs.filter(
        (rfq, idx, self) => idx === self.findIndex((r) => r.id === rfq.id),
      )
      setRfqs(unique)
    } catch (e: any) {
      if (__DEV__) console.error('fetchSupplierRFQs error', e)
      Alert.alert('Error', e.message ?? 'Failed to load RFQs.')
    } finally {
      setLoading(false)
    }
  }, [user?.orgId])

  useEffect(() => { load() }, [load])

  const toggleSelection = (rfqId: string) => {
    setSelectedRfqIds((prev) =>
      prev.includes(rfqId)
        ? prev.filter((id) => id !== rfqId)
        : [...prev, rfqId],
    )
  }

  const handleCreatePO = async () => {
    if (selectedRfqIds.length === 0) {
      Alert.alert('No RFQs Selected', 'Please select at least one RFQ to consolidate.')
      return
    }

    if (!deliveryDate) {
      Alert.alert('Missing Delivery Date', 'Please specify a delivery date.')
      return
    }

    const rfqList = rfqs.filter((r) => selectedRfqIds.includes(r.id))
    const totalAmount =
      rfqList.reduce((sum, rfq) => {
        if (rfq.acceptedPrice && rfq.quantity) {
          const qty = parseFloat(rfq.quantity)
          if (!isNaN(qty)) return sum + rfq.acceptedPrice * qty
        }
        return sum
      }, 0) || 0

    const vatAmount = totalAmount * 0.12

    Alert.alert(
      'Confirm Consolidated PO',
      `${selectedRfqIds.length} RFQ(s) will be consolidated into a single Purchase Order.\n\n` +
        `Total: ${formatPHP(totalAmount + vatAmount)}\n` +
        `Delivery: ${formatDate(deliveryDate)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create PO',
          style: 'default',
          onPress: async () => {
            setIsCreatingPo(true)
            try {
              const result = await createConsolidatedPurchaseOrder({
                rfqIds: selectedRfqIds,
                deliveryDate,
              })

              if (result.success) {
                showToast('success', result.message)
                // Navigate to the new PO
                const poId = result.purchaseOrder?.id
                const poNumber = result.purchaseOrder?.poNumber
                if (poId) {
                  router.push(`/supplier/po/${poId}` as any)
                }
              } else {
                showToast(result.message || 'Could not create consolidated PO.', 'error')
              }
            } catch (e: any) {
              showToast(e.message ?? 'Failed to create consolidated PO.', 'error')
            } finally {
              setIsCreatingPo(false)
            }
          },
        },
      ],
    )
  }

  const selectedTotal = rfqs
    .filter((r) => selectedRfqIds.includes(r.id))
    .reduce((sum, rfq) => {
      if (rfq.acceptedPrice && rfq.quantity) {
        const qty = parseFloat(rfq.quantity)
        if (!isNaN(qty)) return sum + rfq.acceptedPrice * qty
      }
      return sum
    }, 0)

  const selectedVat = selectedTotal * 0.12
  const selectedGrandTotal = selectedTotal + selectedVat

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: horizontalPadding,
          paddingVertical: 16,
          gap: 16,
          maxWidth: 1200,
          alignSelf: 'center',
          width: '100%',
        }}
      >
        {/* Header */}
        <View>
          <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text }}>
            Consolidated Purchase Order
          </Text>
          <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
            Select multiple accepted RFQs to create a single consolidated PO.
          </Text>
        </View>

        {/* Filters — show all selected */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>
            Selected: {selectedRfqIds.length} RFQ(s)
          </Text>
          {selectedRfqIds.length > 0 && (
            <TouchableOpacity onPress={() => setSelectedRfqIds([])}>
              <Text style={{ fontSize: 12, color: colors.error }}>Clear all</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Delivery Date Input */}
        <View>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>
            Delivery Date *
          </Text>
          <View
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Calendar size={16} color={colors.textSecondary} />
            <Text style={{ fontSize: 13, color: deliveryDate ? colors.text : colors.textSecondary }}>
              {deliveryDate || 'Select delivery date'}
            </Text>
          </View>
          <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 4, opacity: 0.6 }}>
            Tap to set date (YYYY-MM-DD format)
          </Text>
        </View>

        {/* RFQ List */}
        {loading ? (
          <View style={{ gap: 12 }}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={{
                  height: 80,
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              />
            ))}
          </View>
        ) : rfqs.length === 0 ? (
          <View
            style={{
              alignItems: 'center',
              paddingVertical: 40,
              gap: 12,
            }}
          >
            <Package size={40} color={colors.textSecondary} />
            <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center' }}>
              No RFQs available for consolidation.{'\n'}
              Only RFQs with accepted negotiations can be consolidated.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {rfqs.map((rfq) => {
              const isSelected = selectedRfqIds.includes(rfq.id)
              const itemTotal =
                (rfq.acceptedPrice ?? 0) *
                (rfq.quantity ? parseFloat(rfq.quantity) : 0)
              return (
                <TouchableOpacity
                  key={rfq.id}
                  onPress={() => toggleSelection(rfq.id)}
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: isSelected ? colors.primary : colors.border,
                    padding: 12,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 8,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Check
                        size={18}
                        color={isSelected ? colors.primary : colors.textSecondary}
                      />
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                        #{rfq.rfqNumber}
                      </Text>
                    </View>
                    <RfqStatusBadge status={rfq.status} size="sm" />
                  </View>

                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 4 }}>
                    {rfq.supplierOrg?.name || rfq.supplierOrgName || 'Supplier'}
                  </Text>

                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      marginTop: 4,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: colors.text }}>
                      {rfq.quantity} pcs × {formatPHP(rfq.acceptedPrice ?? 0)}
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>
                      {formatPHP(itemTotal)}
                    </Text>
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        )}

        {/* Summary + Create Button */}
        {selectedRfqIds.length > 0 && (
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 16,
              gap: 12,
              marginTop: 8,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
              Summary
            </Text>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>Subtotal</Text>
              <Text style={{ fontSize: 12, color: colors.text }}>
                {formatPHP(selectedTotal)}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>VAT (12%)</Text>
              <Text style={{ fontSize: 12, color: colors.text }}>
                {formatPHP(selectedVat)}
              </Text>
            </View>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                borderTopWidth: 1,
                borderTopColor: colors.border,
                paddingTop: 8,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                Grand Total
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary }}>
                {formatPHP(selectedGrandTotal)}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleCreatePO}
              disabled={isCreatingPo}
              style={{
                backgroundColor: colors.primary,
                borderRadius: 12,
                paddingVertical: 12,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
                opacity: isCreatingPo ? 0.6 : 1,
              }}
            >
              {isCreatingPo ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <FileText size={16} color="white" />
              )}
              <Text style={{ fontSize: 14, fontWeight: '600', color: 'white' }}>
                {isCreatingPo ? 'Creating PO...' : `Create Consolidated PO (${rfqs.filter((r) => selectedRfqIds.includes(r.id)).length})`}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  )
}
