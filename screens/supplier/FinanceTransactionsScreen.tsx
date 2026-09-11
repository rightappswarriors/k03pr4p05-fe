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
  getSupplierTransactionPage,
  getSupplierWalletSummary,
  type SupplierTransactionPageItem,
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
  const [entries, setEntries] = useState<SupplierTransactionPageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [walletData, transactionData] = await Promise.all([
          getSupplierWalletSummary(),
          getSupplierTransactionPage({ page: 1, limit: 20 }),
        ])
        setWallet(walletData)
        setEntries(transactionData.items)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unable to load transactions')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const available = useMemo(() => wallet?.balance ?? 0, [wallet])

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
        <FinanceStatCard title="Lifetime earnings" value={formatPHP(wallet?.lifetimeEarnings ?? 0)} hint="Settlement net credits" accent="#22C55E" icon={ReceiptText} />
        <FinanceStatCard title="Fees paid" value={formatPHP(wallet?.feesPaid ?? 0)} hint="Settlement platform fees" accent="#DC2626" icon={ReceiptText} />
        <FinanceStatCard title="Total withdrawals" value={formatPHP(wallet?.totalWithdrawn ?? 0)} hint="Completed cash-outs only" accent="#8B5CF6" icon={ReceiptText} />
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
                  <Text style={{ color: colors.text, fontWeight: '700' }}>{entry.label}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{entry.linkedPoNumber ?? entry.reference ?? 'No reference'}</Text>
                </View>,
                <Text key="date" style={{ color: colors.textSecondary, fontSize: 12 }}>{formatDate(entry.createdAt)}</Text>,
                <Text key="amount" style={{ color: entry.amount >= 0 ? colors.success : colors.error, fontWeight: '800' }}>{formatPHP(entry.amount)}</Text>,
                <Text key="status" style={{ color: colors.textSecondary, fontSize: 12 }}>{entry.statusLabel}</Text>,
              ],
            }))}
            emptyState={<EmptyState title="No transactions yet" message="Transactions will appear after payouts, fees, or orders are posted." />}
          />
        )}
      </FinanceSectionCard>
    </FinanceScreenShell>
  )
}
