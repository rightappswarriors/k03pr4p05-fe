import React, { useEffect, useMemo, useState } from 'react'
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { CreditCard } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import {

  FinanceFormGrid,
  FinanceHeroCard,
  FinanceScreenShell,
  FinanceSectionCard,
  FinanceSplitLayout,
  FinanceStatCard,
  FinanceStatGrid,
} from '@/components/supplier/finance/FinanceScreenShell'
import { EmptyState } from '@/components/DataTable'
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
  const [form, setForm] = useState({ type: 'BANK_TRANSFER', accountName: '', accountNumber: '', confirmAccountNumber: '', bankName: '', isDefault: true })
  const [modalVisible, setModalVisible] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [errors, setErrors] = useState<{ bankName?: string; accountName?: string; accountNumber?: string; confirmAccountNumber?: string }>({})

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
    if (!form.accountName || !form.accountNumber || !form.confirmAccountNumber) {
      Alert.alert('Incomplete details', 'Please provide and confirm the account number.')
      return
    }

    try {
      const created = await createSupplierPayoutMethod({
        type: form.type,
        accountName: form.accountName,
        accountNumber: form.accountNumber,
        confirmAccountNumber: form.confirmAccountNumber,
        bankName: form.bankName || null,
        isDefault: form.isDefault,
      })
      setMethods((prev) => [created, ...prev])
      setForm({ type: 'BANK_TRANSFER', accountName: '', accountNumber: '', confirmAccountNumber: '', bankName: '', isDefault: true })
      setReviewing(false); setModalVisible(false)
      Alert.alert('Saved', 'Your payout method has been added.')
    } catch (e) {
      Alert.alert('Unable to save', e instanceof Error ? e.message : 'Please try again later.')
    }
  }

  const validateAndReview = () => {
    const nextErrors: typeof errors = {}
    if (!form.bankName.trim()) nextErrors.bankName = 'Bank or gateway is required.'
    if (!form.accountName.trim()) nextErrors.accountName = 'Account holder name is required.'
    if (!form.accountNumber.trim()) nextErrors.accountNumber = 'Account number is required.'
    if (!form.confirmAccountNumber.trim()) nextErrors.confirmAccountNumber = 'Please confirm the account number.'
    else if (form.accountNumber && form.accountNumber !== form.confirmAccountNumber) nextErrors.confirmAccountNumber = 'Account numbers do not match.'

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length === 0) setReviewing(true)
  }

  const available = useMemo(() => wallet?.balance ?? 0, [wallet])
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

      <FinanceSectionCard title="Payout destinations" subtitle="Add a new destination to replace an account; account numbers cannot be edited.">
        <Pressable onPress={() => setModalVisible(true)} style={{ backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}><Text style={{ color: '#fff', fontWeight: '800' }}>+ Add payout method</Text></Pressable>
      </FinanceSectionCard>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setModalVisible(false)
          setReviewing(false)
          setErrors({})
          setForm({ type: 'BANK_TRANSFER', accountName: '', accountNumber: '', confirmAccountNumber: '', bankName: '', isDefault: true })
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modal, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {reviewing ? (
              <>
                <View style={styles.reviewHeader}>
                  <View style={[styles.reviewIconWrap, { backgroundColor: `${colors.primary}1A` }]}>
                    <CreditCard size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sideTitle, { color: colors.text }]}>Review payout destination</Text>
                    <Text style={[styles.reviewSubtitle, { color: colors.textSecondary }]}>Double-check before saving</Text>
                  </View>
                </View>

                <View style={[styles.reviewCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <View style={styles.reviewRow}>
                    <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Bank</Text>
                    <Text style={[styles.reviewValue, { color: colors.text }]}>{form.bankName}</Text>
                  </View>
                  <View style={[styles.reviewDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.reviewRow}>
                    <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Account holder</Text>
                    <Text style={[styles.reviewValue, { color: colors.text }]}>{form.accountName}</Text>
                  </View>
                  <View style={[styles.reviewDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.reviewRow}>
                    <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Account number</Text>
                    <Text style={[styles.reviewValue, { color: colors.text }]}>•••• {form.accountNumber.replace(/\s|-/g, '').slice(-4)}</Text>
                  </View>
                </View>

                <Text style={[styles.reviewWarning, { color: colors.textSecondary }]}>
                  Make sure these details are correct. Incorrect payout information may cause failed withdrawals.
                </Text>

                <View style={styles.actions}>
                  <Pressable
                    onPress={() => setReviewing(false)}
                    style={({ pressed }) => [styles.secondaryButton, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Text style={{ color: colors.text, fontWeight: '700' }}>Back</Text>
                  </Pressable>
                  <Pressable
                    onPress={addMethod}
                    style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
                  >
                    <Text style={{ color: '#fff', fontWeight: '800' }}>Confirm & Add</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Text style={[styles.sideTitle, { color: colors.text }]}>Add payout method</Text>

                <View style={styles.fieldGroup}>
                  <TextInput
                    value={form.bankName}
                    onChangeText={(v) => { setForm((p) => ({ ...p, bankName: v })); if (errors.bankName) setErrors((p) => ({ ...p, bankName: undefined })) }}
                    placeholder="Bank or gateway"
                    placeholderTextColor={colors.textSecondary}
                    style={[styles.input, { color: colors.text, borderColor: errors.bankName ? '#DC2626' : colors.border }]}
                  />
                  {errors.bankName ? <Text style={styles.errorText}>{errors.bankName}</Text> : null}
                </View>

                <View style={styles.fieldGroup}>
                  <TextInput
                    value={form.accountName}
                    onChangeText={(v) => { setForm((p) => ({ ...p, accountName: v })); if (errors.accountName) setErrors((p) => ({ ...p, accountName: undefined })) }}
                    placeholder="Account holder name"
                    placeholderTextColor={colors.textSecondary}
                    style={[styles.input, { color: colors.text, borderColor: errors.accountName ? '#DC2626' : colors.border }]}
                  />
                  {errors.accountName ? <Text style={styles.errorText}>{errors.accountName}</Text> : null}
                </View>

                <View style={styles.fieldGroup}>
                  <TextInput
                    value={form.accountNumber}
                    onChangeText={(v) => { setForm((p) => ({ ...p, accountNumber: v })); if (errors.accountNumber) setErrors((p) => ({ ...p, accountNumber: undefined })) }}
                    placeholder="Account number"
                    placeholderTextColor={colors.textSecondary}
                    secureTextEntry
                    style={[styles.input, { color: colors.text, borderColor: errors.accountNumber ? '#DC2626' : colors.border }]}
                  />
                  {errors.accountNumber ? <Text style={styles.errorText}>{errors.accountNumber}</Text> : null}
                </View>

                <View style={styles.fieldGroup}>
                  <TextInput
                    value={form.confirmAccountNumber}
                    onChangeText={(v) => { setForm((p) => ({ ...p, confirmAccountNumber: v })); if (errors.confirmAccountNumber) setErrors((p) => ({ ...p, confirmAccountNumber: undefined })) }}
                    placeholder="Confirm account number"
                    placeholderTextColor={colors.textSecondary}
                    secureTextEntry
                    style={[styles.input, { color: colors.text, borderColor: errors.confirmAccountNumber ? '#DC2626' : colors.border }]}
                  />
                  {errors.confirmAccountNumber ? <Text style={styles.errorText}>{errors.confirmAccountNumber}</Text> : null}
                </View>

                <Pressable
                  onPress={validateAndReview}
                  style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
                >
                  <Text style={{ color: '#fff', fontWeight: '800' }}>Review</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Saved destinations only; raw account inputs live exclusively in the modal above. */}
      {false && <FinanceSectionCard title="Add payout method" subtitle="Add a bank transfer or e-wallet destination">
        <FinanceFormGrid>
          <View style={{ flex: 1, minWidth: 220 }}>
            <TextInput value={form.accountName} onChangeText={(v) => setForm((prev) => ({ ...prev, accountName: v }))} placeholder="Account name" style={styles.input} placeholderTextColor={colors.textSecondary} />
          </View>
          <View style={{ flex: 1, minWidth: 220 }}>
            <TextInput value={form.accountNumber} onChangeText={(v) => setForm((prev) => ({ ...prev, accountNumber: v }))} placeholder="Account number" secureTextEntry style={styles.input} placeholderTextColor={colors.textSecondary} />
          </View>
          <View style={{ flex: 1, minWidth: 220 }}>
            <TextInput value={form.confirmAccountNumber} onChangeText={(v) => setForm((prev) => ({ ...prev, confirmAccountNumber: v }))} placeholder="Confirm account number" secureTextEntry style={styles.input} placeholderTextColor={colors.textSecondary} />
          </View>
          <View style={{ flex: 1, minWidth: 220 }}>
            <TextInput value={form.bankName} onChangeText={(v) => setForm((prev) => ({ ...prev, bankName: v }))} placeholder="Bank or gateway name" style={styles.input} placeholderTextColor={colors.text} />
          </View>
        </FinanceFormGrid>
        <Pressable onPress={addMethod} style={{ backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '800' }}>Save payout method</Text>
        </Pressable>
      </FinanceSectionCard>}

      <FinanceSectionCard title="Existing methods" subtitle="Your saved payout methods">
        {methods.length === 0 ? (
          <EmptyState title="No payout methods yet" message="Create one to enable withdrawals." />
        ) : (
          <View style={{ gap: 8 }}>
            {methods.map((method) => (
              <View key={method.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{method.accountName}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>{method.type} • {method.maskedAccountNumber}</Text>
                <Text style={{ color: method.isVerified ? colors.success : colors.textSecondary, fontSize: 12, marginTop: 4 }}>{method.isVerified ? 'Verified' : 'Verification pending'}</Text>
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
  fieldGroup: { gap: 4 },
  errorText: { color: '#DC2626', fontSize: 12, marginLeft: 2 },
  sidePanel: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 10 },
  sideTitle: { fontSize: 16, fontWeight: '800' },
  sideText: { fontSize: 12, lineHeight: 18 },
  modalBackdrop: { flex: 1, backgroundColor: '#0008', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modal: { width: '100%', maxWidth: 420, alignSelf: 'center', borderWidth: 1, borderRadius: 16, padding: 20, gap: 14 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
  primaryButton: { borderRadius: 10, paddingVertical: 12, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  secondaryButton: { borderWidth: 1, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reviewIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  reviewSubtitle: { fontSize: 12, marginTop: 2 },
  reviewCard: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 10 },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  reviewLabel: { fontSize: 12 },
  reviewValue: { fontSize: 13, fontWeight: '700' },
  reviewDivider: { height: StyleSheet.hairlineWidth, opacity: 0.6 },
  reviewWarning: { fontSize: 12, lineHeight: 18 },
})