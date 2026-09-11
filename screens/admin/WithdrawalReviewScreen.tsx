import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { RefreshCw } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { AdminDataTable, type AdminDataTableColumn } from '@/components/admin/AdminDataTable';
import {
  approveAdminWithdrawal,
  completeSandboxAdminWithdrawalPayout,
  failSandboxAdminWithdrawalPayout,
  getAdminWithdrawals,
  processAdminWithdrawalPayout,
  rejectAdminWithdrawal,
  type AdminWithdrawal,
  type AdminWithdrawalsData,
  type WithdrawalEnvironment,
  type WithdrawalStatus,
} from '@/services/adminWithdrawalService';

const ENVIRONMENTS: WithdrawalEnvironment[] = ['SANDBOX', 'PRODUCTION'];
const PAGE_SIZES = [30, 50, 100, 200];
const STATUS_OPTIONS: Array<WithdrawalStatus | 'ALL'> = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'];
const statusColor = (status: WithdrawalStatus) => ({ PENDING: '#F59E0B', APPROVED: '#2563EB', REJECTED: '#EF4444', PROCESSING: '#7C3AED', COMPLETED: '#10B981', FAILED: '#EF4444', CANCELLED: '#6B7280' }[status]);
const money = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
const date = (value: string) => new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });

const Badge = ({ status }: { status: WithdrawalStatus }) => <View style={[styles.badge, { backgroundColor: `${statusColor(status)}22` }]}><Text style={{ color: statusColor(status), fontSize: 11, fontWeight: '700' }}>{status}</Text></View>;
const Chip = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => {
  const { colors } = useTheme();
  return <TouchableOpacity style={[styles.chip, { backgroundColor: active ? colors.primary : colors.border }]} onPress={onPress}><Text style={{ color: active ? '#fff' : colors.textSecondary, fontSize: 12, fontWeight: '700' }}>{label}</Text></TouchableOpacity>;
};

