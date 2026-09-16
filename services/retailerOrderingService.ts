import { gql } from 'graphql-request'

import { graphQLRequest } from './apiClient'

export type RetailerPriceTier = { id: string; minQty: number; maxQty?: number | null; price: number; currency: string }
export type RetailerCatalogVariant = { id: string; name: string; sku?: string | null; price: number; availableQty: number; image?: string | null; isActive: boolean; priceTiers: RetailerPriceTier[] }
export type RetailerCatalogItem = { id: string; name: string; description?: string | null; sku?: string | null; unit: string; unitPrice: number; moq: number; availableQty: number; image?: string | null; priceTiers: RetailerPriceTier[]; variants: RetailerCatalogVariant[] }
export type RetailerSupplierCatalogPage = { linkId: string; supplierOrgId: number; supplierName: string; supplierLogo?: string | null; supplierLocation?: string | null; supplierDescription?: string | null; outletId: number; outletName: string; items: RetailerCatalogItem[]; total: number; page: number; pageSize: number }
export type RetailerOrderLineQuote = { supplierItemId: string; supplierItemVariantId?: string | null; itemName: string; variantName?: string | null; sku?: string | null; unit: string; qty: number; unitPrice: number; subtotal: number; vatAmount: number; totalAmount: number; pricingSource: string; tierMinQty?: number | null; tierMaxQty?: number | null }
export type RetailerPurchaseOrderLine = { id: string; supplierItemId: string; supplierItemVariantId?: string | null; qty: number; unitPrice: number; subtotal: number; itemName?: string | null; itemSku?: string | null; itemDescription?: string | null; variantName?: string | null; variantSku?: string | null; supplierItem: { id: string; name: string; unit: string; image?: string | null }; supplierItemVariant?: { id: string; name: string; sku?: string | null; image?: string | null } | null }
export type RetailerPurchaseOrder = { id: string; poNumber: string; conversationId?: string | null; status: string; source: string; supplierConfirmation: string; supplierConfirmedAt?: string | null; supplierExpectedDeliveryAt?: string | null; deliveryDateAgreementStatus: string; deliveryDateAgreedAt?: string | null; deliveryDateResponseDeadlineAt?: string | null; deliveryDateProposalVersion: number; deliveryDateAgreementMethod?: 'BUYER_ACCEPTED' | 'SUPPLIER_ACCEPTED' | 'AUTO_BUYER_TIMEOUT' | null; supplierNote?: string | null; rejectionReason?: string | null; subtotalAmount: number; extraChargesTotal: number; totalAmount: number; vatAmount: number; notes?: string | null; requestedDate?: string | null; paymentStatus: string; paymentMethod?: 'CASH' | 'E_WALLET' | 'CARD' | null; paymentAttemptStatus?: string | null; receiptSnapshot?: Record<string, unknown> | string | null; buyerOrg: { id: number; name: string }; supplierOrg: { id: number; name: string }; outlet?: { id: number; name: string; address?: string | null; latitude?: number | null; longitude?: number | null } | null; delivery?: { id: string; status: string; scheduledDate: string; address?: string | null; latitude?: number | null; longitude?: number | null; notes?: string | null } | null; lineItems: RetailerPurchaseOrderLine[]; createdAt: string; updatedAt: string }
export type RetailerPurchaseOrderPage = { items: RetailerPurchaseOrder[]; total: number; page: number; pageSize: number }
export type MayaCheckoutResult = { transactionId: string; poId: string; transactionStatus: string; checkoutUrl?: string | null; checkoutReusable: boolean; checkoutExpiresAt?: string | null; amount: number; reconciliationRequired: boolean; canRetry: boolean; message?: string | null }
export type RetailerPurchaseOrderPaymentEligibility = { poId: string; totalAmount: number; codMaximumAmount: number; supplierAccepted: boolean; deliveryAddressConfirmed: boolean; deliveryDateAgreed: boolean; fundingClassification: 'PREPAID_PAID' | 'COD_ELIGIBLE' | 'UNFUNDED'; authoritativePrepaid: boolean; codEligible: boolean; mayaEligible: boolean; bankTransferSupported: boolean; selectedMethod?: string | null }
export type PurchaseOrderCancellationState = { purchaseOrderId: string; poNumber: string; orderStatus: string; paymentStatus: string; idempotent: boolean; cancellation?: { id: string; status: string; reason: string; requestedAt: string; decidedAt?: string | null; cancelledAt?: string | null } | null; refund?: { id: string; status: string; amount: number; currency: string; requestedAt: string; completedAt?: string | null } | null }

