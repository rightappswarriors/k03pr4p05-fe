import React from 'react'
import { View, Text } from 'react-native'
import { MessageSquare } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { DashboardCard } from '@/screens/supplier/SupplierDashboardScreen'
import { withAlpha } from '@/utils/color'
import { VerificationStatusBadge } from './VerificationStatusBadge'
import type { BusinessVerificationDocument } from '@/services/supplierService/verificationService'

export function AdminRemarksCard({ document }: { document: BusinessVerificationDocument }) {
  const { colors } = useTheme()

  if (!document.adminRemarks) return null

  return (
    <DashboardCard style={{ borderWidth: 1, borderColor: withAlpha('#DC2626', '30') }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <MessageSquare size={15} color={colors.textSecondary} />
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>Reviewer Notes</Text>
        <VerificationStatusBadge status={document.status} size="sm" />
      </View>
      <Text style={{ fontSize: 13, color: colors.text, lineHeight: 19 }}>{document.adminRemarks}</Text>
      {document.reviewedAt && (
        <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 8 }}>
          Reviewed {new Date(document.reviewedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
        </Text>
      )}
    </DashboardCard>
  )
}