export default function WithdrawalReviewScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const [environment, setEnvironment] = useState<WithdrawalEnvironment>(process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'SANDBOX');
  const [status, setStatus] = useState<WithdrawalStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [data, setData] = useState<AdminWithdrawalsData>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [selected, setSelected] = useState<AdminWithdrawal>();
  const [rejectionReason, setRejectionReason] = useState('');
  const [failureReason, setFailureReason] = useState('');
  const [failureTarget, setFailureTarget] = useState<AdminWithdrawal>();
  const [completionTarget, setCompletionTarget] = useState<AdminWithdrawal>();
  const [submitting, setSubmitting] = useState(false);

  const normalizedSearch = search.trim();
  const searchError = normalizedSearch.length > 100 ? 'Search must not exceed 100 characters.' : undefined;
  const reason = rejectionReason.trim();
  const reasonError = !reason ? 'Please provide a reason for rejection.' : reason.length < 5 ? 'Reason must be at least 5 characters.' : reason.length > 500 ? 'Reason must not exceed 500 characters.' : undefined;
  const sandboxFailureReason = failureReason.trim();
  const failureReasonError = !sandboxFailureReason ? 'Please provide a payout failure reason.' : sandboxFailureReason.length < 5 ? 'Failure reason must be at least 5 characters.' : sandboxFailureReason.length > 500 ? 'Failure reason must not exceed 500 characters.' : undefined;

  const load = useCallback(async () => {
    if (searchError) return;
    try {
      setLoading(true);
      setError(undefined);
      setData(await getAdminWithdrawals({ environment, status: status === 'ALL' ? undefined : status, search: normalizedSearch || undefined, page, pageSize }));
    } catch (e: any) {
      setError(e.message ?? 'Unable to load withdrawals.');
    } finally {
      setLoading(false);
    }
  }, [environment, normalizedSearch, page, pageSize, searchError, status]);

  useEffect(() => { void load(); }, [load]);
  const rows = data?.adminWithdrawals.items ?? [];
  const total = data?.adminWithdrawals.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const summary = data?.adminWithdrawalSummary;

  const review = (row: AdminWithdrawal) => { setSelected(row); setRejectionReason(''); setFailureReason(''); setError(undefined); };
  const finish = async (action: 'approve' | 'reject' | 'process' | 'completeSandbox' | 'failSandbox') => {
    if (!selected || submitting || (action === 'reject' && reasonError) || (action === 'failSandbox' && failureReasonError)) return;
    try {
      setSubmitting(true);
      setError(undefined);
      if (action === 'approve') await approveAdminWithdrawal(selected.id);
      else if (action === 'reject') await rejectAdminWithdrawal(selected.id, reason);
      else if (action === 'process') await processAdminWithdrawalPayout(selected.id);
      else if (action === 'completeSandbox') await completeSandboxAdminWithdrawalPayout(selected.id);
      else await failSandboxAdminWithdrawalPayout(selected.id, sandboxFailureReason);
      setSelected(undefined);
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Withdrawal review could not be completed.');
    } finally {
      setSubmitting(false);
    }
  };

  const payoutAction = async (row: AdminWithdrawal, action: 'process' | 'completeSandbox') => {
    if (action === 'completeSandbox') {
      setCompletionTarget(row);
      return;
    }
    await runPayoutAction(row, action);
  };

  const runPayoutAction = async (row: AdminWithdrawal, action: 'process' | 'completeSandbox') => {
    if (submitting) return;
    try {
      setSubmitting(true);
      setError(undefined);
      if (action === 'process') await processAdminWithdrawalPayout(row.id);
      else await completeSandboxAdminWithdrawalPayout(row.id);
      if (action === 'completeSandbox') {
        setCompletionTarget(undefined);
        toast.show('Sandbox payout completed successfully. No real bank transfer occurred.', 'success');
      }
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Payout action could not be completed.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitSandboxFailure = async () => {
    if (!failureTarget || failureReasonError || submitting) return;
    try {
      setSubmitting(true);
      setError(undefined);
      await failSandboxAdminWithdrawalPayout(failureTarget.id, sandboxFailureReason);
      setFailureTarget(undefined);
      setFailureReason('');
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Sandbox payout could not be marked as failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = useMemo<AdminDataTableColumn<AdminWithdrawal>[]>(() => [
    { key: 'request', label: 'Request', width: 115, render: (row) => <Text style={[styles.primary, { color: colors.text }]}>{row.reference}</Text> },
    { key: 'supplier', label: 'Supplier', width: 165, render: (row) => <View><Text style={[styles.primary, { color: colors.text }]} numberOfLines={1}>{row.supplierName}</Text><Text style={[styles.secondary, { color: colors.textSecondary }]} numberOfLines={1}>{row.requestedByName ?? 'Supplier user'}</Text></View> },
    { key: 'method', label: 'Payout method', width: 200, render: (row) => <View><Text style={[styles.primary, { color: colors.text }]} numberOfLines={1}>{row.bankName ?? row.payoutMethodType}</Text><Text style={[styles.secondary, { color: colors.textSecondary }]}>{row.maskedAccountNumber}</Text></View> },
    { key: 'amount', label: 'Amount', width: 120, render: (row) => <Text style={[styles.primary, { color: colors.text }]}>{money(row.amount)}</Text> },
    { key: 'requested', label: 'Requested', width: 125, render: (row) => <Text style={[styles.secondary, { color: colors.textSecondary }]}>{date(row.requestedAt)}</Text> },
    { key: 'environment', label: 'Environment', width: 120, render: (row) => <Text style={[styles.secondary, { color: colors.textSecondary }]}>{row.environment}</Text> },
    { key: 'status', label: 'Status', width: 125, render: (row) => <Badge status={row.status} /> },
    { key: 'actions', label: 'Actions', width: 320, render: (row) => <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}><Pressable onPress={() => review(row)} style={[styles.reviewButton, { borderColor: colors.primary }]}><Text style={{ color: colors.primary, fontSize: 12, fontWeight: '800' }}>{row.status === 'PENDING' ? 'Review' : 'View'}</Text></Pressable>{row.status === 'APPROVED' ? <Pressable disabled={submitting} onPress={() => void payoutAction(row, 'process')} style={[styles.reviewButton, { borderColor: '#7C3AED', opacity: submitting ? 0.5 : 1 }]}><Text style={{ color: '#7C3AED', fontSize: 12, fontWeight: '800' }}>Process Payout</Text></Pressable> : null}{row.status === 'PROCESSING' && row.environment === 'SANDBOX' ? <><Pressable disabled={submitting} onPress={() => void payoutAction(row, 'completeSandbox')} style={[styles.reviewButton, { borderColor: colors.success, opacity: submitting ? 0.5 : 1 }]}><Text style={{ color: colors.success, fontSize: 12, fontWeight: '800' }}>Complete Sandbox Payout</Text></Pressable><Pressable disabled={submitting} onPress={() => { setFailureTarget(row); setFailureReason(''); }} style={[styles.reviewButton, { borderColor: colors.error, opacity: submitting ? 0.5 : 1 }]}><Text style={{ color: colors.error, fontSize: 12, fontWeight: '800' }}>Fail Sandbox Payout</Text></Pressable></> : null}</View> },
  ], [colors, submitting]);

  return <View style={[styles.screen, { backgroundColor: colors.background }]}>
    <View style={styles.toolbar}><View><Text style={[styles.title, { color: colors.text }]}>Withdrawal Review</Text><Text style={[styles.subtitle, { color: colors.textSecondary }]}>Review supplier withdrawal requests and reserved funds.</Text></View><View style={styles.toolbarRight}><Text style={[styles.count, { color: colors.textSecondary }]}>{total.toLocaleString()} requests</Text><TouchableOpacity onPress={() => void load()} style={[styles.refresh, { backgroundColor: colors.surface, borderColor: colors.border }]}><RefreshCw color={colors.primary} size={18} /></TouchableOpacity></View></View>
    <View style={styles.chips}>{ENVIRONMENTS.map((value) => <Chip key={value} label={value} active={value === environment} onPress={() => { setEnvironment(value); setPage(1); }} />)}</View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{STATUS_OPTIONS.map((value) => <Chip key={value} label={value} active={value === status} onPress={() => { setStatus(value); setPage(1); }} />)}</ScrollView>
    <TextInput value={search} onChangeText={(value) => { setSearch(value); setPage(1); }} maxLength={101} placeholder="Search request, supplier, bank, or masked account" placeholderTextColor={colors.textSecondary} style={[styles.search, { color: colors.text, borderColor: searchError ? colors.error : colors.border, backgroundColor: colors.surface }]} />
    {searchError ? <Text style={{ color: colors.error, fontSize: 12 }}>{searchError}</Text> : null}
    {loading && !data ? <View style={styles.center}><ActivityIndicator color={colors.primary} /></View> : error ? <Text style={{ color: colors.error }}>{error}</Text> : <>
      <View style={styles.kpis}>{[['Pending', String(summary?.pendingCount ?? 0), '#F59E0B'], ['Approved', String(summary?.approvedCount ?? 0), '#2563EB'], ['Processing', String(summary?.processingCount ?? 0), '#7C3AED'], ['Completed', String(summary?.completedCount ?? 0), '#10B981'], ['Failed', String(summary?.failedCount ?? 0), '#EF4444'], ['Completed amount', money(summary?.completedAmount ?? 0), '#10B981']].map(([label, value, accent]) => <View key={label} style={[styles.kpi, { backgroundColor: colors.surface, borderColor: `${accent}33` }]}><Text style={{ color: accent, fontSize: 21, fontWeight: '800' }}>{value}</Text><Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' }}>{label}</Text></View>)}</View>
      <View style={{ flex: 1 }}><AdminDataTable columns={columns} data={rows} keyExtractor={(row) => String(row.id)} emptyState="No withdrawal requests found for the selected filters." onRowPress={review} minWidth={1080} /></View>
      <View style={[styles.pagination, { backgroundColor: colors.surface, borderTopColor: colors.border }]}><TouchableOpacity disabled={page === 1} onPress={() => setPage(1)} style={[styles.pageButton, { backgroundColor: colors.border }, page === 1 && styles.disabled]}><Text style={{ color: colors.text }}>«</Text></TouchableOpacity><TouchableOpacity disabled={page === 1} onPress={() => setPage((value) => Math.max(1, value - 1))} style={[styles.pageButton, { backgroundColor: colors.border }, page === 1 && styles.disabled]}><Text style={{ color: colors.text }}>‹</Text></TouchableOpacity><Text style={{ color: colors.textSecondary, marginHorizontal: 10 }}>{page} / {totalPages}</Text><TouchableOpacity disabled={page >= totalPages} onPress={() => setPage((value) => Math.min(totalPages, value + 1))} style={[styles.pageButton, { backgroundColor: colors.border }, page >= totalPages && styles.disabled]}><Text style={{ color: colors.text }}>›</Text></TouchableOpacity><TouchableOpacity disabled={page >= totalPages} onPress={() => setPage(totalPages)} style={[styles.pageButton, { backgroundColor: colors.border }, page >= totalPages && styles.disabled]}><Text style={{ color: colors.text }}>»</Text></TouchableOpacity><View style={styles.pageSizes}>{PAGE_SIZES.map((value) => <TouchableOpacity key={value} onPress={() => { setPageSize(value); setPage(1); }} style={[styles.sizeButton, { backgroundColor: pageSize === value ? colors.primary : colors.border }]}><Text style={{ color: pageSize === value ? '#fff' : colors.textSecondary, fontSize: 12 }}>{value}</Text></TouchableOpacity>)}</View></View>
    </>}
    <Modal visible={Boolean(selected)} transparent animationType="fade" onRequestClose={() => !submitting && setSelected(undefined)}><View style={styles.overlay}><ScrollView contentContainerStyle={[styles.modal, { backgroundColor: colors.surface }]}><Text style={[styles.modalTitle, { color: colors.text }]}>Withdrawal Review</Text>{selected ? <><View style={styles.detail}><Text style={[styles.detailLabel, { color: colors.textSecondary }]}>WITHDRAWAL</Text><Text style={[styles.detailValue, { color: colors.text }]}>{selected.reference} · {money(selected.amount)}</Text><Text style={[styles.detailLabel, { color: colors.textSecondary }]}>SUPPLIER</Text><Text style={[styles.detailValue, { color: colors.text }]}>{selected.supplierName}</Text><Text style={[styles.detailSub, { color: colors.textSecondary }]}>Requested by {selected.requestedByName ?? 'Supplier user'} on {date(selected.requestedAt)}</Text><Text style={[styles.detailLabel, { color: colors.textSecondary }]}>PAYOUT METHOD</Text><Text style={[styles.detailValue, { color: colors.text }]}>{selected.bankName ?? selected.payoutMethodType}</Text><Text style={[styles.detailSub, { color: colors.textSecondary }]}>{selected.accountName} · {selected.maskedAccountNumber} · {selected.payoutMethodVerified ? 'Verified' : 'Not verified'}</Text><Text style={[styles.detailLabel, { color: colors.textSecondary }]}>WALLET EFFECT</Text><Text style={[styles.detailSub, { color: colors.textSecondary }]}>Reserved {money(selected.amount)} · Available {money(selected.walletBalance)} · Held {money(selected.walletHeldBalance)}</Text><Badge status={selected.status} />{selected.approvedAt ? <Text style={[styles.detailSub, { color: colors.textSecondary }]}>Reviewed {date(selected.approvedAt)}{selected.approvedByName ? ` by ${selected.approvedByName}` : ''}</Text> : null}{selected.rejectionReason ? <Text style={[styles.rejection, { color: colors.error }]}>Reason: {selected.rejectionReason}</Text> : null}</View>{selected.status === 'PENDING' ? <><Text style={[styles.confirmation, { color: colors.textSecondary }]}>Approving this request does not send funds yet. The amount remains reserved until payout processing.</Text><TextInput value={rejectionReason} onChangeText={setRejectionReason} maxLength={501} multiline placeholder="Reason for rejection (required to reject)" placeholderTextColor={colors.textSecondary} style={[styles.reason, { color: colors.text, borderColor: reasonError && rejectionReason ? colors.error : colors.border }]} />{reasonError && rejectionReason ? <Text style={{ color: colors.error, fontSize: 12 }}>{reasonError}</Text> : null}<View style={styles.actions}><Pressable disabled={submitting} onPress={() => setSelected(undefined)}><Text style={{ color: colors.textSecondary, fontWeight: '800' }}>Cancel</Text></Pressable><Pressable disabled={submitting || Boolean(reasonError)} onPress={() => void finish('reject')} style={[styles.actionButton, { backgroundColor: colors.error, opacity: submitting || reasonError ? 0.5 : 1 }]}><Text style={styles.actionText}>Reject</Text></Pressable><Pressable disabled={submitting} onPress={() => void finish('approve')} style={[styles.actionButton, { backgroundColor: colors.primary, opacity: submitting ? 0.5 : 1 }]}><Text style={styles.actionText}>{submitting ? 'Saving…' : 'Approve Withdrawal'}</Text></Pressable></View></> : <View style={styles.actions}><Pressable onPress={() => setSelected(undefined)}><Text style={{ color: colors.primary, fontWeight: '800' }}>Close</Text></Pressable></View>}</> : null}</ScrollView></View></Modal>
    <Modal visible={Boolean(failureTarget)} transparent animationType="fade" onRequestClose={() => !submitting && setFailureTarget(undefined)}><View style={styles.overlay}><View style={[styles.modal, { backgroundColor: colors.surface }]}><Text style={[styles.modalTitle, { color: colors.text }]}>Fail Sandbox Payout</Text><Text style={[styles.confirmation, { color: colors.textSecondary }]}>Enter why this sandbox payout failed. Reserved funds will be returned to the supplier wallet.</Text><TextInput value={failureReason} onChangeText={setFailureReason} maxLength={500} multiline placeholder="Failure reason (5–500 characters)" placeholderTextColor={colors.textSecondary} style={[styles.reason, { color: colors.text, borderColor: failureReasonError && failureReason ? colors.error : colors.border }]} />{failureReason && failureReasonError ? <Text style={{ color: colors.error, fontSize: 12 }}>{failureReasonError}</Text> : null}<View style={styles.actions}><Pressable disabled={submitting} onPress={() => setFailureTarget(undefined)}><Text style={{ color: colors.textSecondary, fontWeight: '800' }}>Cancel</Text></Pressable><Pressable disabled={submitting || Boolean(failureReasonError)} onPress={() => void submitSandboxFailure()} style={[styles.actionButton, { backgroundColor: colors.error, opacity: submitting || failureReasonError ? 0.5 : 1 }]}><Text style={styles.actionText}>Fail Sandbox Payout</Text></Pressable></View></View></View></Modal>
    <Modal visible={Boolean(completionTarget)} transparent animationType="fade" onRequestClose={() => !submitting && setCompletionTarget(undefined)}>
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.surface }]}>
          {completionTarget ? <>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Complete Sandbox Payout?</Text>
            <Text style={[styles.confirmation, { color: colors.textSecondary }]}>{completionTarget.reference} · {completionTarget.supplierName} · {money(completionTarget.amount)}</Text>
            <Text style={[styles.detailSub, { color: colors.textSecondary }]}>{completionTarget.bankName ?? completionTarget.payoutMethodType} · {completionTarget.maskedAccountNumber}</Text>
            <Text style={[styles.confirmation, { color: colors.textSecondary }]}>This records a successful sandbox payout. No real bank transfer occurs.</Text>
            <View style={styles.actions}>
              <Pressable disabled={submitting} onPress={() => setCompletionTarget(undefined)}><Text style={{ color: colors.textSecondary, fontWeight: '800' }}>Cancel</Text></Pressable>
              <Pressable disabled={submitting} onPress={() => void runPayoutAction(completionTarget, 'completeSandbox')} style={[styles.actionButton, { backgroundColor: colors.success, opacity: submitting ? 0.5 : 1 }]}><Text style={styles.actionText}>{submitting ? 'Completing...' : 'Complete Sandbox Payout'}</Text></Pressable>
            </View>
          </> : null}
        </View>
      </View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 18, gap: 12 }, toolbar: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 }, toolbarRight: { flexDirection: 'row', alignItems: 'center', gap: 12 }, title: { fontSize: 24, fontWeight: '900' }, subtitle: { fontSize: 13, marginTop: 2 }, count: { fontSize: 13, fontWeight: '600' }, refresh: { padding: 10, borderRadius: 8, borderWidth: 1 }, chips: { flexDirection: 'row', gap: 8 }, chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20 }, search: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13 }, kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, kpi: { minWidth: 150, flex: 1, borderRadius: 16, borderWidth: 1, padding: 14, gap: 3 }, primary: { fontSize: 13, fontWeight: '800' }, secondary: { fontSize: 11, marginTop: 2 }, badge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }, reviewButton: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 7 }, center: { flex: 1, minHeight: 200, alignItems: 'center', justifyContent: 'center' }, pagination: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderRadius: 12, padding: 12 }, pageButton: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginHorizontal: 2 }, disabled: { opacity: 0.35 }, pageSizes: { flexDirection: 'row', gap: 4, marginLeft: 8 }, sizeButton: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }, overlay: { flex: 1, backgroundColor: '#00000066', padding: 20, justifyContent: 'center' }, modal: { width: '100%', maxWidth: 540, alignSelf: 'center', borderRadius: 16, padding: 20, maxHeight: '90%' }, modalTitle: { fontSize: 20, fontWeight: '900' }, detail: { gap: 5, marginTop: 16 }, detailLabel: { marginTop: 10, fontSize: 10, fontWeight: '800', letterSpacing: 0.7 }, detailValue: { fontSize: 15, fontWeight: '800' }, detailSub: { fontSize: 13, lineHeight: 19 }, confirmation: { fontSize: 13, lineHeight: 19, marginTop: 18 }, reason: { minHeight: 88, borderWidth: 1, borderRadius: 10, padding: 11, textAlignVertical: 'top', marginTop: 12 }, rejection: { marginTop: 10, fontSize: 13, fontWeight: '700' }, actions: { marginTop: 18, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10, flexWrap: 'wrap' }, actionButton: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 }, actionText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