const PO_FIELDS = `
  id poNumber conversationId status source supplierConfirmation supplierConfirmedAt supplierExpectedDeliveryAt
  deliveryDateAgreementStatus deliveryDateAgreedAt deliveryDateResponseDeadlineAt deliveryDateProposalVersion deliveryDateAgreementMethod supplierNote rejectionReason subtotalAmount extraChargesTotal totalAmount vatAmount
  notes requestedDate paymentStatus paymentMethod paymentAttemptStatus receiptSnapshot createdAt updatedAt
  buyerOrg { id name }
  supplierOrg { id name }
  outlet { id name address latitude longitude }
  delivery { id status scheduledDate address latitude longitude notes }
  lineItems {
    id supplierItemId supplierItemVariantId qty unitPrice subtotal itemName itemSku itemDescription variantName variantSku
    supplierItem { id name unit image }
    supplierItemVariant { id name sku image }
  }
`

export async function getRetailerSupplierCatalog(options: { linkId: string; search?: string; page?: number; pageSize?: number }) {
  const response = await graphQLRequest<{ retailerSupplierCatalog: RetailerSupplierCatalogPage }>(gql`
    query RetailerSupplierCatalog($linkId: String!, $search: String, $page: Int, $pageSize: Int) {
      retailerSupplierCatalog(linkId: $linkId, search: $search, page: $page, pageSize: $pageSize) {
        linkId supplierOrgId supplierName supplierLogo supplierLocation supplierDescription outletId outletName total page pageSize
        items {
          id name description sku unit unitPrice moq availableQty image
          priceTiers { id minQty maxQty price currency }
          variants { id name sku price availableQty image isActive priceTiers { id minQty maxQty price currency } }
        }
      }
    }
  `, options)
  return response.retailerSupplierCatalog
}

export async function quoteRetailerOrderLine(input: { linkId: string; supplierItemId: string; supplierItemVariantId?: string; qty: number }) {
  const response = await graphQLRequest<{ retailerOrderLineQuote: RetailerOrderLineQuote }>(gql`
    query RetailerOrderLineQuote($linkId: String!, $supplierItemId: String!, $supplierItemVariantId: String, $qty: Int!) {
      retailerOrderLineQuote(linkId: $linkId, supplierItemId: $supplierItemId, supplierItemVariantId: $supplierItemVariantId, qty: $qty) {
        supplierItemId supplierItemVariantId itemName variantName sku unit qty unitPrice subtotal vatAmount totalAmount pricingSource tierMinQty tierMaxQty
      }
    }
  `, input)
  return response.retailerOrderLineQuote
}

export async function createRetailerPurchaseOrder(input: { linkId: string; requestId: string; notes?: string; requestedDate?: string; lineItems: Array<{ supplierItemId: string; supplierItemVariantId?: string; qty: number }> }) {
  const response = await graphQLRequest<{ createRetailerPurchaseOrder: RetailerPurchaseOrder }>(gql`
    mutation CreateRetailerPurchaseOrder($input: CreateRetailerPurchaseOrderInput!) {
      createRetailerPurchaseOrder(input: $input) { ${PO_FIELDS} }
    }
  `, { input })
  return response.createRetailerPurchaseOrder
}

export async function getRetailerPurchaseOrders(options: { status?: string; page?: number; pageSize?: number } = {}) {
  const response = await graphQLRequest<{ retailerPurchaseOrders: RetailerPurchaseOrderPage }>(gql`
    query RetailerPurchaseOrders($status: POStatus, $page: Int, $pageSize: Int) {
      retailerPurchaseOrders(status: $status, page: $page, pageSize: $pageSize) { items { ${PO_FIELDS} } total page pageSize }
    }
  `, options)
  return response.retailerPurchaseOrders
}

