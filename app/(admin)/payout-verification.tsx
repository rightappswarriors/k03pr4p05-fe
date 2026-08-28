import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { gql } from 'graphql-request'
import { CreditCard, ShieldCheck } from 'lucide-react-native'
import { graphQLRequest } from '@/services/apiClient'
import { useTheme } from '@/contexts/ThemeContext'
import { AdminDataTable, type AdminDataTableColumn } from '@/components/admin/AdminDataTable'
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge'
import { AdminPagination, ADMIN_PAGE_SIZES } from '@/components/admin/AdminPagination'

type Method = {
  id: number
  supplierName: string
  type: string
  bankName?: string | null
  accountName: string
  maskedAccountNumber: string
  isVerified: boolean
  isActive: boolean
  isDefault: boolean
  environment: string
  createdAt: string
  verifiedAt?: string | null
}

const query = gql`
  query {
    adminPayoutMethods {
      id
      supplierName
      type
      bankName
      accountName
      maskedAccountNumber
      isVerified
      isActive
      isDefault
      environment
      createdAt
      verifiedAt
    }
  }
`

const verifyMutation = gql`
  mutation ($payoutMethodId: Int!) {
    adminVerifySandboxPayoutMethod(payoutMethodId: $payoutMethodId) {
      id
      isVerified
      verifiedAt
    }
  }
`

function statusFor(method: Method) {
  if (!method.isActive) return 'SUSPENDED'
  if (method.isVerified) return 'VERIFIED'
  return 'PENDING'
}

