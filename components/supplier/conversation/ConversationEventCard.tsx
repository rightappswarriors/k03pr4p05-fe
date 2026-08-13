import React from 'react'
import { View, Text } from 'react-native'
import { MessageEventCard } from '@/components/supplier/conversation/MessageEventCard'
import { CounterOfferCard } from '@/components/supplier/conversation/CounterOfferCard'
import {
  OfferAcceptedCard,
  OfferRejectedCard,
  SupplierConfirmedCard,
  OfferCounteredCard,
  PurchaseOrderCreatedCard,
  ConsolidatedPoCreatedCard,
  PaymentReceivedCard,
  DeliveryScheduledCard,
  ShipmentDispatchedCard,
  RefundIssuedCard,
  SystemEventCard,
} from '@/components/conversation/events'
import type { ConversationMessage, NegotiationOffer } from '@/types'

export type TimelineEvent =
  | { kind: 'message'; data: ConversationMessage }
  | { kind: 'offer'; data: NegotiationOffer }

export interface ConversationEventCardProps {
  event: TimelineEvent
  isLatestOffer?: boolean
  supplierName?: string
  buyerName?: string
  currentOrganizationId?: number
  onAcceptOffer?: (offerId: string) => void
  onCounterOffer?: (offer: NegotiationOffer) => void
  onRejectOffer?: (offerId: string) => void
  onViewPO?: (poId: string) => void
  onViewTracking?: (url: string) => void
  onViewReceipt?: (url: string) => void
}

/**
 * Dispatches to the correct card component based on the message type or
 * whether the event is an offer record.
 *
 * Structured timeline cards (full-width, centered):
 *  - OFFER_ACCEPTED → OfferAcceptedCard
 *  - OFFER_REJECTED → OfferRejectedCard
 *  - SUPPLIER_CONFIRMED → SupplierConfirmedCard
 *  - COUNTER_OFFER (as message with metadata) → OfferCounteredCard
 *  - ORDER_CREATED → PurchaseOrderCreatedCard
 *  - CONSOLIDATED_PO_CREATED → ConsolidatedPoCreatedCard
 *  - PAYMENT_RECEIVED → PaymentReceivedCard
 *  - DELIVERY_SCHEDULED → DeliveryScheduledCard
 *  - SHIPMENT_DISPATCHED → ShipmentDispatchedCard
 *  - REFUND_ISSUED → RefundIssuedCard
 *
 * NegotiationOffer records (kind: 'offer') render as chat bubbles via CounterOfferCard.
 * Regular text messages with a sender → MessageEventCard (chat bubbles).
 * System messages without sender → SystemEventCard.
 */
