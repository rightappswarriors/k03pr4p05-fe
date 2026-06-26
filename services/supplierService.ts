import { gql } from 'graphql-request'
import { graphQLRequest } from './apiClient'

// ─── Fragments ───────────────────────────────────────────────────────────────

const PRICE_TIER_FIELDS = `
  id
  minQty
  price
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
  priceTiers { ${PRICE_TIER_FIELDS} }
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

// ─── Supplier Dashboard ───────────────────────────────────────────────────────

export interface SupplierDashboardStats {
  newPOs: number
  pendingDeliveries: number
  fulfilledToday: number
  duePayments: number
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

export async function startDelivery(poId: string): Promise<Delivery> {
  const MUTATION = gql`
    mutation StartDelivery($poId: String!) {
      startDelivery(poId: $poId) {
        ${DELIVERY_FIELDS}
      }
    }
  `
  const res = await graphQLRequest<{ startDelivery: Delivery }>(MUTATION, { poId })
  return res.startDelivery
}

export async function markDelivered(poId: string, notes?: string): Promise<Delivery> {
  const MUTATION = gql`
    mutation MarkDelivered($poId: String!, $notes: String) {
      markDelivered(poId: $poId, notes: $notes) {
        ${DELIVERY_FIELDS}
      }
    }
  `
  const res = await graphQLRequest<{ markDelivered: Delivery }>(MUTATION, {
    poId,
    notes: notes ?? null,
  })
  return res.markDelivered
}

export async function fetchPurchaseOrdersForDelivery(
  supplierOrgId: number
): Promise<PurchaseOrder[]> {
  const QUERY = gql`
    query PurchaseOrdersForDelivery($supplierOrgId: Int!) {
      accepted: purchaseOrdersForSupplier(supplierOrgId: $supplierOrgId, status: ACCEPTED) {
        ${PURCHASE_ORDER_FIELDS}
      }
      inTransit: purchaseOrdersForSupplier(supplierOrgId: $supplierOrgId, status: IN_TRANSIT) {
        ${PURCHASE_ORDER_FIELDS}
      }
    }
  `
  const res = await graphQLRequest<{
    accepted: PurchaseOrder[]
    inTransit: PurchaseOrder[]
  }>(QUERY, { supplierOrgId })
  return [...res.accepted, ...res.inTransit]
}

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
  priceTiers: PriceTier[]
}

export interface SupplierCatalog {
  id: string
  organizationId: number
  items: SupplierItem[]
}

export async function fetchOrCreateCatalog(organizationId: number): Promise<SupplierCatalog> {
  const MUTATION = gql`
    mutation UpsertCatalog($organizationId: Int!) {
      upsertSupplierCatalog(organizationId: $organizationId) {
        id
        organizationId
        items { ${SUPPLIER_ITEM_FIELDS} }
      }
    }
  `
  const res = await graphQLRequest<{ upsertSupplierCatalog: SupplierCatalog }>(MUTATION, {
    organizationId,
  })
  return res.upsertSupplierCatalog
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
