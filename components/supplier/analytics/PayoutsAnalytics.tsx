import React, { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { AlertTriangle, Banknote, CheckCircle2, Clock3, Send } from 'lucide-react-native'
import { InsightCard } from '@/components/Kpi'
import { SkeletonBox } from '@/components/LoadingSkeleton'
import { useTheme } from '@/contexts/ThemeContext'
import { comparisonLabel, type SupplierAnalyticsData } from '@/services/supplierService/supplierAnalyticsService'
import type { PayoutHistoryItem, PayoutOptions, PayoutSort } from '@/services/supplierService/supplierFinanceAnalytics'
import { AnalyticsDonut } from './AnalyticsCharts'
import { DataRecordCard, ResponsiveDataView } from '@/components/ResponsiveDataView'
import { Pagination } from '@/components/supplier/catalog/CatalogPagination'
import { PayoutDetailsModal } from './PayoutDetailsModal'

const php = (value: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value)
const hours = (value: number | null) => value === null ? '—' : value < 24 ? value.toFixed(1) + ' hours' : (value / 24).toFixed(1) + ' days'
const dateTime = (value: string | null) => value ? new Date(value).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) { const { colors } = useTheme(); return <View style={{ minWidth: 0, flexGrow: 1, padding: 18, gap: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}><View style={{ gap: 4 }}><Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }}>{title}</Text>{subtitle && <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{subtitle}</Text>}</View>{children}</View> }
function Choice({ label, selected, disabled, onPress }: { label: string; selected?: boolean; disabled?: boolean; onPress: () => void }) { const { colors } = useTheme(); return <Pressable accessibilityRole="button" accessibilityState={{ selected, disabled }} disabled={disabled} onPress={onPress} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: selected ? colors.primaryLight : colors.surface, opacity: disabled ? 0.5 : 1 }}><Text style={{ color: colors.text, fontSize: 12 }}>{label}</Text></Pressable> }

