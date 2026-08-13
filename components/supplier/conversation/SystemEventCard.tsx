import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { Info, Calendar, CreditCard, Receipt, Truck, ExternalLink } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { formatDateSafe, formatPHP, formatTimeSafe } from '@/utils/financial'
import type { ConversationMessage, MessageType } from '@/types'

const EVENT_ICONS: Record<MessageType, React.ReactNode> = {
  TEXT: <Info size={16} color="#6474a5" />,
  RFQ_CREATED: <Info size={16} color="#3b82f6" />,
  COUNTER_OFFER: <Info size={16} color="#6366f1" />,
  FINAL_OFFER: <Info size={16} color="#6366f1" />,
  PRICE_ACCEPTED: <Info size={16} color="#10b981" />,
  PRICE_REJECTED: <Info size={16} color="#ef4444" />,
  SYSTEM: <Info size={16} color="#6474a5" />,
  ORDER_CREATED: <Calendar size={16} color="#3b82f6" />,
  PAYMENT_UPDATE: <CreditCard size={16} color="#f59e0b" />,
  OFFER_ACCEPTED: <Info size={16} color="#10b981" />,
  OFFER_REJECTED: <Info size={16} color="#ef4444" />,
  SUPPLIER_CONFIRMED: <Info size={16} color="#14b8a8" />,
  CONSOLIDATED_PO_CREATED: <Calendar size={16} color="#8b5cf6" />,
  PAYMENT_SUBMITTED: <CreditCard size={16} color="#f59e0b" />,
  RECEIPT_UPLOADED: <Receipt size={16} color="#10b981" />,
  DELIVERY_UPDATED: <Truck size={16} color="#6366f1" />,
  PAYMENT_RECEIVED: <CreditCard size={16} color="#10b981" />,
  DELIVERY_SCHEDULED: <Calendar size={16} color="#3b82f6" />,
  SHIPMENT_DISPATCHED: <Truck size={16} color="#6366f1" />,
  REFUND_ISSUED: <CreditCard size={16} color="#f59e0b" />,
}

interface Props {
  message: ConversationMessage
  onViewPO?: (poId: string) => void
  supplierName?: string
}

export function SystemEventCard({ message, onViewPO, supplierName = 'Supplier' }: Props) {
  const { colors } = useTheme()
  const icon = EVENT_ICONS[message.type] ?? <Info size={16} color={colors.textSecondary} />
  const meta = message.metadata ?? {}

  let title = message.message
  let details: React.ReactNode = null

  switch (message.type) {
    case 'PAYMENT_SUBMITTED':
      title = 'Payment Submitted'
      details = meta.amount != null ? (
        <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>
          Amount: {formatPHP(meta.amount)}
        </Text>
      ) : null
      break

    case 'PAYMENT_UPDATE':
      title = 'Payment Updated'
      details = meta.amount != null ? (
        <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>
          Amount: {formatPHP(meta.amount)}
        </Text>
      ) : null
      break

    case 'RECEIPT_UPLOADED':
      title = 'Receipt Uploaded'
      if (meta.fileUrl) {
        details = (
          <TouchableOpacity onPress={() => {}}>
            <Text style={{ fontSize: 11, color: colors.primary, marginTop: 4 }}>
              View receipt
            </Text>
          </TouchableOpacity>
        )
      }
      break

    case 'DELIVERY_UPDATED':
      title = 'Delivery Updated'
      details = meta.trackingNumber ? (
        <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>
          Tracking: {meta.trackingNumber}
        </Text>
      ) : null
      break

    case 'RFQ_CREATED':
      title = 'RFQ Created'
      break

    case 'FINAL_OFFER':
      title = 'Final Offer'
      break

    case 'CONSOLIDATED_PO_CREATED':
      title = 'Consolidated Purchase Order Created'
      if (meta.poNumber) {
        details = (
          <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>
            PO #: {meta.poNumber}
          </Text>
        )
      }
      break

    case 'ORDER_CREATED':
      title = 'Order Created'
      break

    case 'PAYMENT_RECEIVED':
      title = 'Payment Received'
      if (meta.amount != null) {
        details = (
          <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>
            Amount: {formatPHP(meta.amount)}
          </Text>
        )
      }
      break

    case 'DELIVERY_SCHEDULED':
      title = 'Delivery Scheduled'
      if (meta.scheduledDate) {
        details = (
          <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>
            Scheduled: {formatDateSafe(meta.scheduledDate)}
          </Text>
        )
      }
      break

    case 'SHIPMENT_DISPATCHED':
      title = 'Shipment Dispatched'
      if (meta.trackingNumber) {
        details = (
          <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>
            Tracking: {meta.trackingNumber}
          </Text>
        )
      }
      break

    case 'REFUND_ISSUED':
      title = 'Refund Issued'
      if (meta.amount != null) {
        details = (
          <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>
            Amount: {formatPHP(meta.amount)}
          </Text>
        )
      }
      break

    default:
      if (message.message) title = message.message
      break
  }

  return (
    <View style={{ alignSelf: 'center', marginVertical: 4, maxWidth: '85%' }}>
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <View style={{ marginTop: 1 }}>{icon}</View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text }}>
              {title}
            </Text>
            {details}
            <Text style={{ fontSize: 10, color: colors.textSecondary, opacity: 0.6, marginTop: 4 }}>
              {formatTimeSafe(message.createdAt)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  )
}

// Re-export the icon map for external use
export { EVENT_ICONS }
