import React, { useMemo, useState } from 'react'
import { Alert, Platform, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native'
import {
  Calendar,
  Download,
  Eye,
  KeyRound,
  Laptop,
  ListFilter,
  Lock,
  RefreshCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Users,
} from 'lucide-react-native'
import DateRangePickerModal from '@/components/DateRangePickerModal'
import { useTheme } from '@/contexts/ThemeContext'
import { useResponsive } from '@/hooks/useResponsive'
import { useSupplierSecurity, type AuditLogRow, type SecurityTab } from '@/hooks/useSupplierSecurity'
import { StatCard } from './SupplierDashboardScreen'
import {
  AuditLogTable,
  AuditTimelineDrawer,
  LoginActivityCard,
  PasswordStrengthMeter,
  RolePermissionMatrix,
  SecurityAlertCard,
  SecurityEmptyState,
  SecurityHealthChecklist,
  SecurityPill,
  SecurityScoreCard,
  SecuritySectionCard,
  SessionCard,
  TrustedDeviceCard,
  UserRoleSummary,
} from '@/components/supplier/security/SecurityComponents'

const tabs: Array<{ key: SecurityTab; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'login', label: 'Login Activity' },
  { key: 'audit', label: 'Audit Logs' },
  { key: 'access', label: 'Access Control' },
  { key: 'sessions', label: 'Active Sessions' },
  { key: 'devices', label: 'Trusted Devices' },
  { key: 'password', label: 'Password' },
  { key: 'mfa', label: 'Two-Factor' },
  { key: 'alerts', label: 'Alerts' },
  { key: 'policies', label: 'Policies' },
]

function cardWidth(width: number) {
  if (width >= 1320) return '15.8%'
  if (width >= 980) return '23.5%'
  if (width >= 620) return '48%'
  return '100%'
}

