import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { RefreshCw } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { AdminDataTable, type AdminDataTableColumn } from '@/components/admin/AdminDataTable';
import { PayoutReconciliationToolbar, type PayoutReconciliationFilters } from '@/components/admin/PayoutReconciliationToolbar';
import {
  acknowledgeLegacyAdminPayoutReconciliation,
  addAdminWithdrawalPayoutReconciliationNote,
  getAdminPayoutReconciliations,
  refreshAdminWithdrawalPayoutStatus,
  type PayoutReconciliationData,
  type PayoutReconciliationEnvironment,
  type PayoutReconciliationRow,
} from '@/services/payoutReconciliationService';

const ENVIRONMENTS: PayoutReconciliationEnvironment[] = ['SANDBOX', 'PRODUCTION'];
const PAGE_SIZES = [30, 50, 100, 200];
const money = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
const statusColor = (status: string | null) => ({ PROCESSING: '#7C3AED', SUCCEEDED: '#10B981', FAILED: '#EF4444', RECONCILIATION_REQUIRED: '#F59E0B', COMPLETED: '#10B981' }[status ?? ''] ?? '#6B7280');

const Chip = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => {
  const { colors } = useTheme();
  return <TouchableOpacity style={[styles.chip, { backgroundColor: active ? colors.primary : colors.border }]} onPress={onPress}><Text style={{ color: active ? '#fff' : colors.textSecondary, fontSize: 12, fontWeight: '700' }}>{label}</Text></TouchableOpacity>;
};

