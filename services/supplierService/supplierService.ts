// k03pr4p05-fe\services\supplierService\supplierService.ts
import { gql } from 'graphql-request'
import { graphQLRequest } from '../apiClient'
import type { MarketplaceListing } from '../marketplaceService'
import type { SupplierItemVariant, VariantGroup } from './variantService'
import type { SupplierItemImage, ProductSpecification } from '@/types'

// ─── Fragments ───────────────────────────────────────────────────────────────

const PRICE_TIER_FIELDS = `
  id
  minQty
  maxQty
  price
`

// Inline marketplace listing fields — fetched alongside each catalog item.
const MARKETPLACE_LISTING_FIELDS = `
  marketplaceListing {
    id
    status
    publishedAt
    unpublishedAt
    featured
    views
    clicks
    inquiries
  }
`

const SUPPLIER_ITEM_FIELDS = `
  id
  name
  description
  sku
  unit
  unitPrice
  isVatExempt
  vatRate
  moq
  availableQty
  isActive
  image
  averageRating
  reviewCount
  createdAt
  updatedAt
  priceTiers { ${PRICE_TIER_FIELDS} }
  ${MARKETPLACE_LISTING_FIELDS}
`


const PO_LINE_ITEM_FIELDS = `
  id
  qty
  unitPrice
  subtotal
  supplierItem { ${SUPPLIER_ITEM_FIELDS} }
`

const DELIVERY_FIELDS = `
  id
  status
  scheduledDate
  deliveredAt
  driverName
  driverContact
  notes
`

const PURCHASE_ORDER_FIELDS = `
  id
  poNumber
  status
  totalAmount
  vatAmount
  notes
  requestedDate
  createdAt
  updatedAt
  buyerOrg { id name }
  supplierOrg { id name }
  outlet { id name address }
  lineItems { ${PO_LINE_ITEM_FIELDS} }
  delivery { ${DELIVERY_FIELDS} }
`
// ── Activity log (backed by the existing AuditLog model) ──────────────────
// Requires the small Nexus addition below (purchaseOrderActivity query).
export interface AuditLogEntry {
  id: string
  action: string
  createdAt: string
  userFullname?: string | null
}

export async function fetchPurchaseOrderActivity(poId: string): Promise<AuditLogEntry[]> {
  const QUERY = gql`
    query PurchaseOrderActivity($poId: String!) {
      purchaseOrderActivity(poId: $poId) {
        id
        action
        createdAt
        userFullname
      }
    }
  `
  const res = await graphQLRequest<{ purchaseOrderActivity: AuditLogEntry[] }>(QUERY, { poId })
  return res.purchaseOrderActivity
}
// ─── Supplier Dashboard ───────────────────────────────────────────────────────
export interface SupplierDashboardStats {
  // Retail supply-order pipeline
  newPOs: number
  pendingDeliveries: number
  fulfilledToday: number
  duePayments: number
  // Mandate marketplace
  openMandatesCount: number
  myPendingMandateOffers: number
  myAcceptedMandateOffers: number
  // Catalog + Wallet
  catalogItemCount: number
  walletBalance: number
  walletHeldBalance: number
}

// New: archive wrapper — the "deleteSupplierItem" mutation is a soft-delete
// (isActive: false), it doesn't remove the row. Named to match reality.
export async function archiveSupplierItem(id: string): Promise<SupplierItem> {
  const MUTATION = gql`
    mutation ArchiveSupplierItem($id: String!) {
      deleteSupplierItem(id: $id) { ${SUPPLIER_ITEM_FIELDS} }
    }
  `
  const res = await graphQLRequest<{ deleteSupplierItem: SupplierItem }>(MUTATION, { id })
  return res.deleteSupplierItem
}

