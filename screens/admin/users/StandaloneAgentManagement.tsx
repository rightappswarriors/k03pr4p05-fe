import React, { useCallback, useEffect, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native'
import { MoreHorizontal } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { AdminDataTable, AdminDataTableColumn } from '@/components/admin/AdminDataTable'
import { AdminPagination } from '@/components/admin/AdminPagination'
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge'
import { AdminEntityManagementModal, ManagedEntity, ManagementAction } from '@/components/admin/AdminEntityManagementModal'
import { adminGovernanceService } from '@/services/adminGovernanceService'

type Agent = {
  id: string
  fullname: string
  email: string
  phone?: string | null
  address?: string | null
  trustTier: string
  verificationStatus: string
  status: string
  createdAt: string
}

type AgentPage = { items: Agent[]; total: number; page: number; limit: number }

const STATUS_FILTERS = ['All', 'REGISTERED', 'PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'BANNED', 'REJECTED'] as const

const human = (value: string) => value.replace(/_/g, ' ')

export function StandaloneAgentManagement() {
  const { colors } = useTheme()
  const { width } = useWindowDimensions()
  const desktop = width >= 1100
  const styles = makeStyles(colors)

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(30)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>()
  const [data, setData] = useState<AgentPage>({ items: [], total: 0, page: 1, limit: 30 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [selected, setSelected] = useState<Agent | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(undefined)
    try {
      const result = await adminGovernanceService.agents({ search: search || undefined, status, page, limit: pageSize })
      setData(result.adminStandaloneAgents)
    } catch (cause: any) {
      setError(cause.message ?? 'Unable to load standalone agents.')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search, status])

  useEffect(() => {
    void load()
  }, [load])

  const columns: AdminDataTableColumn<Agent>[] = [
    {
      key: 'name',
      label: 'Full Name',
      flex: 1.6,
      render: (row) => <Text style={[styles.primary, { color: colors.text }]}>{row.fullname}</Text>,
    },
    {
      key: 'email',
      label: 'Email',
      flex: 1.8,
      render: (row) => <Text style={[styles.secondary, { color: colors.textSecondary }]}>{row.email}</Text>,
    },
    {
      key: 'type',
      label: 'Type',
      flex: 1,
      render: () => <Text style={[styles.primary, { color: colors.textSecondary }]}>Standalone Agent</Text>,
    },
    {
      key: 'verification',
      label: 'Verification',
      flex: 1,
      render: (row) => <AdminStatusBadge value={row.verificationStatus} />,
    },
    {
      key: 'status',
      label: 'Status',
      flex: 1,
      render: (row) => <AdminStatusBadge value={row.status} />,
    },
    {
      key: 'tier',
      label: 'Trust Tier',
      flex: 1,
      render: (row) => <Text style={[styles.primary, { color: colors.text }]}>{row.trustTier}</Text>,
    },
    {
      key: 'created',
      label: 'Created',
      flex: 1,
      render: (row) => <Text style={[styles.primary, { color: colors.textSecondary }]}>{new Date(row.createdAt).toLocaleDateString()}</Text>,
    },
    {
      key: 'actions',
      label: 'Actions',
      width: 66,
      render: (row) => (
        <Pressable onPress={() => setSelected(row)} style={styles.action}>
          <MoreHorizontal size={19} color={colors.text} />
        </Pressable>
      ),
    },
  ]

  const actions = selected ? agentActions(selected) : []

  const execute = async (action: ManagementAction, reason?: string) => {
    if (!selected) return
    await adminGovernanceService.mutateAgent(action.mutation, selected.id, reason)
    await load()
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.toolbar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Standalone Agents</Text>
        <Text style={{ color: colors.textSecondary }}>{data.total} agents</Text>
      </View>

      <TextInput
        value={search}
        onChangeText={(value) => {
          setSearch(value)
          setPage(1)
        }}
        placeholder="Search standalone agents…"
        placeholderTextColor={colors.textSecondary}
        style={[styles.search, { color: colors.text, borderColor: colors.border }]}
      />

      <ScrollView
        horizontal
        style={styles.filtersScroll}
        contentContainerStyle={styles.filters}
        showsHorizontalScrollIndicator={false}
      >
        {STATUS_FILTERS.map((value) => {
          const active = value === 'All' ? !status : status === value
          return (
            <Pressable
              key={value}
              onPress={() => {
                setStatus(value === 'All' ? undefined : value)
                setPage(1)
              }}
              style={[styles.filter, { backgroundColor: active ? colors.primary : colors.border }]}
            >
              <Text style={{ color: active ? '#fff' : colors.textSecondary, fontWeight: '700', fontSize: 12 }}>{human(value)}</Text>
            </Pressable>
          )
        })}
      </ScrollView>

      {error ? (
        <View style={styles.state}>
          <Text style={{ color: colors.error }}>{error}</Text>
          <Pressable onPress={() => void load()}>
            <Text style={{ color: colors.primary, fontWeight: '800' }}>Retry</Text>
          </Pressable>
        </View>
      ) : desktop ? (
        <AdminDataTable
          columns={columns}
          data={data.items}
          keyExtractor={(row) => row.id}
          loading={loading}
          emptyState="No standalone agents found."
          onRowPress={setSelected}
          minWidth={1050}
        />
      ) : (
        <View style={styles.cards}>
          {data.items.map((agent) => (
            <Pressable key={agent.id} onPress={() => setSelected(agent)} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.primary, { color: colors.text }]}>{agent.fullname}</Text>
              <Text style={[styles.secondary, { color: colors.textSecondary }]}>{agent.email}</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <AdminStatusBadge value={agent.verificationStatus} />
                <AdminStatusBadge value={agent.status} />
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {data.total > 0 && (
        <AdminPagination
          page={page}
          total={data.total}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
        />
      )}

      <AdminEntityManagementModal
        entity={
          selected
            ? ({
              id: selected.id,
              name: selected.fullname,
              subtitle: selected.email,
              verificationStatus: selected.verificationStatus,
              accountStatus: selected.status,
              createdAt: selected.createdAt,
              details: [
                ['Phone', selected.phone],
                ['Address', selected.address],
                ['Trust tier', selected.trustTier],
              ],
            } satisfies ManagedEntity)
            : null
        }
        actions={actions}
        onClose={() => setSelected(null)}
        onAction={execute}
      />
    </View>
  )
}

function agentActions(agent: Agent): ManagementAction[] {
  const result: ManagementAction[] = []

  if (agent.verificationStatus !== 'APPROVED') {
    result.push(
      { label: 'Verify Agent', mutation: 'adminVerifyAgent' },
      { label: 'Reject Verification', mutation: 'adminRejectAgent', requiresReason: true, destructive: true },
    )
  }

  if (agent.status === 'ACTIVE' || agent.status === 'REGISTERED' || agent.status === 'PENDING_VERIFICATION') {
    result.push(
      { label: 'Suspend Agent', mutation: 'adminSuspendAgent', requiresReason: true, destructive: true },
      { label: 'Ban Agent', mutation: 'adminBanAgent', requiresReason: true, destructive: true },
    )
  }

  if (agent.status === 'SUSPENDED') {
    result.push(
      { label: 'Restore Agent', mutation: 'adminRestoreAgent' },
      { label: 'Ban Agent', mutation: 'adminBanAgent', requiresReason: true, destructive: true },
    )
  }

  if (agent.status === 'BANNED') {
    result.push({ label: 'Unban Agent', mutation: 'adminRestoreAgent' })
  }

  return result
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    root: { flex: 1 },
    toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
    title: { fontSize: 18, fontWeight: '800' },
    search: { margin: 12, borderWidth: 1, borderRadius: 10, padding: 11 },
    filtersScroll: { flexGrow: 0, flexShrink: 0 },
    filters: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingBottom: 12 },
    filter: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 18, alignSelf: 'flex-start' },
    primary: { fontSize: 13, fontWeight: '800' },
    secondary: { fontSize: 11, marginTop: 3 },
    action: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: colors.border },
    state: { minHeight: 160, alignItems: 'center', justifyContent: 'center', gap: 12 },
    cards: { padding: 12, gap: 8 },
    card: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 8 },
  })