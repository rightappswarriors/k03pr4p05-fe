import { useCallback, useEffect, useMemo, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuth } from '@/contexts/AuthContext'
import { AuditService } from '@/services/auditService'
import { PositionService } from '@/services/positionService'
import { SecurityService, type SecuritySession, type TrustedDevice } from '@/services/securityService'

export type SecurityTab = 'overview' | 'login' | 'audit' | 'access' | 'sessions' | 'devices' | 'password' | 'mfa' | 'alerts' | 'policies'
export type SecurityViewMode = 'cards' | 'table'

export interface AuditLogRow {
  id: string
  orgId: number
  userId?: number | null
  pageKey?: string | null
  action: string
  recordId?: string | null
  recordType?: string | null
  oldValue?: any
  newValue?: any
  ipAddress?: string | null
  userAgent?: string | null
  createdAt: string
  user?: { id: number; fullname: string; email: string }
}

export interface SecurityPrefs {
  selectedTab: SecurityTab
  search: string
  userFilter: string
  moduleFilter: string
  actionFilter: string
  severityFilter: string
  sort: 'newest' | 'oldest' | 'severity'
  viewMode: SecurityViewMode
  visibleColumns: string[]
  dateRange: { startDate: string; endDate: string }
}

const defaultRange = () => {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 30)
  return { startDate: start.toISOString(), endDate: end.toISOString() }
}

const defaultPrefs: SecurityPrefs = {
  selectedTab: 'overview',
  search: '',
  userFilter: 'ALL',
  moduleFilter: 'ALL',
  actionFilter: 'ALL',
  severityFilter: 'ALL',
  sort: 'newest',
  viewMode: 'table',
  visibleColumns: ['user', 'module', 'action', 'severity', 'resource', 'timestamp'],
  dateRange: defaultRange(),
}

const PREFS_KEY = 'supplierSecurityCenter:prefs'

function severityFor(action: string) {
  const value = action.toLowerCase()
  if (value.includes('delete') || value.includes('terminate') || value.includes('permission')) return 'High'
  if (value.includes('update') || value.includes('create') || value.includes('login')) return 'Medium'
  return 'Low'
}