export async function reactivateSupplierItem(id: string): Promise<SupplierItem> {
  return updateSupplierItem({ id, isActive: true })
}
export async function fetchSupplierDashboard(
  supplierOrgId: number
): Promise<SupplierDashboardStats> {
  const QUERY = gql`
    query SupplierDashboard($supplierOrgId: Int!) {
      supplierDashboard(supplierOrgId: $supplierOrgId) {
        newPOs
        pendingDeliveries
        fulfilledToday
        duePayments
        openMandatesCount
        myPendingMandateOffers
        myAcceptedMandateOffers
        catalogItemCount
        walletBalance
        walletHeldBalance
      }
    }
  `
  const res = await graphQLRequest<{ supplierDashboard: SupplierDashboardStats }>(QUERY, {
    supplierOrgId,
  })
  return res.supplierDashboard
}
// ─── Purchase Orders ─────────────────────────────────────────────────────────

export type POStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED'

export interface PurchaseOrder {
  id: string
  poNumber: string
  status: POStatus
  totalAmount: number
  vatAmount: number
  notes?: string | null
  requestedDate?: string | null
  createdAt: string
  updatedAt: string
  buyerOrg: { id: number; name: string }
  supplierOrg: { id: number; name: string }
  outlet: { id: number; name: string; address: string }
  lineItems: Array<{
    id: string
    qty: number
    unitPrice: number
    subtotal: number
    supplierItem: SupplierItem
  }>
  delivery?: Delivery | null
}

export async function fetchPurchaseOrdersForSupplier(
  supplierOrgId: number,
  status?: POStatus | null
): Promise<PurchaseOrder[]> {
  const QUERY = gql`
    query PurchaseOrdersForSupplier($supplierOrgId: Int!, $status: POStatus) {
      purchaseOrdersForSupplier(supplierOrgId: $supplierOrgId, status: $status) {
        ${PURCHASE_ORDER_FIELDS}
      }
    }
  `
  const res = await graphQLRequest<{ purchaseOrdersForSupplier: PurchaseOrder[] }>(QUERY, {
    supplierOrgId,
    status: status ?? null,
  })
  return res.purchaseOrdersForSupplier
}

export async function fetchPurchaseOrder(id: string): Promise<PurchaseOrder | null> {
  const QUERY = gql`
    query PurchaseOrder($id: String!) {
      purchaseOrder(id: $id) {
        ${PURCHASE_ORDER_FIELDS}
      }
    }
  `
  const res = await graphQLRequest<{ purchaseOrder: PurchaseOrder | null }>(QUERY, { id })
  return res.purchaseOrder
}

export async function acceptPO(
  id: string,
  scheduledDate: string,
  driverName?: string,
  driverContact?: string
): Promise<PurchaseOrder> {
  const MUTATION = gql`
    mutation AcceptPO($id: String!, $scheduledDate: DateTime!, $driverName: String, $driverContact: String) {
      acceptPO(id: $id, scheduledDate: $scheduledDate, driverName: $driverName, driverContact: $driverContact) {
        ${PURCHASE_ORDER_FIELDS}
      }
    }
  `
  const res = await graphQLRequest<{ acceptPO: PurchaseOrder }>(MUTATION, {
    id,
    scheduledDate,
    driverName: driverName ?? null,
    driverContact: driverContact ?? null,
  })
  return res.acceptPO
}

export async function rejectPO(id: string): Promise<PurchaseOrder> {
  const MUTATION = gql`
    mutation RejectPO($id: String!) {
      rejectPO(id: $id) {
        ${PURCHASE_ORDER_FIELDS}
      }
    }
  `
  const res = await graphQLRequest<{ rejectPO: PurchaseOrder }>(MUTATION, { id })
  return res.rejectPO
}

// ─── Deliveries ───────────────────────────────────────────────────────────────

export interface Delivery {
  id: string
  status: 'SCHEDULED' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED'
  scheduledDate: string
  deliveredAt?: string | null
  driverName?: string | null
  driverContact?: string | null
  notes?: string | null
}

export type DeliveryStatus = 'SCHEDULED' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED'


// ─── Supplier Catalog ─────────────────────────────────────────────────────────

export interface PriceTier {
  id: string
  minQty: number
  price: number
}