export async function getRetailerPurchaseOrder(id: string) {
  const response = await graphQLRequest<{ retailerPurchaseOrder: RetailerPurchaseOrder }>(gql`
    query RetailerPurchaseOrder($id: String!) { retailerPurchaseOrder(id: $id) { ${PO_FIELDS} } }
  `, { id })
  return response.retailerPurchaseOrder
}

export async function getRetailerPurchaseOrderPaymentEligibility(purchaseOrderId: string) {
  const response = await graphQLRequest<{ retailerPurchaseOrderPaymentEligibility: RetailerPurchaseOrderPaymentEligibility }>(gql`
    query RetailerPurchaseOrderPaymentEligibility($purchaseOrderId: String!) {
      retailerPurchaseOrderPaymentEligibility(purchaseOrderId: $purchaseOrderId) {
        poId totalAmount codMaximumAmount supplierAccepted deliveryAddressConfirmed deliveryDateAgreed fundingClassification authoritativePrepaid codEligible mayaEligible bankTransferSupported selectedMethod
      }
    }
  `, { purchaseOrderId })
  return response.retailerPurchaseOrderPaymentEligibility
}

export async function confirmRetailerPurchaseOrderDeliveryLocation(input: { purchaseOrderId: string; address: string; latitude: number; longitude: number; instructions?: string }) {
  const response = await graphQLRequest<{ confirmRetailerPurchaseOrderDeliveryLocation: RetailerPurchaseOrder }>(gql`
    mutation ConfirmRetailerPurchaseOrderDeliveryLocation($input: ConfirmRetailerPurchaseOrderDeliveryLocationInput!) {
      confirmRetailerPurchaseOrderDeliveryLocation(input: $input) { ${PO_FIELDS} }
    }
  `, { input })
  return response.confirmRetailerPurchaseOrderDeliveryLocation
}

export async function setRetailerPurchaseOrderPaymentMethod(purchaseOrderId: string, paymentMethod: 'CASH' | 'E_WALLET') {
  const response = await graphQLRequest<{ setRetailerPurchaseOrderPaymentMethod: RetailerPurchaseOrder }>(gql`
    mutation SetRetailerPurchaseOrderPaymentMethod($purchaseOrderId: String!, $paymentMethod: PaymentMethod!) {
      setRetailerPurchaseOrderPaymentMethod(purchaseOrderId: $purchaseOrderId, paymentMethod: $paymentMethod) { ${PO_FIELDS} }
    }
  `, { purchaseOrderId, paymentMethod })
  return response.setRetailerPurchaseOrderPaymentMethod
}

export async function acceptSupplierPurchaseOrderDeliveryDate(purchaseOrderId: string) {
  const response = await graphQLRequest<{ acceptSupplierPurchaseOrderDeliveryDate: RetailerPurchaseOrder }>(gql`
    mutation AcceptSupplierPurchaseOrderDeliveryDate($purchaseOrderId: String!) {
      acceptSupplierPurchaseOrderDeliveryDate(purchaseOrderId: $purchaseOrderId) { ${PO_FIELDS} }
    }
  `, { purchaseOrderId })
  return response.acceptSupplierPurchaseOrderDeliveryDate
}

export async function requestDifferentPurchaseOrderDeliveryDate(purchaseOrderId: string, requestedDeliveryDate: string) {
  const response = await graphQLRequest<{ requestDifferentPurchaseOrderDeliveryDate: RetailerPurchaseOrder }>(gql`
    mutation RequestDifferentPurchaseOrderDeliveryDate($purchaseOrderId: String!, $requestedDeliveryDate: DateTime!) {
      requestDifferentPurchaseOrderDeliveryDate(purchaseOrderId: $purchaseOrderId, requestedDeliveryDate: $requestedDeliveryDate) { ${PO_FIELDS} }
    }
  `, { purchaseOrderId, requestedDeliveryDate })
  return response.requestDifferentPurchaseOrderDeliveryDate
}

