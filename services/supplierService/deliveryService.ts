import { gql } from 'graphql-request'
import { graphQLRequest } from '../apiClient'
import type { PurchaseOrder, Delivery, DeliveryStatus } from './supplierService'

// ─── Types ──────────────────────────────────────────────────────────────────

export type { DeliveryStatus, Delivery }

export interface DeliveryItem {
  poId: string
  poNumber: string
  buyerName: string
  outletName: string
  outletAddress: string
  scheduledDate: string
  deliveredAt?: string | null
  status: DeliveryStatus
  driverName?: string | null
  driverContact?: string | null
  totalAmount: number
  createdAt: string
  notes?: string | null
}

export type DeliverySort = 'NEWEST' | 'OLDEST' | 'NEAREST_DELIVERY' | 'HIGHEST_AMOUNT'

export interface DeliveryDateRange {
  start: string | null // ISO date
  end: string | null
}

// ─── Mapping ────────────────────────────────────────────────────────────────

export function mapPOToDelivery(po: PurchaseOrder): DeliveryItem | null {
  if (!po.delivery) return null
  return {
    poId: po.id,
    poNumber: po.poNumber,
    buyerName: po.buyerOrg.name,
    outletName: po.outlet?.name ?? '—',
    outletAddress: po.outlet?.address ?? '—',
    scheduledDate: po.delivery.scheduledDate,
    deliveredAt: po.delivery.deliveredAt,
    status: po.delivery.status,
    driverName: po.delivery.driverName,
    driverContact: po.delivery.driverContact,
    totalAmount: po.totalAmount,
    createdAt: po.createdAt,
    notes: po.delivery.notes,
  }
}

// ─── Fetch ──────────────────────────────────────────────────────────────────

const DELIVERY_PO_FIELDS = `
  id
  poNumber
  totalAmount
  createdAt
  buyerOrg { id name }
  outlet { id name address }
  delivery {
    id status scheduledDate deliveredAt driverName driverContact notes
  }
`

/**
 * Fetches every PO for this supplier that has a delivery record, regardless
 * of the PO's own status — the Deliveries screen tracks DeliveryStatus, not
 * POStatus, and needs to keep showing DELIVERED/FAILED history.
 * TODO(backend): once volume grows, this should become a dedicated
 * `deliveriesForSupplier(supplierOrgId, status, dateRange)` query with
 * server-side filtering instead of fetching all POs and filtering client-side.
 */
export async function fetchDeliveries(supplierOrgId: number): Promise<DeliveryItem[]> {
  const QUERY = gql`
    query DeliveriesForSupplier($supplierOrgId: Int!) {
      purchaseOrdersForSupplier(supplierOrgId: $supplierOrgId) {
        ${DELIVERY_PO_FIELDS}
      }
    }
  `
  const res = await graphQLRequest<{ purchaseOrdersForSupplier: Array<PurchaseOrder> }>(QUERY, {
    supplierOrgId,
  })
  return res.purchaseOrdersForSupplier
    .map(mapPOToDelivery)
    .filter((d): d is DeliveryItem => d !== null)
}

export async function fetchDeliveryByPOId(poId: string): Promise<DeliveryItem | null> {
  const QUERY = gql`
    query DeliveryByPOId($id: String!) {
      purchaseOrder(id: $id) {
        ${DELIVERY_PO_FIELDS}
      }
    }
  `
  const res = await graphQLRequest<{ purchaseOrder: PurchaseOrder | null }>(QUERY, { id: poId })
  return res.purchaseOrder ? mapPOToDelivery(res.purchaseOrder) : null
}

// ─── Mutations (thin wrappers over existing PO mutations) ──────────────────

export async function startDelivery(poId: string): Promise<Delivery> {
  const MUTATION = gql`
    mutation StartDelivery($poId: String!) {
      startDelivery(poId: $poId) {
        id status scheduledDate deliveredAt driverName driverContact notes
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
        id status scheduledDate deliveredAt driverName driverContact notes
      }
    }
  `
  const res = await graphQLRequest<{ markDelivered: Delivery }>(MUTATION, {
    poId,
    notes: notes ?? null,
  })
  return res.markDelivered
}

// TODO(backend): no mutation exists yet to mark a delivery FAILED, or to
// reassign a driver after scheduling. Both need new Nexus mutations
// (e.g. `markDeliveryFailed(poId, reason)`, `reassignDriver(poId, driverName, driverContact)`)
// plus corresponding AuditLog entries once you get to that.

// ─── Client-side filtering / sorting (mirrors OrderFilters' approach) ──────

export function applyDeliveryFilters(
  deliveries: DeliveryItem[],
  opts: {
    search: string
    status: DeliveryStatus | 'ALL'
    dateRange: DeliveryDateRange
    sort: DeliverySort
  }
): DeliveryItem[] {
  const { search, status, dateRange, sort } = opts
  let result = deliveries

  if (status !== 'ALL') result = result.filter((d) => d.status === status)

  if (search.trim()) {
    const q = search.trim().toLowerCase()
    result = result.filter(
      (d) => d.poNumber.toLowerCase().includes(q) || d.buyerName.toLowerCase().includes(q)
    )
  }

  if (dateRange.start) {
    const start = new Date(dateRange.start)
    result = result.filter((d) => new Date(d.scheduledDate) >= start)
  }
  if (dateRange.end) {
    const end = new Date(dateRange.end)
    result = result.filter((d) => new Date(d.scheduledDate) <= end)
  }

  const sorted = [...result]
  switch (sort) {
    case 'NEWEST':
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      break
    case 'OLDEST':
      sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      break
    case 'NEAREST_DELIVERY':
      sorted.sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
      break
    case 'HIGHEST_AMOUNT':
      sorted.sort((a, b) => b.totalAmount - a.totalAmount)
      break
  }
  return sorted
}

// ─── Helpers for KPI computation ───────────────────────────────────────────

export function isSameDay(iso?: string | null, ref: Date = new Date()): boolean {
  if (!iso) return false
  const d = new Date(iso)
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth() && d.getDate() === ref.getDate()
}

export function isWithinLastDays(iso?: string | null, days = 7): boolean {
  if (!iso) return false
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  return new Date(iso) >= cutoff
}

export function isOverdue(delivery: DeliveryItem): boolean {
  // Heuristic: a SCHEDULED delivery whose date has already passed.
  // TODO(backend): consider a real `isOverdue` flag or SLA field instead of
  // computing this client-side once you have delivery SLAs defined.
  return delivery.status === 'SCHEDULED' && new Date(delivery.scheduledDate).getTime() < Date.now()
}