export interface SupplierItem {
  id: string
  name: string
  description?: string | null
  sku?: string | null
  unit: string
  unitPrice: number
  isVatExempt: boolean
  vatRate: number
  moq: number
  availableQty: number
  isActive: boolean
  updatedAt: string
  createdAt: string
  image?: string | null
  averageRating: number
  reviewCount: number
  priceTiers: PriceTier[]
  reservedQty: number
  incomingQty: number
  damagedQty: number
  returnedQty: number
  reorderLevel?: number | null
  reorderQty?: number | null
  // Marketplace listing — null when the item has never been published.
  marketplaceListing?: MarketplaceListing | null
  // Variant system
  hasVariants?: boolean
  totalStock?: number
  variantGroups?: VariantGroup[]
  variants?: SupplierItemVariant[]
  // Image collections for Alibaba-style product management
  images?: SupplierItemImage[]
  // Specifications
  productSpecifications?: ProductSpecification[]
}

export interface SupplierCatalog {
  id: string
  organizationId: number
  organization: {
    id: number
    name: string
    averageRating: number
    reviewCount: number
    totalReviews: number
    verifiedReviewsCount: number
    reviews: OrganizationReview[]
    reviewsReceived: OrganizationReview[]
  }
  items: SupplierItem[]
}

export interface ReviewAggregate {
  averageRating: number
  reviewCount: number
  verifiedCount: number
  breakdown: Array<{ rating: number; count: number }>
}

export interface SupplierItemReview {
  id: string
  supplierItemId: string
  reviewerOrgId: number
  rating: number
  title?: string | null
  comment?: string | null
  isVerifiedPurchase: boolean
  createdAt: string
  reviewer: { id: number; name: string }
}

export interface OrganizationReview {
  id: string
  organizationId: number
  reviewerOrgId?: number | null
  reviewerCustomerId?: number | null
  reviewerName?: string | null
  rating: number
  title?: string | null
  comment?: string | null
  isVerifiedTransaction: boolean
  createdAt: string
  reviewer?: { id: number; name: string } | null
}

export interface SupplierItemReviewPayload {
  reviews: SupplierItemReview[]
  aggregate: ReviewAggregate
}

export interface OrganizationReviewPayload {
  reviews: OrganizationReview[]
  aggregate: ReviewAggregate
}

const REVIEW_FIELDS = `
  id
  rating
  title
  comment
  createdAt
  reviewer { id name }
`

const ORGANIZATION_REVIEW_FIELDS = `
  ${REVIEW_FIELDS}
  reviewerName
`

export async function fetchOrCreateCatalog(organizationId: number): Promise<SupplierCatalog> {
  const MUTATION = gql`
    mutation UpsertCatalog($organizationId: Int!) {
      upsertSupplierCatalog(organizationId: $organizationId) {
        id
        organizationId
        organization {
          id
          name
          averageRating
          reviewCount
          totalReviews
          verifiedReviewsCount
          reviews {
            ${ORGANIZATION_REVIEW_FIELDS}
            organizationId
            reviewerOrgId
            reviewerCustomerId
            isVerifiedTransaction
          }
          reviewsReceived {
            ${ORGANIZATION_REVIEW_FIELDS}
            organizationId
            reviewerOrgId
            reviewerCustomerId
            isVerifiedTransaction
          }
        }
        items { ${SUPPLIER_ITEM_FIELDS} }
      }
    }
  `
  const res = await graphQLRequest<{ upsertSupplierCatalog: SupplierCatalog }>(MUTATION, {
    organizationId,
  })
  return res.upsertSupplierCatalog
}

export async function fetchSupplierItemReviews(supplierItemId: string): Promise<SupplierItemReviewPayload> {
  const QUERY = gql`
    query SupplierItemReviews($supplierItemId: String!) {
      supplierItemReviews(supplierItemId: $supplierItemId) {
        aggregate {
          averageRating
          reviewCount
          verifiedCount
          breakdown { rating count }
        }
        reviews {
          ${REVIEW_FIELDS}
          supplierItemId
          reviewerOrgId
          isVerifiedPurchase
        }
      }
    }
  `
  const res = await graphQLRequest<{ supplierItemReviews: SupplierItemReviewPayload }>(QUERY, { supplierItemId })
  return res.supplierItemReviews
}

