import { gql } from 'graphql-request'
import { graphQLRequest } from './apiClient'

export type TimelineEventType =
  | 'PURCHASE_ORDER'
  | 'DELIVERY'
  | 'WALLET'
  | 'MANDATE'
  | 'INVENTORY'
  | 'SYSTEM'
  | 'ORGANIZATION'
  | 'NOTIFICATION'

export type TimelineStatus = 'SUCCESS' | 'WARNING' | 'INFO' | 'ERROR' | 'PENDING'
export type TimelineSort = 'NEWEST' | 'OLDEST'
export type TimelineLayout = 'cards' | 'timeline'

export interface TimelineDateRange {
  start: string | null
  end: string | null
}

export interface TimelineEvent {
  id: string
  eventType: TimelineEventType
  title: string
  description: string
  status: TimelineStatus
  referenceId?: string | null
  referenceType?: string | null
  organization?: string | null
  createdAt: string
  actor?: string | null
  icon: string
  color: string
  actionLabel?: string | null
  actionRoute?: string | null
  metadata: Record<string, unknown>
}

export interface TimelineGroup {
  label: string
  events: TimelineEvent[]
}

export interface TimelineSummary {
  total: number
  purchaseOrders: number
  deliveries: number
  wallet: number
  mandates: number
  inventory: number
  notifications: number
  attention: number
}

export interface TimelineResult {
  groups: TimelineGroup[]
  totalCount: number
  hasNextPage: boolean
  summary: TimelineSummary
}

export interface TimelineQueryOptions {
  supplierOrgId: number
  search?: string
  status?: TimelineStatus | 'ALL'
  eventTypes?: TimelineEventType[]
  dateRange?: TimelineDateRange
  limit?: number
  offset?: number
  sort?: TimelineSort
}

const TIMELINE_FIELDS = `
  totalCount
  hasNextPage
  summary {
    total
    purchaseOrders
    deliveries
    wallet
    mandates
    inventory
    notifications
    attention
  }
  groups {
    label
    events {
      id
      eventType
      title
      description
      status
      referenceId
      referenceType
      organization
      createdAt
      actor
      icon
      color
      actionLabel
      actionRoute
      metadata
    }
  }
`

export async function getTimeline(options: TimelineQueryOptions): Promise<TimelineResult> {
  const QUERY = gql`
    query SupplierOrderTimeline(
      $supplierOrgId: Int!
      $search: String
      $status: SupplierTimelineStatus
      $eventTypes: [SupplierTimelineEventType!]
      $startDate: String
      $endDate: String
      $limit: Int
      $offset: Int
      $sort: SupplierTimelineSort
    ) {
      supplierOrderTimeline(
        supplierOrgId: $supplierOrgId
        search: $search
        status: $status
        eventTypes: $eventTypes
        startDate: $startDate
        endDate: $endDate
        limit: $limit
        offset: $offset
        sort: $sort
      ) {
        ${TIMELINE_FIELDS}
      }
    }
  `

  const res = await graphQLRequest<{ supplierOrderTimeline: TimelineResult }>(QUERY, {
    supplierOrgId: options.supplierOrgId,
    search: options.search?.trim() || null,
    status: options.status && options.status !== 'ALL' ? options.status : null,
    eventTypes: options.eventTypes?.length ? options.eventTypes : null,
    startDate: options.dateRange?.start ?? null,
    endDate: options.dateRange?.end ?? null,
    limit: options.limit ?? 30,
    offset: options.offset ?? 0,
    sort: options.sort ?? 'NEWEST',
  })

  return res.supplierOrderTimeline
}
