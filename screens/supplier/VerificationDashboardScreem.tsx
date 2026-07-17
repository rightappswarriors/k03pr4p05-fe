import React, { useCallback, useEffect, useState } from 'react'
import { View, Text, ScrollView, useWindowDimensions, RefreshControl } from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { KpiSkeletonRow } from '@/components/LoadingSkeleton'
import {
  fetchVerificationDashboard,
  type VerificationDashboardData,
} from '@/services/supplierService/verificationService'
import { VerificationHero } from '@/components/supplier/verification/VerificationHero'
import { VerificationProgressCard } from '@/components/supplier/verification/VerificationProgressCard'
import { DocumentRequirementCard } from '@/components/supplier/verification/DocumentRequirementCard'
import { VerificationTimeline } from '@/components/supplier/verification/VerificationTimeline'
import { EmptyVerificationState } from '@/components/supplier/verification/EmptyVerificationState'
import { useAuth } from '@/contexts/AuthContext'
import { useDocumentPickerModal } from '@/hooks/useDocumentPickerModal'

interface Props {
  /** Injected file picker — see DocumentRequirementCard's onPickFile doc comment. */
  onPickFile: () => Promise<any | null>
}

export function VerificationDashboardScreen({ onPickFile }: Props) {
  const { colors } = useTheme()
  const { width } = useWindowDimensions()

  const [dashboard, setDashboard] = useState<VerificationDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // "Start Verification" doesn't create anything server-side — it just
  // reveals the upload cards. Without this, hasAnySubmission stays false
  // until a document exists, so there was no way to get from the empty
  // state to the cards that let you upload the first document.
  const [hasStarted, setHasStarted] = useState(false)
  const { user } = useAuth()
  const { pickFile, modal } = useDocumentPickerModal()
  const load = useCallback(
    async (isRefresh = false) => {
      if (!user?.orgId) return
      isRefresh ? setRefreshing(true) : setLoading(true)
      setError(null)
      try {
        const data = await fetchVerificationDashboard(user.orgId)
        setDashboard(data)
      } catch (err: any) {
        setError(err?.message ?? 'Failed to load verification status.')
      } finally {
        isRefresh ? setRefreshing(false) : setLoading(false)
      }
    },
    [user?.orgId]
  )

  useEffect(() => {
    load()
  }, [load])

  const isTablet = width >= 768
  const isDesktop = width >= 1100

  if (loading && !dashboard) {
    return (
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <KpiSkeletonRow count={2} />
      </ScrollView>
    )
  }

  if (error && !dashboard) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Couldn't load verification status</Text>
        <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center' }}>{error}</Text>
      </View>
    )
  }

  if (!dashboard) return null

  const documentsByRequirement = new Map(dashboard.documents.map((d) => [d.requirementId, d]))
  const hasAnySubmission = dashboard.documents.length > 0
  const showRequirements = hasAnySubmission || hasStarted

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 16, maxWidth: 1400, alignSelf: 'center', width: '100%' }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
    >
      <View>
        <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>Verification Center</Text>
        <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
          Manage your business documents, track review status, and stay verified for retailer discovery.
        </Text>
      </View>

      <VerificationHero
        status={dashboard.orgVerificationStatus}
        verificationExpiresAt={dashboard.verificationExpiresAt ?? null}
        approvedCount={dashboard.approvedCount}
        requiredCount={dashboard.requiredCount}
        onStartVerification={() => setHasStarted(true)}
      />

      {!showRequirements ? (
        <EmptyVerificationState onStart={() => setHasStarted(true)} />
      ) : (
        <>
          <VerificationProgressCard
            approvedCount={dashboard.approvedCount}
            requiredCount={dashboard.requiredCount}
            progressPct={dashboard.progressPct}
          />

          {/* Required Documents — 1 col phone, 2 col tablet, 3 col desktop */}
          <View>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 10 }}>
              Required Documents
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {dashboard.requirements.map((req) => {
                const columns = isDesktop ? 3 : isTablet ? 2 : 1
                const widthPct = `${100 / columns - (columns > 1 ? 2 : 0)}%`
                return (
                  <View key={req.id} style={{ width: widthPct, minWidth: 280, flexGrow: 1 }}>
                    <DocumentRequirementCard
                      key={req.id}
                      orgId={user!.orgId}
                      requirement={req}
                      document={documentsByRequirement.get(req.id)}
                      onPickFile={pickFile}     /* 👈 wire it here */
                      onChanged={() => load()}
                    />
                    {modal}
                  </View>
                )
              })}
            </View>
          </View>

          {/* Timeline + Review History share the row on desktop, stack elsewhere */}
          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16 }}>
            <View style={{ flex: isDesktop ? 1 : undefined }}>
              <VerificationTimeline documents={dashboard.documents} />
            </View>
          </View>
        </>
      )}
    </ScrollView>
  )
}