export async function fetchOrganizationReviews(organizationId: number): Promise<OrganizationReviewPayload> {
  const QUERY = gql`
    query OrganizationReviews($organizationId: Int!) {
      organizationReviews(organizationId: $organizationId) {
        aggregate {
          averageRating
          reviewCount
          verifiedCount
          breakdown { rating count }
        }
        reviews {
          ${ORGANIZATION_REVIEW_FIELDS}
          organizationId
          reviewerOrgId
          reviewerCustomerId
          isVerifiedTransaction
        }
      }
    }
  `
  const res = await graphQLRequest<{ organizationReviews: OrganizationReviewPayload }>(QUERY, { organizationId })
  return res.organizationReviews
}

export interface CreateOrganizationReviewInput {
  organizationId: number
  reviewerCustomerId?: number | null
  reviewerName?: string | null
  rating: number
  title?: string | null
  comment?: string | null
}

export async function createOrganizationReview(input: CreateOrganizationReviewInput): Promise<OrganizationReview> {
  const MUTATION = gql`
    mutation CreateOrganizationReview(
      $organizationId: Int!
      $reviewerCustomerId: Int
      $reviewerName: String
      $rating: Int!
      $title: String
      $comment: String
    ) {
      createOrganizationReview(
        organizationId: $organizationId
        reviewerCustomerId: $reviewerCustomerId
        reviewerName: $reviewerName
        rating: $rating
        title: $title
        comment: $comment
      ) {
        ${ORGANIZATION_REVIEW_FIELDS}
        organizationId
        reviewerOrgId
        reviewerCustomerId
        isVerifiedTransaction
      }
    }
  `
  const res = await graphQLRequest<{ createOrganizationReview: OrganizationReview }>(MUTATION, input)
  return res.createOrganizationReview
}

export interface UpdateOrganizationReviewInput {
  id: string
  rating?: number | null
  title?: string | null
  comment?: string | null
  reviewerName?: string | null
}

export async function updateOrganizationReview(input: UpdateOrganizationReviewInput): Promise<OrganizationReview> {
  const MUTATION = gql`
    mutation UpdateOrganizationReview(
      $id: String!
      $rating: Int
      $title: String
      $comment: String
      $reviewerName: String
    ) {
      updateOrganizationReview(
        id: $id
        rating: $rating
        title: $title
        comment: $comment
        reviewerName: $reviewerName
      ) {
        ${ORGANIZATION_REVIEW_FIELDS}
        organizationId
        reviewerOrgId
        reviewerCustomerId
        isVerifiedTransaction
      }
    }
  `
  const res = await graphQLRequest<{ updateOrganizationReview: OrganizationReview }>(MUTATION, input)
  return res.updateOrganizationReview
}

export async function deleteOrganizationReview(id: string): Promise<OrganizationReview> {
  const MUTATION = gql`
    mutation DeleteOrganizationReview($id: String!) {
      deleteOrganizationReview(id: $id) {
        ${ORGANIZATION_REVIEW_FIELDS}
        organizationId
        reviewerOrgId
        reviewerCustomerId
        isVerifiedTransaction
      }
    }
  `
  const res = await graphQLRequest<{ deleteOrganizationReview: OrganizationReview }>(MUTATION, { id })
  return res.deleteOrganizationReview
}

export interface CreateSupplierItemInput {
  catalogId: string
  name: string
  description?: string
  sku?: string
  unit: string
  unitPrice: number
  isVatExempt: boolean
  vatRate: number
  moq: number
  image: string
  availableQty: number
  priceTiers?: Array<{ minQty: number; price: number }>
}

