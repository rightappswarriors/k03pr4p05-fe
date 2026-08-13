import React from 'react'
import { View, Text } from 'react-native'
import { CheckCircle2, User, Calendar, DollarSign, Package, ArrowRight } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { formatPHP, formatDateSafe, formatTimeSafe } from '@/utils/financial'
import type { ConversationMessage } from '@/types'

interface SupplierConfirmedCardProps {
  message: ConversationMessage
  supplierName?: string
}

export function SupplierConfirmedCard({
  message,
  supplierName = 'Supplier',
}: SupplierConfirmedCardProps) {
  const { colors } = useTheme()
  const meta = message.metadata ?? {}

  const confirmedByName = meta.supplierName ?? supplierName
  const confirmedAt = meta.confirmedAt ?? message.createdAt
  const acceptedPrice = meta.acceptedPrice ?? 0
  const acceptedQuantity = meta.acceptedQuantity ?? 0
  // Persisted negotiation metadata is the financial source of truth. Support
  // the field aliases already emitted by existing Portal/PO flows.
  const subtotal = meta.subtotal ?? acceptedPrice * acceptedQuantity
  const vatAmount = meta.vatAmount ?? meta.vat ?? meta.tax ?? meta.totalVat ?? 0
  const totalAmount = meta.totalAmount ?? meta.grandTotal ?? subtotal + vatAmount

  return (
    <View style={{ alignSelf: 'stretch', marginVertical: 4 }}>
      <View
        style={{
          backgroundColor: colors.success + '10',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.success + '30',
          padding: 16,
          gap: 12,
        }}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={22} color={colors.success} />
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.success }}>
            Supplier Confirmed
          </Text>
        </View>

        {/* Confirmed by */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <User size={14} color={colors.success} />
          <Text style={{ fontSize: 12, color: colors.success, opacity: 0.9 }}>
            Confirmed by {confirmedByName}
          </Text>
        </View>

        {/* Confirmed Date */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Calendar size={14} color={colors.success} />
          <Text style={{ fontSize: 12, color: colors.success, opacity: 0.9 }}>
            {formatDateSafe(confirmedAt, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        {/* Financial Details */}
        <View style={{ gap: 8, marginTop: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Quantity
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                {acceptedQuantity.toLocaleString()} pcs
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Unit Price
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                {formatPHP(acceptedPrice)}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Subtotal
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                {formatPHP(subtotal)}
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                VAT (12%)
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                {formatPHP(vatAmount)}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.success + '20', paddingTop: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Grand Total
              </Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.success }}>
                {formatPHP(totalAmount)}
              </Text>
            </View>
          </View>
        </View>

        {/* Next Step Banner - Ready for PO Creation */}
        <View
          style={{
            backgroundColor: colors.success + '15',
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 10,
            marginTop: 4,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            borderWidth: 1,
            borderColor: colors.success + '30',
          }}
        >
          <View
            style={{
              backgroundColor: colors.success,
              borderRadius: 8,
              padding: 8,
            }}
          >
            <CheckCircle2 size={18} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.success }}>
              Ready to Create Purchase Order
            </Text>
            <Text style={{ fontSize: 11, color: colors.success, opacity: 0.85, marginTop: 2 }}>
              Both parties have confirmed. You can now generate the PO.
            </Text>
          </View>
          <ArrowRight size={20} color={colors.success} />
        </View>

        {/* Timestamp */}
        <Text style={{ fontSize: 10, color: colors.textSecondary, opacity: 0.6, textAlign: 'right', marginTop: 4 }}>
          {formatTimeSafe(message.createdAt)}
        </Text>
      </View>
    </View>
  )
}
