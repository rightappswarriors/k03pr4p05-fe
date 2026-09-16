import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Banknote, CircleDollarSign, Clock3, Landmark, RefreshCw } from 'lucide-react-native';

import { ActionModal } from '@/components/ActionModal';
import { DataTable, EmptyState } from '@/components/DataTable';
import { Kpis } from '@/components/Kpi';
import { useTheme } from '@/contexts/ThemeContext';
import { platformFinanceService, type PlatformEnvironment } from '@/services/platformFinanceService';

const php = (value: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value ?? 0);
const date = (value?: string | null) => value ? new Date(value).toLocaleString('en-PH') : '—';

export function PlatformFinancePanel() {
  const { colors } = useTheme();
  const [environment, setEnvironment] = useState<PlatformEnvironment>('SANDBOX');
  const [data, setData] = useState<any>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>();
  const [showRequest, setShowRequest] = useState(false);
  const [showMethod, setShowMethod] = useState(false);
  const [amount, setAmount] = useState('');
  const [payoutMethodId, setPayoutMethodId] = useState('');
  const [method, setMethod] = useState({ type: 'BANK_TRANSFER', accountName: '', destination: '', bankName: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await platformFinanceService.load(environment)); }
    catch (requestError: any) { setError(requestError.message ?? 'Unable to load platform finance data.'); }
    finally { setLoading(false); }
  }, [environment]);
  useEffect(() => { void load(); }, [load]);

  const summary = data?.platformFeeSummary;
  const withdrawals = data?.platformWithdrawals?.items ?? [];
  const ledger = data?.platformFeeLedger?.items ?? [];
  const methods = data?.platformPayoutMethods?.filter((item: any) => item.isActive && item.isVerified) ?? [];
  const unverifiedMethods = data?.platformPayoutMethods?.filter((item: any) => item.isActive && !item.isVerified) ?? [];

  const run = async (action: string, row: any) => {
    setSubmitting(true); setError('');
    try {
      if (action === 'rejectPlatformWithdrawal' || action === 'failSandboxPlatformWithdrawal') {
        await platformFinanceService.reject(action, row.id, action === 'rejectPlatformWithdrawal' ? 'Rejected by platform finance administrator.' : 'Sandbox payout simulation failed.');
      } else {
        await platformFinanceService.act(action as any, row.id);
      }
      setSelected(undefined); await load();
    } catch (requestError: any) { setError(requestError.message ?? 'Platform withdrawal action failed.'); }
    finally { setSubmitting(false); }
  };

  const options = (() => {
    if (!selected) return [];
    if (selected.status === 'PENDING') return [
      { label: 'Approve withdrawal', icon: 'checkmark-circle-outline' as const, onPress: () => run('approvePlatformWithdrawal', selected) },
      { label: 'Reject and restore funds', icon: 'close-circle-outline' as const, destructive: true, onPress: () => run('rejectPlatformWithdrawal', selected) },
    ];
    if (selected.status === 'APPROVED') return [{ label: 'Start payout processing', icon: 'play-circle-outline' as const, onPress: () => run('processPlatformWithdrawalPayout', selected) }];
    if (selected.status === 'PROCESSING' && selected.environment === 'SANDBOX') return [
      { label: 'Complete sandbox payout', icon: 'checkmark-done-outline' as const, onPress: () => run('completeSandboxPlatformWithdrawal', selected) },
      { label: 'Fail sandbox payout', icon: 'warning-outline' as const, destructive: true, onPress: () => run('failSandboxPlatformWithdrawal', selected) },
    ];
    return [];
  })();

  const createMethod = async () => {
    setSubmitting(true); setError('');
    try { await platformFinanceService.createPayoutMethod({ ...method, environment }); setShowMethod(false); setMethod({ type: 'BANK_TRANSFER', accountName: '', destination: '', bankName: '' }); await load(); }
    catch (requestError: any) { setError(requestError.message ?? 'Unable to save payout method.'); }
    finally { setSubmitting(false); }
  };
  const request = async () => {
    setSubmitting(true); setError('');
    try { await platformFinanceService.requestWithdrawal(environment, Number(amount), payoutMethodId); setShowRequest(false); setAmount(''); setPayoutMethodId(''); await load(); }
    catch (requestError: any) { setError(requestError.message ?? 'Unable to request platform withdrawal.'); }
    finally { setSubmitting(false); }
  };

  const cell = (value: string, strong = false) => <Text style={{ color: colors.text, fontSize: 12, fontWeight: strong ? '800' : '500' }}>{value}</Text>;
  return <View style={styles.root}>
    <View style={styles.toolbar}>
      <View style={styles.environments}>{(['SANDBOX', 'PRODUCTION'] as const).map((value) => <Pressable key={value} onPress={() => setEnvironment(value)} style={[styles.chip, { borderColor: colors.border }, environment === value && { backgroundColor: colors.primary, borderColor: colors.primary }]}><Text style={{ color: environment === value ? '#fff' : colors.textSecondary, fontWeight: '800', fontSize: 12 }}>{value}</Text></Pressable>)}</View>
      <View style={styles.actions}><Pressable onPress={() => setShowMethod(true)} style={[styles.secondary, { borderColor: colors.border }]}><Text style={{ color: colors.text, fontWeight: '800' }}>Add payout method</Text></Pressable><Pressable disabled={!methods.length || !(summary?.wallet?.balance > 0)} onPress={() => setShowRequest(true)} style={[styles.primary, { backgroundColor: colors.primary, opacity: !methods.length || !(summary?.wallet?.balance > 0) ? 0.45 : 1 }]}><Text style={styles.primaryText}>Request withdrawal</Text></Pressable><Pressable accessibilityLabel="Refresh platform finance" onPress={() => void load()} style={[styles.icon, { borderColor: colors.border }]}><RefreshCw size={17} color={colors.primary} /></Pressable></View>
    </View>
    {error ? <Text style={{ color: colors.error }}>{error}</Text> : null}
    {loading && !data ? <ActivityIndicator color={colors.primary} /> : <>
      <Kpis items={[
        { title: 'Available', value: php(summary?.wallet?.balance), icon: CircleDollarSign, accent: '#7C3AED' },
        { title: 'Held', value: php(summary?.wallet?.heldBalance), icon: Clock3, accent: '#D97706' },
        { title: 'Total Earned', value: php(summary?.totalEarned), icon: Banknote, accent: '#059669' },
        { title: 'Total Withdrawn', value: php(summary?.totalWithdrawn), icon: Landmark, accent: '#2563EB' },
      ]} />
      {unverifiedMethods.map((item: any) => <View key={item.id} style={[styles.unverified, { borderColor: colors.border }]}><View style={{ flex: 1 }}><Text style={{ color: colors.text, fontWeight: '800' }}>{item.accountName} · {item.maskedAccountNumber}</Text><Text style={{ color: colors.textSecondary, fontSize: 12 }}>Production payout destination awaiting independent Admin verification.</Text></View><Pressable disabled={submitting} onPress={async () => { setSubmitting(true); try { await platformFinanceService.verifyPayoutMethod(item.id); await load(); } catch (requestError: any) { setError(requestError.message); } finally { setSubmitting(false); } }} style={[styles.secondary, { borderColor: colors.primary }]}><Text style={{ color: colors.primary, fontWeight: '800' }}>Verify</Text></Pressable></View>)}
      <Text style={[styles.heading, { color: colors.text }]}>Fee ledger</Text>
      <DataTable columns={[{ label: 'Channel' }, { label: 'PO / Settlement', width: 1.7 }, { label: 'Gross', align: 'right' }, { label: 'Platform fee', align: 'right' }, { label: 'Supplier net', align: 'right' }, { label: 'Date', width: 1.4 }]} rows={ledger.map((row: any) => ({ key: row.id, cells: [cell(row.channel, true), cell(row.purchaseOrderId ?? row.referenceId ?? '—'), cell(row.grossAmount == null ? '—' : php(row.grossAmount)), cell(php(row.platformFee ?? row.amount)), cell(row.supplierNet == null ? '—' : php(row.supplierNet)), cell(date(row.createdAt))] }))} emptyState={<EmptyState title="No platform fee postings" message="Settled-order fees for this environment will appear here." />} />
      <Text style={[styles.heading, { color: colors.text }]}>Platform withdrawals</Text>
      <DataTable columns={[{ label: 'Status' }, { label: 'Amount', align: 'right' }, { label: 'Destination', width: 1.8 }, { label: 'Requested' }, { label: 'Approved' }, { label: 'Completed' }]} rows={withdrawals.map((row: any) => ({ key: row.id, cells: [cell(row.status, true), cell(php(row.amount)), cell(`${row.payoutDestinationAccount} · ${row.payoutDestinationMasked}`), cell(date(row.requestedAt)), cell(date(row.approvedAt)), cell(date(row.completedAt))] }))} onRowPress={(row) => { const item = withdrawals.find((value: any) => value.id === row.key); if (item) setSelected(item); }} emptyState={<EmptyState title="No platform withdrawals" message="Admin platform-fund withdrawals are recorded separately from Supplier withdrawals." />} />
    </>}
    <ActionModal visible={Boolean(selected && options.length)} title="Platform withdrawal" description={selected ? `${php(selected.amount)} · ${selected.status} · ${selected.payoutDestinationMasked}` : ''} options={options} onClose={() => !submitting && setSelected(undefined)} />
    <Modal transparent visible={showRequest} onRequestClose={() => setShowRequest(false)}><View style={styles.overlay}><View style={[styles.modal, { backgroundColor: colors.surface }]}><Text style={[styles.modalTitle, { color: colors.text }]}>Request platform withdrawal</Text><Text style={{ color: colors.textSecondary }}>Funds move from available to held. Approval and processing do not move them again.</Text><TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="Amount in PHP" placeholderTextColor={colors.textSecondary} style={[styles.input, { color: colors.text, borderColor: colors.border }]} /><View style={styles.methodList}>{methods.map((item: any) => <Pressable key={item.id} onPress={() => setPayoutMethodId(item.id)} style={[styles.method, { borderColor: payoutMethodId === item.id ? colors.primary : colors.border }]}><Text style={{ color: colors.text, fontWeight: '700' }}>{item.accountName} · {item.maskedAccountNumber}</Text></Pressable>)}</View><View style={styles.actions}><Pressable onPress={() => setShowRequest(false)}><Text style={{ color: colors.textSecondary }}>Cancel</Text></Pressable><Pressable disabled={submitting || !payoutMethodId || !(Number(amount) > 0)} onPress={() => void request()} style={[styles.primary, { backgroundColor: colors.primary }]}><Text style={styles.primaryText}>Reserve funds</Text></Pressable></View></View></View></Modal>
    <Modal transparent visible={showMethod} onRequestClose={() => setShowMethod(false)}><View style={styles.overlay}><View style={[styles.modal, { backgroundColor: colors.surface }]}><Text style={[styles.modalTitle, { color: colors.text }]}>Add platform payout method</Text><Text style={{ color: colors.textSecondary }}>{environment === 'SANDBOX' ? 'Sandbox methods are auto-verified for local testing only.' : 'Production methods remain unverified until an independent verification flow is configured.'}</Text>{(['accountName', 'bankName', 'destination'] as const).map((key) => <TextInput key={key} secureTextEntry={key === 'destination'} value={method[key]} onChangeText={(value) => setMethod((current) => ({ ...current, [key]: value }))} placeholder={key === 'accountName' ? 'Account name' : key === 'bankName' ? 'Bank or provider' : 'Account number / destination'} placeholderTextColor={colors.textSecondary} style={[styles.input, { color: colors.text, borderColor: colors.border }]} />)}<View style={styles.actions}><Pressable onPress={() => setShowMethod(false)}><Text style={{ color: colors.textSecondary }}>Cancel</Text></Pressable><Pressable disabled={submitting || !method.accountName || !method.destination} onPress={() => void createMethod()} style={[styles.primary, { backgroundColor: colors.primary }]}><Text style={styles.primaryText}>Save method</Text></Pressable></View></View></View></Modal>
  </View>;
}

const styles = StyleSheet.create({
  root: { gap: 14 }, toolbar: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 }, environments: { flexDirection: 'row', gap: 7 }, actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }, chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }, primary: { borderRadius: 9, paddingHorizontal: 12, paddingVertical: 10 }, primaryText: { color: '#fff', fontWeight: '800', fontSize: 12 }, secondary: { borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 10 }, icon: { borderWidth: 1, borderRadius: 9, padding: 10 }, heading: { fontSize: 16, fontWeight: '900', marginTop: 4 }, unverified: { borderWidth: 1, borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }, overlay: { flex: 1, backgroundColor: '#00000066', justifyContent: 'center', padding: 20 }, modal: { width: '100%', maxWidth: 520, maxHeight: '90%', alignSelf: 'center', borderRadius: 16, padding: 20, gap: 12 }, modalTitle: { fontSize: 19, fontWeight: '900' }, input: { borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 11 }, methodList: { gap: 8 }, method: { borderWidth: 1, borderRadius: 9, padding: 11 },
});