export function ConversationEventCard({
  event,
  isLatestOffer = false,
  supplierName = 'Supplier',
  buyerName = 'Buyer',
  currentOrganizationId,
  onAcceptOffer,
  onCounterOffer,
  onRejectOffer,
  onViewPO,
  onViewTracking,
  onViewReceipt,
}: ConversationEventCardProps) {
  if (event.kind === 'offer') {
    const offer = event.data
    const isFromSupplier = offer.senderType === 'SUPPLIER'

    return (
      <CounterOfferCard
        offer={offer}
        isLatest={isLatestOffer}
        isFromSupplier={isFromSupplier}
        supplierName={supplierName}
        buyerName={buyerName}
        currentOrganizationId={currentOrganizationId}
        onAccept={onAcceptOffer}
        onCounter={onCounterOffer}
        onReject={onRejectOffer}
      />
    )
  }

  const message = event.data
  const msgType = message.type

  // Messages without a sender role — treat as system events
  const hasSender = message.senderAgentId || message.senderOrgId

  switch (msgType) {
    case 'OFFER_ACCEPTED':
      return (
        <OfferAcceptedCard
          message={message}
          buyerName={buyerName}
          supplierName={supplierName}
        />
      )

    case 'OFFER_REJECTED':
      return (
        <OfferRejectedCard
          message={message}
          supplierName={supplierName}
          buyerName={buyerName}
        />
      )

    case 'SUPPLIER_CONFIRMED':
      return (
        <SupplierConfirmedCard
          message={message}
          supplierName={supplierName}
        />
      )

    case 'ORDER_CREATED':
      return (
        <PurchaseOrderCreatedCard
          message={message}
          onViewPO={onViewPO}
          supplierName={supplierName}
        />
      )

    case 'CONSOLIDATED_PO_CREATED':
      return (
        <ConsolidatedPoCreatedCard
          message={message}
          onViewPO={onViewPO}
          supplierName={supplierName}
        />
      )

    case 'PAYMENT_RECEIVED':
      return (
        <PaymentReceivedCard
          message={message}
          onViewReceipt={onViewReceipt}
        />
      )

    case 'DELIVERY_SCHEDULED':
      return (
        <DeliveryScheduledCard
          message={message}
          onViewTracking={onViewTracking}
        />
      )

    case 'SHIPMENT_DISPATCHED':
      return (
        <ShipmentDispatchedCard
          message={message}
          onViewTracking={onViewTracking}
        />
      )

    case 'REFUND_ISSUED':
      return (
        <RefundIssuedCard
          message={message}
          onViewReceipt={onViewReceipt}
        />
      )

    case 'COUNTER_OFFER':
      // COUNTER_OFFER can arrive as a message with metadata or as an offer record.
      // If it has metadata, render as a structured OfferCounteredCard (timeline card).
      if (message.metadata) {
        const offer: NegotiationOffer = {
          id: message.rfqOfferId ?? message.id,
          conversationId: message.conversationId,
          senderType: message.senderRole,
          senderName: message.senderAgent?.fullname ?? message.senderOrg?.name ?? '',
          quantity: message.metadata.quantity ?? 0,
          unitPrice: message.metadata.unitPrice ?? 0,
          deliveryDate: message.metadata.deliveryDate ?? null,
          notes: message.metadata.notes ?? null,
          status: 'PENDING',
          negotiationStatus: null,
          minimumOrderQuantity: message.metadata.minimumOrderQuantity ?? null,
          estimatedLeadTime: message.metadata.estimatedLeadTime ?? null,
          validUntil: message.metadata.validUntil ?? null,
          createdAt: message.createdAt,
          updatedAt: message.createdAt,
          senderAgent: message.senderAgent ?? null,
          senderOrg: message.senderOrg ?? null,
        }

        const isFromSupplier = message.senderRole === 'SUPPLIER'
        return (
          <OfferCounteredCard
            offer={offer}
            isLatest={isLatestOffer}
            isFromSupplier={isFromSupplier}
            supplierName={supplierName}
            buyerName={buyerName}
            onAccept={onAcceptOffer}
            onCounter={onCounterOffer}
            onReject={onRejectOffer}
          />
        )
      }
      // Fall through to system event
      return <SystemEventCard message={message} onViewPO={onViewPO} onViewTracking={onViewTracking} onViewReceipt={onViewReceipt} />

    case 'TEXT':
    case 'SYSTEM':
    case 'RFQ_CREATED':
    case 'FINAL_OFFER':
    case 'PRICE_ACCEPTED':
    case 'PRICE_REJECTED':
    case 'PAYMENT_UPDATE':
    case 'PAYMENT_SUBMITTED':
    case 'PAYMENT_RECEIVED':
    case 'DELIVERY_SCHEDULED':
    case 'SHIPMENT_DISPATCHED':
    case 'REFUND_ISSUED':
    case 'RECEIPT_UPLOADED':
    case 'DELIVERY_UPDATED':
      if (!hasSender) {
        // System-style message (no sender) → SystemEventCard
        return <SystemEventCard message={message} onViewPO={onViewPO} onViewTracking={onViewTracking} onViewReceipt={onViewReceipt} />
      }
      // Regular text message with a sender → MessageEventCard (chat bubble)
      return (
        <MessageEventCard
          message={message}
          supplierName={supplierName}
          buyerName={buyerName}
          isFromSupplier={message.senderRole === 'SUPPLIER'}
        />
      )

    default:
      return <SystemEventCard message={message} onViewPO={onViewPO} onViewTracking={onViewTracking} onViewReceipt={onViewReceipt} />
  }
}
