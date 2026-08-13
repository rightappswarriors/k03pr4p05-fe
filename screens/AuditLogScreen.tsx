// screens/AuditLogScreen.tsx
// Audit Trail — owner-only screen to view all permission changes and actions

import React, { useMemo, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { ChevronDown, Clock, Filter, Globe, Hash, Info, Shield, User, X } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { AuditService } from '@/services/auditService';
import { HrService } from '@/services/hrService';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuditLog {
  id: string;
  userId: number;
  pageKey: string;
  action: 'CREATE' | 'EDIT' | 'DELETE' | 'VIEW' | 'LOGIN' | 'LOGOUT' | 'PERMISSION_CHANGE';
  recordId?: string;
  recordType?: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  user: { fullname: string };
}

const AUDIT_ACTIONS = [
  'CREATE', 'EDIT', 'DELETE', 'VIEW', 'LOGIN', 'LOGOUT', 'PERMISSION_CHANGE',
] as const;

// ─── Action config ────────────────────────────────────────────────────────────

const ACTION_CONFIG: Record<AuditLog['action'], { label: string; color: string; bg: string; border: string }> = {
  CREATE: { label: 'Create', color: '#059669', bg: '#D1FAE5', border: '#6EE7B7' },
  EDIT: { label: 'Edit', color: '#D97706', bg: '#FEF3C7', border: '#FCD34D' },
  DELETE: { label: 'Delete', color: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5' },
  VIEW: { label: 'View', color: '#2563EB', bg: '#DBEAFE', border: '#93C5FD' },
  LOGIN: { label: 'Login', color: '#7C3AED', bg: '#EDE9FE', border: '#C4B5FD' },
  LOGOUT: { label: 'Logout', color: '#6B7280', bg: '#F3F4F6', border: '#D1D5DB' },
  PERMISSION_CHANGE: { label: 'Permission', color: '#EA580C', bg: '#FFF7ED', border: '#FDBA74' },
};

// ─── ActionBadge ──────────────────────────────────────────────────────────────

function ActionBadge({ action, size = 'md' }: { action: AuditLog['action']; size?: 'sm' | 'md' | 'lg' }) {
  const cfg = ACTION_CONFIG[action] ?? ACTION_CONFIG.VIEW;
  const ph = size === 'sm' ? 6 : size === 'lg' ? 12 : 9;
  const pv = size === 'sm' ? 2 : size === 'lg' ? 5 : 3;
  const fs = size === 'sm' ? 10 : size === 'lg' ? 13 : 11;
  return (
    <View style={{ backgroundColor: cfg.bg, borderRadius: 99, paddingHorizontal: ph, paddingVertical: pv, borderWidth: 1, borderColor: cfg.border, alignSelf: 'flex-start' }}>
      <Text style={{ color: cfg.color, fontSize: fs, fontWeight: '700' }}>{cfg.label}</Text>
    </View>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function AuditDetailModal({ log, onClose, colors }: { log: AuditLog | null; onClose: () => void; colors: any }) {
  const { width } = useWindowDimensions();
  if (!log) return null;
  const cfg = ACTION_CONFIG[log.action] ?? ACTION_CONFIG.VIEW;
  const maxWidth = Math.min(width - 32, 640);

  function SectionLabel({ label }: { label: string }) {
    return (
      <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.8, marginBottom: 6, marginTop: 14 }}>
        {label}
      </Text>
    );
  }

  function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
    if (!value) return null;
    return (
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ width: 18, marginTop: 1 }}>{icon}</View>
        <Text style={{ fontSize: 12, color: colors.textSecondary, width: 90 }}>{label}</Text>
        <Text style={{ fontSize: 12, color: colors.text, fontWeight: '600', flex: 1 }}>{value}</Text>
      </View>
    );
  }

  function JsonBlock({ label, data }: { label: string; data: any }) {
    if (!data) return null;
    const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    return (
      <View style={{ marginTop: 6 }}>
        <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.8, marginBottom: 6 }}>{label}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator style={{ backgroundColor: colors.background, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontSize: 11, color: colors.text, padding: 10, fontFamily: Platform.select({ web: 'monospace', default: undefined }), lineHeight: 18 }}>
            {text}
          </Text>
        </ScrollView>
      </View>
    );
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
        <View style={{ width: '100%', maxWidth, backgroundColor: colors.card, borderRadius: 16, overflow: 'hidden', maxHeight: '88%' }}>
          {/* Header */}
          <View style={{ backgroundColor: cfg.bg, paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: cfg.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <ActionBadge action={log.action} size="lg" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }} numberOfLines={1}>{log.user.fullname}</Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>{new Date(log.createdAt).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', marginLeft: 10 }}>
              <X size={16} color={colors.textSecondary} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 28 }}>
            <SectionLabel label="DETAILS" />
            <View style={{ backgroundColor: colors.background, borderRadius: 10, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', paddingHorizontal: 4 }}>
              <InfoRow icon={<User size={14} color={colors.textSecondary} />} label="User" value={log.user.fullname} />
              <InfoRow icon={<Shield size={14} color={colors.textSecondary} />} label="Page" value={log.pageKey} />
              <InfoRow icon={<Hash size={14} color={colors.textSecondary} />} label="Record ID" value={log.recordId} />
              <InfoRow icon={<Info size={14} color={colors.textSecondary} />} label="Record Type" value={log.recordType} />
              <InfoRow icon={<Globe size={14} color={colors.textSecondary} />} label="IP Address" value={log.ipAddress} />
              <InfoRow icon={<Clock size={14} color={colors.textSecondary} />} label="Timestamp" value={new Date(log.createdAt).toLocaleString('en-PH')} />
            </View>

            {log.userAgent ? (
              <>
                <SectionLabel label="USER AGENT" />
                <View style={{ backgroundColor: colors.background, borderRadius: 8, borderWidth: 1, borderColor: colors.border, padding: 10 }}>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, lineHeight: 16 }}>{log.userAgent}</Text>
                </View>
              </>
            ) : null}

            {(log.oldValue || log.newValue) ? (
              <>
                <SectionLabel label="CHANGES" />
                <View style={{ gap: 10 }}>
                  <JsonBlock label="BEFORE" data={log.oldValue} />
                  <JsonBlock label="AFTER" data={log.newValue} />
                </View>
              </>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── DropdownSelect ───────────────────────────────────────────────────────────

function DropdownSelect({ value, placeholder, options, onSelect, colors }: {
  value: string;
  placeholder: string;
  options: { label: string; value: string }[];
  onSelect: (v: string) => void;
  colors: any;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={{ position: 'relative', flex: 1, zIndex: open ? 999 : 1 }}>
      <TouchableOpacity
        onPress={() => setOpen((v) => !v)}
        style={{ borderWidth: 1, borderColor: open ? colors.primary : colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        activeOpacity={0.8}
      >
        <Text style={{ fontSize: 13, color: selected ? colors.text : colors.textSecondary, flex: 1 }} numberOfLines={1}>
          {selected?.label ?? placeholder}
        </Text>
        <ChevronDown size={14} color={colors.textSecondary} />
      </TouchableOpacity>
      {open && (
        <>
          <Pressable style={{ position: 'fixed' as any, inset: 0, zIndex: 998 }} onPress={() => setOpen(false)} />
          <View style={{ position: 'absolute', top: 46, left: 0, right: 0, backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.border, zIndex: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 10, overflow: 'hidden' }}>
            <TouchableOpacity
              onPress={() => { onSelect(''); setOpen(false); }}
              style={{ paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border }}
            >
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>{placeholder}</Text>
            </TouchableOpacity>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => { onSelect(opt.value); setOpen(false); }}
                style={{ paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: value === opt.value ? colors.primary + '12' : 'transparent' }}
              >
                <Text style={{ fontSize: 13, color: value === opt.value ? colors.primary : colors.text, fontWeight: value === opt.value ? '700' : '400' }}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AuditLogScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [filters, setFilters] = useState({ userId: '', action: '', pageKey: '', dateFrom: '', dateTo: '' });
  const [staffOptions, setStaffOptions] = useState<{ id: string; fullname: string }[]>([]);

  const orgId = Number(user?.orgId || 0);
  const pageSize = 25;

  useEffect(() => {
    if (!user || !orgId) return;
    fetchStaffOptions();
    fetchLogs(1);
  }, [user?.id, orgId, filters]);

  const fetchStaffOptions = async () => {
    try {
      const staff = await HrService.getAllStaffs(orgId);
      setStaffOptions(staff.map((item) => ({
        id: String(item.id),
        fullname: item.fullname || item.username || item.email || `User ${item.id}`,
      })));
    } catch (error) {
      if (__DEV__) console.warn('Failed to load staff options for audit filters', error);
    }
  };

  const fetchLogs = async (nextPage = 1) => {
    setLoading(true);
    try {
      const auditLogs = await AuditService.getLogs(orgId, filters, { page: nextPage, pageSize });
      setLogs(auditLogs);
      setHasMore(auditLogs.length === pageSize);
      setPage(nextPage);
    } catch (error) {
      if (__DEV__) console.warn('Failed to fetch audit logs', error);
    } finally {
      setLoading(false);
    }
  };

  const activeFilterCount = [filters.userId, filters.action, filters.pageKey, filters.dateFrom, filters.dateTo].filter(Boolean).length;

  const actionCounts = useMemo(() => {
    const counts: Partial<Record<AuditLog['action'], number>> = {};
    logs.forEach((l) => { counts[l.action] = (counts[l.action] ?? 0) + 1; });
    return counts;
  }, [logs]);

  const staffSelectOptions = staffOptions.map((s) => ({ label: s.fullname, value: s.id }));
  const actionSelectOptions = AUDIT_ACTIONS.map((a) => ({ label: ACTION_CONFIG[a].label, value: a }));

  // Column widths
  const colUser = isDesktop ? 180 : 130;
  const colAction = 100;
  const colTime = isDesktop ? 160 : 130;
  const colBtn = 60;

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    toolbar: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border },
    filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: colors.card },
    filterBadge: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
    filterPanel: { marginHorizontal: 16, marginTop: 10, marginBottom: 4, backgroundColor: colors.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 10 },
    filterRow: { flexDirection: 'row', gap: 10 },
    input: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, backgroundColor: colors.card, fontSize: 13 },
    statsStrip: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8, maxHeight: 50 },
    statChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, maxHeight: 42 },
    tableHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.background },
    headerTxt: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6, color: colors.textSecondary },
    tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border },
    pageBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10, borderWidth: 1 },
  });

  if (user?.role !== 'OWNER') {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', gap: 12 }]}>
        <Shield size={40} color={colors.border} strokeWidth={1} />
        <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 14 }}>
          Audit logs are only available to the business owner.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* ── Toolbar ── */}
      <View style={styles.toolbar}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>Audit Log</Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 1 }}>
            {logs.length} entr{logs.length !== 1 ? 'ies' : 'y'}
            {activeFilterCount > 0 ? ` · ${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} active` : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, { borderColor: filterOpen ? colors.primary : colors.border, backgroundColor: filterOpen ? colors.primary + '12' : colors.card }]}
          onPress={() => setFilterOpen((v) => !v)}
        >
          <Filter size={15} color={filterOpen ? colors.primary : colors.textSecondary} strokeWidth={2} />
          <Text style={{ fontSize: 13, fontWeight: '600', color: filterOpen ? colors.primary : colors.textSecondary }}>Filters</Text>
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, { borderColor: colors.border }]}
          onPress={() => fetchLogs(1)}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>↻ Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* ── Filter panel ── */}
      {filterOpen && (
        <View style={styles.filterPanel}>
          <View style={styles.filterRow}>
            <DropdownSelect value={filters.userId} placeholder="All users" options={staffSelectOptions} onSelect={(userId) => setFilters({ ...filters, userId })} colors={colors} />
            <DropdownSelect value={filters.action} placeholder="All actions" options={actionSelectOptions} onSelect={(action) => setFilters({ ...filters, action })} colors={colors} />
          </View>
          <View style={styles.filterRow}>
            <TextInput style={styles.input} placeholder="Page key" placeholderTextColor={colors.textSecondary} value={filters.pageKey} onChangeText={(pageKey) => setFilters({ ...filters, pageKey })} />
            <TextInput style={styles.input} placeholder="Date from (YYYY-MM-DD)" placeholderTextColor={colors.textSecondary} value={filters.dateFrom} onChangeText={(dateFrom) => setFilters({ ...filters, dateFrom })} />
            <TextInput style={styles.input} placeholder="Date to (YYYY-MM-DD)" placeholderTextColor={colors.textSecondary} value={filters.dateTo} onChangeText={(dateTo) => setFilters({ ...filters, dateTo })} />
          </View>
          {activeFilterCount > 0 && (
            <TouchableOpacity
              onPress={() => setFilters({ userId: '', action: '', pageKey: '', dateFrom: '', dateTo: '' })}
              style={{ alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: colors.error + '60', backgroundColor: colors.error + '10' }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.error }}>Clear all filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Stats strip ── */}
      {logs.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={isDesktop ? true : false} style={{ flexGrow: 0 }} contentContainerStyle={styles.statsStrip}>
          {(Object.entries(actionCounts) as [AuditLog['action'], number][]).map(([action, count]) => {
            const cfg = ACTION_CONFIG[action] ?? ACTION_CONFIG.VIEW;
            return (
              <View key={action} style={[styles.statChip, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: cfg.color }} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: cfg.color }}>{cfg.label}</Text>
                <Text style={{ fontSize: 11, fontWeight: '800', color: cfg.color }}>{count}</Text>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* ── Content ── */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Loading audit entries…</Text>
        </View>
      ) : logs.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Shield size={44} color={colors.border} strokeWidth={1} />
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>No audit entries found</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Try adjusting your filters.</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Table header */}
          <View style={styles.tableHeader}>
            <View style={{ width: 3, marginRight: 8 }} />
            <View style={{ width: colUser }}><Text style={styles.headerTxt}>USER</Text></View>
            <View style={{ width: colAction }}><Text style={styles.headerTxt}>ACTION</Text></View>
            <View style={{ flex: 1 }}><Text style={styles.headerTxt}>PAGE · RECORD</Text></View>
            {isDesktop && <View style={{ width: 120 }}><Text style={styles.headerTxt}>IP ADDRESS</Text></View>}
            <View style={{ width: colTime, alignItems: 'flex-end' }}><Text style={styles.headerTxt}>TIME</Text></View>
            <View style={{ width: colBtn }} />
          </View>

          {/* Rows */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            {logs.map((log, index) => {
              const cfg = ACTION_CONFIG[log.action] ?? ACTION_CONFIG.VIEW;
              return (
                <Pressable
                  key={log.id}
                  // @ts-ignore
                  style={({ hovered }: any) => [
                    styles.tableRow,
                    { backgroundColor: hovered ? (colors.card) : index % 2 === 0 ? colors.background : colors.card },
                  ]}
                  onPress={() => setSelectedLog(log)}
                >
                  {/* Left color accent stripe */}
                  <View style={{ width: 3, alignSelf: 'stretch', backgroundColor: cfg.color, borderRadius: 2, marginRight: 8 }} />

                  {/* User */}
                  <View style={{ width: colUser }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }} numberOfLines={1}>{log.user.fullname}</Text>
                  </View>

                  {/* Action badge */}
                  <View style={{ width: colAction }}>
                    <ActionBadge action={log.action} size="sm" />
                  </View>

                  {/* Page + record */}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, fontFamily: Platform.select({ web: 'monospace', default: undefined }) }} numberOfLines={1}>
                      {log.pageKey}
                    </Text>
                    {(log.recordType || log.recordId) ? (
                      <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 1 }} numberOfLines={1}>
                        {[log.recordType, log.recordId].filter(Boolean).join(' · ')}
                      </Text>
                    ) : null}
                  </View>

                  {/* IP */}
                  {isDesktop && (
                    <View style={{ width: 120 }}>
                      <Text style={{ fontSize: 11, color: colors.textSecondary }} numberOfLines={1}>{log.ipAddress ?? '—'}</Text>
                    </View>
                  )}

                  {/* Time */}
                  <View style={{ width: colTime, alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                      {new Date(log.createdAt).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </Text>
                  </View>

                  {/* View button */}
                  <View style={{ width: colBtn, alignItems: 'flex-end' }}>
                    <TouchableOpacity
                      onPress={() => setSelectedLog(log)}
                      style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: colors.primary + '60', backgroundColor: colors.primary + '10' }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '600', color: colors.primary }}>View</Text>
                    </TouchableOpacity>
                  </View>
                </Pressable>
              );
            })}

            {/* Pagination */}
            <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', paddingVertical: 16 }}>
              {page > 1 && (
                <TouchableOpacity style={[styles.pageBtn, { borderColor: colors.border, backgroundColor: colors.card }]} onPress={() => fetchLogs(page - 1)}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>← Previous</Text>
                </TouchableOpacity>
              )}
              <View style={[styles.pageBtn, { borderColor: colors.primary + '40', backgroundColor: colors.primary + '10' }]}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>Page {page}</Text>
              </View>
              {hasMore && (
                <TouchableOpacity style={[styles.pageBtn, { borderColor: colors.border, backgroundColor: colors.card }]} onPress={() => fetchLogs(page + 1)}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Next →</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      )}

      {/* ── Detail Modal ── */}
      <AuditDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} colors={colors} />
    </View>
  );
}