export async function createSupplierItem(input: CreateSupplierItemInput): Promise<SupplierItem> {
  const MUTATION = gql`
    mutation CreateSupplierItem(
      $catalogId: String!
      $name: String!
      $description: String
      $sku: String
      $unit: String!
      $unitPrice: Float!
      $isVatExempt: Boolean!
      $vatRate: Float!
      $moq: Int!
      $image: String!
      $availableQty: Int!
      $priceTiers: [PriceTierInput!]
    ) {
      createSupplierItem(
        catalogId: $catalogId
        name: $name
        description: $description
        sku: $sku
        unit: $unit
        unitPrice: $unitPrice
        isVatExempt: $isVatExempt
        vatRate: $vatRate
        moq: $moq
        image: $image
        availableQty: $availableQty
        priceTiers: $priceTiers
      ) { ${SUPPLIER_ITEM_FIELDS} }
    }
  `
  const res = await graphQLRequest<{ createSupplierItem: SupplierItem }>(MUTATION, input)
  return res.createSupplierItem
}

export interface UpdateSupplierItemInput {
  id: string
  name?: string
  description?: string
  sku?: string
  unit?: string
  unitPrice?: number
  isVatExempt?: boolean
  vatRate?: number
  moq?: number
  image?: string
  availableQty?: number
  isActive?: boolean
  priceTiers?: Array<{ minQty: number; price: number }>
}

export async function updateSupplierItem(input: UpdateSupplierItemInput): Promise<SupplierItem> {
  const { id, ...rest } = input
  const MUTATION = gql`
    mutation UpdateSupplierItem(
      $id: String!
      $name: String
      $description: String
      $sku: String
      $unit: String
      $unitPrice: Float
      $isVatExempt: Boolean
      $vatRate: Float
      $moq: Int
      $image: String
      $availableQty: Int
      $isActive: Boolean
      $priceTiers: [PriceTierInput!]
    ) {
      updateSupplierItem(
        id: $id
        name: $name
        description: $description
        sku: $sku
        unit: $unit
        unitPrice: $unitPrice
        isVatExempt: $isVatExempt
        vatRate: $vatRate
        moq: $moq
        image: $image
        availableQty: $availableQty
        isActive: $isActive
        priceTiers: $priceTiers
      ) { ${SUPPLIER_ITEM_FIELDS} }
    }
  `
  const res = await graphQLRequest<{ updateSupplierItem: SupplierItem }>(MUTATION, { id, ...rest })
  return res.updateSupplierItem
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface SupplierAnalytics {
  totalRevenue: number
  ordersFulfilled: number
  averageOrderValue: number
  topOutlets: Array<{ outletName: string; totalAmount: number; orderCount: number }>
}

export async function fetchSupplierAnalytics(
  supplierOrgId: number
): Promise<SupplierAnalytics> {
  // Derived from delivered purchase orders — computed client-side from raw PO data
  const QUERY = gql`
    query SupplierAnalytics($supplierOrgId: Int!) {
      delivered: purchaseOrdersForSupplier(supplierOrgId: $supplierOrgId, status: DELIVERED) {
        id
        totalAmount
        outlet { id name }
      }
    }
  `
  const res = await graphQLRequest<{
    delivered: Array<{ id: string; totalAmount: number; outlet: { id: number; name: string } }>
  }>(QUERY, { supplierOrgId })

  const delivered = res.delivered
  const totalRevenue = delivered.reduce((s, o) => s + o.totalAmount, 0)
  const ordersFulfilled = delivered.length
  const averageOrderValue = ordersFulfilled > 0 ? totalRevenue / ordersFulfilled : 0

  const outletMap = new Map<string, { outletName: string; totalAmount: number; orderCount: number }>()
  for (const o of delivered) {
    const key = String(o.outlet.id)
    if (!outletMap.has(key)) {
      outletMap.set(key, { outletName: o.outlet.name, totalAmount: 0, orderCount: 0 })
    }
    const entry = outletMap.get(key)!
    entry.totalAmount += o.totalAmount
    entry.orderCount += 1
  }
  const topOutlets = [...outletMap.values()]
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 5)

  return { totalRevenue, ordersFulfilled, averageOrderValue, topOutlets }
}
