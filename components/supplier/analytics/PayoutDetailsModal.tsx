import React from 'react'
import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { X } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import type { PayoutHistoryItem } from '@/services/supplierService/supplierFinanceAnalytics'

const php = (value: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value)
const dateTime = (value: string | null) => value ? new Date(value).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : 'Unavailable'
const duration = (value: number | null) => value === null ? 'Unavailable' : value < 24 ? `${value.toFixed(1)} hours` : `${(value / 24).toFixed(1)} days`

function DetailRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme()
  return <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingVertical: 8, borderBottomWidth: 1, borderColor: colors.border }}>
    <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700', textAlign: 'right', flexShrink: 1 }}>{value}</Text>
  </View>
}

export function PayoutDetailsModal({ item, onClose }: { item: PayoutHistoryItem | null; onClose: () => void }) {
  const { colors } = useTheme()
  if (!item) return null
  const statusTone = item.reconciliationRequired ? colors.error : item.analyticsStatus === 'COMPLETED' ? colors.success : colors.warning
  return <Modal transparent visible animationType="fade" onRequestClose={onClose}>
    <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.52)', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <Pressable onPress={() => {}} accessibilityViewIsModal style={{ width: '100%', maxWidth: 680, maxHeight: '88%', borderRadius: 16, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderColor: colors.border }}>
          <View style={{ flex: 1 }}><Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>Payout details</Text><Text style={{ color: colors.textSecondary, fontSize: 12 }}>{item.reference}</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close payout details" onPress={onClose} hitSlop={8}><X size={20} color={colors.text} /></Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 18, gap: 18 }}>
          <View style={{ gap: 8 }}><Text style={{ color: colors.text, fontSize: 14, fontWeight: '800' }}>Payout</Text><DetailRow label="Amount" value={php(item.amount)} /><DetailRow label="Status" value={item.analyticsStatus.replace(/_/g, ' ')} /><DetailRow label="Withdrawal status" value={item.withdrawalStatus.replace(/_/g, ' ')} /></View>
          <View style={{ gap: 8 }}><Text style={{ color: colors.text, fontSize: 14, fontWeight: '800' }}>Timeline</Text><DetailRow label="Requested" value={dateTime(item.requestedAt)} /><DetailRow label="Completed / outcome" value={dateTime(item.completedAt ?? item.terminalAt)} /><DetailRow label="Processing time" value={duration(item.processingHours)} /></View>
          <View style={{ gap: 8 }}><Text style={{ color: colors.text, fontSize: 14, fontWeight: '800' }}>Destination</Text><DetailRow label="Method" value={item.methodLabel} /><DetailRow label="Destination" value={item.destinationMasked ?? 'Unavailable'} /></View>
          <View style={{ gap: 8 }}><Text style={{ color: colors.text, fontSize: 14, fontWeight: '800' }}>Provider / execution</Text><DetailRow label="Attempts" value={String(item.attemptCount)} /><DetailRow label="Provider reference" value={item.providerReference ?? 'Unavailable'} /></View>
          {(item.legacyNoAttempt || item.reconciliationRequired) ? <View style={{ borderWidth: 1, borderColor: statusTone, borderRadius: 10, padding: 12, gap: 4 }}>
            <Text style={{ color: statusTone, fontSize: 12, fontWeight: '800' }}>{item.reconciliationRequired ? 'Reconciliation required' : 'Legacy sandbox completion'}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{item.reconciliationRequired ? 'This analytics record is read-only and excluded from paid-out amounts until it is reconciled.' : 'Provider attempt evidence unavailable.'}</Text>
          </View> : null}
        </ScrollView>
        <View style={{ padding: 14, borderTopWidth: 1, borderColor: colors.border }}><Pressable accessibilityRole="button" accessibilityLabel="Close payout details" onPress={onClose} style={{ minHeight: 42, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontWeight: '800' }}>Close</Text></Pressable></View>
      </Pressable>
    </Pressable>
  </Modal>
}
