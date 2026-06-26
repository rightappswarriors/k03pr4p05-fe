import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import {
  BadgePercent,
  Calendar,
  Download,
  Filter,
  Hash,
  RefreshCcw,
  Tag,
  User,
  X,
} from 'lucide-react-native';
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

// ─── Audit Row Detail Modal ───────────────────────────────────────────────────

interface AuditDetailModalProps {
  item: DiscountAuditRow | null;
  visible: boolean;
  onClose: () => void;
  colors: any;
}

function AuditDetailModal({ item, visible, onClose, colors }: AuditDetailModalProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!item) return null;

  const itemLabel = item.item?.name ?? item.customItemName ?? 'Custom item';
  const txId = item.transactionId ?? item.salesOrderId ?? item.kompraOrderId ?? '-';
  const isOverBnpcCap =
    isBnpc(item.discountType) &&
    Number(item.runningWeeklyBnpcTotal ?? 0) >= BNPC_WEEKLY_DISCOUNT_CAP;

  const DetailRow = ({
    icon,
    label,
    value,
    valueColor,
  }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    valueColor?: string;
  }) => (
    <View style={modalStyles.detailRow}>
      <View style={modalStyles.detailIconLabel}>
        {icon}
        <Text style={[modalStyles.detailLabel, { color: colors.textSecondary }]}>{label}</Text>
      </View>
      <Text style={[modalStyles.detailValue, { color: valueColor ?? colors.text }]}>{value}</Text>
    </View>
  );

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[modalStyles.overlay, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[
            modalStyles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              opacity: fadeAnim,
              transform: [
                {
                  scale: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.95, 1],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Modal Header */}
          <View style={[modalStyles.cardHeader, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[modalStyles.cardTitle, { color: colors.text }]} numberOfLines={2}>
                {itemLabel}
              </Text>
              <View style={[modalStyles.typeBadge, { backgroundColor: colors.primary + '18' }]}>
                <Text style={[modalStyles.typeBadgeText, { color: colors.primary }]}>
                  {item.discountType}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[modalStyles.closeBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
              activeOpacity={0.7}
            >
              <X size={16} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* Modal Body */}
          <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
            <View style={modalStyles.cardBody}>

              <Text style={[modalStyles.sectionLabel, { color: colors.textSecondary }]}>
                TRANSACTION
              </Text>
              <DetailRow
                icon={<Hash size={13} color={colors.textSecondary} strokeWidth={2} />}
                label="Record ID"
                value={`#${txId}`}
              />
              <DetailRow
                icon={<Tag size={13} color={colors.textSecondary} strokeWidth={2} />}
                label="Type"
                value={item.transactionType}
              />
              <DetailRow
                icon={<Calendar size={13} color={colors.textSecondary} strokeWidth={2} />}
                label="Timestamp"
                value={new Date(item.createdAt).toLocaleString('en-PH')}
              />

              <View style={[modalStyles.divider, { backgroundColor: colors.border }]} />

              <Text style={[modalStyles.sectionLabel, { color: colors.textSecondary }]}>
                CUSTOMER & ITEM
              </Text>
              <DetailRow
                icon={<User size={13} color={colors.textSecondary} strokeWidth={2} />}
                label="Customer ID"
                value={item.customerId ?? '-'}
              />
              <DetailRow
                icon={<Tag size={13} color={colors.textSecondary} strokeWidth={2} />}
                label="Item ID"
                value={item.itemId ?? '-'}
              />
              <DetailRow
                icon={<Tag size={13} color={colors.textSecondary} strokeWidth={2} />}
                label="Item Name"
                value={itemLabel}
              />

              <View style={[modalStyles.divider, { backgroundColor: colors.border }]} />

              <Text style={[modalStyles.sectionLabel, { color: colors.textSecondary }]}>
                DISCOUNT DETAILS
              </Text>
              <DetailRow
                icon={<BadgePercent size={13} color={colors.textSecondary} strokeWidth={2} />}
                label="Discount Amount"
                value={money(item.discountAmount)}
                valueColor={colors.error}
              />
              {item.eligibleAmount != null && (
                <DetailRow
                  icon={<BadgePercent size={13} color={colors.textSecondary} strokeWidth={2} />}
                  label="Eligible Amount"
                  value={money(item.eligibleAmount)}
                />
              )}
              {isBnpc(item.discountType) && (
                <>
                  <DetailRow
                    icon={<BadgePercent size={13} color={colors.textSecondary} strokeWidth={2} />}
                    label="Running Weekly Total"
                    value={money(item.runningWeeklyBnpcTotal ?? item.discountAmount)}
                    valueColor={isOverBnpcCap ? colors.error : colors.text}
                  />
                  <View
                    style={[
                      modalStyles.complianceBanner,
                      {
                        backgroundColor: isOverBnpcCap
                          ? colors.error + '15'
                          : colors.success + '15',
                        borderColor: isOverBnpcCap ? colors.error + '40' : colors.success + '40',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        modalStyles.complianceText,
                        { color: isOverBnpcCap ? colors.error : colors.success },
                      ]}
                    >
                      {isOverBnpcCap
                        ? `Weekly cap of ${money(BNPC_WEEKLY_DISCOUNT_CAP)} reached`
                        : `Within weekly cap of ${money(BNPC_WEEKLY_DISCOUNT_CAP)}`}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 18,
    borderBottomWidth: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  cardBody: {
    padding: 18,
    gap: 2,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    gap: 12,
  },
  detailIconLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
    flex: 1,
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  complianceBanner: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  complianceText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function DiscountTrackingScreen() {
  const { colors } = useTheme();
  const [rows, setRows] = useState<DiscountAuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [discountType, setDiscountType] = useState<DiscountFilter>('ALL');
  const [transactionType, setTransactionType] = useState<TransactionFilter>('ALL');
  const [activeTab, setActiveTab] = useState<'compliance' | 'audit'>('compliance');
  const [selectedRow, setSelectedRow] = useState<DiscountAuditRow | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const { width: windowWidth } = useWindowDimensions();
  // 3-column grid on desktop web (≥1024px), 1 column everywhere else
  const numColumns = Platform.OS === 'web' && windowWidth >= 1024 ? 3 : 1;
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
    } catch (error: any) {
      if (__DEV__) console.error('Failed to load discount audits:', error);
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
      'Transaction Type', 'Record ID', 'Customer ID', 'Item ID',
      'Item Name', 'Custom Item Name', 'Discount Type', 'Discount Amount',
      'Eligible Amount', 'Running Weekly BNPC Total', 'Timestamp',
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
    const csv = [header, ...body].map((line) => line.map(csvCell).join(',')).join('\n');

    if (Platform.OS === 'web') {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `discount-audit-${Date.now()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const fileUri = `${FileSystem.documentDirectory}discount-audit-${Date.now()}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csv);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Export discount audit' });
      } else {
        Alert.alert('Export ready', `CSV saved to ${fileUri}`);
      }
    }
  };

  useEffect(() => { load(); }, []);

  // ── Weekly BNPC compliance aggregation ──────────────────────────────────────

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
      const current = map.get(key) ?? { key, customerId: customer, week, discountTotal: 0, eligibleTotal: 0 };
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

  // ── Audit row — tap opens modal ─────────────────────────────────────────────

  const openModal = (item: DiscountAuditRow) => {
    setSelectedRow(item);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    // delay clearing selectedRow so fade-out animation plays with data intact
    setTimeout(() => setSelectedRow(null), 200);
  };

  const renderAuditRow = ({ item }: { item: DiscountAuditRow }) => {
    const itemLabel = item.item?.name ?? item.customItemName ?? 'Custom item';
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => openModal(item)}
        activeOpacity={0.72}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>{itemLabel}</Text>
          <Text style={styles.rowMeta}>
            {item.transactionType} #{item.transactionId ?? item.salesOrderId ?? item.kompraOrderId ?? '-'} · Customer {item.customerId ?? '-'}
          </Text>
          <Text style={styles.rowMeta}>{new Date(item.createdAt).toLocaleString('en-PH')}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.discountType}>{item.discountType}</Text>
          <Text style={styles.amount}>-{money(item.discountAmount)}</Text>
          {isBnpc(item.discountType) && (
            <Text style={styles.rowMeta}>Weekly {money(item.runningWeeklyBnpcTotal ?? item.discountAmount)}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // ── Weekly compliance row (vertical list) ───────────────────────────────────

  const renderWeekRow = ({ item: week }: { item: typeof weeklyBnpc[0] }) => {
    const capReached = week.discountTotal >= BNPC_WEEKLY_DISCOUNT_CAP;
    const purchaseReached = week.eligibleTotal >= BNPC_WEEKLY_PURCHASE_LIMIT;
    const limitReached = capReached || purchaseReached;

    // Progress bar widths (clamped 0–100%)
    const purchasePct = Math.min((week.eligibleTotal / BNPC_WEEKLY_PURCHASE_LIMIT) * 100, 100);
    const discountPct = Math.min((week.discountTotal / BNPC_WEEKLY_DISCOUNT_CAP) * 100, 100);

    return (
      // In grid mode each item gets flex:1 with a small margin to form columns
      <View style={numColumns === 3 ? styles.complianceCardGrid : styles.complianceCard}>
        <View style={[
          styles.complianceCardInner,
          { borderColor: limitReached ? colors.error + '60' : colors.border },
        ]}>
          {/* Card top row */}
          <View style={styles.complianceCardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.complianceCustomer} numberOfLines={1}>{week.customerId}</Text>
              <Text style={styles.complianceWeek}>Week of {week.week}</Text>
            </View>
            <View style={[
              styles.complianceBadge,
              { backgroundColor: limitReached ? colors.error + '15' : colors.success + '15' }
            ]}>
              <Text style={[styles.complianceBadgeText, { color: limitReached ? colors.error : colors.success }]}>
                {limitReached ? 'Limit reached' : 'Within limit'}
              </Text>
            </View>
          </View>

          {/* Purchase progress */}
          <View style={styles.progressBlock}>
            <View style={styles.progressLabelRow}>
              <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>Purchase</Text>
              <Text style={[styles.progressValue, { color: colors.text }]}>
                {money(week.eligibleTotal)} / {money(BNPC_WEEKLY_PURCHASE_LIMIT)}
              </Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
              <View style={[
                styles.progressFill,
                {
                  width: `${purchasePct}%` as any,
                  backgroundColor: purchaseReached ? colors.error : colors.primary,
                }
              ]} />
            </View>
          </View>

          {/* Discount progress */}
          <View style={styles.progressBlock}>
            <View style={styles.progressLabelRow}>
              <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>Discount</Text>
              <Text style={[styles.progressValue, { color: colors.text }]}>
                {money(week.discountTotal)} / {money(BNPC_WEEKLY_DISCOUNT_CAP)}
              </Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
              <View style={[
                styles.progressFill,
                {
                  width: `${discountPct}%` as any,
                  backgroundColor: capReached ? colors.error : colors.primary,
                }
              ]} />
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Discount Tracking</Text>
          <Text style={styles.subtitle}>
            BNPC is enforced per store system unless a shared cross-store database exists.
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity style={styles.exportButton} onPress={exportCsv}>
            <Download size={16} color={colors.primary} />
            <Text style={[styles.applyText, { color: colors.primary }]}>Export CSV</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={load} disabled={loading}>
            {loading
              ? <ActivityIndicator color={colors.primary} />
              : <RefreshCcw size={18} color={colors.primary} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Filter bar — fixed height prevents web layout expansion on tab switch ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBarScroll}
        contentContainerStyle={styles.filterBar}
      >
        <Filter size={16} color={colors.textSecondary} />
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

      {/* ── Summary cards ── */}
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

      {/* ── Tabs ── */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'compliance' && styles.tabActive]}
          onPress={() => setActiveTab('compliance')}
        >
          <Text style={[styles.tabText, activeTab === 'compliance' && styles.tabTextActive]}>
            Weekly BNPC Compliance
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'audit' && styles.tabActive]}
          onPress={() => setActiveTab('audit')}
        >
          <Text style={[styles.tabText, activeTab === 'audit' && styles.tabTextActive]}>
            Discount Audit Trail
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Weekly BNPC Compliance — vertical FlatList ── */}
      {activeTab === 'compliance' && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Weekly BNPC Compliance</Text>
            <TouchableOpacity style={styles.exportButton} onPress={exportCsv}>
              <Download size={16} color={colors.primary} />
              <Text style={[styles.applyText, { color: colors.primary }]}>Export CSV</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={weeklyBnpc}
            keyExtractor={(w) => w.key}
            renderItem={renderWeekRow}
            key={numColumns} // forces remount when columns change so RN recalculates layout
            numColumns={numColumns}
            columnWrapperStyle={numColumns === 3 ? styles.gridRow : undefined}
            contentContainerStyle={{ paddingBottom: 28 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              !loading ? (
                <Text style={styles.emptyText}>No BNPC discounts found for these filters.</Text>
              ) : null
            }
          />
        </>
      )}

      {/* ── Discount Audit Trail ── */}
      {activeTab === 'audit' && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Discount Audit Trail</Text>
            <Text style={styles.subtitle}>{filteredRows.length} rows</Text>
          </View>
          <FlatList
            data={filteredRows}
            keyExtractor={(item) => item.id}
            renderItem={renderAuditRow}
            contentContainerStyle={{ paddingBottom: 28 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              !loading ? (
                <Text style={styles.emptyText}>No discount audit rows found.</Text>
              ) : null
            }
          />
        </>
      )}

      {/* ── Audit Detail Modal ── */}
      <AuditDetailModal
        item={selectedRow}
        visible={modalVisible}
        onClose={closeModal}
        colors={colors}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (colors: any) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background, padding: 16 },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 12,
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
    // ── Filter bar: explicit height on the ScrollView prevents web layout bloat ──
    // On web, a horizontal ScrollView without a height can expand vertically when
    // the parent layout changes (e.g. switching tabs). height: 48 locks it to one row.
    filterBarScroll: {
      flexShrink: 0,
      flexGrow: 0,
      height: 48,
      marginBottom: 10,
    },
    filterBar: {
      alignItems: 'center',
      gap: 8,
      paddingVertical: 6,
    },
    input: {
      minWidth: 130,
      height: 36,               // was 38
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 10,
      color: colors.text,
      fontSize: 13,
    },
    chip: {
      height: 32,               // was 34
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
      height: 34,
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
      gap: 6,
      backgroundColor: colors.surface,
    },
    // ── Summary: no fixed height, wraps naturally ──
    summary: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 12,
      flexWrap: 'wrap',
    },
    metric: {
      minWidth: 160,
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      backgroundColor: colors.surface,
      padding: 12,
    },
    metricLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
    metricValue: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 4 },
    tabBar: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tab: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderBottomWidth: 3,
      borderBottomColor: 'transparent',
    },
    tabActive: { borderBottomColor: colors.primary },
    tabText: { color: colors.textSecondary, fontSize: 14, fontWeight: '700' },
    tabTextActive: { color: colors.primary },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },

    // ── Compliance card — vertical, full-width ──────────────────────────────
    // Outer wrapper for single-column mode (just spacing, no visual border)
    complianceCard: {
      marginBottom: 10,
    },
    // Grid wrapper — each cell gets flex:1 with horizontal margin for gutters
    complianceCardGrid: {
      flex: 1,
      marginHorizontal: 5,
      marginBottom: 10,
    },
    // The actual card border/bg lives here in both modes (grid uses inner)
    complianceCardInner: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 10,
      backgroundColor: colors.surface,
      padding: 14,
    },
    // Row wrapper for columnWrapperStyle — adds outer horizontal padding
    gridRow: {
      marginHorizontal: -5, // cancel out the per-card marginHorizontal on the row edges
      marginBottom: 0,
    },
    complianceCardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 12,
      gap: 10,
    },
    complianceCustomer: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 2,
    },
    complianceWeek: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    complianceBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    complianceBadgeText: {
      fontSize: 11,
      fontWeight: '800',
    },
    progressBlock: { marginBottom: 10 },
    progressLabelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 5,
    },
    progressLabel: { fontSize: 11, fontWeight: '700' },
    progressValue: { fontSize: 11, fontWeight: '700' },
    progressTrack: {
      height: 6,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressFill: {
      height: 6,
      borderRadius: 3,
    },

    // ── Audit row ──────────────────────────────────────────────────────────
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