export default function PayoutReconciliationScreen() {
  const { colors } = useTheme();
  const [environment, setEnvironment] = useState<PayoutReconciliationEnvironment>(process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'SANDBOX');
  const [search, setSearch] = useState('');
  const [attemptStatus, setAttemptStatus] = useState<string>();
  const [withdrawalStatus, setWithdrawalStatus] = useState<string>();
  const [diagnostic, setDiagnostic] = useState<string>();
  const [needsReview, setNeedsReview] = useState(false);
  const [provider, setProvider] = useState<string>();
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [data, setData] = useState<PayoutReconciliationData>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [refreshingAttemptId, setRefreshingAttemptId] = useState<string>();
  const [reviewTarget, setReviewTarget] = useState<PayoutReconciliationRow>();
  const [noteTarget, setNoteTarget] = useState<PayoutReconciliationRow>();
  const [note, setNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const normalizedSearch = search.trim();
  const searchError = normalizedSearch.length > 100 ? 'Search must not exceed 100 characters.' : undefined;
  const hasActiveFilters = Boolean(normalizedSearch || attemptStatus || withdrawalStatus || diagnostic || needsReview || provider || startDate || endDate);

  const load = useCallback(async () => {
    if (searchError) return;
    try { setLoading(true); setError(undefined); setData(await getAdminPayoutReconciliations({ environment, search: normalizedSearch || undefined, attemptStatus, withdrawalStatus, diagnostic, needsReview: needsReview || undefined, provider, startDate: startDate?.toISOString(), endDate: endDate?.toISOString(), page, pageSize })); }
    catch (e: any) { setError(e.message ?? 'Unable to load payout reconciliation data.'); }
    finally { setLoading(false); }
  }, [attemptStatus, diagnostic, endDate, environment, needsReview, normalizedSearch, page, pageSize, provider, searchError, startDate, withdrawalStatus]);

  useEffect(() => { void load(); }, [load]);
  const rows = data?.adminPayoutReconciliations.items ?? [];
  const total = data?.adminPayoutReconciliations.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const summary = data?.adminPayoutReconciliationSummary;
  const providers = data?.adminPayoutReconciliationProviders ?? [];
  const setFilter = (setter: (value?: string) => void, value?: string) => { setter(value); setPage(1); };
  const updateFilters = (next: PayoutReconciliationFilters) => { setSearch(next.search); setAttemptStatus(next.attemptStatus); setWithdrawalStatus(next.withdrawalStatus); setDiagnostic(next.diagnostic); setNeedsReview(next.needsReview); setProvider(next.provider); setStartDate(next.startDate); setEndDate(next.endDate); setPage(1); };
  const clearFilters = () => { setSearch(''); setAttemptStatus(undefined); setWithdrawalStatus(undefined); setDiagnostic(undefined); setNeedsReview(false); setProvider(undefined); setStartDate(undefined); setEndDate(undefined); setPage(1); };

  const refresh = async (row: PayoutReconciliationRow) => {
    if (!row.attemptId || refreshingAttemptId) return;
    try { setRefreshingAttemptId(row.attemptId); setError(undefined); await refreshAdminWithdrawalPayoutStatus(row.attemptId); await load(); }
    catch (e: any) { setError(e.message ?? 'Provider status could not be refreshed.'); }
    finally { setRefreshingAttemptId(undefined); }
  };

  const saveNote = async () => {
    const trimmedNote = note.trim();
    if (!noteTarget || trimmedNote.length < 5 || trimmedNote.length > 500 || savingNote) return;
    try { setSavingNote(true); setError(undefined); if (noteTarget.attemptId) await addAdminWithdrawalPayoutReconciliationNote(noteTarget.attemptId, trimmedNote); else await acknowledgeLegacyAdminPayoutReconciliation(noteTarget.withdrawalId, trimmedNote); setNoteTarget(undefined); setNote(''); await load(); }
    catch (e: any) { setError(e.message ?? 'Reconciliation note could not be saved.'); }
    finally { setSavingNote(false); }
  };

  const columns = useMemo<AdminDataTableColumn<PayoutReconciliationRow>[]>(() => [
    { key: 'withdrawal', label: 'Withdrawal', width: 125, render: (row) => <Text style={[styles.primary, { color: colors.text }]}>{row.withdrawalReference}</Text> },
    { key: 'supplier', label: 'Supplier', width: 180, render: (row) => <Text style={[styles.primary, { color: colors.text }]} numberOfLines={1}>{row.supplierName}</Text> },
    { key: 'amount', label: 'Amount', width: 120, render: (row) => <Text style={[styles.primary, { color: colors.text }]}>{money(row.amount)}</Text> },
    { key: 'statuses', label: 'Withdrawal / Attempt', width: 190, render: (row) => <View style={{ gap: 4 }}><Text style={[styles.primary, { color: statusColor(row.withdrawalStatus) }]}>{row.withdrawalStatus}</Text><Text style={[styles.secondary, { color: statusColor(row.attemptStatus) }]}>{row.attemptStatus ?? 'NO ATTEMPT'}</Text></View> },
    { key: 'provider', label: 'Provider reference', width: 220, render: (row) => <View><Text style={[styles.primary, { color: colors.text }]} numberOfLines={1}>{row.provider ?? 'Not recorded'}</Text><Text style={[styles.secondary, { color: colors.textSecondary }]} numberOfLines={1}>{row.providerReference ?? 'No provider reference'}</Text></View> },
    { key: 'warnings', label: 'Diagnostics', width: 260, render: (row) => <Text style={[styles.secondary, { color: row.warnings.length ? '#F59E0B' : colors.textSecondary }]}>{row.warnings.map((warning) => warning === 'LEGACY_NO_PAYOUT_ATTEMPT' ? 'Legacy payout — no provider attempt' : warning.toLowerCase().replaceAll('_', ' ')).join(', ') || 'No warnings'}</Text> },
    { key: 'updated', label: 'Attempt updated', width: 160, render: (row) => <Text style={[styles.secondary, { color: colors.textSecondary }]}>{row.attemptUpdatedAt ? new Date(row.attemptUpdatedAt).toLocaleString('en-PH') : '—'}</Text> },
    { key: 'action', label: 'Action', width: 165, render: (row) => row.attemptId ? <TouchableOpacity disabled={Boolean(refreshingAttemptId)} onPress={() => void refresh(row)} style={[styles.action, { borderColor: colors.primary, opacity: refreshingAttemptId ? 0.45 : 1 }]}><Text style={{ color: colors.primary, fontSize: 12, fontWeight: '800' }}>{refreshingAttemptId === row.attemptId ? 'Refreshing…' : 'Refresh status'}</Text></TouchableOpacity> : row.legacyReviewed ? <Text style={[styles.secondary, { color: colors.textSecondary }]}>Legacy reviewed</Text> : <TouchableOpacity onPress={() => void acknowledgeLegacyAdminPayoutReconciliation(row.withdrawalId).then(load).catch((e: any) => setError(e.message ?? 'Legacy acknowledgement could not be recorded.'))} style={[styles.action, { borderColor: '#B45309' }]}><Text style={{ color: '#B45309', fontSize: 12, fontWeight: '800' }}>Acknowledge legacy</Text></TouchableOpacity> },
    { key: 'review', label: 'Review', width: 90, render: (row) => <TouchableOpacity onPress={() => setReviewTarget(row)} style={[styles.action, { borderColor: colors.primary }]}><Text style={{ color: colors.primary, fontSize: 12, fontWeight: '800' }}>Review</Text></TouchableOpacity> },
  ], [colors, refreshingAttemptId]);

  return <View style={[styles.screen, { backgroundColor: colors.background }]}>
    <View style={styles.toolbar}><View><Text style={[styles.title, { color: colors.text }]}>Payout Reconciliation</Text><Text style={[styles.subtitle, { color: colors.textSecondary }]}>Read-only operational review of payout attempts and suspicious withdrawal states.</Text></View><View style={styles.toolbarRight}><Text style={[styles.count, { color: colors.textSecondary }]}>{total.toLocaleString()} items</Text><TouchableOpacity onPress={() => void load()} style={[styles.refresh, { backgroundColor: colors.surface, borderColor: colors.border }]}><RefreshCw color={colors.primary} size={18} /></TouchableOpacity></View></View>
    <View style={styles.chips}>{ENVIRONMENTS.map((value) => <Chip key={value} label={value} active={environment === value} onPress={() => { setEnvironment(value); setPage(1); }} />)}</View>
    <PayoutReconciliationToolbar filters={{ search, attemptStatus, withdrawalStatus, diagnostic, needsReview, provider, startDate, endDate }} providers={providers} onChange={updateFilters} onClear={clearFilters} />
    {loading && !data ? <View style={styles.center}><ActivityIndicator color={colors.primary} /></View> : error ? <Text style={{ color: colors.error }}>{error}</Text> : <><View style={styles.kpis}>{[['Needs review', summary?.needsReview ?? 0, '#F59E0B', () => { setNeedsReview(true); setDiagnostic(undefined); setPage(1); }, needsReview], ['Processing', summary?.processing ?? 0, '#7C3AED', () => setFilter(setAttemptStatus, 'PROCESSING'), attemptStatus === 'PROCESSING'], ['Reconciliation required', summary?.reconciliationRequired ?? 0, '#EF4444', () => setFilter(setAttemptStatus, 'RECONCILIATION_REQUIRED'), attemptStatus === 'RECONCILIATION_REQUIRED'], ['Succeeded', summary?.succeeded ?? 0, '#10B981', () => setFilter(setAttemptStatus, 'SUCCEEDED'), attemptStatus === 'SUCCEEDED'], ['Failed', summary?.failed ?? 0, '#EF4444', () => setFilter(setAttemptStatus, 'FAILED'), attemptStatus === 'FAILED']].map(([label, value, accent, onPress, active]) => <TouchableOpacity key={String(label)} onPress={onPress as () => void} style={[styles.kpi, { backgroundColor: colors.surface, borderColor: active ? accent as string : `${accent}33`, borderWidth: active ? 2 : 1 }]}><Text style={{ color: accent as string, fontSize: 21, fontWeight: '800' }}>{String(value)}</Text><Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' }}>{label}</Text></TouchableOpacity>)}</View><View style={{ flex: 1 }}>{rows.length === 0 ? <View style={styles.center}><Text style={{ color: colors.textSecondary }}>{hasActiveFilters ? 'No payout reconciliation records match the current filters.' : 'No payout attempts or suspicious withdrawals found for the selected environment.'}</Text>{hasActiveFilters ? <TouchableOpacity onPress={clearFilters} style={[styles.clearButton, { borderColor: colors.border }]}><Text style={{ color: colors.primary, fontSize: 12, fontWeight: '800' }}>Clear filters</Text></TouchableOpacity> : null}</View> : <AdminDataTable columns={columns} data={rows} keyExtractor={(row) => String(row.withdrawalId)} emptyState="No payout reconciliation records match the current filters." minWidth={1360} />}</View><View style={[styles.pagination, { backgroundColor: colors.surface, borderTopColor: colors.border }]}><TouchableOpacity disabled={page === 1} onPress={() => setPage((value) => Math.max(1, value - 1))} style={[styles.pageButton, { backgroundColor: colors.border }, page === 1 && styles.disabled]}><Text style={{ color: colors.text }}>‹</Text></TouchableOpacity><Text style={{ color: colors.textSecondary, marginHorizontal: 10 }}>{page} / {totalPages}</Text><TouchableOpacity disabled={page >= totalPages} onPress={() => setPage((value) => Math.min(totalPages, value + 1))} style={[styles.pageButton, { backgroundColor: colors.border }, page >= totalPages && styles.disabled]}><Text style={{ color: colors.text }}>›</Text></TouchableOpacity><ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginLeft: 8 }}><View style={styles.pageSizes}>{PAGE_SIZES.map((value) => <TouchableOpacity key={value} onPress={() => { setPageSize(value); setPage(1); }} style={[styles.sizeButton, { backgroundColor: pageSize === value ? colors.primary : colors.border }]}><Text style={{ color: pageSize === value ? '#fff' : colors.textSecondary, fontSize: 12 }}>{value}</Text></TouchableOpacity>)}</View></ScrollView></View></>}
    <Modal visible={Boolean(noteTarget)} transparent animationType="fade" onRequestClose={() => !savingNote && setNoteTarget(undefined)}><View style={styles.overlay}><View style={[styles.modal, { backgroundColor: colors.surface }]}><Text style={[styles.modalTitle, { color: colors.text }]}>Add reconciliation note</Text><Text style={[styles.noteContext, { color: colors.textSecondary }]}>{noteTarget?.withdrawalReference} · {noteTarget?.providerReference ?? 'No provider reference'}</Text><TextInput value={note} onChangeText={setNote} maxLength={501} multiline placeholder="Note (5–500 characters)" placeholderTextColor={colors.textSecondary} style={[styles.noteInput, { color: colors.text, borderColor: note && (note.trim().length < 5 || note.trim().length > 500) ? colors.error : colors.border }]} />{note && (note.trim().length < 5 || note.trim().length > 500) ? <Text style={{ color: colors.error, fontSize: 12 }}>Note must be between 5 and 500 characters.</Text> : null}<View style={styles.noteActions}><Pressable disabled={savingNote} onPress={() => setNoteTarget(undefined)}><Text style={{ color: colors.textSecondary, fontWeight: '800' }}>Cancel</Text></Pressable><Pressable disabled={savingNote || note.trim().length < 5 || note.trim().length > 500} onPress={() => void saveNote()} style={[styles.saveNote, { backgroundColor: colors.primary, opacity: savingNote || note.trim().length < 5 || note.trim().length > 500 ? 0.5 : 1 }]}><Text style={styles.saveNoteText}>{savingNote ? 'Saving…' : 'Save note'}</Text></Pressable></View></View></View></Modal>
    <Modal visible={Boolean(reviewTarget)} transparent animationType="fade" onRequestClose={() => setReviewTarget(undefined)}><View style={styles.overlay}><ScrollView contentContainerStyle={[styles.modal, { backgroundColor: colors.surface }]}>{reviewTarget ? <><Text style={[styles.modalTitle, { color: colors.text }]}>Reconciliation review</Text><Text style={[styles.noteContext, { color: colors.textSecondary }]}>{reviewTarget.withdrawalReference} · {reviewTarget.supplierName} · {money(reviewTarget.amount)}</Text><Text style={[styles.noteContext, { color: colors.textSecondary }]}>{reviewTarget.environment} · {reviewTarget.withdrawalStatus} · Requested {new Date(reviewTarget.requestedAt).toLocaleString('en-PH')}</Text><Text style={[styles.noteContext, { color: colors.textSecondary }]}>{reviewTarget.attemptId ? `${reviewTarget.provider ?? 'Provider'} · ${reviewTarget.providerReference ?? 'No provider reference'} · ${reviewTarget.attemptStatus}` : 'Legacy payout — no provider attempt recorded.'}</Text><Text style={[styles.noteContext, { color: colors.textSecondary }]}>Reservation {reviewTarget.reservationStatus ?? 'not recorded'} · Payout ledger {reviewTarget.terminalLedgerStatus ?? 'not recorded'} · Wallet {money(reviewTarget.walletBalance)}</Text><Text style={[styles.noteContext, { color: colors.textSecondary }]}>{reviewTarget.warnings.map((warning) => warning === 'LEGACY_NO_PAYOUT_ATTEMPT' ? 'No payout attempt recorded' : warning.toLowerCase().replaceAll('_', ' ')).join(' · ') || 'No diagnostics'}</Text><View style={styles.noteActions}><Pressable onPress={() => setReviewTarget(undefined)}><Text style={{ color: colors.textSecondary, fontWeight: '800' }}>Close</Text></Pressable><Pressable onPress={() => { setNoteTarget(reviewTarget); setNote(''); }} style={[styles.saveNote, { backgroundColor: colors.primary }]}><Text style={styles.saveNoteText}>Add note</Text></Pressable></View></> : null}</ScrollView></View></Modal>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 18, gap: 12 }, toolbar: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 }, toolbarRight: { flexDirection: 'row', alignItems: 'center', gap: 12 }, title: { fontSize: 24, fontWeight: '900' }, subtitle: { fontSize: 13, marginTop: 2 }, count: { fontSize: 13, fontWeight: '600' }, refresh: { padding: 10, borderRadius: 8, borderWidth: 1 }, chips: { flexDirection: 'row', gap: 8 }, chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20 }, search: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13 }, filterBar: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 12 }, filterGroup: { gap: 6 }, filterLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }, filterOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, dateButton: { minHeight: 36, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 }, clearButton: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 8, paddingHorizontal: 11, paddingVertical: 8, marginTop: 4 }, kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, kpi: { minWidth: 155, flex: 1, borderRadius: 16, padding: 14, gap: 3 }, primary: { fontSize: 13, fontWeight: '800' }, secondary: { fontSize: 11, lineHeight: 16 }, action: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 7 }, center: { flex: 1, minHeight: 200, alignItems: 'center', justifyContent: 'center', gap: 12 }, pagination: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderRadius: 12, padding: 12 }, pageButton: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginHorizontal: 2 }, disabled: { opacity: 0.35 }, pageSizes: { flexDirection: 'row', gap: 4 }, sizeButton: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }, overlay: { flex: 1, backgroundColor: '#00000066', padding: 20, justifyContent: 'center' }, modal: { width: '100%', maxWidth: 520, alignSelf: 'center', borderRadius: 16, padding: 20 }, modalTitle: { fontSize: 20, fontWeight: '900' }, noteContext: { fontSize: 13, marginTop: 8 }, noteInput: { minHeight: 100, borderWidth: 1, borderRadius: 10, padding: 11, textAlignVertical: 'top', marginTop: 14 }, noteActions: { marginTop: 18, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10 }, saveNote: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 }, saveNoteText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
