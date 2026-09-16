import { gql } from 'graphql-request'

import { graphQLRequest } from './apiClient'

export type NotificationAccountContext = 'SUPPLIER' | 'RETAIL' | 'ADMIN'
export type NotificationCategory = 'ORDERS' | 'PAYMENTS' | 'DELIVERY' | 'RFQ' | 'MESSAGES' | 'FINANCE' | 'SUPPLIER_LINKS' | 'SYSTEM'
export type NotificationFilter = 'ALL' | 'UNREAD' | NotificationCategory

export type NotificationItem = {
  id: number
  orgId?: number | null
  outletId?: number | null
  itemId?: number | null
  type: string
  category: NotificationCategory
  title: string
  message: string
  isRead: boolean
  createdAt: string
  conversationId?: string | null
  referenceType?: string | null
  referenceId?: string | null
}

export type NotificationPage = {
  items: NotificationItem[]
  total: number
  unreadCount: number
  page: number
  pageSize: number
  hasNextPage: boolean
}

const NOTIFICATION_FIELDS = `
  id orgId outletId itemId type category title message isRead createdAt
  conversationId referenceType referenceId
`

export async function getNotificationPage(accountContext: NotificationAccountContext, filter: NotificationFilter, page = 1, pageSize = 20) {
  const response = await graphQLRequest<{ notificationPage: NotificationPage }>(gql`
    query NotificationPage($accountContext: NotificationAccountContext!, $filter: NotificationFilter, $page: Int, $pageSize: Int) {
      notificationPage(accountContext: $accountContext, filter: $filter, page: $page, pageSize: $pageSize) {
        items { ${NOTIFICATION_FIELDS} }
        total unreadCount page pageSize hasNextPage
      }
    }
  `, { accountContext, filter, page, pageSize })
  return response.notificationPage
}

export async function getNotificationUnreadCount(accountContext: NotificationAccountContext) {
  const response = await graphQLRequest<{ notificationUnreadCount: number }>(gql`
    query NotificationUnreadCount($accountContext: NotificationAccountContext!) {
      notificationUnreadCount(accountContext: $accountContext)
    }
  `, { accountContext })
  return response.notificationUnreadCount
}

export async function markNotificationRead(accountContext: NotificationAccountContext, id: number) {
  const response = await graphQLRequest<{ markNotificationRead: NotificationItem }>(gql`
    mutation MarkNotificationRead($accountContext: NotificationAccountContext, $id: Int!) {
      markNotificationRead(accountContext: $accountContext, id: $id) { ${NOTIFICATION_FIELDS} }
    }
  `, { accountContext, id })
  return response.markNotificationRead
}

export async function markAllNotificationsRead(accountContext: NotificationAccountContext) {
  const response = await graphQLRequest<{ markAllNotificationsRead: boolean }>(gql`
    mutation MarkAllNotificationsRead($accountContext: NotificationAccountContext) {
      markAllNotificationsRead(accountContext: $accountContext)
    }
  `, { accountContext })
  return response.markAllNotificationsRead
}
