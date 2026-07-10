import React, { useEffect, useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { ReceiptText } from 'lucide-react-native'
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
  getSupplierWalletSummary,
  type SupplierLedgerEntry,
  type SupplierWalletSummary,
} from '@/services/supplierService/financeService'
import { useTheme } from '@/contexts/ThemeContext'
import { styles } from './FinancePayoutMethodsScreen'
import { DataTable, EmptyState } from '@/components/DataTable'

function formatPHP(value: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value)
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function FinanceTransactionsScreen() {
  const { colors } = useTheme()
  const [wallet, setWallet] = useState<SupplierWalletSummary | null>(null)
  const [entries, setEntries] = useState<SupplierLedgerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [walletData, transactionData] = await Promise.all([
          getSupplierWalletSummary(),
          getSupplierFinanceTransactions(),
        ])
        setWallet(walletData)
        setEntries(transactionData)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unable to load transactions')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const available = useMemo(() => (wallet ? wallet.balance - wallet.heldBalance : 0), [wallet])
  const positiveEntries = useMemo(() => entries.filter((entry) => entry.amount > 0).reduce((sum, entry) => sum + entry.amount, 0), [entries])
  const feesPaid = useMemo(() => entries.filter((entry) => entry.amount < 0).reduce((sum, entry) => sum + Math.abs(entry.amount), 0), [entries])
  const totalWithdrawals = useMemo(() => entries.filter((entry) => entry.sourceType === 'WITHDRAWAL').reduce((sum, entry) => sum + Math.abs(entry.amount), 0), [entries])

  return (
    <FinanceScreenShell title="Transactions" subtitle="A complete ledger of supplier credits, debits, and fees" loading={loading}>
      {error ? <Text style={{ color: colors.error, fontSize: 13 }}>{error}</Text> : null}
      <FinanceSectionCard title="Ledger overview" subtitle="A quick view of the movement that shapes your wallet">
        <FinanceSplitLayout>
          <FinanceHeroCard
            title="Available balance"
            value={wallet ? formatPHP(available) : '—'}
            subtitle="Current cleared funds"
            description="Review the ledger, payout activity, and fees from one place."
            accent="#16A34A"
            icon={ReceiptText}
          />
          <View style={[styles.sidePanel, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Text style={[styles.sideTitle, { color: colors.text }]}>Ledger snapshot</Text>
            <Text style={[styles.sideText, { color: colors.textSecondary }]}>The most recent entries and their movement help keep your supplier account balanced.</Text>
          </View>
        </FinanceSplitLayout>
      </FinanceSectionCard>
      <FinanceStatGrid>
        <FinanceStatCard title="Available balance" value={wallet ? formatPHP(available) : '—'} hint="Funds ready for withdrawal" accent="#16A34A" icon={ReceiptText} />
        <FinanceStatCard title="Pending balance" value={wallet ? formatPHP(wallet.heldBalance) : '—'} hint="Reserved or pending clearance" accent="#F59E0B" icon={ReceiptText} />
        <FinanceStatCard title="Withdrawable" value={wallet ? formatPHP(available) : '—'} hint="Net cash available now" accent="#0EA5E9" icon={ReceiptText} />
        <FinanceStatCard title="Lifetime earnings" value={formatPHP(positiveEntries)} hint="All credits posted" accent="#22C55E" icon={ReceiptText} />
        <FinanceStatCard title="Fees paid" value={formatPHP(feesPaid)} hint="Platform charges posted" accent="#DC2626" icon={ReceiptText} />
        <FinanceStatCard title="Total withdrawals" value={formatPHP(totalWithdrawals)} hint="Cash-outs recorded" accent="#8B5CF6" icon={ReceiptText} />
      </FinanceStatGrid>
      <FinanceSectionCard title="Recent transactions" subtitle="Sorted by most recent posting">
        {entries.length === 0 ? (
          <EmptyState title="No transactions yet" message="Transactions will appear after payouts, fees, or orders are posted." />
        ) : (
          <DataTable
            columns={[
              { label: 'Entry', width: 240 },
              { label: 'Date', width: 180 },
              { label: 'Amount', width: 140, align: 'right' },
              { label: 'Status', width: 140 },
            ]}
            rows={entries.map((entry) => ({
              key: entry.id,
              cells: [
                <View key="entry" style={{ gap: 2 }}>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>{entry.sourceType.replace(/_/g, ' ')}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{entry.referenceId ?? 'No reference'}</Text>
                </View>,
                <Text key="date" style={{ color: colors.textSecondary, fontSize: 12 }}>{formatDate(entry.createdAt)}</Text>,
                <Text key="amount" style={{ color: entry.amount >= 0 ? colors.success : colors.error, fontWeight: '800' }}>{formatPHP(entry.amount)}</Text>,
                <Text key="status" style={{ color: colors.textSecondary, fontSize: 12 }}>{entry.status}</Text>,
              ],
            }))}
            emptyState={<EmptyState title="No transactions yet" message="Transactions will appear after payouts, fees, or orders are posted." />}
          />
        )}
      </FinanceSectionCard>
    </FinanceScreenShell>
  )
}
