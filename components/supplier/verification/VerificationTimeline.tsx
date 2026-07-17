import React, { useMemo } from 'react'
import { View, Text } from 'react-native'
import { CheckCircle2, XCircle, Clock, Upload } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { DashboardCard } from '@/screens/supplier/SupplierDashboardScreen'
import { withAlpha } from '@/utils/color'
import { FadeInView } from '@/components/FadeInView'
import type { BusinessVerificationDocument } from '@/services/supplierService/verificationService'

interface TimelineEvent {
  id: string
  label: string
  detail: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  at: string
}

const EVENT_CONFIG = {
  PENDING: { color: '#D97706', icon: Upload },
  APPROVED: { color: '#059669', icon: CheckCircle2 },
  REJECTED: { color: '#DC2626', icon: XCircle },
}

export function VerificationTimeline({ documents }: { documents: BusinessVerificationDocument[] }) {
  const { colors } = useTheme()

  const events = useMemo<TimelineEvent[]>(() => {
    const all: TimelineEvent[] = []
    for (const doc of documents) {
      for (const review of doc.reviews) {
        all.push({
          id: review.id,
          label: doc.requirement.label,
          detail: review.remarks ?? (review.status === 'PENDING' ? 'Document submitted' : `Marked ${review.status.toLowerCase()}`),
          status: review.status as 'PENDING' | 'APPROVED' | 'REJECTED',
          at: review.reviewedAt,
        })
      }
    }
    return all.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  }, [documents])

  if (events.length === 0) {
    return (
      <DashboardCard>
        <Text style={{ fontSize: 13, color: colors.textSecondary }}>No verification activity yet.</Text>
      </DashboardCard>
    )
  }

  return (
    <FadeInView delay={120}>
      <DashboardCard>
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 14 }}>Timeline</Text>
        <View style={{ gap: 0 }}>
          {events.map((event, idx) => {
            const config = EVENT_CONFIG[event.status]
            const Icon = config.icon
            const isLast = idx === events.length - 1
            return (
              <View key={event.id} style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ alignItems: 'center' }}>
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: withAlpha(config.color, '18'),
                    }}
                  >
                    <Icon size={14} color={config.color} />
                  </View>
                  {!isLast && <View style={{ width: 2, flex: 1, backgroundColor: colors.border, marginVertical: 2 }} />}
                </View>
                <View style={{ flex: 1, paddingBottom: isLast ? 0 : 16 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{event.label}</Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{event.detail}</Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                    {new Date(event.at).toLocaleString('en-PH', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              </View>
            )
          })}
        </View>
      </DashboardCard>
    </FadeInView>
  )
}