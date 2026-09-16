import React, { useEffect, useMemo, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { Banknote, Wallet2 } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { useSocket } from '@/contexts/SocketContext'
import {
  FinanceHeroCard,
  FinanceScreenShell,
  FinanceSectionCard,
  FinanceSplitLayout,
  FinanceStatCard,
  FinanceStatGrid,
} from '@/components/supplier/finance/FinanceScreenShell'
import {
  getSupplierFinanceTransactions,
  getSupplierFinancePayoutMethods,
  getSupplierFinanceWithdrawals,
  getSupplierWalletSummary,
  requestSupplierWithdrawal,
  type SupplierPayoutMethod,
  type SupplierWithdrawalRecord,
  type SupplierLedgerEntry,
  type SupplierWalletSummary,
} from '@/services/supplierService/financeService'
import { DataTable, EmptyState } from '@/components/DataTable'

function formatPHP(value: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value)
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

const withdrawalLedgerPresentation = (entry: SupplierLedgerEntry) => {
  if (entry.referenceId?.startsWith('withdrawal-payout:')) return { label: 'Payout completed', status: 'COMPLETED' }
  if (entry.referenceId?.startsWith('withdrawal-payout-failure:') || entry.referenceId?.startsWith('withdrawal-rejection:')) return { label: 'Withdrawal funds returned', status: entry.status }
  return { label: 'Withdrawal reserved', status: entry.status }
}

export default function FinanceWalletScreen() {
  const { colors } = useTheme()
  const { subscribe } = useSocket()
  const [wallet, setWallet] = useState<SupplierWalletSummary | null>(null)
  const [entries, setEntries] = useState<SupplierLedgerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [withdrawals, setWithdrawals] = useState<SupplierWithdrawalRecord[]>([])
  const [methods, setMethods] = useState<SupplierPayoutMethod[]>([])
  const [withdrawModal, setWithdrawModal] = useState(false)
  const [amount, setAmount] = useState('')
  const [payoutMethodId, setPayoutMethodId] = useState<number | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [walletData, transactionData, withdrawalData, methodData] = await Promise.all([
          getSupplierWalletSummary(),
          getSupplierFinanceTransactions(),
          getSupplierFinanceWithdrawals(),
          getSupplierFinancePayoutMethods(),
        ])
        setWallet(walletData)
        setEntries(transactionData.slice(0, 8))
        setWithdrawals(withdrawalData)
        setMethods(methodData)
        setPayoutMethodId(methodData.find((method) => method.isDefault && method.isVerified)?.id ?? methodData.find((method) => method.isVerified)?.id ?? null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unable to load wallet data')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  useEffect(() => subscribe(({ event }) => {
    if (event !== 'wallet:updated') return
    void Promise.all([getSupplierWalletSummary(), getSupplierFinanceTransactions(), getSupplierFinanceWithdrawals()]).then(([walletData, transactionData, withdrawalData]) => {
      setWallet(walletData)
      setEntries(transactionData.slice(0, 8))
      setWithdrawals(withdrawalData)
    }).catch((e) => setError(e instanceof Error ? e.message : 'Unable to refresh wallet data'))
  }), [subscribe])

  const available = useMemo(() => wallet?.balance ?? 0, [wallet])
  const visibleWithdrawalRequests = useMemo(
    () => withdrawals.filter((withdrawal) => ['PENDING', 'APPROVED', 'PROCESSING', 'REJECTED'].includes(withdrawal.status)),
    [withdrawals],
  )

  return (
    <FinanceScreenShell
      title="Wallet"
      subtitle="Track withdrawable funds separately from payments held in escrow"
      loading={loading}
    >
      {error ? <Text style={{ color: colors.error, fontSize: 13 }}>{error}</Text> : null}

      <FinanceSectionCard title="Wallet summary" subtitle="Available funds and protected order payments have different release rules">
        <FinanceSplitLayout>
          <FinanceHeroCard
            title="Total wallet funds"
            value={wallet ? formatPHP(wallet.totalFunds) : '—'}
            subtitle="Available balance plus all held funds"
            description="Payment received is included here immediately, while only completed-order settlements become available for withdrawal."
            accent="#16A34A"
            icon={Wallet2}
          />
          <View style={[styles.sidePanel, { borderColor: colors.border, backgroundColor: colors.background }]}> 
            <Text style={[styles.sideTitle, { color: colors.text }]}>Where your funds are</Text>
            <Text style={[styles.sideText, { color: colors.textSecondary }]}>Available funds can be withdrawn. Payment escrow remains protected until the order is completed.</Text>
            <View style={styles.sideList}>
              <View style={styles.sideItem}>
                <Text style={[styles.sideItemLabel, { color: colors.textSecondary }]}>Available for withdrawal</Text>
                <Text style={[styles.sideItemValue, { color: colors.success }]}>{wallet ? formatPHP(wallet.balance) : '—'}</Text>
                <Text style={[styles.sideItemLabel, { color: colors.textSecondary }]}>Cleared Supplier settlement credits</Text>
              </View>
              <View style={styles.sideItem}>
                <Text style={[styles.sideItemLabel, { color: colors.textSecondary }]}>Payment escrow</Text>
                <Text style={[styles.sideItemValue, { color: '#D97706' }]}>{wallet ? formatPHP(wallet.paymentEscrowBalance) : '—'}</Text>
                <Text style={[styles.sideItemLabel, { color: colors.textSecondary }]}>{wallet?.paymentEscrowOrderCount ?? 0} paid {wallet?.paymentEscrowOrderCount === 1 ? 'order' : 'orders'} awaiting completion</Text>
              </View>
              <View style={styles.sideItem}>
                <Text style={[styles.sideItemLabel, { color: colors.textSecondary }]}>Withdrawal reservations</Text>
                <Text style={[styles.sideItemValue, { color: colors.text }]}>{formatPHP(wallet?.pendingWithdrawalTotal ?? 0)}</Text>
                <Text style={[styles.sideItemLabel, { color: colors.textSecondary }]}>Requested payouts awaiting completion</Text>
              </View>
            </View>
          </View>
        </FinanceSplitLayout>
      </FinanceSectionCard>

      <View style={[styles.escrowNotice, { borderColor: '#F59E0B', backgroundColor: colors.surface }]}>
        <Text style={[styles.escrowNoticeTitle, { color: colors.text }]}>Payment received — held safely in escrow</Text>
        <Text style={[styles.escrowNoticeText, { color: colors.textSecondary }]}>Maya-confirmed Supplier net enters Payment Escrow first. Fulfill the order through dispatch, delivery, and buyer receipt confirmation. When the PO becomes Completed, settlement moves the exact amount from Held to Available for withdrawal.</Text>
      </View>

      <Pressable disabled={!available} onPress={() => setWithdrawModal(true)} style={[styles.withdrawButton, { backgroundColor: colors.primary, opacity: available ? 1 : 0.5 }]}><Text style={styles.withdrawButtonText}>Withdraw Funds</Text></Pressable>

      <FinanceStatGrid>
        <FinanceStatCard title="Available balance" value={wallet ? formatPHP(available) : '—'} hint="Funds ready for withdrawal" accent="#16A34A" icon={Wallet2} />
        <FinanceStatCard title="Payment escrow" value={wallet ? formatPHP(wallet.paymentEscrowBalance) : '—'} hint="Paid orders awaiting completion" accent="#F59E0B" icon={Banknote} />
        <FinanceStatCard title="Total held" value={wallet ? formatPHP(wallet.heldBalance) : '—'} hint="Escrow plus payout reservations" accent="#EA580C" icon={Banknote} />
        <FinanceStatCard title="Withdrawable" value={wallet ? formatPHP(available) : '—'} hint="Net cash available now" accent="#0EA5E9" icon={Banknote} />
        <FinanceStatCard title="Lifetime earnings" value={formatPHP(wallet?.lifetimeEarnings ?? 0)} hint="Supplier settlement net credits" accent="#22C55E" icon={Banknote} />
        <FinanceStatCard title="Fees paid" value={formatPHP(wallet?.feesPaid ?? 0)} hint="Platform charges posted" accent="#DC2626" icon={Banknote} />
        <FinanceStatCard title="Pending withdrawals" value={formatPHP(wallet?.pendingWithdrawalTotal ?? 0)} hint="Awaiting payout" accent="#D97706" icon={Banknote} />
        <FinanceStatCard title="Total withdrawn" value={formatPHP(wallet?.totalWithdrawn ?? 0)} hint="Completed cash-outs" accent="#8B5CF6" icon={Banknote} />
      </FinanceStatGrid>

      <FinanceSectionCard title="Recent wallet activity" subtitle="The latest ledger entries for your supplier wallet">
        {entries.length === 0 ? (
          <EmptyState title="No activity yet" message="Ledger entries will appear here once orders, fees, or withdrawals are posted." />
        ) : (
          <DataTable
            columns={[
              { label: 'Entry', width: 220 },
              { label: 'Date', width: 160 },
              { label: 'Amount', width: 140, align: 'right' },
              { label: 'Status', width: 140 },
            ]}
            rows={entries.map((entry) => ({
              key: entry.id,
              cells: [
                <Text key="entry" style={{ color: colors.text, fontWeight: '700' }}>{entry.sourceType === 'PURCHASE_ORDER_SETTLEMENT' ? 'Order completed · Funds available' : entry.sourceType === 'ESCROW_HOLD' ? 'Payment received · Held in escrow' : entry.sourceType === 'WITHDRAWAL' ? withdrawalLedgerPresentation(entry).label : entry.sourceType.replace(/_/g, ' ').toLowerCase()}</Text>,
                <Text key="date" style={{ color: colors.textSecondary, fontSize: 12 }}>{formatDate(entry.createdAt)}</Text>,
                <Text key="amount" style={{ color: entry.sourceType === 'ESCROW_HOLD' ? '#D97706' : entry.amount >= 0 ? colors.success : colors.error, fontWeight: '800' }}>
                  {entry.amount >= 0 ? '+' : ''}{formatPHP(entry.amount)}
                </Text>,
                <Text key="status" style={{ color: entry.sourceType === 'ESCROW_HOLD' ? '#D97706' : colors.textSecondary, fontSize: 12, fontWeight: entry.sourceType === 'ESCROW_HOLD' ? '700' : '400' }}>{entry.sourceType === 'ESCROW_HOLD' ? 'HELD · Awaiting order completion' : entry.sourceType === 'WITHDRAWAL' ? withdrawalLedgerPresentation(entry).status : entry.status}</Text>,
              ],
            }))}
            emptyState={<EmptyState title="No activity yet" message="Ledger entries will appear here once orders, fees, or withdrawals are posted." />}
          />
        )}
      </FinanceSectionCard>

      <FinanceSectionCard title="Withdrawal Requests" subtitle="Reserved amounts are no longer available for another withdrawal.">
        {visibleWithdrawalRequests.length === 0 ? <EmptyState title="No withdrawal requests" message="Your withdrawal requests will appear here." /> : visibleWithdrawalRequests.map((withdrawal) => <View key={withdrawal.id} style={[styles.withdrawalRow, { borderColor: colors.border }]}><View><Text style={{ color: colors.text, fontWeight: '800' }}>{formatPHP(withdrawal.amount)}</Text><Text style={{ color: colors.textSecondary, fontSize: 12 }}>{withdrawal.payoutMethod.bankName ?? withdrawal.payoutMethod.type} • {withdrawal.payoutMethod.maskedAccountNumber}</Text><Text style={{ color: colors.textSecondary, fontSize: 12 }}>Requested {formatDate(withdrawal.requestedAt)}</Text>{withdrawal.status === 'APPROVED' ? <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Approved and awaiting payout.</Text> : null}{withdrawal.status === 'REJECTED' && withdrawal.rejectionReason ? <Text style={{ color: colors.error, fontSize: 12 }}>Reason: {withdrawal.rejectionReason}</Text> : null}</View><Text style={{ color: withdrawal.status === 'REJECTED' ? colors.error : withdrawal.status === 'APPROVED' ? colors.primary : '#D97706', fontWeight: '800' }}>{withdrawal.status}</Text></View>)}
      </FinanceSectionCard>

      <Modal visible={withdrawModal} transparent animationType="fade" onRequestClose={() => setWithdrawModal(false)}><View style={styles.modalBackdrop}><View style={[styles.modal, { backgroundColor: colors.surface }]}><Text style={{ color: colors.text, fontSize: 19, fontWeight: '900' }}>Withdraw Funds</Text><Text style={{ color: colors.textSecondary, marginTop: 4 }}>Available balance: {formatPHP(available)}</Text><TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="Amount" placeholderTextColor={colors.textSecondary} style={[styles.input, { borderColor: colors.border, color: colors.text }]} />{methods.filter((method) => method.isVerified).map((method) => <Pressable key={method.id} onPress={() => setPayoutMethodId(method.id)} style={[styles.method, { borderColor: payoutMethodId === method.id ? colors.primary : colors.border }]}><Text style={{ color: colors.text }}>{method.bankName ?? method.type} • {method.maskedAccountNumber}</Text></Pressable>)}{!methods.some((method) => method.isVerified) ? <Text style={{ color: colors.error }}>No verified payout method available.</Text> : null}<View style={styles.modalActions}><Pressable onPress={() => setWithdrawModal(false)}><Text style={{ color: colors.textSecondary, fontWeight: '800' }}>Cancel</Text></Pressable><Pressable onPress={async () => { const requested = Number(amount); if (!payoutMethodId || !Number.isFinite(requested) || requested <= 0 || requested > available) { setError(!payoutMethodId ? 'Select a verified payout method.' : requested > available ? 'Withdrawal amount exceeds available balance.' : 'Enter a valid withdrawal amount.'); return } try { await requestSupplierWithdrawal(requested, payoutMethodId); setWithdrawModal(false); setAmount(''); const [walletData, transactionData, withdrawalData] = await Promise.all([getSupplierWalletSummary(), getSupplierFinanceTransactions(), getSupplierFinanceWithdrawals()]); setWallet(walletData); setEntries(transactionData.slice(0, 8)); setWithdrawals(withdrawalData) } catch (e) { setError(e instanceof Error ? e.message : 'Unable to request withdrawal.') } }} style={[styles.submit, { backgroundColor: colors.primary }]}><Text style={styles.withdrawButtonText}>Submit Withdrawal</Text></Pressable></View></View></View></Modal>
    </FinanceScreenShell>
  )
}

