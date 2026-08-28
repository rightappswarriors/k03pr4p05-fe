import React, { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { confirmSandboxPaymentReconciliation, getSandboxPaymentReconciliations, type SandboxPaymentReconciliation } from '@/services/adminCommerceService'

const money = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)

export default function PaymentReconciliationScreen() {
  const { colors } = useTheme()
  const [payments, setPayments] = useState<SandboxPaymentReconciliation[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<SandboxPaymentReconciliation | null>(null)
  const [reason, setReason] = useState('Verified successful sandbox payment in Maya Checkout.')
  const [confirming, setConfirming] = useState(false)
  const [confirmationError, setConfirmationError] = useState<string | null>(null)
  const load = useCallback(async () => {
    try { setLoading(true); const data = await getSandboxPaymentReconciliations(); setPayments(data.adminSandboxPaymentReconciliations) }
    catch (error) { Alert.alert('Payment reconciliation', error instanceof Error ? error.message : 'Unable to load payment reconciliation records.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])
  const confirm = async () => {
    if (!selected || !reason.trim()) return
    try {
      setConfirmationError(null)
      if (__DEV__) console.info('[RECON-FE-2] mutation started', { transactionId: selected.id })
      setConfirming(true)
      await confirmSandboxPaymentReconciliation(selected.id, reason)
      if (__DEV__) console.info('[RECON-FE-3] success', { transactionId: selected.id })
      setSelected(null)
      await load()
      Alert.alert('Sandbox payment confirmed', 'The central payment confirmation workflow completed.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Confirmation was rejected.'
      if (__DEV__) console.warn('[RECON-FE-3] error', { message })
      setConfirmationError(message)
      Alert.alert('Sandbox payment confirmation', message)
    }
    finally { setConfirming(false) }
  }
  return <ScrollView style={[styles.root, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
    <View style={styles.header}><View><Text style={[styles.title, { color: colors.text }]}>Payment Reconciliation</Text><Text style={{ color: colors.textSecondary }}>Sandbox-only review for Maya payments blocked from independent verification.</Text></View><Pressable onPress={() => void load()} style={[styles.refresh, { backgroundColor: colors.primary }]}><Text style={styles.refreshText}>Refresh</Text></Pressable></View>
    <View style={[styles.notice, { borderColor: colors.border, backgroundColor: colors.surface }]}><Text style={{ color: colors.text, fontWeight: '800' }}>Maya independent verification: blocked by K007</Text><Text style={{ color: colors.textSecondary, marginTop: 4 }}>Sandbox confirmation requires persisted PAYMENT_SUCCESS webhook evidence and never replaces production verification.</Text></View>
    {loading ? <ActivityIndicator color={colors.primary} /> : payments.length === 0 ? <Text style={{ color: colors.textSecondary }}>No unresolved Maya payment attempts require reconciliation.</Text> : payments.map(payment => <View key={payment.id} style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={[styles.po, { color: colors.text }]}>{payment.poNumber}</Text>
      <Text style={{ color: colors.textSecondary }}>{payment.buyerName ?? 'Buyer'} · {payment.supplierName}</Text>
      <Text style={{ color: colors.textSecondary }}>{payment.provider} · {money(payment.amount)} · {payment.status}</Text>
      <Text style={styles.detail}>Transaction: {payment.id}</Text><Text style={styles.detail}>Maya reference: {payment.gatewayReference ?? 'Unavailable'}</Text>
      <Text style={styles.detail}>Webhook: {payment.webhookStatus ?? 'No success evidence'}{payment.webhookReceivedAt ? ` · ${new Date(payment.webhookReceivedAt).toLocaleString('en-PH')}` : ''}</Text>
      <Text style={styles.detail}>Provider verification: {payment.verificationResult ?? 'Not available'}</Text>
      {payment.environment === 'SANDBOX' && payment.status === 'RECONCILIATION_REQUIRED' && payment.webhookStatus === 'PAYMENT_SUCCESS' ? <Pressable onPress={() => { if (__DEV__) console.info('[RECON-FE-1] confirm clicked', { transactionId: payment.id }); setConfirmationError(null); setSelected(payment) }} style={[styles.confirm, { backgroundColor: colors.primary }]}><Text style={styles.refreshText}>Confirm Sandbox Payment</Text></Pressable> : <Text style={[styles.blocked, { color: colors.textSecondary }]}>Confirmation is unavailable until complete matching sandbox webhook evidence is persisted.</Text>}
    </View>)}
    <Modal visible={Boolean(selected)} transparent animationType="fade" onRequestClose={() => setSelected(null)}><View style={styles.overlay}><View style={[styles.modal, { backgroundColor: colors.surface }]}><Text style={[styles.modalTitle, { color: colors.text }]}>Confirm Sandbox Payment</Text><Text style={{ color: colors.textSecondary, marginTop: 8 }}>{selected?.poNumber} · Maya Sandbox · {selected ? money(selected.amount) : ''}</Text><Text style={{ color: colors.textSecondary, marginTop: 8 }}>Maya Status: PAYMENT_SUCCESS{`\n`}Verification: {selected?.verificationResult ?? 'Blocked by K007'}</Text><Text style={[styles.warning, { color: colors.textSecondary }]}>This action is available only for local/sandbox testing. It does not replace production provider verification.</Text><Text style={[styles.reasonLabel, { color: colors.text }]}>Reason *</Text><TextInput value={reason} onChangeText={setReason} multiline style={[styles.input, { borderColor: colors.border, color: colors.text }]} placeholder="Why is this sandbox payment being confirmed?" placeholderTextColor={colors.textSecondary} />{confirmationError && <Text style={styles.error}>{confirmationError}</Text>}<View style={styles.actions}><Pressable onPress={() => setSelected(null)} disabled={confirming}><Text style={{ color: colors.textSecondary, fontWeight: '800' }}>Cancel</Text></Pressable><Pressable onPress={() => void confirm()} disabled={confirming || !reason.trim()} style={[styles.confirm, { backgroundColor: colors.primary, opacity: confirming || !reason.trim() ? 0.55 : 1 }]}><Text style={styles.refreshText}>{confirming ? 'Confirming…' : 'Confirm Sandbox Payment'}</Text></Pressable></View></View></View></Modal>
  </ScrollView>
}

const styles = StyleSheet.create({ root: { flex: 1 }, content: { padding: 18, gap: 12, width: '100%', maxWidth: 1080, alignSelf: 'center' }, header: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center' }, title: { fontSize: 25, fontWeight: '900' }, refresh: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 9 }, refreshText: { color: '#fff', fontWeight: '800' }, notice: { borderWidth: 1, borderRadius: 12, padding: 13 }, card: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 5 }, po: { fontSize: 17, fontWeight: '900' }, detail: { color: '#64748B', fontSize: 12 }, confirm: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8 }, blocked: { marginTop: 8, fontSize: 12 }, overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, .5)', alignItems: 'center', justifyContent: 'center', padding: 18 }, modal: { width: '100%', maxWidth: 520, borderRadius: 14, padding: 18 }, modalTitle: { fontSize: 20, fontWeight: '900' }, warning: { marginTop: 12, fontSize: 12 }, reasonLabel: { marginTop: 16, fontWeight: '800' }, input: { minHeight: 88, borderWidth: 1, borderRadius: 8, marginTop: 7, padding: 10, textAlignVertical: 'top' }, error: { color: '#B91C1C', marginTop: 10, fontSize: 12 }, actions: { marginTop: 16, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 16 } })