export default function PayoutsAnalytics({ data, loading, busy, width, options, onOptionsChange }: { data: SupplierAnalyticsData | null; loading: boolean; busy: boolean; width: number; options: PayoutOptions; onOptionsChange: (next: Partial<PayoutOptions>) => void }) {
  const { colors } = useTheme(); const [allMetrics, setAllMetrics] = useState(false); const [selectedPayout, setSelectedPayout] = useState<PayoutHistoryItem | null>(null); const mobile = width < 680; const cardLayout = width < 768; const wide = width >= 1050; const columns = width >= 1250 ? 6 : width >= 680 ? 3 : width >= 440 ? 2 : 1; const body = { color: colors.textSecondary, fontSize: 12 } as const
  if (loading) return <><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>{Array.from({ length: mobile ? 4 : 6 }, (_, i) => <SkeletonBox key={i} style={{ height: 150, flexBasis: 190, flexGrow: 1 }} />)}</View><SkeletonBox style={{ height: 300 }} /><SkeletonBox style={{ height: 380 }} /></>
  if (!data) return null
  const payouts = data.payoutAnalytics; const current = payouts.metrics; const previous = payouts.previousMetrics; const page = payouts.history
  const metrics = [
    { key: 'requestedCount', label: 'Total Requested', value: current.requestedCount.toLocaleString('en-PH'), prior: comparisonLabel(current.requestedCount, previous.requestedCount), icon: Send },
    { key: 'completedCount', label: 'Completed', value: current.completedCount.toLocaleString('en-PH'), prior: comparisonLabel(current.completedCount, previous.completedCount), icon: CheckCircle2 },
    { key: 'paidOutAmount', label: 'Amount Paid Out', value: php(current.paidOutAmount), prior: comparisonLabel(current.paidOutAmount, previous.paidOutAmount), icon: Banknote },
    { key: 'processingPendingCount', label: 'Pending / Processing', value: current.processingPendingCount.toLocaleString('en-PH'), prior: comparisonLabel(current.processingPendingCount, previous.processingPendingCount), icon: Clock3 },
    { key: 'failedRejectedCount', label: 'Failed / Rejected', value: current.failedRejectedCount.toLocaleString('en-PH'), prior: comparisonLabel(current.failedRejectedCount, previous.failedRejectedCount), icon: AlertTriangle },
    { key: 'successRate', label: 'Success Rate', value: current.successRate === null ? '—' : current.successRate.toFixed(1) + '%', prior: current.successRate === null || previous.successRate === null ? 'Unavailable' : comparisonLabel(current.successRate, previous.successRate), icon: AlertTriangle },
  ]
  const statusTone = (row: typeof page.items[number]) => row.reconciliationRequired ? colors.error : row.analyticsStatus === 'COMPLETED' ? colors.success : colors.warning
  const status = (row: typeof page.items[number]) => <Text style={{ color: statusTone(row), fontSize: 12, fontWeight: '800' }}>{row.reconciliationRequired ? 'RECONCILIATION' : row.analyticsStatus.replace(/_/g, ' ')}</Text>
  const updateSort = (payoutSort: PayoutSort) => { if (!busy) onOptionsChange({ payoutSort, payoutDirection: options.payoutSort === payoutSort ? options.payoutDirection === 'DESC' ? 'ASC' : 'DESC' : 'DESC', payoutPage: 1 }) }
  return <>
    <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>Payouts Analytics</Text><Text style={body}>{data.environment} · Asia/Manila · {data.range.startDate} – {data.range.endDate}</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6, rowGap: 12 }}>{metrics.slice(0, mobile && !allMetrics ? 4 : 6).map(metric => <View key={metric.key} style={{ width: `${100 / columns}%`, paddingHorizontal: 6 }}><InsightCard title={metric.label} icon={metric.icon} accent="#168CFF" value={metric.value} valueFontSize={columns === 6 ? 16 : 20} subtitle={metric.prior + ' · vs. previous period'} subtitleColor={colors.textSecondary} /></View>)}</View>
    {mobile && <Choice label={allMetrics ? 'Show primary metrics' : 'View all metrics'} onPress={() => setAllMetrics(!allMetrics)} />}
    <Text style={body}>Amounts and counts use one Withdrawal row per payout. Provider attempts are retry evidence only. Success Rate = completed ÷ (completed + failed + rejected terminal outcomes).</Text>
    {(current.reconciliationRequiredCount > 0 || current.invalidDurationCount > 0) && <Text style={{ color: colors.error, fontSize: 12 }}>{current.reconciliationRequiredCount} reconciliation-required · {current.invalidDurationCount} invalid-duration records excluded from duration averages.</Text>}
    <View style={{ flexDirection: wide ? 'row' : 'column', gap: 14 }}><View style={{ flex: 3 }}><Panel title="Payout Activity" subtitle="Requests use request date; completed payouts use actual completion date."><PayoutActivityTrendChart points={payouts.activityTrend} /><Text style={body}>Each zero-filled Manila bucket remains in the timeline. Amounts are available in the selected period detail.</Text></Panel></View><View style={{ flex: 2 }}><Panel title="Request Status" subtitle="Current classification of withdrawals requested in the selected period.">{payouts.statusDistribution.length ? <AnalyticsDonut rows={payouts.statusDistribution.map(row => ({ label: row.label, value: row.count, percentage: row.percentage }))} center={String(current.requestedCount)} caption="Requests" /> : <Text style={{ ...body, textAlign: 'center', paddingVertical: 30 }}>No payout requests in this period.</Text>}</Panel></View></View>
    <View style={{ flexDirection: wide ? 'row' : 'column', gap: 14 }}><View style={{ flex: 3 }}><Panel title="Payout Outcomes" subtitle="Completed versus failed/rejected by actual terminal-event date."><ScrollView style={{ maxHeight: 230 }} contentContainerStyle={{ gap: 8 }}>{payouts.outcomeTrend.filter(row => row.completed || row.failedRejected).map(row => <View key={row.bucket} style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: colors.border, paddingBottom: 8 }}><Text style={body}>{row.bucket}</Text><Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>{row.completed} completed · {row.failedRejected} failed/rejected</Text></View>)}</ScrollView>{!payouts.outcomeTrend.some(row => row.completed || row.failedRejected) && <Text style={{ ...body, textAlign: 'center', paddingVertical: 24 }}>No terminal payout outcomes in this period.</Text>}<Text style={body}>Average request-to-completion time: {hours(current.averageProcessingHours)}</Text></Panel></View><View style={{ flex: 2 }}><Panel title="Completed Payout Methods" subtitle="Immutable method snapshots; no live destination lookup."><ResponsiveDataView items={payouts.methodBreakdown} useCards={cardLayout} keyExtractor={row => row.key} columns={[{ label: 'Method', width: 3 }, { label: 'Completed', width: 1, align: 'right' }, { label: 'Amount', width: 2, align: 'right' }]} renderCells={row => [<Text key="method" style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>{row.label}</Text>, <Text key="count" style={{ color: colors.textSecondary, fontSize: 12 }}>{row.completedCount}</Text>, <Text key="amount" style={{ color: colors.text, fontSize: 12, fontWeight: '800' }}>{php(row.completedAmount)}</Text>]} renderCard={row => <DataRecordCard title={row.label} fields={[{ label: 'Completed payouts', value: String(row.completedCount) }, { label: 'Amount', value: php(row.completedAmount) }]} />} emptyState={<Text style={{ ...body, textAlign: 'center', paddingVertical: 24 }}>No completed payouts in this period.</Text>} /></Panel></View></View>
    <Panel title="Payout History" subtitle="Requests and terminal outcomes in the period. Export contains this loaded server page.">
      <ResponsiveDataView
        items={page.items}
        useCards={cardLayout}
        keyExtractor={row => row.id}
        columns={[
          { label: 'Withdrawal', width: 1.2 },
          { label: 'Requested', width: 1.7, sortKey: 'REQUESTED' },
          { label: 'Completed / outcome', width: 1.7, sortKey: 'COMPLETED' },
          { label: 'Amount', width: 1.1, align: 'right', sortKey: 'AMOUNT' },
          { label: 'Status', width: 1.2, sortKey: 'STATUS' },
          { label: 'Method', width: 1.3 },
          { label: 'Processing', width: 1.1, align: 'right', sortKey: 'PROCESSING' },
          { label: 'Attempts', width: 0.8, align: 'right' },
          { label: 'Action', width: 0.9, align: 'center' },
        ]}
        renderCells={row => [
          <Text key="reference" style={{ color: colors.text, fontSize: 12, fontWeight: '800' }}>{row.reference}</Text>,
          <Text key="requested" style={body}>{dateTime(row.requestedAt)}</Text>,
          <Text key="completed" style={body}>{dateTime(row.completedAt ?? row.terminalAt)}</Text>,
          <Text key="amount" style={{ color: colors.text, fontSize: 12, fontWeight: '800' }}>{php(row.amount)}</Text>,
          <View key="status" style={{ gap: 2 }}>{status(row)}{row.legacyNoAttempt ? <Text style={{ color: colors.textSecondary, fontSize: 10 }}>Legacy evidence</Text> : null}</View>,
          <Text key="method" style={body}>{row.methodLabel}</Text>,
          <Text key="processing" style={body}>{hours(row.processingHours)}</Text>,
          <Text key="attempts" style={body}>{row.attemptCount}</Text>,
          <Text key="action" style={{ color: colors.primary, fontSize: 12, fontWeight: '800' }}>View</Text>,
        ]}
        renderCard={row => <DataRecordCard title={`${row.reference} · ${php(row.amount)}`} subtitle={dateTime(row.requestedAt)} status={status(row)} onPress={() => setSelectedPayout(row)} accessibilityLabel={`${row.reference}, ${row.analyticsStatus.replace(/_/g, ' ')}`} fields={[
          { label: 'Requested', value: dateTime(row.requestedAt) },
          { label: 'Completed', value: dateTime(row.completedAt ?? row.terminalAt) },
          { label: 'Method', value: row.methodLabel },
          { label: 'Processing', value: hours(row.processingHours) },
        ]} />}
        emptyState={<Text style={{ ...body, textAlign: 'center', paddingVertical: 24 }}>No payout events match this period and search.</Text>}
        onItemPress={setSelectedPayout}
        activeSortKey={options.payoutSort}
        sortDirection={options.payoutDirection}
        onSort={sort => updateSort(sort as PayoutSort)}
      />
      <Pagination page={page.page} pageSize={page.limit} totalItems={page.total} pageSizeOptions={[20, 50, 100]} showSummary onPageChange={payoutPage => { if (!busy) onOptionsChange({ payoutPage }) }} onPageSizeChange={payoutLimit => { if (!busy) onOptionsChange({ payoutLimit, payoutPage: 1 }) }} />
    </Panel>
    <PayoutDetailsModal item={selectedPayout} onClose={() => setSelectedPayout(null)} />
  </>
}
