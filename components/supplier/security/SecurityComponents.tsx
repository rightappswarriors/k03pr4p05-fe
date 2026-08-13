import React from 'react'
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import {
  CheckCircle2,
  CircleAlert,
  Laptop,
  Lock,
  ShieldCheck,
  Smartphone,
  X,
} from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { useResponsive } from '@/hooks/useResponsive'
import type { AuditLogRow } from '@/hooks/useSupplierSecurity'
import type { SecuritySession, TrustedDevice } from '@/services/securityService'

export const formatDateTime = (value: string) => new Date(value).toLocaleString()

export function SecuritySectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const { colors } = useTheme()
  return (
    <View style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 15, padding: 14, gap: 12 }}>
      <View>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '900' }}>{title}</Text>
        {subtitle ? <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700', marginTop: 2 }}>{subtitle}</Text> : null}
      </View>
      {children}
    </View>
  )
}

export function SecurityEmptyState({ title, message }: { title: string; message: string }) {
  const { colors } = useTheme()
  return (
    <View style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 15, padding: 18, alignItems: 'center', gap: 5 }}>
      <Text style={{ color: colors.text, fontWeight: '900', fontSize: 15 }}>{title}</Text>
      <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 12 }}>{message}</Text>
    </View>
  )
}

function SecurityDataTable({ columns, rows, emptyState }: { columns: Array<{ label: string; width: number }>; rows: Array<{ key: string; cells: React.ReactNode[] }>; emptyState?: React.ReactNode }) {
  const { colors } = useTheme()
  if (!rows.length) return <>{emptyState}</>
  return (
    <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, overflow: 'hidden' }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ minWidth: columns.reduce((sum, col) => sum + col.width, 0) }}>
          <View style={{ flexDirection: 'row', backgroundColor: colors.background, paddingVertical: 10, paddingHorizontal: 12 }}>
            {columns.map((column) => <Text key={column.label} style={{ width: column.width, color: colors.textSecondary, fontSize: 12, fontWeight: '900' }}>{column.label}</Text>)}
          </View>
          {rows.map((row) => (
            <View key={row.key} style={{ flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 12, borderTopWidth: 1, borderColor: colors.border }}>
              {row.cells.map((cell, index) => <View key={`${row.key}-${index}`} style={{ width: columns[index]?.width ?? 120 }}>{cell}</View>)}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}

export function SecurityPill({ label, tone = '#2563EB' }: { label: string; tone?: string }) {
  return (
    <View style={{ borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, backgroundColor: `${tone}18`, alignSelf: 'flex-start' }}>
      <Text style={{ color: tone, fontSize: 11, fontWeight: '900' }}>{label}</Text>
    </View>
  )
}

export function SecurityScoreCard({ score }: { score: number }) {
  const { colors } = useTheme()
  const tone = score >= 80 ? '#16A34A' : score >= 60 ? '#F59E0B' : '#DC2626'
  return (
    <View style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 18, padding: 18, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 48, height: 48, borderRadius: 15, backgroundColor: `${tone}18`, alignItems: 'center', justifyContent: 'center' }}>
          <ShieldCheck size={24} color={tone} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>Security Score</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700' }}>Calculated from audit, RBAC, sessions, devices, and policy readiness.</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
        <Text style={{ color: colors.text, fontSize: 46, fontWeight: '900' }}>{score}</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 18, fontWeight: '900', marginBottom: 8 }}>/100</Text>
      </View>
      <View style={{ height: 10, borderRadius: 999, backgroundColor: colors.background, overflow: 'hidden' }}>
        <View style={{ width: `${score}%`, height: '100%', backgroundColor: tone, borderRadius: 999 }} />
      </View>
    </View>
  )
}

export function SecurityHealthChecklist({ items }: { items: Array<{ label: string; complete: boolean; detail: string }> }) {
  const { colors } = useTheme()
  return (
    <SecuritySectionCard title="Security Health Checklist" subtitle="Configuration items that influence your security score">
      <View style={{ gap: 10 }}>
        {items.map((item) => (
          <View key={item.label} style={{ flexDirection: 'row', gap: 10, padding: 10, borderRadius: 12, backgroundColor: colors.background }}>
            {item.complete ? <CheckCircle2 size={18} color="#16A34A" /> : <CircleAlert size={18} color="#F59E0B" />}
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '900' }}>{item.label}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>{item.detail}</Text>
            </View>
          </View>
        ))}
      </View>
    </SecuritySectionCard>
  )
}