const styles = StyleSheet.create({
  sidePanel: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 10 },
  sideTitle: { fontSize: 14, fontWeight: '800' },
  sideText: { fontSize: 12, lineHeight: 18 },
  sideList: { gap: 8 },
  sideItem: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'transparent' },
  sideItemLabel: { fontSize: 12, fontWeight: '700' },
  sideItemValue: { fontSize: 14, fontWeight: '800', marginTop: 2 },
  escrowNotice: { borderWidth: 1, borderRadius: 12, padding: 14 },
  escrowNoticeTitle: { fontSize: 14, fontWeight: '900' },
  escrowNoticeText: { fontSize: 12, lineHeight: 18, marginTop: 5 },
  withdrawButton: { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12 }, withdrawButtonText: { color: '#fff', fontWeight: '800' }, withdrawalRow: { borderTopWidth: 1, paddingVertical: 11, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, modalBackdrop: { flex: 1, backgroundColor: '#00000066', alignItems: 'center', justifyContent: 'center', padding: 20 }, modal: { width: '100%', maxWidth: 440, borderRadius: 16, padding: 20 }, input: { borderWidth: 1, borderRadius: 9, padding: 12, marginTop: 16 }, method: { borderWidth: 1, borderRadius: 9, padding: 12, marginTop: 8 }, modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 18, marginTop: 20 }, submit: { borderRadius: 8, paddingHorizontal: 13, paddingVertical: 10 },
})