export function useSupplierSecurity() {
  const { user, isBiometricEnabled } = useAuth()
  const [prefs, setPrefsState] = useState<SecurityPrefs>(defaultPrefs)
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([])
  const [positions, setPositions] = useState<any[]>([])
  const [sessions, setSessions] = useState<SecuritySession[]>([])
  const [devices, setDevices] = useState<TrustedDevice[]>([])
  const [biometricEnabled, setBiometricEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const saved = await AsyncStorage.getItem(PREFS_KEY)
      if (saved) setPrefsState({ ...defaultPrefs, ...JSON.parse(saved) })
    })().catch((e) => __DEV__ && console.error('security prefs load error', e))
  }, [])

  const setPrefs = useCallback((next: Partial<SecurityPrefs>) => {
    setPrefsState((current) => {
      const merged = { ...current, ...next }
      AsyncStorage.setItem(PREFS_KEY, JSON.stringify(merged)).catch((e) => __DEV__ && console.error(e))
      return merged
    })
  }, [])

  const load = useCallback(async () => {
    if (!user?.orgId) {
      setLoading(false)
      return
    }
    try {
      setError(null)
      const [logs, rbac, activeSessions, trustedDevices, bio] = await Promise.all([
        AuditService.getLogs(user.orgId, {
          dateFrom: prefs.dateRange.startDate,
          dateTo: prefs.dateRange.endDate,
        }, { page: 1, pageSize: 250 }),
        PositionService.getAll(),
        SecurityService.getActiveSessions(),
        SecurityService.getTrustedDevices(),
        isBiometricEnabled().catch(() => false),
      ])
      setAuditLogs(logs ?? [])
      setPositions(rbac ?? [])
      setSessions(activeSessions)
      setDevices(trustedDevices)
      setBiometricEnabled(Boolean(bio))
    } catch (e: any) {
      setError(e?.message ?? 'Unable to load security center.')
      if (__DEV__) console.error('useSupplierSecurity load error', e)
    } finally {
      setLoading(false)
    }
  }, [isBiometricEnabled, prefs.dateRange.endDate, prefs.dateRange.startDate, user?.orgId])

  useEffect(() => { load() }, [load])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  const terminateSession = useCallback(async (id: string) => {
    await SecurityService.terminateSession(id)
    setSessions(await SecurityService.getActiveSessions())
  }, [])

  const removeTrustedDevice = useCallback(async (id: string) => {
    await SecurityService.removeTrustedDevice(id)
    setDevices(await SecurityService.getTrustedDevices())
  }, [])

  const filteredAuditLogs = useMemo(() => {
    const query = prefs.search.trim().toLowerCase()
    const start = new Date(prefs.dateRange.startDate).getTime()
    const end = new Date(prefs.dateRange.endDate).getTime()
    const rows = auditLogs.filter((row) => {
      const t = new Date(row.createdAt).getTime()
      const severity = severityFor(row.action)
      const haystack = `${row.user?.fullname ?? ''} ${row.user?.email ?? ''} ${row.pageKey ?? ''} ${row.action} ${row.recordType ?? ''}`.toLowerCase()
      return t >= start && t <= end
        && (!query || haystack.includes(query))
        && (prefs.userFilter === 'ALL' || String(row.userId) === prefs.userFilter)
        && (prefs.moduleFilter === 'ALL' || row.pageKey === prefs.moduleFilter)
        && (prefs.actionFilter === 'ALL' || row.action === prefs.actionFilter)
        && (prefs.severityFilter === 'ALL' || severity === prefs.severityFilter)
    })
    return rows.sort((a, b) => prefs.sort === 'oldest' ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [auditLogs, prefs])

  const users = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>()
    auditLogs.forEach((row) => {
      if (row.userId) map.set(String(row.userId), { id: String(row.userId), name: row.user?.fullname ?? row.user?.email ?? `User ${row.userId}` })
    })
    positions.forEach((position) => position.users?.forEach((u: any) => map.set(String(u.id), { id: String(u.id), name: u.fullname ?? `User ${u.id}` })))
    return [...map.values()]
  }, [auditLogs, positions])

  const modules = useMemo(() => [...new Set(auditLogs.map((row) => row.pageKey).filter(Boolean))] as string[], [auditLogs])
  const actions = useMemo(() => [...new Set(auditLogs.map((row) => row.action).filter(Boolean))] as string[], [auditLogs])
  const today = new Date().toDateString()
  const auditToday = auditLogs.filter((row) => new Date(row.createdAt).toDateString() === today).length
  const failedLogins = auditLogs.filter((row) => row.action.toLowerCase().includes('failed')).length
  const lockedAccounts = auditLogs.filter((row) => row.action.toLowerCase().includes('locked')).length
  const hasAudit = auditLogs.length > 0
  const hasRbac = positions.some((p) => p.permissions?.length)
  const scoreItems = [hasAudit, hasRbac, biometricEnabled, devices.length > 0, sessions.length > 0, lockedAccounts === 0]
  const securityScore = Math.round((scoreItems.filter(Boolean).length / scoreItems.length) * 100)

  return {
    prefs,
    setPrefs,
    loading,
    refreshing,
    error,
    refresh,
    auditLogs: filteredAuditLogs,
    rawAuditLogs: auditLogs,
    positions,
    sessions,
    devices,
    users,
    modules,
    actions,
    biometricEnabled,
    terminateSession,
    removeTrustedDevice,
    severityFor,
    kpis: {
      securityScore,
      activeSessions: sessions.filter((s) => s.status === 'ACTIVE').length,
      auditToday,
      failedLogins,
      lockedAccounts,
      usersWith2fa: biometricEnabled ? 1 : 0,
    },
    checklist: [
      { label: 'Business Verification', complete: true, detail: 'Verification workflow is available.' },
      { label: 'Password Policy', complete: false, detail: 'Minimum length and rotation policy can be configured.' },
      { label: 'Audit Logging', complete: hasAudit, detail: hasAudit ? 'Audit log events are being captured.' : 'No audit events in range.' },
      { label: 'Two-Factor Authentication', complete: biometricEnabled, detail: 'Placeholder until organization-wide 2FA ships.' },
      { label: 'Weak Password Warnings', complete: false, detail: 'Password strength guidance is shown in Security Center.' },
      { label: 'Inactive Users', complete: users.length > 0, detail: 'Review users with no recent audit activity.' },
    ],
    alerts: [
      ...(failedLogins ? [{ title: 'Failed login attempts detected', severity: 'High', message: `${failedLogins} failed attempts in the selected period.` }] : []),
      ...(lockedAccounts ? [{ title: 'Locked accounts require review', severity: 'High', message: `${lockedAccounts} account lock event(s) found.` }] : []),
      ...(!biometricEnabled ? [{ title: 'Two-factor authentication is not enabled', severity: 'Medium', message: '2FA is planned; biometric sign-in can be enabled per device today.' }] : []),
    ],
  }
}
