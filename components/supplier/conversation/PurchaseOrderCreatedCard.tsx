import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { FileText, Calendar, Package, ExternalLink } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { formatPHP, formatDateSafe, formatTimeSafe } from '@/utils/financial'
import { SenderInfo } from './SenderInfo'
import type { ConversationMessage } from '@/types'
import type { PurchaseOrder } from '@/services/supplierService/supplierService'

interface Props {
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
}: Props) {
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
  const poStatus = meta.poStatus ?? 'PENDING'
  const lineItems = meta.poLineItems ?? po?.lineItems ?? []

  return (
    <View style={{ alignSelf: 'stretch', marginVertical: 4 }}>
      <View
        style={{
          backgroundColor: colors.primary + '10',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.primary + '30',
          padding: 12,
          gap: 8,
        }}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <FileText size={18} color={colors.primary} />
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>
            Purchase Order Created
          </Text>
        </View>

        {/* PO details grid */}
        <View style={{ gap: 6, marginTop: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontSize: 10, color: colors.textSecondary }}>PO Number</Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, fontFamily: 'mono' }}>
                {poNumber}
              </Text>
            </View>
            <View>
              <Text style={{ fontSize: 10, color: colors.textSecondary }}>Status</Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>{poStatus}</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontSize: 10, color: colors.textSecondary }}>Buyer</Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>{buyerName}</Text>
            </View>
            <View>
              <Text style={{ fontSize: 10, color: colors.textSecondary }}>Supplier</Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>{confirmedSupplierName}</Text>
            </View>
          </View>

          {totalAmount != null && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 10, color: colors.textSecondary }}>Grand Total</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                {formatPHP(totalAmount)}
              </Text>
            </View>
          )}

          {vatAmount != null && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 10, color: colors.textSecondary }}>VAT</Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>
                {formatPHP(vatAmount)}
              </Text>
            </View>
          )}

          {deliveryDate && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Calendar size={12} color={colors.textSecondary} />
              <Text style={{ fontSize: 10, color: colors.textSecondary }}>
                Delivery: {formatDateSafe(deliveryDate, { year: 'numeric', month: 'short', day: 'numeric' })}
              </Text>
            </View>
          )}
        </View>

        {/* Created timestamp */}
        <Text style={{ fontSize: 10, color: colors.textSecondary, opacity: 0.6 }}>
          Created: {formatDateSafe(createdAt, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </Text>

        {/* Line items */}
        {Array.isArray(lineItems) && lineItems.length > 0 && (
          <View style={{ marginTop: 4, gap: 4 }}>
            {lineItems.map((item: any, i: number) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 10, color: colors.textSecondary }}>
                  {item.name ?? item.supplierItem?.name ?? 'Item'} × {item.qty ?? item.quantity ?? 1}
                </Text>
                <Text style={{ fontSize: 10, color: colors.text }}>
                  {formatPHP(item.subtotal ?? ((item.unitPrice ?? 0) * (item.qty ?? 1)))}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* View PO link */}
        {poId && onViewPO && (
          <TouchableOpacity
            onPress={() => onViewPO(poId)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: 4 }}
          >
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.primary }}>
              View Purchase Order
            </Text>
            <ExternalLink size={11} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}
