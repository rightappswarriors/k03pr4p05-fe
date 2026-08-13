import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { Package, Calendar, FileText, Check, X, MessageSquare } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { resolveSenderName, formatDateSafe } from '@/utils/financial'
import { FinancialSummary } from './FinancialSummary'
import { SenderInfo } from './SenderInfo'
import type { NegotiationOffer, NegotiationOfferStatus } from '@/types'

interface Props {
  offer: NegotiationOffer
  isLatest?: boolean
  isFromSupplier?: boolean
  supplierName?: string
  buyerName?: string
  currentOrganizationId?: number
  onAccept?: (offerId: string) => void
  onCounter?: (offer: NegotiationOffer) => void
  onReject?: (offerId: string) => void
}

export function CounterOfferCard({
  offer,
  isLatest = false,
  isFromSupplier = false,
  supplierName = 'Supplier',
  buyerName = 'Buyer',
  currentOrganizationId,
  onAccept,
  onCounter,
  onReject,
}: Props) {
  const { colors } = useTheme()

  const isMyOffer = currentOrganizationId != null &&
    offer.senderOrgId != null && Number(offer.senderOrgId) === Number(currentOrganizationId)
  // Only the recipient of the latest pending offer can respond. Sender role
  // is presentation data; ownership is the authorization signal.
  const canAct = isLatest && !isMyOffer && offer.status === 'PENDING'
  const isAccepted = offer.status === 'ACCEPTED'
  const isRejected = offer.status === 'REJECTED'

  const statusColor =
    isAccepted
      ? colors.success + '20'
      : isRejected
        ? colors.error + '20'
        : colors.textSecondary + '20'
  const statusTextColor =
    isAccepted ? colors.success : isRejected ? colors.error : colors.textSecondary

  const senderLabel = isMyOffer ? supplierName : buyerName
  const headerLabel = isMyOffer ? 'Your Counter Offer' : 'Buyer Counter Offer'

  return (
    <View
      style={{
        alignSelf: isMyOffer ? 'flex-end' : 'flex-start',
        maxWidth: '80%',
        marginVertical: 4,
      }}
    >
      <SenderInfo
        offer={offer}
        senderType={offer.senderType}
        senderName={senderLabel}
        createdAt={offer.createdAt}
      />
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 16,
          borderTopLeftRadius: isMyOffer ? 16 : 4,
          borderTopRightRadius: isMyOffer ? 4 : 16,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 12,
          gap: 8,
        }}
      >
        {/* Header label */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            alignSelf: 'flex-start',
          }}
        >
          <Package size={12} color={colors.textSecondary} />
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>
            {headerLabel}
          </Text>
        </View>

        {/* Status badge */}
        <View
          style={{
            alignSelf: 'flex-start',
            backgroundColor: statusColor,
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 12,
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: '600', color: statusTextColor }}>
            {offer.status}
          </Text>
        </View>

        {/* Financial summary */}
        <FinancialSummary
          quantity={offer.quantity}
          unitPrice={offer.unitPrice}
          deliveryDate={offer.deliveryDate ?? null}
          leadTime={offer.estimatedLeadTime ?? null}
          isCompact
        />

        {offer.notes && (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 4 }}>
            <FileText size={11} color={colors.textSecondary} style={{ marginTop: 2 }} />
            <Text style={{ fontSize: 11, color: colors.textSecondary, flex: 1 }}>
              {offer.notes}
            </Text>
          </View>
        )}

        {offer.validUntil && (
          <Text style={{ fontSize: 10, color: colors.textSecondary }}>
            Expires: {formatDateSafe(offer.validUntil, { month: 'short', day: 'numeric', year: 'numeric' })}
          </Text>
        )}

        {/* Action buttons — only for the latest pending supplier offer */}
        {canAct && (
          <View
            style={{
              flexDirection: 'row',
              gap: 8,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              marginTop: 8,
              paddingTop: 8,
            }}
          >
            <TouchableOpacity
              onPress={() => onAccept?.(offer.id)}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                backgroundColor: colors.success,
                borderRadius: 8,
                paddingVertical: 8,
              }}
            >
              <Check size={14} color="white" />
              <Text style={{ fontSize: 13, fontWeight: '600', color: 'white' }}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onCounter?.(offer)}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 8,
                paddingVertical: 8,
                backgroundColor: colors.surface,
              }}
            >
              <MessageSquare size={14} color={colors.text} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Counter</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onReject?.(offer.id)}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                borderWidth: 1,
                borderColor: colors.error + '40',
                borderRadius: 8,
                paddingVertical: 8,
                backgroundColor: colors.error + '10',
              }}
            >
              <X size={14} color={colors.error} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.error }}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  )
}