export function AuditLogTable({
  logs,
  severityFor,
  onSelect,
}: {
  logs: AuditLogRow[]
  severityFor: (action: string) => string
  onSelect: (log: AuditLogRow) => void
}) {
  const { colors } = useTheme()
  const { isDesktop } = useResponsive()
  const tone = (severity: string) => severity === 'High' ? '#DC2626' : severity === 'Medium' ? '#F59E0B' : '#16A34A'

  if (!logs.length) return <SecurityEmptyState title="No audit events" message="Try widening the date range or clearing filters." />

  if (!isDesktop) {
    return (
      <View style={{ gap: 10 }}>
        {logs.map((log) => {
          const severity = severityFor(log.action)
          return (
            <TouchableOpacity key={log.id} onPress={() => onSelect(log)} style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 14, padding: 14, gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                <Text style={{ flex: 1, color: colors.text, fontWeight: '900' }}>{log.action}</Text>
                <SecurityPill label={severity} tone={tone(severity)} />
              </View>
              <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>{log.user?.fullname ?? 'System'} - {log.pageKey ?? log.recordType ?? 'General'}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{formatDateTime(log.createdAt)}</Text>
            </TouchableOpacity>
          )
        })}
      </View>
    )
  }

  return (
    <SecurityDataTable
      columns={[
        { label: 'User', width: 210 },
        { label: 'Module', width: 150 },
        { label: 'Action', width: 190 },
        { label: 'Severity', width: 100 },
        { label: 'Resource', width: 170 },
        { label: 'Timestamp', width: 180 },
      ]}
      rows={logs.map((log) => {
        const severity = severityFor(log.action)
        return {
          key: log.id,
          cells: [
            <TouchableOpacity onPress={() => onSelect(log)}><Text style={{ color: colors.text, fontWeight: '900' }}>{log.user?.fullname ?? 'System'}</Text></TouchableOpacity>,
            <Text style={{ color: colors.textSecondary, fontWeight: '800' }}>{log.pageKey ?? 'General'}</Text>,
            <Text style={{ color: colors.text, fontWeight: '900' }}>{log.action}</Text>,
            <SecurityPill label={severity} tone={tone(severity)} />,
            <Text style={{ color: colors.textSecondary, fontWeight: '800' }}>{log.recordType ?? '-'} {log.recordId ?? ''}</Text>,
            <Text style={{ color: colors.textSecondary, fontWeight: '800' }}>{formatDateTime(log.createdAt)}</Text>,
          ],
        }
      })}
      emptyState={null}
    />
  )
}

export function AuditTimelineDrawer({ log, onClose, severityFor }: { log: AuditLogRow | null; onClose: () => void; severityFor: (action: string) => string }) {
  const { colors } = useTheme()
  const { isDesktop, width } = useResponsive()
  const valueBlock = (label: string, value: any) => (
    <View style={{ gap: 6 }}>
      <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '900' }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 12, lineHeight: 18 }}>{value ? JSON.stringify(value, null, 2) : 'None'}</Text>
    </View>
  )
  return (
    <Modal visible={!!log} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.38)', flexDirection: 'row', justifyContent: 'flex-end' }}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
        <View style={{ width: isDesktop ? 540 : width, backgroundColor: colors.surface, borderLeftWidth: isDesktop ? 1 : 0, borderColor: colors.border }}>
          <View style={{ padding: 18, borderBottomWidth: 1, borderColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 20, fontWeight: '900' }}>{log?.action ?? 'Audit Event'}</Text>
              {log ? <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>{formatDateTime(log.createdAt)} - {severityFor(log.action)} severity</Text> : null}
            </View>
            <TouchableOpacity onPress={onClose}><X size={21} color={colors.textSecondary} /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }}>
            {log ? (
              <>
                <SecurityPill label={severityFor(log.action)} tone={severityFor(log.action) === 'High' ? '#DC2626' : '#F59E0B'} />
                {valueBlock('User', log.user ? `${log.user.fullname} (${log.user.email})` : 'System')}
                {valueBlock('Affected resource', `${log.recordType ?? 'Unknown'} ${log.recordId ?? ''}`)}
                {valueBlock('Old values', log.oldValue)}
                {valueBlock('New values', log.newValue)}
                {valueBlock('IP address', log.ipAddress)}
                {valueBlock('User agent', log.userAgent)}
              </>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

export function LoginActivityCard({ log }: { log: AuditLogRow }) {
  const { colors } = useTheme()
  return (
    <View style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 14, padding: 14, gap: 5 }}>
      <Text style={{ color: colors.text, fontWeight: '900' }}>{log.user?.fullname ?? 'System'}</Text>
      <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>{log.action}</Text>
      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{formatDateTime(log.createdAt)}</Text>
    </View>
  )
}

export function SessionCard({ session, onTerminate }: { session: SecuritySession; onTerminate: () => void }) {
  const { colors } = useTheme()
  return (
    <View style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 15, padding: 15, gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <Laptop size={22} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: '900' }}>{session.deviceName}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700' }}>{session.platform} - {session.location}</Text>
        </View>
        <SecurityPill label={session.current ? 'Current' : session.status} tone={session.current ? '#16A34A' : '#2563EB'} />
      </View>
      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Last active {formatDateTime(session.lastActiveAt)}</Text>
      <TouchableOpacity disabled={session.current} onPress={onTerminate} style={{ opacity: session.current ? 0.45 : 1, borderRadius: 10, paddingVertical: 9, alignItems: 'center', backgroundColor: '#FEE2E2' }}>
        <Text style={{ color: '#DC2626', fontWeight: '900' }}>{session.current ? 'Current session' : 'Terminate session'}</Text>
      </TouchableOpacity>
    </View>
  )
}

