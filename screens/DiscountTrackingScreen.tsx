import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Download, Filter, RefreshCcw } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { AuditService, type DiscountAuditRow } from '@/services/auditService';
import { AuthService } from '@/services/authService';

type DiscountFilter =
  | 'ALL'
  | 'BNPC'
  | 'SeniorVATExempt'
  | 'BNPC_SENIOR_CITIZEN'
  | 'BNPC_PWD'
  | 'SENIOR_CITIZEN'
  | 'PWD';
type TransactionFilter = 'ALL' | 'Transaction' | 'SalesOrder' | 'KompraOrder';

const BNPC_WEEKLY_PURCHASE_LIMIT = 2500;
const BNPC_WEEKLY_DISCOUNT_CAP = 125;

function money(value?: number | null) {
  return `PHP ${Number(value ?? 0).toFixed(2)}`;
}

function weekKey(iso: string) {
  const date = new Date(iso);
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return start.toISOString().slice(0, 10);
}

function isBnpc(type: string) {
  return type === 'BNPC_SENIOR_CITIZEN' || type === 'BNPC_PWD';
}

function isSeniorVatExempt(type: string) {
  return type === 'SENIOR_CITIZEN' || type === 'PWD';
}

function matchesDiscountFilter(row: DiscountAuditRow, filter: DiscountFilter) {
  if (filter === 'ALL') return true;
  if (filter === 'BNPC') return isBnpc(row.discountType);
  if (filter === 'SeniorVATExempt') return isSeniorVatExempt(row.discountType);
  return row.discountType === filter;
}

