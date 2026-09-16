import type React from 'react'
import { AlertCircle, Banknote, Bell, CreditCard, Link2, MessageCircle, PackageCheck, ScrollText, Truck } from 'lucide-react-native'

import type { NotificationAccountContext, NotificationCategory, NotificationFilter, NotificationItem } from '@/services/notificationService'

type IconComponent = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>

export const NOTIFICATION_FILTERS: Array<{ key: NotificationFilter; label: string }> = [
  { key: 'ALL', label: 'All' },
  { key: 'UNREAD', label: 'Unread' },
  { key: 'ORDERS', label: 'Orders' },
  { key: 'PAYMENTS', label: 'Payments' },
  { key: 'DELIVERY', label: 'Delivery' },
  { key: 'RFQ', label: 'RFQ' },
  { key: 'MESSAGES', label: 'Messages' },
  { key: 'FINANCE', label: 'Finance' },
  { key: 'SUPPLIER_LINKS', label: 'Supplier Links' },
  { key: 'SYSTEM', label: 'System' },
]

export const NOTIFICATION_CATEGORY_PRESENTATION: Record<NotificationCategory, { label: string; icon: IconComponent; color: string }> = {
  ORDERS: { label: 'Orders', icon: PackageCheck, color: '#2563EB' },
  PAYMENTS: { label: 'Payments', icon: CreditCard, color: '#059669' },
  DELIVERY: { label: 'Delivery', icon: Truck, color: '#D97706' },
  RFQ: { label: 'RFQ', icon: ScrollText, color: '#7C3AED' },
  MESSAGES: { label: 'Messages', icon: MessageCircle, color: '#0891B2' },
  FINANCE: { label: 'Finance', icon: Banknote, color: '#16A34A' },
  SUPPLIER_LINKS: { label: 'Supplier Links', icon: Link2, color: '#4F46E5' },
  SYSTEM: { label: 'System', icon: AlertCircle, color: '#64748B' },
}

export function notificationCategory(notification: Pick<NotificationItem, 'category' | 'type' | 'title' | 'message' | 'referenceType'>): NotificationCategory {
  if (notification.category) return notification.category
  if (notification.referenceType === 'DELIVERY' || /delivery|dispatch|in transit/i.test(`${notification.title} ${notification.message}`)) return 'DELIVERY'
  if (notification.referenceType === 'PURCHASE_ORDER' || notification.type === 'PURCHASE_ORDER_CREATED') return 'ORDERS'
  if (['RFQ_RECEIVED', 'COUNTER_OFFER', 'NEGOTIATION_ACCEPTED', 'NEGOTIATION_REJECTED'].includes(notification.type)) return 'RFQ'
  return 'SYSTEM'
}

export function notificationMatchesFilter(notification: NotificationItem, filter: NotificationFilter) {
  if (filter === 'ALL') return true
  if (filter === 'UNREAD') return !notification.isRead
  return notificationCategory(notification) === filter
}

export type NotificationDestination = { pathname: string; params?: Record<string, string> }

export type NotificationReferenceDomain = 'PURCHASE_ORDER' | 'RFQ' | 'SUPPLIER_LINK' | 'WITHDRAWAL' | 'UNKNOWN'

// These are the only structured notification reference values currently
// persisted by the Portal and Marketplace backends. Keep this normalization at
// the navigation boundary; titles and message text are deliberately not used
// as record identities.
export function normalizeNotificationReferenceType(referenceType?: string | null): NotificationReferenceDomain {
  switch (referenceType?.trim().toUpperCase()) {
    case 'PURCHASE_ORDER': return 'PURCHASE_ORDER'
    case 'RFQ': return 'RFQ'
    case 'SUPPLIER_LINK': return 'SUPPLIER_LINK'
    case 'WITHDRAWAL': return 'WITHDRAWAL'
    default: return 'UNKNOWN'
  }
}

export function resolveNotificationDestination(notification: NotificationItem, accountContext: NotificationAccountContext): NotificationDestination | null {
  const referenceId = notification.referenceId?.trim()
  if (!referenceId) return null
  const referenceType = normalizeNotificationReferenceType(notification.referenceType)

  if (referenceType === 'PURCHASE_ORDER') {
    if (accountContext === 'SUPPLIER') return { pathname: '/(supplier)/po-inbox/[id]', params: { id: referenceId } }
    if (accountContext === 'RETAIL') return { pathname: '/(erp)/supplier-links/orders/[id]', params: { id: referenceId } }
    return null
  }
  if (referenceType === 'RFQ') {
    if (accountContext === 'SUPPLIER') return { pathname: '/(supplier)/po-inbox', params: { rfqId: referenceId } }
    if (accountContext === 'RETAIL') return { pathname: '/(erp)/supplier-links' }
    return null
  }
  if (referenceType === 'SUPPLIER_LINK') {
    if (accountContext === 'SUPPLIER') return { pathname: '/(supplier)/supplier-links/[id]', params: { id: referenceId } }
    if (accountContext === 'RETAIL') return { pathname: '/(erp)/supplier-links/[id]', params: { id: referenceId } }
    return null
  }
  if (referenceType === 'WITHDRAWAL') {
    if (accountContext === 'SUPPLIER') return { pathname: '/(supplier)/withdrawals' }
    if (accountContext === 'ADMIN') return { pathname: '/(admin)/notifications', params: { destination: 'withdrawals' } }
  }
  return null
}

export const NotificationFallbackIcon = Bell
