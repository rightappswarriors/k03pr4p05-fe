import React, { useEffect, useMemo, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { Banknote, ChevronLeft, ChevronRight, Filter } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import {
  FinanceDataTable,
  FinanceEmptyState,
  FinanceFormGrid,
  FinanceHeroCard,
  FinanceScreenShell,
  FinanceSectionCard,
  FinanceSplitLayout,
  FinanceStatCard,
  FinanceStatGrid,
} from '@/components/supplier/finance/FinanceScreenShell'
import {
  getSupplierFinancePayoutMethods,
  getSupplierFinanceWithdrawals,
  getSupplierWalletSummary,
  requestSupplierWithdrawal,
  type SupplierPayoutMethod,
  type SupplierWithdrawalRecord,
  type SupplierWalletSummary,
} from '@/services/supplierService/financeService'

function formatPHP(value: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value)
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function FinanceWithdrawalsScreen() {
  const { colors } = useTheme()
  const [wallet, setWallet] = useState<SupplierWalletSummary | null>(null)
  const [payoutMethods, setPayoutMethods] = useState<SupplierPayoutMethod[]>([])
  const [withdrawals, setWithdrawals] = useState<SupplierWithdrawalRecord[]>([])
  const [amount, setAmount] = useState('')
  const [selectedMethod, setSelectedMethod] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [reviewVisible, setReviewVisible] = useState(false)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL')
  const [sortMode, setSortMode] = useState<'DATE' | 'AMOUNT' | 'STATUS'>('DATE')
  const pageSize = 5

  useEffect(() => {
    const load = async () => {
      try {
        const [walletData, methodData, withdrawalData] = await Promise.all([
          getSupplierWalletSummary(),
          getSupplierFinancePayoutMethods(),
          getSupplierFinanceWithdrawals(),
        ])
        setWallet(walletData)
        setPayoutMethods(methodData)
        setWithdrawals(withdrawalData)
        setSelectedMethod(methodData.find((m) => m.isDefault)?.id ?? methodData[0]?.id ?? null)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const availableBalance = useMemo(() => (wallet ? wallet.balance - wallet.heldBalance : 0), [wallet])
  const feeEstimate = useMemo(() => {
    const value = Number(amount)
    if (!value || value <= 0) return 0
    return Math.max(10, value * 0.01)
  }, [amount])
  const netAmount = useMemo(() => Math.max(0, Number(amount) - feeEstimate), [amount, feeEstimate])
  const selectedMethodDetails = payoutMethods.find((method) => method.id === selectedMethod)
  const filteredWithdrawals = useMemo(() => {
    const list = statusFilter === 'ALL' ? withdrawals : withdrawals.filter((entry) => entry.status === statusFilter)
    const sorted = [...list]
    if (sortMode === 'AMOUNT') {
      sorted.sort((a, b) => b.amount - a.amount)
    } else if (sortMode === 'STATUS') {
      sorted.sort((a, b) => a.status.localeCompare(b.status))
    } else {
      sorted.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())
    }
    return sorted
  }, [statusFilter, sortMode, withdrawals])
  const totalPages = Math.max(1, Math.ceil(filteredWithdrawals.length / pageSize))
  const pagedWithdrawals = useMemo(() => filteredWithdrawals.slice((page - 1) * pageSize, page * pageSize), [filteredWithdrawals, page])

  useEffect(() => {
    setPage(1)
  }, [statusFilter, sortMode])

  const submitWithdrawal = async () => {
    if (!selectedMethod) {
      Alert.alert('Select payout method', 'Add a payout method before requesting withdrawal.')
      return
    }
    const value = Number(amount)
    if (!value || value <= 0) {
      Alert.alert('Enter amount', 'Please enter a valid amount to withdraw.')
      return
    }
    try {
      setSubmitting(true)
      const newRequest = await requestSupplierWithdrawal(value, selectedMethod)
      setWithdrawals((prev) => [newRequest, ...prev])
      setAmount('')
      setReviewVisible(false)
      Alert.alert('Withdrawal requested', 'Your request has been submitted for review.')
    } catch (e) {
      Alert.alert('Unable to submit withdrawal', e instanceof Error ? e.message : 'Please try again later.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FinanceScreenShell title="Withdrawals" subtitle="Request cash out from your supplier wallet" loading={loading}>
      <FinanceSectionCard title="Cashout overview" subtitle="Review your balance and prepare a clean payout request">
        <FinanceSplitLayout>
          <FinanceHeroCard
            title="Available balance"
            value={wallet ? formatPHP(availableBalance) : '—'}
            subtitle="Ready to move out of your wallet"
            description="Keep your payout requests aligned with your cleared funds and selected destination."
            accent="#16A34A"
            icon={Banknote}
          />
          <View style={[styles.reviewPanel, { borderColor: colors.border, backgroundColor: colors.background }]}> 
            <Text style={[styles.reviewTitle, { color: colors.text }]}>Request review</Text>
            <View style={styles.reviewRow}>
              <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Amount</Text>
              <Text style={[styles.reviewValue, { color: colors.text }]}>{amount ? formatPHP(Number(amount)) : '—'}</Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Estimated fee</Text>
              <Text style={[styles.reviewValue, { color: colors.text }]}>{formatPHP(feeEstimate)}</Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Net amount</Text>
              <Text style={[styles.reviewValue, { color: colors.text }]}>{formatPHP(netAmount)}</Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Payout method</Text>
              <Text style={[styles.reviewValue, { color: colors.text }]}>{selectedMethodDetails?.accountName ?? 'Select a method'}</Text>
            </View>
          </View>
        </FinanceSplitLayout>
      </FinanceSectionCard>

      <FinanceStatGrid>
        <FinanceStatCard title="Available for withdrawal" value={wallet ? formatPHP(availableBalance) : '—'} hint="Current balance less held funds" accent="#16A34A" icon={Banknote} />
        <FinanceStatCard title="Pending requests" value={withdrawals.filter((entry) => entry.status === 'PENDING').length.toString()} hint="Awaiting review" accent="#F59E0B" icon={Banknote} />
        <FinanceStatCard title="Approved" value={withdrawals.filter((entry) => entry.status === 'APPROVED').length.toString()} hint="Cleared for release" accent="#22C55E" icon={Banknote} />
        <FinanceStatCard title="Total requests" value={withdrawals.length.toString()} hint="Historical submissions" accent="#0EA5E9" icon={Banknote} />
      </FinanceStatGrid>

      <FinanceSectionCard title="Request withdrawal" subtitle="Choose a payout method and enter an amount">
        <FinanceFormGrid>
          <View style={{ flex: 1, minWidth: 220 }}>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="Enter amount"
              keyboardType="numeric"
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: colors.text }}
            />
          </View>
          <View style={{ flex: 1, minWidth: 220 }}>
            {payoutMethods.length === 0 ? (
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>No payout methods yet. Add one in the Payout Methods screen.</Text>
            ) : (
              <View style={{ gap: 8 }}>
                {payoutMethods.map((method) => (
                  <Pressable
                    key={method.id}
                    onPress={() => setSelectedMethod(method.id)}
                    style={{ borderWidth: 1, borderColor: selectedMethod === method.id ? colors.primary : colors.border, borderRadius: 10, padding: 10 }}
                  >
                    <Text style={{ color: colors.text, fontWeight: '700' }}>{method.accountName}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{method.type} • {method.maskedAccountNumber}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </FinanceFormGrid>
        <View style={styles.actionsRow}>
          <Pressable onPress={() => setReviewVisible((prev) => !prev)} style={[styles.secondaryButton, { borderColor: colors.border }]}> 
            <Text style={[styles.secondaryText, { color: colors.text }]}>Review details</Text>
          </Pressable>
          <Pressable onPress={submitWithdrawal} disabled={submitting} style={{ backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '800' }}>{submitting ? 'Submitting…' : 'Request withdrawal'}</Text>
          </Pressable>
        </View>
        {reviewVisible ? (
          <View style={[styles.reviewCard, { borderColor: colors.border, backgroundColor: colors.background }]}> 
            <Text style={[styles.reviewCardTitle, { color: colors.text }]}>Withdrawal review</Text>
            <View style={styles.reviewCardRow}>
              <Text style={[styles.reviewCardLabel, { color: colors.textSecondary }]}>Amount</Text>
              <Text style={[styles.reviewCardValue, { color: colors.text }]}>{amount ? formatPHP(Number(amount)) : '—'}</Text>
            </View>
            <View style={styles.reviewCardRow}>
              <Text style={[styles.reviewCardLabel, { color: colors.textSecondary }]}>Estimated fee</Text>
              <Text style={[styles.reviewCardValue, { color: colors.text }]}>{formatPHP(feeEstimate)}</Text>
            </View>
            <View style={styles.reviewCardRow}>
              <Text style={[styles.reviewCardLabel, { color: colors.textSecondary }]}>Net amount</Text>
              <Text style={[styles.reviewCardValue, { color: colors.text }]}>{formatPHP(netAmount)}</Text>
            </View>
            <View style={styles.reviewCardRow}>
              <Text style={[styles.reviewCardLabel, { color: colors.textSecondary }]}>Selected payout method</Text>
              <Text style={[styles.reviewCardValue, { color: colors.text }]}>{selectedMethodDetails?.accountName ?? 'Select a method'}</Text>
            </View>
          </View>
        ) : null}
      </FinanceSectionCard>

      <FinanceSectionCard title="Withdrawal history" subtitle="Your recent payout requests">
        <View style={styles.tableToolbar}>
          <View style={[styles.filterPill, { borderColor: colors.border, backgroundColor: colors.background }]}> 
            <Filter size={14} color={colors.textSecondary} />
            <Text style={[styles.filterText, { color: colors.textSecondary }]}>{statusFilter}</Text>
          </View>
          <View style={styles.filterActions}>
            {(['DATE', 'AMOUNT', 'STATUS'] as const).map((option) => (
              <Pressable key={option} onPress={() => setSortMode(option)} style={[styles.optionButton, { borderColor: colors.border, backgroundColor: sortMode === option ? colors.primary : colors.background }]}> 
                <Text style={{ color: sortMode === option ? '#fff' : colors.text, fontSize: 12, fontWeight: '700' }}>{option}</Text>
              </Pressable>
            ))}
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((option) => (
              <Pressable key={option} onPress={() => setStatusFilter(option)} style={[styles.optionButton, { borderColor: colors.border, backgroundColor: statusFilter === option ? colors.primary : colors.background }]}> 
                <Text style={{ color: statusFilter === option ? '#fff' : colors.text, fontSize: 12, fontWeight: '700' }}>{option}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        {filteredWithdrawals.length === 0 ? (
          <FinanceEmptyState title="No withdrawals yet" message="Approved or pending requests will appear here." />
        ) : (
          <>
            <FinanceDataTable
              columns={[
                { label: 'Amount', width: 150, align: 'right' },
                { label: 'Method', width: 220 },
                { label: 'Date', width: 180 },
                { label: 'Status', width: 140 },
                { label: 'Actions', width: 120, align: 'center' },
              ]}
              rows={pagedWithdrawals.map((entry) => ({
                key: entry.id,
                cells: [
                  <Text key="amount" style={{ color: colors.text, fontWeight: '700' }}>{formatPHP(entry.amount)}</Text>,
                  <Text key="method" style={{ color: colors.textSecondary, fontSize: 12 }}>{entry.payoutMethod.accountName}</Text>,
                  <Text key="date" style={{ color: colors.textSecondary, fontSize: 12 }}>{formatDate(entry.requestedAt)}</Text>,
                  <Text key="status" style={{ color: colors.textSecondary, fontSize: 12 }}>{entry.status}</Text>,
                  <Pressable key="action" style={[styles.actionButton, { borderColor: colors.border }]}> 
                    <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>View</Text>
                  </Pressable>,
                ],
              }))}
              emptyState={<FinanceEmptyState title="No withdrawals yet" message="Approved or pending requests will appear here." />}
            />
            <View style={styles.paginationRow}>
              <Pressable onPress={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page === 1} style={[styles.paginationButton, { borderColor: colors.border, opacity: page === 1 ? 0.4 : 1 }]}> 
                <ChevronLeft size={14} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Prev</Text>
              </Pressable>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Page {page} of {totalPages}</Text>
              <Pressable onPress={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={page === totalPages} style={[styles.paginationButton, { borderColor: colors.border, opacity: page === totalPages ? 0.4 : 1 }]}> 
                <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Next</Text>
                <ChevronRight size={14} color={colors.textSecondary} />
              </Pressable>
            </View>
          </>
        )}
      </FinanceSectionCard>
    </FinanceScreenShell>
  )
}

const styles = StyleSheet.create({
  reviewPanel: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 10 },
  reviewTitle: { fontSize: 14, fontWeight: '800' },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  reviewLabel: { fontSize: 12, fontWeight: '700' },
  reviewValue: { fontSize: 12, fontWeight: '700', textAlign: 'right', flexShrink: 1 },
  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' },
  secondaryButton: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center' },
  secondaryText: { fontWeight: '700' },
  reviewCard: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 },
  reviewCardTitle: { fontSize: 13, fontWeight: '800' },
  reviewCardRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  reviewCardLabel: { fontSize: 12, fontWeight: '700' },
  reviewCardValue: { fontSize: 12, fontWeight: '700', textAlign: 'right', flexShrink: 1 },
  tableToolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  filterPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  filterText: { fontSize: 12, fontWeight: '700' },
  filterActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  optionButton: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  actionButton: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  paginationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  paginationButton: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
})
