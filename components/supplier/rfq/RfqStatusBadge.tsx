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

export function RfqStatusBadge({ status, size = 'md' }: { status: RfqStatus; size?: 'sm' | 'md' }) {
  const color = RFQ_STATUS_COLORS[status]
  const isSmall = size === 'sm'
  return (
    <View
      style={{
        backgroundColor: color + '20',
        paddingHorizontal: isSmall ? 8 : 10,
        paddingVertical: isSmall ? 3 : 4,
        borderRadius: 20,
        alignSelf: 'flex-start',
      }}
    >
      <Text style={{ fontSize: isSmall ? 10 : 11, fontWeight: '600', color }}>
        {RFQ_STATUS_LABELS[status]}
      </Text>
    </View>
  )
}
