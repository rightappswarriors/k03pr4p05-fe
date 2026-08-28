import React, { useEffect, useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Banknote, Wallet2 } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
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
import { DataTable, EmptyState } from '@/components/DataTable'

function formatPHP(value: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value)
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function FinanceWalletScreen() {
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
        setEntries(transactionData.slice(0, 8))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unable to load wallet data')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const available = useMemo(() => wallet?.balance ?? 0, [wallet])
  const positiveEntries = useMemo(() => entries.filter((entry) => entry.amount > 0).reduce((sum, entry) => sum + entry.amount, 0), [entries])
  const feesPaid = useMemo(() => entries.filter((entry) => entry.amount < 0).reduce((sum, entry) => sum + Math.abs(entry.amount), 0), [entries])
  const totalWithdrawals = useMemo(() => entries.filter((entry) => entry.sourceType === 'WITHDRAWAL').reduce((sum, entry) => sum + Math.abs(entry.amount), 0), [entries])

  return (
    <FinanceScreenShell
      title="Wallet"
      subtitle="Manage your available balance and recent ledger activity"
      loading={loading}
    >
      {error ? <Text style={{ color: colors.error, fontSize: 13 }}>{error}</Text> : null}

      <FinanceSectionCard title="Wallet summary" subtitle="A polished overview of your supplier balance">
        <FinanceSplitLayout>
          <FinanceHeroCard
            title="Available balance"
            value={wallet ? formatPHP(available) : '—'}
            subtitle="Ready for your next payout"
            description="Track cleared funds, held balances, fees, and recent activity from one place."
            accent="#16A34A"
            icon={Wallet2}
          />
          <View style={[styles.sidePanel, { borderColor: colors.border, backgroundColor: colors.background }]}> 
            <Text style={[styles.sideTitle, { color: colors.text }]}>What matters now</Text>
            <Text style={[styles.sideText, { color: colors.textSecondary }]}>Use this view to review where your funds stand and what is ready to move out of the wallet.</Text>
            <View style={styles.sideList}>
              <View style={styles.sideItem}>
                <Text style={[styles.sideItemLabel, { color: colors.textSecondary }]}>Held balance</Text>
                <Text style={[styles.sideItemValue, { color: colors.text }]}>{wallet ? formatPHP(wallet.heldBalance) : '—'}</Text>
              </View>
              <View style={styles.sideItem}>
                <Text style={[styles.sideItemLabel, { color: colors.textSecondary }]}>Fees paid</Text>
                <Text style={[styles.sideItemValue, { color: colors.text }]}>{formatPHP(feesPaid)}</Text>
              </View>
            </View>
          </View>
        </FinanceSplitLayout>
      </FinanceSectionCard>

      <FinanceStatGrid>
        <FinanceStatCard title="Available balance" value={wallet ? formatPHP(available) : '—'} hint="Funds ready for withdrawal" accent="#16A34A" icon={Wallet2} />
        <FinanceStatCard title="Pending balance" value={wallet ? formatPHP(wallet.heldBalance) : '—'} hint="Reserved or pending clearance" accent="#F59E0B" icon={Banknote} />
        <FinanceStatCard title="Withdrawable" value={wallet ? formatPHP(available) : '—'} hint="Net cash available now" accent="#0EA5E9" icon={Banknote} />
        <FinanceStatCard title="Lifetime earnings" value={formatPHP(positiveEntries)} hint="All credits posted" accent="#22C55E" icon={Banknote} />
        <FinanceStatCard title="Fees paid" value={formatPHP(feesPaid)} hint="Platform charges posted" accent="#DC2626" icon={Banknote} />
        <FinanceStatCard title="Total withdrawals" value={formatPHP(totalWithdrawals)} hint="Cash-outs recorded" accent="#8B5CF6" icon={Banknote} />
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
                <Text key="entry" style={{ color: colors.text, fontWeight: '700' }}>{entry.sourceType.replace(/_/g, ' ').toLowerCase()}</Text>,
                <Text key="date" style={{ color: colors.textSecondary, fontSize: 12 }}>{formatDate(entry.createdAt)}</Text>,
                <Text key="amount" style={{ color: entry.amount >= 0 ? colors.success : colors.error, fontWeight: '800' }}>
                  {entry.amount >= 0 ? '+' : ''}{formatPHP(entry.amount)}
                </Text>,
                <Text key="status" style={{ color: colors.textSecondary, fontSize: 12 }}>{entry.status}</Text>,
              ],
            }))}
            emptyState={<EmptyState title="No activity yet" message="Ledger entries will appear here once orders, fees, or withdrawals are posted." />}
          />
        )}
      </FinanceSectionCard>
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
})
