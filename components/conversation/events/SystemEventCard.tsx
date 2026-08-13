import React from 'react'
import { View, Text } from 'react-native'
import { 
  MessageCircle, 
  AlertCircle, 
  Info, 
  Clock, 
  Tag, 
  FileText, 
  DollarSign, 
  Truck, 
  Package, 
  CreditCard,
  Receipt,
  RotateCcw
} from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { formatDateSafe, formatTimeSafe } from '@/utils/financial'
import type { ConversationMessage } from '@/types'

interface SystemEventCardProps {
  message: ConversationMessage
  onViewPO?: (poId: string) => void
}

const getEventIcon = (type: string) => {
  switch (type) {
    case 'RFQ_CREATED':
      return FileText
    case 'FINAL_OFFER':
      return Tag
    case 'PRICE_ACCEPTED':
      return DollarSign
    case 'PRICE_REJECTED':
      return AlertCircle
    case 'SYSTEM':
      return Info
    case 'ORDER_CREATED':
      return FileText
    case 'PAYMENT_UPDATE':
      return CreditCard
    case 'PAYMENT_SUBMITTED':
      return CreditCard
    case 'RECEIPT_UPLOADED':
      return Receipt
    case 'DELIVERY_UPDATED':
      return Truck
    case 'CONSOLIDATED_PO_CREATED':
      return Package
    default:
      return MessageCircle
  }
}

const getEventColor = (type: string, colors: any) => {
  switch (type) {
    case 'RFQ_CREATED':
      return colors.primary
    case 'FINAL_OFFER':
      return colors.info
    case 'PRICE_ACCEPTED':
      return colors.success
    case 'PRICE_REJECTED':
      return colors.error
    case 'SYSTEM':
      return colors.textSecondary
    case 'ORDER_CREATED':
      return colors.primary
    case 'PAYMENT_UPDATE':
      return colors.warning
    case 'PAYMENT_SUBMITTED':
      return colors.warning
    case 'RECEIPT_UPLOADED':
      return colors.info
    case 'DELIVERY_UPDATED':
      return colors.primary
    case 'CONSOLIDATED_PO_CREATED':
      return colors.purple || colors.primary
    default:
      return colors.textSecondary
  }
}

const getEventLabel = (type: string) => {
  switch (type) {
    case 'RFQ_CREATED':
      return 'RFQ Created'
    case 'FINAL_OFFER':
      return 'Final Offer Sent'
    case 'PRICE_ACCEPTED':
      return 'Price Accepted'
    case 'PRICE_REJECTED':
      return 'Price Rejected'
    case 'SYSTEM':
      return 'System Message'
    case 'ORDER_CREATED':
      return 'Order Created'
    case 'PAYMENT_UPDATE':
      return 'Payment Update'
    case 'PAYMENT_SUBMITTED':
      return 'Payment Submitted'
    case 'RECEIPT_UPLOADED':
      return 'Receipt Uploaded'
    case 'DELIVERY_UPDATED':
      return 'Delivery Updated'
    case 'CONSOLIDATED_PO_CREATED':
      return 'Consolidated PO Created'
    default:
      return 'Event'
  }
}

export function SystemEventCard({
  message,
  onViewPO,
}: SystemEventCardProps) {
  const { colors } = useTheme()
  const EventIcon = getEventIcon(message.type)
  const eventColor = getEventColor(message.type, colors)
  const label = getEventLabel(message.type)
  const meta = message.metadata ?? {}

  return (
    <View style={{ alignSelf: 'stretch', marginVertical: 4 }}>
      <View
        style={{
          backgroundColor: eventColor + '10',
          borderRadius: 12,
          borderWidth: 1,
          borderColor: eventColor + '30',
          padding: 12,
          gap: 8,
          alignItems: 'center',
        }}
      >
        {/* Icon and Label */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <EventIcon size={18} color={eventColor} />
          <Text style={{ fontSize: 13, fontWeight: '600', color: eventColor }}>
            {label}
          </Text>
        </View>

        {/* Message */}
        {message.message && (
          <Text style={{ fontSize: 12, color: colors.text, opacity: 0.85, textAlign: 'center', lineHeight: 18 }}>
            {message.message}
          </Text>
        )}

        {/* Metadata details for specific event types */}
        {message.type === 'CONSOLIDATED_PO_CREATED' && meta && (
          <View style={{ width: '100%', gap: 4, marginTop: 4 }}>
            {meta.poNumber && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 11, color: colors.textSecondary, flex: 1 }}>PO Number</Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text, fontFamily: 'monospace' }}>{meta.poNumber}</Text>
              </View>
            )}
            {meta.totalAmount != null && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 11, color: colors.textSecondary, flex: 1 }}>Total Amount</Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.success }}>
                  ₱{Number(meta.totalAmount).toLocaleString()}
                </Text>
              </View>
            )}
            {meta.rfqIds && Array.isArray(meta.rfqIds) && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 11, color: colors.textSecondary, flex: 1 }}>RFQs Included</Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>{meta.rfqIds.length} RFQ(s)</Text>
              </View>
            )}
          </View>
        )}

        {message.type === 'DELIVERY_UPDATED' && meta && (
          <View style={{ width: '100%', gap: 4, marginTop: 4 }}>
            {meta.status && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 11, color: colors.textSecondary, flex: 1 }}>Status</Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>{meta.status}</Text>
              </View>
            )}
            {meta.scheduledDate && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 11, color: colors.textSecondary, flex: 1 }}>Scheduled</Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>
                  {formatDateSafe(meta.scheduledDate, { year: 'numeric', month: 'short', day: 'numeric' })}
                </Text>
              </View>
            )}
            {meta.driverName && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 11, color: colors.textSecondary, flex: 1 }}>Driver</Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>{meta.driverName}</Text>
              </View>
            )}
          </View>
        )}

        {message.type === 'PAYMENT_UPDATE' && meta && (
          <View style={{ width: '100%', gap: 4, marginTop: 4 }}>
            {meta.amount != null && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 11, color: colors.textSecondary, flex: 1 }}>Amount</Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.success }}>
                  ₱{Number(meta.amount).toLocaleString()}
                </Text>
              </View>
            )}
            {meta.status && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 11, color: colors.textSecondary, flex: 1 }}>Status</Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>{meta.status}</Text>
              </View>
            )}
          </View>
        )}

        {/* Timestamp */}
        <Text style={{ fontSize: 10, color: colors.textSecondary, opacity: 0.6, textAlign: 'center', marginTop: 4 }}>
          {formatTimeSafe(message.createdAt)}
        </Text>
      </View>
    </View>
  )
}