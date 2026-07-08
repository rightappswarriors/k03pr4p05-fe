import React, { useEffect, useMemo, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { CreditCard } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import {
  FinanceEmptyState,
  FinanceFormGrid,
  FinanceHeroCard,
  FinanceScreenShell,
  FinanceSectionCard,
  FinanceSplitLayout,
  FinanceStatCard,
  FinanceStatGrid,
} from '@/components/supplier/finance/FinanceScreenShell'

import { formatPeso as formatPHP } from '@/utils/moneyHelpers';
import {
  createSupplierPayoutMethod,
  getSupplierFinancePayoutMethods,
  getSupplierFinanceTransactions,
  getSupplierWalletSummary,
  type SupplierLedgerEntry,
  type SupplierPayoutMethod,
  type SupplierWalletSummary,
} from '@/services/supplierService/financeService'

export default function FinancePayoutMethodsScreen() {
  const { colors } = useTheme()
  const [wallet, setWallet] = useState<SupplierWalletSummary | null>(null)
  const [methods, setMethods] = useState<SupplierPayoutMethod[]>([])
  const [entries, setEntries] = useState<SupplierLedgerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ type: 'BANK_TRANSFER', accountName: '', maskedAccountNumber: '', bankName: '', isDefault: true })

  useEffect(() => {
    const load = async () => {
      try {
        const [walletData, methodData, transactionData] = await Promise.all([
          getSupplierWalletSummary(),
          getSupplierFinancePayoutMethods(),
          getSupplierFinanceTransactions(),
        ])
        setWallet(walletData)
        setMethods(methodData)
        setEntries(transactionData)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const addMethod = async () => {
    if (!form.accountName || !form.maskedAccountNumber) {
      Alert.alert('Incomplete details', 'Please provide account name and masked account number.')
      return
    }

    try {
      const created = await createSupplierPayoutMethod({
        type: form.type,
        accountName: form.accountName,
        maskedAccountNumber: form.maskedAccountNumber,
        bankName: form.bankName || null,
        isDefault: form.isDefault,
      })
      setMethods((prev) => [created, ...prev])
      setForm({ type: 'BANK_TRANSFER', accountName: '', maskedAccountNumber: '', bankName: '', isDefault: true })
      Alert.alert('Saved', 'Your payout method has been added.')
    } catch (e) {
      Alert.alert('Unable to save', e instanceof Error ? e.message : 'Please try again later.')
    }
  }

  const available = useMemo(() => (wallet ? wallet.balance - wallet.heldBalance : 0), [wallet])
  const positiveEntries = useMemo(() => entries.filter((entry) => entry.amount > 0).reduce((sum, entry) => sum + entry.amount, 0), [entries])
  const feesPaid = useMemo(() => entries.filter((entry) => entry.amount < 0).reduce((sum, entry) => sum + Math.abs(entry.amount), 0), [entries])
  const totalWithdrawals = useMemo(() => entries.filter((entry) => entry.sourceType === 'WITHDRAWAL').reduce((sum, entry) => sum + Math.abs(entry.amount), 0), [entries])

  return (
    <FinanceScreenShell title="Payout methods" subtitle="Store your withdrawal destinations securely" loading={loading}>
      <FinanceSectionCard title="Payout readiness" subtitle="Review your balances before adding or managing destinations">
        <FinanceSplitLayout>
          <FinanceHeroCard
            title="Available balance"
            value={wallet ? formatPHP(available) : '—'}
            subtitle="Ready for withdrawals"
            description="Keep your preferred payout destinations aligned with your current supplier balance."
            accent="#16A34A"
            icon={CreditCard}
          />
          <View style={[styles.sidePanel, { borderColor: colors.border, backgroundColor: colors.background }]}> 
            <Text style={[styles.sideTitle, { color: colors.text }]}>Destination overview</Text>
            <Text style={[styles.sideText, { color: colors.textSecondary }]}>Saved payout methods are the gateways your withdrawal requests use. Keep at least one active destination ready.</Text>
          </View>
        </FinanceSplitLayout>
      </FinanceSectionCard>
      <FinanceStatGrid>
        <FinanceStatCard title="Available balance" value={wallet ? formatPHP(available) : '—'} hint="Funds ready for withdrawal" accent="#16A34A" icon={CreditCard} />
        <FinanceStatCard title="Pending balance" value={wallet ? formatPHP(wallet.heldBalance) : '—'} hint="Reserved or pending clearance" accent="#F59E0B" icon={CreditCard} />
        <FinanceStatCard title="Withdrawable" value={wallet ? formatPHP(available) : '—'} hint="Net cash available now" accent="#0EA5E9" icon={CreditCard} />
        <FinanceStatCard title="Lifetime earnings" value={formatPHP(positiveEntries)} hint="All credits posted" accent="#22C55E" icon={CreditCard} />
        <FinanceStatCard title="Fees paid" value={formatPHP(feesPaid)} hint="Platform charges posted" accent="#DC2626" icon={CreditCard} />
        <FinanceStatCard title="Total withdrawals" value={formatPHP(totalWithdrawals)} hint="Cash-outs recorded" accent="#8B5CF6" icon={CreditCard} />
      </FinanceStatGrid>

      <FinanceSectionCard title="Add payout method" subtitle="Add a bank transfer or e-wallet destination">
        <FinanceFormGrid>
          <View style={{ flex: 1, minWidth: 220 }}>
            <TextInput value={form.accountName} onChangeText={(v) => setForm((prev) => ({ ...prev, accountName: v }))} placeholder="Account name" style={styles.input} placeholderTextColor={colors.textSecondary} />
          </View>
          <View style={{ flex: 1, minWidth: 220 }}>
            <TextInput value={form.maskedAccountNumber} onChangeText={(v) => setForm((prev) => ({ ...prev, maskedAccountNumber: v }))} placeholder="Last 4 digits" style={styles.input} placeholderTextColor={colors.textSecondary} />
          </View>
          <View style={{ flex: 1, minWidth: 220 }}>
            <TextInput value={form.bankName} onChangeText={(v) => setForm((prev) => ({ ...prev, bankName: v }))} placeholder="Bank or gateway name" style={styles.input} placeholderTextColor={colors.textSecondary} />
          </View>
        </FinanceFormGrid>
        <Pressable onPress={addMethod} style={{ backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '800' }}>Save payout method</Text>
        </Pressable>
      </FinanceSectionCard>

      <FinanceSectionCard title="Existing methods" subtitle="Your saved payout methods">
        {methods.length === 0 ? (
          <FinanceEmptyState title="No payout methods yet" message="Create one to enable withdrawals." />
        ) : (
          <View style={{ gap: 8 }}>
            {methods.map((method) => (
              <View key={method.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{method.accountName}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>{method.type} • {method.maskedAccountNumber}</Text>
                {method.isDefault ? <Text style={{ color: colors.success, fontSize: 12, marginTop: 4 }}>Default method</Text> : null}
              </View>
            ))}
          </View>
        )}
      </FinanceSectionCard>
    </FinanceScreenShell>
  )
}

export const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sidePanel: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 10 },
  sideTitle: { fontSize: 14, fontWeight: '800' },
  sideText: { fontSize: 12, lineHeight: 18 },
})