const PAYMENT_FIELDS = 'transactionId poId transactionStatus checkoutUrl checkoutReusable checkoutExpiresAt amount reconciliationRequired canRetry message'

export async function createRetailerMayaCheckout(purchaseOrderId: string) {
  const response = await graphQLRequest<{ createRetailerMayaCheckout: MayaCheckoutResult }>(gql`
    mutation CreateRetailerMayaCheckout($purchaseOrderId: String!) { createRetailerMayaCheckout(purchaseOrderId: $purchaseOrderId) { ${PAYMENT_FIELDS} } }
  `, { purchaseOrderId })
  return response.createRetailerMayaCheckout
}

export async function reconcileRetailerMayaPayment(transactionId: string) {
  const response = await graphQLRequest<{ reconcileRetailerMayaPayment: MayaCheckoutResult }>(gql`
    mutation ReconcileRetailerMayaPayment($transactionId: String!) { reconcileRetailerMayaPayment(transactionId: $transactionId) { ${PAYMENT_FIELDS} } }
  `, { transactionId })
  return response.reconcileRetailerMayaPayment
}

export async function getRetailerPaymentAttempt(transactionId: string) {
  const response = await graphQLRequest<{ retailerPaymentAttempt: MayaCheckoutResult }>(gql`
    query RetailerPaymentAttempt($transactionId: String!) { retailerPaymentAttempt(transactionId: $transactionId) { ${PAYMENT_FIELDS} } }
  `, { transactionId })
  return response.retailerPaymentAttempt
}

const CANCELLATION_FIELDS = `
  purchaseOrderId poNumber orderStatus paymentStatus idempotent
  cancellation { id status reason requestedAt decidedAt cancelledAt }
  refund { id status amount currency requestedAt completedAt }
`

export async function getPurchaseOrderCancellationState(purchaseOrderId: string) {
  const response = await graphQLRequest<{ purchaseOrderCancellationState: PurchaseOrderCancellationState }>(gql`
    query PurchaseOrderCancellationState($purchaseOrderId: String!) {
      purchaseOrderCancellationState(purchaseOrderId: $purchaseOrderId) { ${CANCELLATION_FIELDS} }
    }
  `, { purchaseOrderId })
  return response.purchaseOrderCancellationState
}

export async function cancelRetailerPurchaseOrder(purchaseOrderId: string, reason: string) {
  const response = await graphQLRequest<{ cancelRetailerPurchaseOrder: PurchaseOrderCancellationState }>(gql`
    mutation CancelRetailerPurchaseOrder($purchaseOrderId: String!, $reason: String!) {
      cancelRetailerPurchaseOrder(purchaseOrderId: $purchaseOrderId, reason: $reason) { ${CANCELLATION_FIELDS} }
    }
  `, { purchaseOrderId, reason })
  return response.cancelRetailerPurchaseOrder
}

export async function approvePurchaseOrderCancellation(purchaseOrderId: string) {
  const response = await graphQLRequest<{ approvePurchaseOrderCancellation: PurchaseOrderCancellationState }>(gql`
    mutation ApprovePurchaseOrderCancellation($purchaseOrderId: String!) {
      approvePurchaseOrderCancellation(purchaseOrderId: $purchaseOrderId) { ${CANCELLATION_FIELDS} }
    }
  `, { purchaseOrderId })
  return response.approvePurchaseOrderCancellation
}

export async function rejectPurchaseOrderCancellation(purchaseOrderId: string, reason: string) {
  const response = await graphQLRequest<{ rejectPurchaseOrderCancellation: PurchaseOrderCancellationState }>(gql`
    mutation RejectPurchaseOrderCancellation($purchaseOrderId: String!, $reason: String!) {
      rejectPurchaseOrderCancellation(purchaseOrderId: $purchaseOrderId, reason: $reason) { ${CANCELLATION_FIELDS} }
    }
  `, { purchaseOrderId, reason })
  return response.rejectPurchaseOrderCancellation
}
