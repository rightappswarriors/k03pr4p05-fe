import React from 'react'
import { View, Text } from 'react-native'
import type { RfqStatus } from '@/types'

export const RFQ_STATUS_COLORS: Record<RfqStatus, string> = {
  DRAFT: '#94A3B8',
  SUBMITTED: '#3B82F6',
  UNDER_REVIEW: '#F59E0B',
  NEGOTIATING: '#10B981',
  SUPPLIER_OFFERED: '#8B5CF6',
  BUYER_COUNTERED: '#6366F1',
  NEGOTIATION_COMPLETED: '#06B6D4',
  NEGOTIATION_ACCEPTED: '#10B981',
  PO_CREATED: '#16A34A',
  CANCELLED: '#94A3B8',
  EXPIRED: '#94A3B8',
  RFQ_RECEIVED: '#60A5FA',
  PENDING_SUPPLIER_RESPONSE: '#F59E0B',
  COUNTER_OFFERED: '#8B5CF6',
  AGENT_ACCEPTED_FINAL: '#16A34A',
  SUPPLIER_ACCEPTED_FINAL: '#059669',
  WAITING_SUPPLIER_CONFIRMATION: '#EA580C',
}

export const RFQ_STATUS_LABELS: Record<RfqStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  NEGOTIATING: 'Negotiating',
  SUPPLIER_OFFERED: 'Offer Sent',
  BUYER_COUNTERED: 'Buyer Countered',
  NEGOTIATION_COMPLETED: 'Negotiation Done',
  NEGOTIATION_ACCEPTED: 'Offer Accepted',
  PO_CREATED: 'PO Created',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
  RFQ_RECEIVED: 'RFQ Received',
  PENDING_SUPPLIER_RESPONSE: 'Awaiting Response',
  COUNTER_OFFERED: 'Counter Offered',
  AGENT_ACCEPTED_FINAL: 'Agent Accepted',
  SUPPLIER_ACCEPTED_FINAL: 'Supplier Accepted',
  WAITING_SUPPLIER_CONFIRMATION: 'Awaiting Confirmation',
}

/** Offer-state status keys that benefit from visual distinction. */
export const RFQ_OFFER_STATES: RfqStatus[] = [
  'SUPPLIER_OFFERED',
  'BUYER_COUNTERED',
  'COUNTER_OFFERED',
  'NEGOTIATION_COMPLETED',
  'NEGOTIATION_ACCEPTED',
  'AGENT_ACCEPTED_FINAL',
  'SUPPLIER_ACCEPTED_FINAL',
  'WAITING_SUPPLIER_CONFIRMATION',
]

/** Accepted statuses — show a filled, positive treatment. */
export const RFQ_ACCEPTED_STATES: RfqStatus[] = [
  'NEGOTIATION_ACCEPTED',
  'AGENT_ACCEPTED_FINAL',
  'SUPPLIER_ACCEPTED_FINAL',
]

/** Closed/rejected statuses — show a muted, outline treatment. */
export const RFQ_CLOSED_STATES: RfqStatus[] = [
  'CANCELLED',
  'EXPIRED',
]

export type RfqStatusBadgeVariant = 'filled' | 'outline' | 'subtle'

export function RfqStatusBadge({
  status,
  size = 'md',
  variant = 'filled',
  showDot = false,
}: {
  status: RfqStatus
  size?: 'sm' | 'md'
  variant?: RfqStatusBadgeVariant
  showDot?: boolean
}) {
  const color = RFQ_STATUS_COLORS[status]
  const isSmall = size === 'sm'
  const isOutline = variant === 'outline'
  const isSubtle = variant === 'subtle'

  const bg = isSubtle ? `${color}10` : isOutline ? 'transparent' : `${color}20`
  const textColor = isSubtle ? color : isOutline ? color : color
  const borderColor = isOutline ? `${color}40` : 'transparent'
  const borderWidth = isOutline ? 1 : 0

  return (
    <View
      style={{
        backgroundColor: bg,
        paddingHorizontal: isSmall ? 8 : 10,
        paddingVertical: isSmall ? 3 : 4,
        borderRadius: 20,
        alignSelf: 'flex-start',
        borderWidth,
        borderColor,
        flexDirection: 'row',
        alignItems: 'center',
        gap: showDot ? 4 : 0,
      }}
    >
      {showDot && (
        <View
          style={{
            width: isSmall ? 5 : 6,
            height: isSmall ? 5 : 6,
            borderRadius: isSmall ? 2.5 : 3,
            backgroundColor: color,
          }}
        />
      )}
      <Text style={{ fontSize: isSmall ? 10 : 11, fontWeight: '600', color: textColor }}>
        {RFQ_STATUS_LABELS[status]}
      </Text>
    </View>
  )
}
