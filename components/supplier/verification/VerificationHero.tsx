import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { ShieldCheck, ShieldAlert, ShieldQuestion, X } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { DashboardCard } from '@/screens/supplier/SupplierDashboardScreen'

import { withAlpha } from '@/utils/color'
import { FadeInView } from '@/components/supplier/FadeInView'
import { VerificationStatusBadge } from './VerificationStatusBadge'
import { RenewalCountdown } from './RenewalCountdown'
import type { OrgVerificationStatus } from '@/services/supplierService/verificationService'

interface HeroProps {
  status: OrgVerificationStatus
  verificationExpiresAt: string | null
  approvedCount: number
  requiredCount: number
  onStartVerification?: () => void
}

const HERO_COPY: Record<OrgVerificationStatus, { title: string; color: string; icon: any }> = {
  UNVERIFIED: {
    title: 'Get verified to appear in retailer searches',
    color: '#6B7280',
    icon: ShieldQuestion,
  },
  PENDING: {
    title: 'Your documents are under review',
    color: '#D97706',
    icon: ShieldAlert,
  },
  VERIFIED: {
    title: 'You are a Verified Supplier',
    color: '#059669',
    icon: ShieldCheck,
  },
  EXPIRED: {
    title: 'Your verification has expired',
    color: '#DC2626',
    icon: ShieldAlert,
  },
}

export function VerificationHero({
  status,
  verificationExpiresAt,
  approvedCount,
  requiredCount,
  onStartVerification,
}: HeroProps) {
  const { colors } = useTheme()
  const copy = HERO_COPY[status]
  const Icon = copy.icon

  return (
    <FadeInView>
      <DashboardCard style={{ overflow: 'hidden', position: 'relative' }}>
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            backgroundColor: copy.color,
          }}
        />
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 16 }}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: withAlpha(copy.color, '18'),
            }}
          >
            <Icon size={26} color={copy.color} strokeWidth={2.2} />
          </View>

          <View style={{ flex: 1, gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{copy.title}</Text>
              <VerificationStatusBadge status={status} />
            </View>

            <Text style={{ fontSize: 13, color: colors.textSecondary }}>
              {approvedCount} of {requiredCount} required documents approved
            </Text>

            {status === 'VERIFIED' && verificationExpiresAt && (
              <RenewalCountdown expiresAt={verificationExpiresAt} />
            )}

            {(status === 'UNVERIFIED' || status === 'EXPIRED') && onStartVerification && (
              <TouchableOpacity
                onPress={onStartVerification}
                style={{
                  alignSelf: 'flex-start',
                  marginTop: 4,
                  backgroundColor: colors.primary,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 10,
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
                  {status === 'EXPIRED' ? 'Renew Verification' : 'Start Verification'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </DashboardCard>
    </FadeInView>
  )
}

/**
 * Floating persistent banner for the rest of the Supplier Portal (not the
 * verification screen itself) — shown while UNVERIFIED/PENDING/EXPIRED,
 * dismissible for the session only (re-appears next visit; verification
 * state, not a one-time toast).
 */
export function VerificationFloatingBanner({
  status,
  verificationExpiresAt,
  onPress,
  onDismiss,
}: {
  status: OrgVerificationStatus
  verificationExpiresAt: string | null
  onPress: () => void
  onDismiss: () => void
}) {
  const { colors } = useTheme()

  if (status === 'VERIFIED') {
    // Verified banner is informational, not a nag — green, no dismiss needed
    // since it's good news, but still dismissible for a clean UI.
    return (
      <FadeInView>
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.85}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor: '#059669',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 12,
          }}
        >
          <ShieldCheck size={18} color="#fff" />
          <Text style={{ flex: 1, color: '#fff', fontWeight: '700', fontSize: 13 }}>
            Verified Supplier
            {verificationExpiresAt
              ? ` · expires ${new Date(verificationExpiresAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`
              : ''}
          </Text>
          <TouchableOpacity onPress={onDismiss} hitSlop={8}>
            <X size={16} color="#fff" />
          </TouchableOpacity>
        </TouchableOpacity>
      </FadeInView>
    )
  }

  const message =
    status === 'EXPIRED'
      ? 'Your verification has expired. Renew now to stay visible in retailer searches.'
      : status === 'PENDING'
      ? 'Your verification is under review.'
      : 'Complete your verification to appear in retailer searches.'

  return (
    <FadeInView>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: status === 'EXPIRED' ? '#DC2626' : '#D97706',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderRadius: 12,
        }}
      >
        <ShieldAlert size={18} color={status === 'EXPIRED' ? '#DC2626' : '#D97706'} />
        <Text style={{ flex: 1, color: colors.text, fontWeight: '600', fontSize: 13 }}>{message}</Text>
        <TouchableOpacity onPress={onDismiss} hitSlop={8}>
          <X size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </TouchableOpacity>
    </FadeInView>
  )
}