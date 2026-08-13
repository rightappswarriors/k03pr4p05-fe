// Conversation Event Cards - Structured business event cards for the conversation timeline
// These replace plain text workflow messages with rich, structured UI components

export { OfferAcceptedCard } from './OfferAcceptedCard'
export type { OfferAcceptedCardProps } from './OfferAcceptedCard'

export { OfferRejectedCard } from './OfferRejectedCard'
export type { OfferRejectedCardProps } from './OfferRejectedCard'

export { SupplierConfirmedCard } from './SupplierConfirmedCard'
export type { SupplierConfirmedCardProps } from './SupplierConfirmedCard'

export { OfferCounteredCard } from './OfferCounteredCard'
export type { OfferCounteredCardProps } from './OfferCounteredCard'

export { PurchaseOrderCreatedCard } from './PurchaseOrderCreatedCard'
export type { PurchaseOrderCreatedCardProps } from './PurchaseOrderCreatedCard'

export { ConsolidatedPoCreatedCard } from './ConsolidatedPoCreatedCard'
export type { ConsolidatedPoCreatedCardProps } from './ConsolidatedPoCreatedCard'

export { PaymentReceivedCard } from './PaymentReceivedCard'
export type { PaymentReceivedCardProps } from './PaymentReceivedCard'

export { DeliveryScheduledCard } from './DeliveryScheduledCard'
export type { DeliveryScheduledCardProps } from './DeliveryScheduledCard'

export { ShipmentDispatchedCard } from './ShipmentDispatchedCard'
export type { ShipmentDispatchedCardProps } from './ShipmentDispatchedCard'

export { RefundIssuedCard } from './RefundIssuedCard'
export type { RefundIssuedCardProps } from './RefundIssuedCard'

export { SystemEventCard } from './SystemEventCard'
export type { SystemEventCardProps } from './SystemEventCard'

// Event type to card mapping helper
export const EVENT_CARD_TYPES = {
  OFFER_ACCEPTED: 'OfferAcceptedCard',
  OFFER_REJECTED: 'OfferRejectedCard',
  SUPPLIER_CONFIRMED: 'SupplierConfirmedCard',
  COUNTER_OFFER: 'OfferCounteredCard',
  ORDER_CREATED: 'PurchaseOrderCreatedCard',
  CONSOLIDATED_PO_CREATED: 'ConsolidatedPoCreatedCard',
  PAYMENT_RECEIVED: 'PaymentReceivedCard',
  DELIVERY_SCHEDULED: 'DeliveryScheduledCard',
  SHIPMENT_DISPATCHED: 'ShipmentDispatchedCard',
  REFUND_ISSUED: 'RefundIssuedCard',
  RFQ_CREATED: 'SystemEventCard',
  FINAL_OFFER: 'SystemEventCard',
  PRICE_ACCEPTED: 'SystemEventCard',
  PRICE_REJECTED: 'SystemEventCard',
  SYSTEM: 'SystemEventCard',
  PAYMENT_UPDATE: 'SystemEventCard',
  PAYMENT_SUBMITTED: 'SystemEventCard',
  RECEIPT_UPLOADED: 'SystemEventCard',
  DELIVERY_UPDATED: 'SystemEventCard',
} as const

export type EventCardType = keyof typeof EVENT_CARD_TYPES
