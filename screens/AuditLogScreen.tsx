// screens/AuditLogScreen.tsx
// Audit Trail — owner-only screen to view all permission changes and actions

import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ChevronDown,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { AuditService } from '@/services/auditService';
import { HrService } from '@/services/hrService';

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
  user: {
    fullname: string;
  };
}

const AUDIT_ACTIONS = [
  'CREATE',
  'EDIT',
  'DELETE',
  'VIEW',
  'LOGIN',
  'LOGOUT',
  'PERMISSION_CHANGE',
] as const;

export default function AuditLogScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [filters, setFilters] = useState({
    userId: '',
    action: '',
    pageKey: '',
    dateFrom: '',
    dateTo: '',
  });
  const [staffOptions, setStaffOptions] = useState<{ id: string; fullname: string }[]>([]);
  const [actionOpen, setActionOpen] = useState(false);
  const [staffOpen, setStaffOpen] = useState(false);

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
      setStaffOptions(
        staff.map((item) => ({
          id: String(item.id),
          fullname: item.fullname || item.username || item.email || `User ${item.id}`,
        })),
      );
    } catch (error) {
      console.warn('Failed to load staff options for audit filters', error);
    }
  };

  const fetchLogs = async (nextPage = 1) => {
    setLoading(true);
    try {
      const auditLogs = await AuditService.getLogs(orgId, filters, {
        page: nextPage,
        pageSize,
      });
      setLogs(auditLogs);
      setHasMore(auditLogs.length === pageSize);
      setPage(nextPage);
    } catch (error) {
      console.warn('Failed to fetch audit logs', error);
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 40 },
    filters: { marginBottom: 16 },
    filterRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 12,
      color: colors.text,
      backgroundColor: colors.card,
    },
    selector: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 12,
      backgroundColor: colors.card,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    dropdown: {
      position: 'absolute',
      left: 16,
      right: 16,
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      maxHeight: 220,
      zIndex: 100,
    },
    dropdownItem: {
      padding: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    dropdownText: {
      color: colors.text,
    },
    logItem: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    logHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    logUser: { fontWeight: '700', color: colors.text },
    logAction: { color: colors.primary, fontWeight: '700' },
    logDetails: { marginTop: 10 },
    logText: { color: colors.textSecondary, fontSize: 13, marginBottom: 4 },
    loadMoreBtn: {
      marginTop: 12,
      borderRadius: 12,
      backgroundColor: colors.primary,
      paddingVertical: 14,
      alignItems: 'center',
    },
    loadMoreText: { color: '#fff', fontWeight: '700' },
    guard: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  });

  if (user?.role !== 'OWNER') {
    return (
      <View style={[styles.container, styles.guard]}>
        <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
          Audit logs are only available to the business owner.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 16 }}>
        Audit Log
      </Text>

      <View style={styles.filters}>
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={styles.selector}
            activeOpacity={0.85}
            onPress={() => setStaffOpen((open) => !open)}
          >
            <Text style={{ color: filters.userId ? colors.text : colors.textSecondary }}>
              {filters.userId ? `User ID: ${filters.userId}` : 'Filter by user'}
            </Text>
            <ChevronDown size={16} color={colors.textSecondary} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.selector}
            activeOpacity={0.85}
            onPress={() => setActionOpen((open) => !open)}
          >
            <Text style={{ color: filters.action ? colors.text : colors.textSecondary }}>
              {filters.action || 'Action'}
            </Text>
            <ChevronDown size={16} color={colors.textSecondary} strokeWidth={2} />
          </TouchableOpacity>
        </View>
        <View style={styles.filterRow}>
          <TextInput
            style={styles.input}
            placeholder="Page Key"
            placeholderTextColor={colors.textSecondary}
            value={filters.pageKey}
            onChangeText={(pageKey) => setFilters({ ...filters, pageKey })}
          />
          <TextInput
            style={styles.input}
            placeholder="Date From (YYYY-MM-DD)"
            placeholderTextColor={colors.textSecondary}
            value={filters.dateFrom}
            onChangeText={(dateFrom) => setFilters({ ...filters, dateFrom })}
          />
          <TextInput
            style={styles.input}
            placeholder="Date To (YYYY-MM-DD)"
            placeholderTextColor={colors.textSecondary}
            value={filters.dateTo}
            onChangeText={(dateTo) => setFilters({ ...filters, dateTo })}
          />
        </View>
      </View>

      {staffOpen && (
        <View style={styles.dropdown}>
          {staffOptions.map((staff) => (
            <TouchableOpacity
              key={staff.id}
              style={styles.dropdownItem}
              onPress={() => {
                setFilters({ ...filters, userId: staff.id });
                setStaffOpen(false);
              }}
            >
              <Text style={styles.dropdownText}>{staff.fullname}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.dropdownItem}
            onPress={() => {
              setFilters({ ...filters, userId: '' });
              setStaffOpen(false);
            }}
          >
            <Text style={[styles.dropdownText, { color: colors.error }]}>Clear user filter</Text>
          </TouchableOpacity>
        </View>
      )}

      {actionOpen && (
        <View style={styles.dropdown}>
          {AUDIT_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action}
              style={styles.dropdownItem}
              onPress={() => {
                setFilters({ ...filters, action });
                setActionOpen(false);
              }}
            >
              <Text style={styles.dropdownText}>{action}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.dropdownItem}
            onPress={() => {
              setFilters({ ...filters, action: '' });
              setActionOpen(false);
            }}
          >
            <Text style={[styles.dropdownText, { color: colors.error }]}>Clear action filter</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : logs.length === 0 ? (
        <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 24 }}>
          No audit entries found.
        </Text>
      ) : (
        <>
          {logs.map((log) => (
            <View key={log.id} style={styles.logItem}>
              <View style={styles.logHeader}>
                <Text style={styles.logUser}>{log.user.fullname}</Text>
                <Text style={styles.logAction}>{log.action}</Text>
              </View>
              <View style={styles.logDetails}>
                <Text style={styles.logText}>Page: {log.pageKey}</Text>
                <Text style={styles.logText}>Time: {new Date(log.createdAt).toLocaleString()}</Text>
                {log.recordId && <Text style={styles.logText}>Record ID: {log.recordId}</Text>}
                {log.recordType ? <Text style={styles.logText}>Type: {log.recordType}</Text> : null}
                {log.ipAddress && <Text style={styles.logText}>IP: {log.ipAddress}</Text>}
              </View>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}