export default function PayoutVerification() {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])

  const [items, setItems] = useState<Method[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Method | null>(null)
  const [saving, setSaving] = useState(false)

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(ADMIN_PAGE_SIZES[0])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await graphQLRequest<{ adminPayoutMethods: Method[] }>(query)
      setItems(r.adminPayoutMethods)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const pending = useMemo(() => items.filter((m) => !m.isVerified && m.isActive).length, [items])
  const canVerifySelected = !!selected && !selected.isVerified && selected.isActive

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, page, pageSize])

  const confirm = async () => {
    if (!selected) return
    setSaving(true)
    try {
      await graphQLRequest(verifyMutation, { payoutMethodId: selected.id })
      setSelected(null)
      await load()
      Alert.alert('Verified', 'Sandbox payout method verified.')
    } catch (e) {
      Alert.alert('Verification failed', e instanceof Error ? e.message : 'Try again.')
    } finally {
      setSaving(false)
    }
  }

  const columns: AdminDataTableColumn<Method>[] = [
    {
      key: 'supplier',
      label: 'Supplier',
      flex: 1.6,
      render: (m) => (
        <View style={{ gap: 2 }}>
          <Text style={styles.primaryText}>{m.supplierName}</Text>
          <Text style={styles.secondaryText}>{m.accountName}</Text>
        </View>
      ),
    },
    {
      key: 'bank',
      label: 'Bank / Type',
      flex: 1.2,
      render: (m) => (
        <View style={{ gap: 2 }}>
          <Text style={styles.primaryText}>{m.bankName ?? m.type.replace(/_/g, ' ')}</Text>
          <Text style={styles.secondaryText}>{m.environment}</Text>
        </View>
      ),
    },
    {
      key: 'account',
      label: 'Account',
      width: 130,
      render: (m) => <Text style={styles.primaryText}>{m.maskedAccountNumber}</Text>,
    },
    {
      key: 'status',
      label: 'Status',
      width: 150,
      render: (m) => (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          <AdminStatusBadge value={statusFor(m)} />
          {m.isDefault && <AdminStatusBadge value="REGISTERED" />}
        </View>
      ),
    },
    {
      key: 'created',
      label: 'Created',
      width: 120,
      render: (m) => <Text style={styles.secondaryText}>{new Date(m.createdAt).toLocaleDateString()}</Text>,
    },
    {
      key: 'action',
      label: 'Action',
      width: 170,
      render: (m) =>
        !m.isVerified && m.isActive ? (
          <Pressable onPress={() => setSelected(m)} style={({ pressed }) => [styles.verifyButton, { opacity: pressed ? 0.75 : 1 }]}>
            <ShieldCheck size={14} color={colors.primary} />
            <Text style={styles.verifyText}>Verify Sandbox</Text>
          </Pressable>
        ) : (
          <Text style={styles.secondaryText}>—</Text>
        ),
    },
  ]

  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Payout Verification</Text>
          <Text style={styles.subtitle}>Review and verify supplier sandbox payout methods</Text>
        </View>
        <View style={styles.pendingPill}>
          <Text style={styles.pendingPillText}>{pending} pending</Text>
        </View>
      </View>

      <AdminDataTable
        columns={columns}
        data={paged}
        keyExtractor={(m) => String(m.id)}
        loading={loading}
        emptyState="No payout methods found."
        minWidth={860}
        onRowPress={(m) => setSelected(m)}
      />

      <AdminPagination
        page={page}
        total={items.length}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size)
          setPage(1)
        }}
      />

      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <View style={styles.backdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <CreditCard size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{canVerifySelected ? 'Verify Sandbox Payout Method' : 'Payout Method Details'}</Text>
                <Text style={styles.modalSubtitle}>
                  {canVerifySelected ? 'Sandbox-only confirmation, no real bank verification' : 'Read-only summary for this payout method'}
                </Text>
              </View>
            </View>

            <View style={styles.detailCard}>
              <DetailRow label="Supplier" value={selected?.supplierName} />
              <Divider />
              <DetailRow label="Bank" value={selected?.bankName ?? selected?.type.replace(/_/g, ' ')} />
              <Divider />
              <DetailRow label="Account holder" value={selected?.accountName} />
              <Divider />
              <DetailRow label="Account" value={selected?.maskedAccountNumber} />
              <Divider />
              <DetailRow label="Status" value={selected ? statusFor(selected) : undefined} />
            </View>

            <Text style={styles.warning}>
              {canVerifySelected
                ? 'This is sandbox-only. No real bank verification is performed.'
                : 'This method is not eligible for sandbox verification right now.'}
            </Text>

            <View style={styles.actions}>
              <Pressable disabled={saving} onPress={() => setSelected(null)} style={({ pressed }) => [styles.secondaryButton, { opacity: pressed ? 0.7 : 1 }]}>
                <Text style={styles.secondaryButtonText}>{canVerifySelected ? 'Cancel' : 'Close'}</Text>
              </Pressable>
              {canVerifySelected && (
                <Pressable disabled={saving} onPress={() => void confirm()} style={({ pressed }) => [styles.primaryButton, { opacity: pressed ? 0.85 : 1 }]}>
                  <Text style={styles.primaryButtonText}>{saving ? 'Verifying…' : 'Verify for Sandbox'}</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )

  function DetailRow({ label, value }: { label: string; value?: string | null }) {
    return (
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value ?? '—'}</Text>
      </View>
    )
  }

  function Divider() {
    return <View style={styles.detailDivider} />
  }
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    screen: { flex: 1, padding: 20, gap: 16, backgroundColor: colors.background },
    headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
    title: { fontSize: 22, fontWeight: '900', color: colors.text },
    subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    pendingPill: { backgroundColor: '#FEF3C7', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
    pendingPillText: { color: '#92400E', fontSize: 12, fontWeight: '800' },

    primaryText: { color: colors.text, fontSize: 13, fontWeight: '700' },
    secondaryText: { color: colors.textSecondary, fontSize: 12 },

    verifyButton: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.primary, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 10 },
    verifyText: { color: colors.primary, fontSize: 12, fontWeight: '800' },

    backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,.58)' },
    modalCard: { width: '100%', maxWidth: 460, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 20, gap: 14 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    modalIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: `${colors.primary}1A` },
    modalTitle: { color: colors.text, fontSize: 17, fontWeight: '900' },
    modalSubtitle: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },

    detailCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, gap: 10, backgroundColor: colors.background },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
    detailLabel: { color: colors.textSecondary, fontSize: 12 },
    detailValue: { color: colors.text, fontSize: 13, fontWeight: '700', textAlign: 'right', flexShrink: 1 },
    detailDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, opacity: 0.6 },

    warning: { color: colors.textSecondary, fontSize: 12, lineHeight: 18 },

    actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
    secondaryButton: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
    secondaryButtonText: { color: colors.text, fontWeight: '700' },
    primaryButton: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
    primaryButtonText: { color: '#fff', fontWeight: '800' },
  })