export function TrustedDeviceCard({ device, onRemove }: { device: TrustedDevice; onRemove: () => void }) {
  const { colors } = useTheme()
  return (
    <View style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 15, padding: 15, gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <Smartphone size={22} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: '900' }}>{device.deviceName}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700' }}>{device.platform} {device.osVersion}</Text>
        </View>
        {device.current ? <SecurityPill label="Current" tone="#16A34A" /> : null}
      </View>
      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Trusted {formatDateTime(device.trustedAt)}</Text>
      <TouchableOpacity disabled={device.current} onPress={onRemove} style={{ opacity: device.current ? 0.45 : 1, borderRadius: 10, paddingVertical: 9, alignItems: 'center', backgroundColor: colors.background }}>
        <Text style={{ color: colors.text, fontWeight: '900' }}>{device.current ? 'This device' : 'Forget device'}</Text>
      </TouchableOpacity>
    </View>
  )
}

export function RolePermissionMatrix({ positions }: { positions: any[] }) {
  const { colors } = useTheme()
  const pages = Array.from(new Map(positions.flatMap((p) => p.permissions ?? []).map((perm: any) => [perm.page?.key ?? perm.pageId, perm.page?.label ?? perm.page?.key ?? perm.pageId])).entries()).slice(0, 12)
  if (!positions.length) return <SecurityEmptyState title="No positions" message="Create positions in Master Files to manage access control." />
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ minWidth: 760, borderWidth: 1, borderColor: colors.border, borderRadius: 14, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', backgroundColor: colors.background, padding: 10 }}>
          <Text style={{ width: 180, color: colors.textSecondary, fontWeight: '900' }}>Position</Text>
          {pages.map(([key, label]) => <Text key={key} style={{ width: 140, color: colors.textSecondary, fontWeight: '900' }}>{label}</Text>)}
        </View>
        {positions.map((position) => (
          <View key={position.id} style={{ flexDirection: 'row', padding: 10, borderTopWidth: 1, borderColor: colors.border }}>
            <Text style={{ width: 180, color: colors.text, fontWeight: '900' }}>{position.name}</Text>
            {pages.map(([key]) => {
              const perm = position.permissions?.find((p: any) => (p.page?.key ?? p.pageId) === key)
              const label = perm?.canDelete ? 'CRUD' : perm?.canEdit ? 'Edit' : perm?.canCreate ? 'Create' : perm?.canView ? 'View' : '-'
              return <Text key={`${position.id}-${key}`} style={{ width: 140, color: perm?.canView ? '#16A34A' : colors.textSecondary, fontWeight: '900' }}>{label}</Text>
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  )
}

export function UserRoleSummary({ position }: { position: any }) {
  const { colors } = useTheme()
  const users = position.users?.length ?? 0
  const pages = position.permissions?.filter((p: any) => p.canView).length ?? 0
  return (
    <View style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 15, padding: 15, gap: 8 }}>
      <Text style={{ color: colors.text, fontWeight: '900', fontSize: 15 }}>{position.name}</Text>
      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{position.description || 'No description'}</Text>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <SecurityPill label={`${users} users`} tone="#2563EB" />
        <SecurityPill label={`${pages} pages`} tone="#16A34A" />
      </View>
    </View>
  )
}

export function SecurityAlertCard({ alert }: { alert: { title: string; severity: string; message: string } }) {
  const { colors } = useTheme()
  const tone = alert.severity === 'High' ? '#DC2626' : '#F59E0B'
  return (
    <View style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 15, padding: 15, gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <CircleAlert size={18} color={tone} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: '900' }}>{alert.title}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 3 }}>{alert.message}</Text>
        </View>
        <SecurityPill label={alert.severity} tone={tone} />
      </View>
    </View>
  )
}

export function PasswordStrengthMeter({ value }: { value: string }) {
  const { colors } = useTheme()
  const score = [value.length >= 10, /[A-Z]/.test(value), /\d/.test(value), /[^A-Za-z0-9]/.test(value)].filter(Boolean).length
  const pct = (score / 4) * 100
  const tone = score >= 3 ? '#16A34A' : score >= 2 ? '#F59E0B' : '#DC2626'
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Lock size={16} color={tone} />
        <Text style={{ color: colors.text, fontWeight: '900' }}>{score >= 3 ? 'Strong' : score >= 2 ? 'Moderate' : 'Weak'} password</Text>
      </View>
      <View style={{ height: 9, backgroundColor: colors.background, borderRadius: 999, overflow: 'hidden' }}>
        <View style={{ width: `${pct}%`, height: '100%', backgroundColor: tone, borderRadius: 999 }} />
      </View>
    </View>
  )
}
