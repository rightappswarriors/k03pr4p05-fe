import React, { useEffect, useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { BadgeDollarSign } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import {
  FinanceDataTable,
  FinanceEmptyState,
  FinanceHeroCard,
  FinanceScreenShell,
  FinanceSectionCard,
  FinanceSplitLayout,
  FinanceStatCard,
  FinanceStatGrid,
} from '@/components/supplier/finance/FinanceScreenShell'
import {
  getSupplierFinanceFeeHistory,
  getSupplierWalletSummary,
  type SupplierLedgerEntry,
  type SupplierWalletSummary,
} from '@/services/supplierService/financeService'
import { styles } from './FinancePayoutMethodsScreen'

function formatPHP(value: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value)
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function FinanceFeeHistoryScreen() {
  const { colors } = useTheme()
  const [wallet, setWallet] = useState<SupplierWalletSummary | null>(null)
  const [entries, setEntries] = useState<SupplierLedgerEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [walletData, feeData] = await Promise.all([
          getSupplierWalletSummary(),
          getSupplierFinanceFeeHistory(),
        ])
        setWallet(walletData)
        setEntries(feeData)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const totalFees = entries.reduce((sum, entry) => sum + Math.abs(entry.amount), 0)
  const available = useMemo(() => (wallet ? wallet.balance - wallet.heldBalance : 0), [wallet])
  const lifetimeEarnings = useMemo(() => (wallet ? wallet.balance + totalFees : 0), [wallet, totalFees])

  return (
    <FinanceScreenShell title="Fee history" subtitle="Track platform and service charges applied to your wallet" loading={loading}>
      <FinanceSectionCard title="Fee overview" subtitle="A quick view of charges impacting your supplier balance">
        <FinanceSplitLayout>
          <FinanceHeroCard
            title="Available balance"
            value={wallet ? formatPHP(available) : '—'}
            subtitle="After posted fees"
            description="Review the fees applied to the wallet and how they affect your net balance."
            accent="#16A34A"
            icon={BadgeDollarSign}
          />
          <View style={[styles.sidePanel, { borderColor: colors.border, backgroundColor: colors.background }]}> 
            <Text style={[styles.sideTitle, { color: colors.text }]}>Charge summary</Text>
            <Text style={[styles.sideText, { color: colors.textSecondary }]}>This page captures the fees and service charges posted to your supplier ledger for review.</Text>
          </View>
        </FinanceSplitLayout>
      </FinanceSectionCard>
      <FinanceStatGrid>
        <FinanceStatCard title="Available balance" value={wallet ? formatPHP(available) : '—'} hint="Funds ready for withdrawal" accent="#16A34A" icon={BadgeDollarSign} />
        <FinanceStatCard title="Pending balance" value={wallet ? formatPHP(wallet.heldBalance) : '—'} hint="Reserved or pending clearance" accent="#F59E0B" icon={BadgeDollarSign} />
        <FinanceStatCard title="Withdrawable" value={wallet ? formatPHP(available) : '—'} hint="Net cash available now" accent="#0EA5E9" icon={BadgeDollarSign} />
        <FinanceStatCard title="Lifetime earnings" value={formatPHP(lifetimeEarnings)} hint="Estimated gross earnings" accent="#22C55E" icon={BadgeDollarSign} />
        <FinanceStatCard title="Fees paid" value={formatPHP(totalFees)} hint="Platform charges posted" accent="#DC2626" icon={BadgeDollarSign} />
        <FinanceStatCard title="Total withdrawals" value={formatPHP(0)} hint="No withdrawal data" accent="#8B5CF6" icon={BadgeDollarSign} />
      </FinanceStatGrid>
      <FinanceSectionCard title="Fee activity" subtitle="Historical fee postings">
        {entries.length === 0 ? (
          <FinanceEmptyState title="No fee history yet" message="Fee activity will appear after charges are posted to your wallet." />
        ) : (
          <FinanceDataTable
            columns={[
              { label: 'Fee', width: 220 },
              { label: 'Date', width: 180 },
              { label: 'Amount', width: 140, align: 'right' },
            ]}
            rows={entries.map((entry) => ({
              key: entry.id,
              cells: [
                <Text key="fee" style={{ color: colors.text, fontWeight: '700' }}>{entry.sourceType.replace(/_/g, ' ')}</Text>,
                <Text key="date" style={{ color: colors.textSecondary, fontSize: 12 }}>{formatDate(entry.createdAt)}</Text>,
                <Text key="amount" style={{ color: colors.error, fontWeight: '800' }}>{formatPHP(entry.amount)}</Text>,
              ],
            }))}
            emptyState={<FinanceEmptyState title="No fee history yet" message="Fee activity will appear after charges are posted to your wallet." />}
          />
        )}
      </FinanceSectionCard>
    </FinanceScreenShell>
  )
}