function SecurityToolbar({ security }: { security: ReturnType<typeof useSupplierSecurity> }) {
  const { colors } = useTheme()
  const [dateOpen, setDateOpen] = useState(false)
  const button = {
    height: 40,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 11,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 7,
  }

  const exportCsv = () => {
    const header = ['Timestamp', 'User', 'Email', 'Module', 'Action', 'Severity', 'Resource', 'IP Address']
    const rows = security.auditLogs.map((log) => [
      log.createdAt,
      log.user?.fullname ?? 'System',
      log.user?.email ?? '',
      log.pageKey ?? '',
      log.action,
      security.severityFor(log.action),
      `${log.recordType ?? ''} ${log.recordId ?? ''}`.trim(),
      log.ipAddress ?? '',
    ])
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `supplier-security-audit-${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } else {
      Alert.alert('CSV ready', 'CSV export is available on web. Mobile export can be connected to the sharing service later.')
    }
  }

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <View style={{ flex: 1, minWidth: 220, height: 40, borderRadius: 11, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 }}>
          <Search size={16} color={colors.textSecondary} />
          <TextInput
            value={security.prefs.search}
            onChangeText={(search) => security.setPrefs({ search })}
            placeholder="Search users, actions, modules"
            placeholderTextColor={colors.textSecondary}
            style={{ flex: 1, color: colors.text, fontWeight: '700' }}
          />
        </View>
        <TouchableOpacity style={button} onPress={() => setDateOpen(true)}>
          <Calendar size={16} color={colors.textSecondary} />
          <Text style={{ color: colors.text, fontWeight: '800', fontSize: 12 }}>Date Range</Text>
        </TouchableOpacity>
        <TouchableOpacity style={button} onPress={() => security.setPrefs({ viewMode: security.prefs.viewMode === 'table' ? 'cards' : 'table' })}>
          <ListFilter size={16} color={colors.textSecondary} />
          <Text style={{ color: colors.text, fontWeight: '800', fontSize: 12 }}>{security.prefs.viewMode === 'table' ? 'Table' : 'Cards'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={button} onPress={exportCsv}>
          <Download size={16} color={colors.textSecondary} />
          <Text style={{ color: colors.text, fontWeight: '800', fontSize: 12 }}>Export CSV</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[button, { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={security.refresh}>
          <RefreshCcw size={16} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 12 }}>Refresh</Text>
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <FilterChip label="All users" active={security.prefs.userFilter === 'ALL'} onPress={() => security.setPrefs({ userFilter: 'ALL' })} />
        {security.users.slice(0, 4).map((user) => <FilterChip key={user.id} label={user.name} active={security.prefs.userFilter === user.id} onPress={() => security.setPrefs({ userFilter: user.id })} />)}
        <FilterChip label="All modules" active={security.prefs.moduleFilter === 'ALL'} onPress={() => security.setPrefs({ moduleFilter: 'ALL' })} />
        {security.modules.slice(0, 4).map((module) => <FilterChip key={module} label={module} active={security.prefs.moduleFilter === module} onPress={() => security.setPrefs({ moduleFilter: module })} />)}
        {['ALL', 'High', 'Medium', 'Low'].map((severity) => <FilterChip key={severity} label={severity === 'ALL' ? 'All severity' : severity} active={security.prefs.severityFilter === severity} onPress={() => security.setPrefs({ severityFilter: severity })} />)}
      </View>
      <DateRangePickerModal
        visible={dateOpen}
        onClose={() => setDateOpen(false)}
        initialStart={new Date(security.prefs.dateRange.startDate)}
        initialEnd={new Date(security.prefs.dateRange.endDate)}
        onApply={(startDate, endDate) => security.setPrefs({ dateRange: { startDate: startDate.toISOString(), endDate: endDate.toISOString() } })}
      />
    </View>
  )
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors } = useTheme()
  return (
    <TouchableOpacity onPress={onPress} style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: active ? colors.primary : colors.surface, borderWidth: 1, borderColor: active ? colors.primary : colors.border }}>
      <Text style={{ color: active ? '#fff' : colors.text, fontSize: 12, fontWeight: '900' }}>{label}</Text>
    </TouchableOpacity>
  )
}

export default function SecurityScreen() {
  const { colors } = useTheme()
  const { width, isDesktop } = useResponsive()
  const security = useSupplierSecurity()
  const [selectedLog, setSelectedLog] = useState<AuditLogRow | null>(null)
  const [password, setPassword] = useState('')
  const widthPct = cardWidth(width)

  const loginLogs = useMemo(
    () => security.rawAuditLogs.filter((log) => log.action.toLowerCase().includes('login') || log.action.toLowerCase().includes('auth')).slice(0, 20),
    [security.rawAuditLogs],
  )

  const terminate = (id: string) => Alert.alert('Terminate session?', 'This will remove the remembered active session entry.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Terminate', style: 'destructive', onPress: () => security.terminateSession(id) },
  ])

  const forgetDevice = (id: string) => Alert.alert('Forget device?', 'This removes the trusted-device entry from this browser or device.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Forget', style: 'destructive', onPress: () => security.removeTrustedDevice(id) },
  ])

  const content = () => {
    switch (security.prefs.selectedTab) {
      case 'login':
        return <CardsOrEmpty items={loginLogs} empty="No login activity in this range">{loginLogs.map((log) => <LoginActivityCard key={log.id} log={log} />)}</CardsOrEmpty>
      case 'audit':
        return <AuditLogTable logs={security.auditLogs} severityFor={security.severityFor} onSelect={setSelectedLog} />
      case 'access':
        return (
          <View style={{ gap: 14 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>{security.positions.map((position) => <View key={position.id} style={{ flexGrow: 1, flexBasis: 250 }}><UserRoleSummary position={position} /></View>)}</View>
            <SecuritySectionCard title="Permission Matrix" subtitle="Reuses existing Position Page Permission records">
              <RolePermissionMatrix positions={security.positions} />
            </SecuritySectionCard>
          </View>
        )
      case 'sessions':
        return <CardsOrEmpty items={security.sessions} empty="No active sessions found">{security.sessions.map((session) => <SessionCard key={session.id} session={session} onTerminate={() => terminate(session.id)} />)}</CardsOrEmpty>
      case 'devices':
        return <CardsOrEmpty items={security.devices} empty="No trusted devices found">{security.devices.map((device) => <TrustedDeviceCard key={device.id} device={device} onRemove={() => forgetDevice(device.id)} />)}</CardsOrEmpty>
      case 'password':
        return (
          <SecuritySectionCard title="Password" subtitle="Strength guidance for future password update flows">
            <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Type a sample password" placeholderTextColor={colors.textSecondary} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, color: colors.text }} />
            <PasswordStrengthMeter value={password} />
          </SecuritySectionCard>
        )
      case 'mfa':
        return <SecurityEmptyState title="Two-Factor Authentication" message="Organization-wide 2FA is reserved for a future release. Current device biometric sign-in is reflected in the score." />
      case 'alerts':
        return <CardsOrEmpty items={security.alerts} empty="No active security alerts">{security.alerts.map((alert) => <SecurityAlertCard key={alert.title} alert={alert} />)}</CardsOrEmpty>
      case 'policies':
        return (
          <View style={{ gap: 12 }}>
            {['Require strong passwords', 'Review access monthly', 'Keep audit logging enabled', 'Expire inactive sessions', 'Review trusted devices'].map((policy) => (
              <SecuritySectionCard key={policy} title={policy} subtitle="Organization security policy">
                <SecurityPill label="Recommended" tone="#2563EB" />
              </SecuritySectionCard>
            ))}
          </View>
        )
      default:
        return (
          <View style={{ gap: 14 }}>
            <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 14 }}>
              <View style={{ flex: 1.1 }}><SecurityScoreCard score={security.kpis.securityScore} /></View>
              <View style={{ flex: 1.4 }}><SecurityHealthChecklist items={security.checklist} /></View>
            </View>
            <SecuritySectionCard title="Recent Audit Activity" subtitle="Newest events from the existing Audit Log system">
              <AuditLogTable logs={security.auditLogs.slice(0, 8)} severityFor={security.severityFor} onSelect={setSelectedLog} />
            </SecuritySectionCard>
          </View>
        )
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={security.refreshing} onRefresh={security.refresh} tintColor={colors.primary} />}
        contentContainerStyle={{ width: '100%', maxWidth: 1720, alignSelf: 'center', paddingHorizontal: isDesktop ? 32 : 16, paddingVertical: 22, gap: 16 }}
      >
        <View style={{ gap: 4 }}>
          <Text style={{ color: colors.text, fontSize: isDesktop ? 30 : 24, fontWeight: '900' }}>Security Center</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '700' }}>Enterprise controls for access, auditability, devices, and security posture.</Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <StatCard title="Security Score" value={`${security.kpis.securityScore}/100`} subtitle="Overall posture" accent="#2563EB" icon={ShieldCheck} widthPct={widthPct} />
          <StatCard title="Active Sessions" value={security.kpis.activeSessions} subtitle="Current logins" accent="#16A34A" icon={Laptop} widthPct={widthPct} />
          <StatCard title="Audit Events Today" value={security.kpis.auditToday} subtitle="Logged actions" accent="#7C3AED" icon={Eye} widthPct={widthPct} />
          <StatCard title="Failed Login Attempts" value={security.kpis.failedLogins} subtitle="Selected range" accent="#DC2626" icon={ShieldAlert} widthPct={widthPct} />
          <StatCard title="Locked Accounts" value={security.kpis.lockedAccounts} subtitle="Requires review" accent="#F59E0B" icon={Lock} widthPct={widthPct} />
          <StatCard title="Users with 2FA Enabled" value={security.kpis.usersWith2fa} subtitle="Device biometric today" accent="#0EA5E9" icon={KeyRound} widthPct={widthPct} />
        </View>
        <SecurityToolbar security={security} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {tabs.map((tab) => <FilterChip key={tab.key} label={tab.label} active={security.prefs.selectedTab === tab.key} onPress={() => security.setPrefs({ selectedTab: tab.key })} />)}
          </View>
        </ScrollView>
        {security.loading ? <SecurityEmptyState title="Loading Security Center" message="Collecting audit logs, RBAC roles, sessions, and device posture." /> : security.error ? <SecurityEmptyState title="Unable to load Security Center" message={security.error} /> : content()}
      </ScrollView>
      <AuditTimelineDrawer log={selectedLog} onClose={() => setSelectedLog(null)} severityFor={security.severityFor} />
    </View>
  )
}

function CardsOrEmpty({ items, empty, children }: { items: any[]; empty: string; children: React.ReactNode }) {
  if (!items.length) return <SecurityEmptyState title={empty} message="Security data will appear here once available." />
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>{React.Children.map(children, (child, index) => <View key={index} style={{ flexGrow: 1, flexBasis: 300 }}>{child}</View>)}</View>
}
