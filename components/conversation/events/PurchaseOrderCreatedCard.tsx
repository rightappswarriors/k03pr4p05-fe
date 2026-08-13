import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { FileText, Calendar, Package, ExternalLink, DollarSign, Truck, User, Building2 } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { formatPHP, formatDateSafe, formatTimeSafe } from '@/utils/financial'
import type { ConversationMessage } from '@/types'
import type { PurchaseOrder } from '@/services/supplierService/supplierService'

interface PurchaseOrderCreatedCardProps {
  message: ConversationMessage
  po?: PurchaseOrder | null
  onViewPO?: (poId: string) => void
  supplierName?: string
}

export function PurchaseOrderCreatedCard({
  message,
  po,
  onViewPO,
  supplierName = 'Supplier',
}: PurchaseOrderCreatedCardProps) {
  const { colors } = useTheme()
  const meta = message.metadata ?? {}

  const poNumber = meta.poNumber ?? po?.poNumber ?? '—'
  const poId = meta.poId ?? po?.id ?? null
  const totalAmount = meta.totalAmount ?? po?.totalAmount
  const vatAmount = meta.vatAmount ?? po?.vatAmount
  const buyerName = meta.buyerName ?? '—'
  const confirmedSupplierName = meta.supplierName ?? supplierName
  const createdAt = meta.createdAt ?? message.createdAt
  const deliveryDate = meta.deliveryDate ?? null
  const poStatus = meta.poStatus ?? po?.status ?? 'PENDING'
  const lineItems = meta.poLineItems ?? po?.lineItems ?? []

  return (
    <View style={{ alignSelf: 'stretch', marginVertical: 4 }}>
      <View
        style={{
          backgroundColor: colors.primary + '10',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.primary + '30',
          padding: 16,
          gap: 12,
        }}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <FileText size={22} color={colors.primary} />
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary }}>
            Purchase Order Created
          </Text>
        </View>

        {/* PO Details Grid */}
        <View style={{ gap: 8, marginTop: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                PO Number
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, fontFamily: 'monospace' }}>
                {poNumber}
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Status
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: poStatus === 'PENDING' ? colors.warning : poStatus === 'ACCEPTED' ? colors.success : poStatus === 'DELIVERED' ? colors.primary : colors.textSecondary,
                  }}
                />
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{poStatus}</Text>
              </View>
            </View>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Buyer
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Building2 size={14} color={colors.textSecondary} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{buyerName}</Text>
              </View>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Supplier
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                <Package size={14} color={colors.textSecondary} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{confirmedSupplierName}</Text>
              </View>
            </View>
          </View>

          {totalAmount != null && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.primary + '20', paddingTop: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Grand Total
                </Text>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                  {formatPHP(totalAmount)}
                </Text>
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  VAT
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                  {vatAmount != null ? formatPHP(vatAmount) : '—'}
                </Text>
              </View>
            </View>
          )}

          {deliveryDate && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.primary + '20' }}>
              <Truck size={16} color={colors.textSecondary} />
              <View>
                <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Delivery Schedule
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                  {formatDateSafe(deliveryDate, { year: 'numeric', month: 'long', day: 'numeric' })}
                </Text>
              </View>
            </View>
          )}

          {/* Created timestamp */}
          <Text style={{ fontSize: 10, color: colors.textSecondary, opacity: 0.6, marginTop: 4 }}>
            Created: {formatDateSafe(createdAt, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </Text>

          {/* Line Items */}
          {Array.isArray(lineItems) && lineItems.length > 0 && (
            <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.primary + '20', gap: 6 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Items ({lineItems.length})
              </Text>
              {lineItems.map((item: any, i: number) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                  <Text style={{ fontSize: 11, color: colors.text }}>
                    {item.name ?? item.supplierItem?.name ?? 'Item'} × {item.qty ?? item.quantity ?? 1}
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>
                    {formatPHP(item.subtotal ?? ((item.unitPrice ?? 0) * (item.qty ?? 1)))}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* View PO Link */}
          {poId && onViewPO && (
            <TouchableOpacity
              onPress={() => onViewPO(poId)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                alignSelf: 'flex-start',
                marginTop: 8,
                paddingVertical: 10,
                paddingHorizontal: 16,
                backgroundColor: colors.primary + '15',
                borderRadius: 10,
                borderWidth: 1,
                borderColor: colors.primary + '30',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>
                View Purchase Order
              </Text>
              <ExternalLink size={14} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  )
}