function csvCell(value: unknown) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export default function DiscountTrackingScreen() {
  const { colors } = useTheme();
  const [rows, setRows] = useState<DiscountAuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [discountType, setDiscountType] = useState<DiscountFilter>('ALL');
  const [transactionType, setTransactionType] = useState<TransactionFilter>('ALL');

  const styles = useMemo(() => makeStyles(colors), [colors]);

  const load = async () => {
    const user = await AuthService.getCurrentUser();
    if (!user?.orgId) {
      Alert.alert('Organization required', 'No organization is linked to this user.');
      return;
    }

    setLoading(true);
    try {
      const serverDiscountType =
        discountType === 'BNPC' || discountType === 'SeniorVATExempt'
          ? undefined
          : discountType;
      const data = await AuditService.getDiscountAudits(user.orgId, {
        customerId: customerId.trim() || undefined,
        discountType: serverDiscountType,
        transactionType,
        dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
        dateTo: dateTo ? new Date(dateTo).toISOString() : undefined,
      });
      setRows(data);
    } catch (error) {
      console.error('Failed to load discount audits:', error);
      Alert.alert('Unable to load discounts', 'Please check the filters and try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredRows = useMemo(
    () => rows.filter((row) => matchesDiscountFilter(row, discountType)),
    [rows, discountType],
  );

  const exportCsv = async () => {
    const header = [
      'Transaction Type',
      'Record ID',
      'Customer ID',
      'Item ID',
      'Item Name',
      'Custom Item Name',
      'Discount Type',
      'Discount Amount',
      'Eligible Amount',
      'Running Weekly BNPC Total',
      'Timestamp',
    ];
    const body = filteredRows.map((row) => [
      row.transactionType,
      row.transactionId ?? row.salesOrderId ?? row.kompraOrderId ?? '',
      row.customerId ?? '',
      row.itemId ?? '',
      row.item?.name ?? '',
      row.customItemName ?? '',
      row.discountType,
      row.discountAmount,
      row.eligibleAmount ?? '',
      row.runningWeeklyBnpcTotal ?? '',
      row.createdAt,
    ]);
    const csv = [header, ...body]
      .map((line) => line.map(csvCell).join(','))
      .join('\n');
    const fileUri = `${FileSystem.documentDirectory}discount-audit-${Date.now()}.csv`;
    await FileSystem.writeAsStringAsync(fileUri, csv);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export discount audit',
      });
    } else {
      Alert.alert('Export ready', `CSV saved to ${fileUri}`);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const weeklyBnpc = useMemo(() => {
    const map = new Map<string, {
      key: string;
      customerId: string;
      week: string;
      discountTotal: number;
      eligibleTotal: number;
    }>();

    filteredRows.filter((row) => isBnpc(row.discountType)).forEach((row) => {
      const customer = row.customerId || 'Unregistered customer';
      const week = weekKey(row.createdAt);
      const key = `${customer}-${week}`;
      const current = map.get(key) ?? {
        key,
        customerId: customer,
        week,
        discountTotal: 0,
        eligibleTotal: 0,
      };
      current.discountTotal += Number(row.discountAmount ?? 0);
      current.eligibleTotal += Number(row.eligibleAmount ?? 0);
      map.set(key, current);
    });

    return Array.from(map.values()).sort((a, b) => b.week.localeCompare(a.week));
  }, [filteredRows]);

  const totals = useMemo(() => {
    return filteredRows.reduce(
      (acc, row) => {
        if (isBnpc(row.discountType)) acc.bnpc += Number(row.discountAmount ?? 0);
        if (isSeniorVatExempt(row.discountType)) acc.senior += Number(row.discountAmount ?? 0);
        acc.all += Number(row.discountAmount ?? 0);
        return acc;
      },
      { all: 0, bnpc: 0, senior: 0 },
    );
  }, [filteredRows]);

  const renderAuditRow = ({ item }: { item: DiscountAuditRow }) => {
    const itemLabel = item.item?.name ?? item.customItemName ?? 'Custom item';
    return (
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>{itemLabel}</Text>
          <Text style={styles.rowMeta}>
            {item.transactionType} #{item.transactionId ?? item.salesOrderId ?? item.kompraOrderId ?? '-'} - Customer {item.customerId ?? '-'}
          </Text>
          <Text style={styles.rowMeta}>{new Date(item.createdAt).toLocaleString('en-PH')}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.discountType}>{item.discountType}</Text>
          <Text style={styles.amount}>-{money(item.discountAmount)}</Text>
          {isBnpc(item.discountType) && (
            <Text style={styles.rowMeta}>
              Weekly {money(item.runningWeeklyBnpcTotal ?? item.discountAmount)}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Discount Tracking</Text>
          <Text style={styles.subtitle}>
            BNPC is enforced per store system unless a shared cross-store database exists.
          </Text>
        </View>
        <TouchableOpacity style={styles.iconButton} onPress={load} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.primary} /> : <RefreshCcw size={18} color={colors.primary} />}
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBar}>
        <Filter size={17} color={colors.textSecondary} />
        <TextInput
          style={styles.input}
          placeholder="Customer ID"
          placeholderTextColor={colors.textSecondary}
          value={customerId}
          onChangeText={setCustomerId}
        />
        <TextInput
          style={styles.input}
          placeholder="From YYYY-MM-DD"
          placeholderTextColor={colors.textSecondary}
          value={dateFrom}
          onChangeText={setDateFrom}
        />
        <TextInput
          style={styles.input}
          placeholder="To YYYY-MM-DD"
          placeholderTextColor={colors.textSecondary}
          value={dateTo}
          onChangeText={setDateTo}
        />
        {(['ALL', 'BNPC', 'SeniorVATExempt', 'BNPC_SENIOR_CITIZEN', 'BNPC_PWD', 'SENIOR_CITIZEN', 'PWD'] as DiscountFilter[]).map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.chip, discountType === type && styles.chipActive]}
            onPress={() => setDiscountType(type)}
          >
            <Text style={[styles.chipText, discountType === type && styles.chipTextActive]}>{type}</Text>
          </TouchableOpacity>
        ))}
        {(['ALL', 'Transaction', 'SalesOrder', 'KompraOrder'] as TransactionFilter[]).map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.chip, transactionType === type && styles.chipActive]}
            onPress={() => setTransactionType(type)}
          >
            <Text style={[styles.chipText, transactionType === type && styles.chipTextActive]}>{type}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.applyButton} onPress={load}>
          <Text style={styles.applyText}>Apply</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.summary}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Total Discounts</Text>
          <Text style={styles.metricValue}>{money(totals.all)}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>BNPC</Text>
          <Text style={styles.metricValue}>{money(totals.bnpc)}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Senior/PWD VAT Exempt</Text>
          <Text style={styles.metricValue}>{money(totals.senior)}</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Weekly BNPC Compliance</Text>
        <TouchableOpacity style={styles.exportButton} onPress={exportCsv}>
          <Download size={16} color={colors.primary} />
          <Text style={[styles.applyText, { color: colors.primary }]}>Export CSV</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weeklyTable}>
        {weeklyBnpc.length === 0 ? (
          <Text style={styles.emptyText}>No BNPC discounts found for these filters.</Text>
        ) : weeklyBnpc.map((week) => {
          const capReached = week.discountTotal >= BNPC_WEEKLY_DISCOUNT_CAP;
          const purchaseReached = week.eligibleTotal >= BNPC_WEEKLY_PURCHASE_LIMIT;
          return (
            <View key={week.key} style={styles.weekRow}>
              <Text style={styles.weekCell}>{week.customerId}</Text>
              <Text style={styles.weekCell}>{week.week}</Text>
              <Text style={styles.weekCell}>{money(week.eligibleTotal)} / {money(BNPC_WEEKLY_PURCHASE_LIMIT)}</Text>
              <Text style={styles.weekCell}>{money(week.discountTotal)} / {money(BNPC_WEEKLY_DISCOUNT_CAP)}</Text>
              <Text style={[styles.status, (capReached || purchaseReached) && styles.statusReached]}>
                {capReached || purchaseReached ? 'Limit reached' : 'Within limit'}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Discount Audit Trail</Text>
        <Text style={styles.subtitle}>{filteredRows.length} rows</Text>
      </View>
      <FlatList
        data={filteredRows}
        keyExtractor={(item) => item.id}
        renderItem={renderAuditRow}
        contentContainerStyle={{ paddingBottom: 28 }}
        ListEmptyComponent={!loading ? <Text style={styles.emptyText}>No discount audit rows found.</Text> : null}
      />
    </View>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, padding: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 3 },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterBar: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    marginBottom: 10,
  },
  input: {
    minWidth: 140,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    color: colors.text,
    fontSize: 13,
  },
  chip: {
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textSecondary, fontSize: 11, fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  applyButton: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  exportButton: {
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surface,
  },
  summary: { flexDirection: 'row', gap: 10, marginBottom: 14, flexWrap: 'wrap' },
  metric: {
    minWidth: 180,
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    padding: 12,
  },
  metricLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
  metricValue: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 5 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 8,
  },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  weeklyTable: { gap: 8, paddingBottom: 8 },
  weekRow: {
    minWidth: 720,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    padding: 10,
  },
  weekCell: { width: 150, color: colors.text, fontSize: 12, fontWeight: '600' },
  status: {
    width: 110,
    color: colors.success,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
  },
  statusReached: { color: colors.error },
  row: {
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    padding: 12,
    marginBottom: 8,
  },
  rowTitle: { color: colors.text, fontSize: 14, fontWeight: '800' },
  rowMeta: { color: colors.textSecondary, fontSize: 11, marginTop: 3 },
  discountType: { color: colors.primary, fontSize: 11, fontWeight: '800' },
  amount: { color: colors.error, fontSize: 14, fontWeight: '800', marginTop: 5 },
  emptyText: { color: colors.textSecondary, fontSize: 13, padding: 12 },
});
