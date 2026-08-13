import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { RefreshCw, ArrowUpRight, XCircle, Calendar, DollarSign } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { formatPHP, formatDateSafe, formatTimeSafe } from '@/utils/financial'
import type { ConversationMessage, NegotiationOffer } from '@/types'

interface OfferCounteredCardProps {
  offer: NegotiationOffer | ConversationMessage
  isLatest?: boolean
  isFromSupplier?: boolean
  supplierName?: string
  buyerName?: string
  onAccept?: (offerId: string) => void
  onCounter?: (offer: NegotiationOffer) => void
  onReject?: (offerId: string) => void
}

export function OfferCounteredCard({
  offer,
  isLatest = false,
  isFromSupplier = false,
  supplierName = 'Supplier',
  buyerName = 'Buyer',
  onAccept,
  onCounter,
  onReject,
}: OfferCounteredCardProps) {
  const { colors } = useTheme()

  // Extract data from either NegotiationOffer or ConversationMessage
  const isMessage = 'senderRole' in offer
  const quantity = isMessage ? (offer.metadata?.quantity ?? 0) : offer.quantity
  const unitPrice = isMessage ? (offer.metadata?.unitPrice ?? 0) : offer.unitPrice
  const deliveryDate = isMessage ? (offer.metadata?.deliveryDate ?? null) : offer.deliveryDate
  const notes = isMessage ? (offer.metadata?.notes ?? null) : offer.notes
  const minimumOrderQuantity = isMessage ? (offer.metadata?.minimumOrderQuantity ?? null) : offer.minimumOrderQuantity
  const estimatedLeadTime = isMessage ? (offer.metadata?.estimatedLeadTime ?? null) : offer.estimatedLeadTime
  const validUntil = isMessage ? (offer.metadata?.validUntil ?? null) : offer.validUntil
  const offerId = isMessage ? (offer.rfqOfferId ?? offer.id) : offer.id
  const senderName = isMessage
    ? (offer.senderAgent?.fullname ?? offer.senderOrg?.name ?? (offer.senderRole === 'SUPPLIER' ? supplierName : buyerName))
    : offer.senderName
  const senderRole = isMessage ? offer.senderRole : offer.senderType
  const createdAt = isMessage ? offer.createdAt : offer.createdAt

  const subtotal = quantity * unitPrice
  const isFromSupplierSender = senderRole === 'SUPPLIER'
  const status = isMessage ? (offer.metadata?.status ?? 'PENDING') : offer.status
  const isPending = status === 'PENDING' && isLatest

  const handleAccept = () => {
    if (onAccept) onAccept(offerId)
  }

  const handleReject = () => {
    if (onReject) onReject(offerId)
  }

  const handleCounter = () => {
    if (onCounter) onCounter(offer as NegotiationOffer)
  }

  return (
    <View style={{ alignSelf: 'stretch', marginVertical: 4 }}>
      <View
        style={{
          backgroundColor: (isFromSupplierSender ? colors.primary : colors.info) + '10',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: (isFromSupplierSender ? colors.primary : colors.info) + '30',
          padding: 16,
          gap: 12,
        }}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ArrowUpRight size={20} color={isFromSupplierSender ? colors.primary : colors.info} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: isFromSupplierSender ? colors.primary : colors.info }}>
              {isFromSupplierSender ? 'Supplier Offer' : 'Buyer Counter Offer'}
            </Text>
          </View>
          {isPending && (
            <View
              style={{
                backgroundColor: colors.success + '15',
                borderRadius: 8,
                paddingHorizontal: 8,
                paddingVertical: 4,
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: '600', color: colors.success, textTransform: 'uppercase' }}>
                Pending Response
              </Text>
            </View>
          )}
        </View>

        {/* Sender */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 11, color: isFromSupplierSender ? colors.primary : colors.info, opacity: 0.85 }}>
            From {senderName}
          </Text>
        </View>

        {/* Financial Details Grid */}
        <View style={{ gap: 8, marginTop: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Quantity
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                {quantity.toLocaleString()} pcs
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Unit Price
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                {formatPHP(unitPrice)}
              </Text>
            </View>
          </View>

          {minimumOrderQuantity && minimumOrderQuantity > 0 && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Min Order Qty
                </Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                  {minimumOrderQuantity.toLocaleString()} pcs
                </Text>
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Lead Time
                </Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                  {estimatedLeadTime ?? '—'}
                </Text>
              </View>
            </View>
          )}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: (isFromSupplierSender ? colors.primary : colors.info) + '20', paddingTop: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Subtotal
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                {formatPHP(subtotal)}
              </Text>
            </View>
            {deliveryDate && (
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Delivery
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                  <Calendar size={12} color={colors.textSecondary} />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>
                    {formatDateSafe(deliveryDate, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Notes */}
        {notes && (
          <View style={{ marginTop: 4 }}>
            <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
              Notes
            </Text>
            <Text style={{ fontSize: 12, color: colors.text, opacity: 0.85, fontStyle: 'italic' }}>
              "{notes}"
            </Text>
          </View>
        )}

        {/* Valid Until */}
        {validUntil && (
          <View style={{ marginTop: 4 }}>
            <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
              Valid Until
            </Text>
            <Text style={{ fontSize: 12, color: colors.text, opacity: 0.85 }}>
              {formatDateSafe(validUntil, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        )}

        {/* Action Buttons - only for latest pending offer from supplier */}
        {isPending && isFromSupplierSender && onAccept && (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <TouchableOpacity
              onPress={handleAccept}
              style={{
                backgroundColor: colors.success,
                borderRadius: 10,
                paddingHorizontal: 16,
                paddingVertical: 10,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                flex: 1,
                justifyContent: 'center',
              }}
            >
              <RefreshCw size={14} color="#fff" />
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#fff' }}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleCounter}
              style={{
                backgroundColor: colors.primary,
                borderRadius: 10,
                paddingHorizontal: 16,
                paddingVertical: 10,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                flex: 1,
                justifyContent: 'center',
              }}
            >
              <ArrowUpRight size={14} color="#fff" />
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#fff' }}>Counter</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleReject}
              style={{
                backgroundColor: colors.error,
                borderRadius: 10,
                paddingHorizontal: 16,
                paddingVertical: 10,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                flex: 1,
                justifyContent: 'center',
              }}
            >
              <XCircle size={14} color="#fff" />
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#fff' }}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Timestamp */}
        <Text style={{ fontSize: 10, color: colors.textSecondary, opacity: 0.6, textAlign: 'right', marginTop: 4 }}>
          {formatTimeSafe(createdAt)}
        </Text>
      </View>
    </View>
  )
}