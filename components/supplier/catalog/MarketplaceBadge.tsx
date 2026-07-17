// Marketplace listing status badge — shown on every catalog item card/row.
import React from 'react'
import { View, Text } from 'react-native'
import type { MarketplaceListingStatus } from '@/services/marketplaceService'

// Extend with portal-only UI statuses not yet in the DB enum.
export type ExtendedListingStatus = MarketplaceListingStatus | 'PENDING_REVIEW' | 'REJECTED' | 'NONE'

interface Config { label: string; bg: string; fg: string; dot: string }

const STATUS_CONFIG: Record<ExtendedListingStatus, Config> = {
  // "NONE" → show as Draft so users know they need to act, not just "Not Listed".
  NONE:           { label: 'Draft',          bg: '#F1F5F9', fg: '#64748B', dot: '#94A3B8' },
  DRAFT:          { label: 'Draft',          bg: '#F1F5F9', fg: '#64748B', dot: '#94A3B8' },
  READY:          { label: 'Ready',          bg: '#ECFDF5', fg: '#059669', dot: '#10B981' },
  PUBLISHED:      { label: 'Published',      bg: '#EFF6FF', fg: '#2563EB', dot: '#3B82F6' },
  SUSPENDED:      { label: 'Suspended',      bg: '#FEF3C7', fg: '#D97706', dot: '#F59E0B' },
  ARCHIVED:       { label: 'Unpublished',    bg: '#FEF2F2', fg: '#DC2626', dot: '#EF4444' },
  PENDING_REVIEW: { label: 'Pending Review', bg: '#FFF7ED', fg: '#C2410C', dot: '#FB923C' },
  REJECTED:       { label: 'Rejected',       bg: '#FEF2F2', fg: '#991B1B', dot: '#DC2626' },
}

interface Props {
  status: ExtendedListingStatus | null | undefined
  size?: 'xs' | 'sm'
}

export function MarketplaceBadge({ status, size = 'sm' }: Props) {
  const key: ExtendedListingStatus = (status ?? 'NONE') as ExtendedListingStatus
  const config = STATUS_CONFIG[key] ?? STATUS_CONFIG.NONE
  const isXs = size === 'xs'

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      gap: isXs ? 4 : 5,
      paddingHorizontal: isXs ? 6 : 8,
      paddingVertical: isXs ? 2 : 4,
      borderRadius: 6,
      backgroundColor: config.bg,
      alignSelf: 'flex-start',
    }}>
      <View style={{
        width: isXs ? 5 : 6,
        height: isXs ? 5 : 6,
        borderRadius: isXs ? 2.5 : 3,
        backgroundColor: config.dot,
      }} />
      <Text style={{
        fontSize: isXs ? 10 : 11,
        fontWeight: '700',
        color: config.fg,
        letterSpacing: 0.2,
      }}>
        {config.label}
      </Text>
    </View>
  )
}
