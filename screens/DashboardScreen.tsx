// screens/DashboardScreen.tsx
// Full ERP Dashboard with:
//   - Date range picker (filters all charts + tables)
//   - Search/filter on expense summary
//   - Delete entry from journal
//   - CSV export

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';
import {
  BarChart2,
  Calendar,
  CheckCircle2,
  Download,
  FileText,
  Search,
  Trash2,
  X,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GISRow, SummaryRow } from '@/data/SummaryData';
import { useTheme } from '@/contexts/ThemeContext';
import StatCard from '@/components/erp/StatCard';
import ChartCard from '@/components/erp/ChartCard';
import {
  dashboardStats,
  financeData,
  inventoryDistribution,
  salesTrend,
  salesTrendByQuarter,
} from '@/data/erpMockData';
import { INITIAL_GIS_ROWS, INITIAL_SUMMARY_ROWS } from '@/data/SummaryData';
import {
  PAGE_SIZE,
  PaginationControls,
  TabKey,
  VIEW_MODE_KEY,
  ViewMode,
  ViewToggle,
} from '@/components/dashboardSummary/ViewToggle';
import {
  calcVatAndNet,
  formatPeso,
  formatPesoCompact,
  getResponsiveColumns,
} from '@/utils/moneyHelpers';
import {
  FinancialCard,
  FinancialCardData,
  FinancialDetailModal,
  GISTable,
  SkeletonFinancialCard,
  SkeletonTableRow,
  SummaryTable,
} from '@/components/dashboardSummary/SummaryTable';
import { DropdownField, s } from '@/app/(admin)';
import {
  ACCOUNT_TITLE_OPTIONS,
  VAT_TYPE_OPTIONS,
} from '@/components/dashboardSummary/AddingEntry';
import { ExportModal } from '@/components/dashboardSummary/ExportModal';

// ─── Constants ────────────────────────────────────────────────────────────────

const CENTER_DEPT_OPTIONS = [
  'Head Office',
  'Branch A',
  'Branch B',
  'Branch C',
  'Finance',
  'HR',
  'Operations',
  'IT',
];
const SUB_CENTER_OPTIONS = [
  'Accounting',
  'Payroll',
  'Procurement',
  'Sales',
  'Marketing',
  'Admin',
  'Audit',
  'Compliance',
];

const DATE_PRESETS = [
  'This Month',
  'Last Month',
  'Last 3 Months',
  'Last 6 Months',
  'This Year',
] as const;
type DatePreset = (typeof DATE_PRESETS)[number];

const CHART_RANGE_LABELS: Record<
  DatePreset,
  { labels: string[]; salesIdx: number[] }
> = {
  'This Month': { labels: ['W1', 'W2', 'W3', 'W4'], salesIdx: [0, 1, 2, 3] },
  'Last Month': { labels: ['W1', 'W2', 'W3', 'W4'], salesIdx: [0, 1, 2, 3] },
  'Last 3 Months': { labels: ['Jan', 'Feb', 'Mar'], salesIdx: [0, 1, 2] },
  'Last 6 Months': {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    salesIdx: [0, 1, 2, 3, 4, 5],
  },
  'This Year': { labels: ['Q1', 'Q2', 'Q3', 'Q4'], salesIdx: [0, 1, 2, 3] },
};

const fmt = (n: number) =>
  n >= 1_000_000
    ? `₱${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
      ? `₱${(n / 1_000).toFixed(0)}K`
      : `₱${n}`;

// ─── Form State ───────────────────────────────────────────────────────────────

interface FormState {
  orInvoice: string;
  centerDept: string;
  subCenter: string;
  vatType: string;
  amount: string;
  notes: string;
  requestedBy: string;
  accountTitle: string;
}

const EMPTY_FORM: FormState = {
  orInvoice: '',
  centerDept: '',
  subCenter: '',
  vatType: '',
  amount: '',
  notes: '',
  requestedBy: '',
  accountTitle: '',
};

// ─── Date Range Picker ────────────────────────────────────────────────────────

function DateRangePicker({
  selected,
  onSelect,
  colors,
}: {
  selected: DatePreset;
  onSelect: (p: DatePreset) => void;
  colors: any;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <TouchableOpacity
        style={[
          drp.trigger,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
      >
        <Calendar size={13} color={colors.primary} strokeWidth={2} />
        <Text style={[drp.triggerText, { color: colors.text }]}>
          {selected}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 11 }}>▾</Text>
      </TouchableOpacity>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableOpacity
          style={drp.backdrop}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View style={[drp.sheet, { backgroundColor: colors.surface }]}>
            <Text style={[drp.sheetTitle, { color: colors.textSecondary }]}>
              SELECT PERIOD
            </Text>
            {DATE_PRESETS.map((p) => (
              <TouchableOpacity
                key={p}
                style={[
                  drp.option,
                  { borderBottomColor: colors.border },
                  selected === p && { backgroundColor: colors.primary + '14' },
                ]}
                onPress={() => {
                  onSelect(p);
                  setOpen(false);
                }}
              >
                <Text
                  style={[
                    drp.optionText,
                    {
                      color: selected === p ? colors.primary : colors.text,
                      fontWeight: selected === p ? '700' : '500',
                    },
                  ]}
                >
                  {p}
                </Text>
                {selected === p && (
                  <Text style={{ color: colors.primary }}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const drp = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  triggerText: { fontSize: 13, fontWeight: '600' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 32,
  },
  sheet: { borderRadius: 14, overflow: 'hidden' },
  sheetTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    padding: 16,
    paddingBottom: 8,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  optionText: { fontSize: 14 },
});

// ─── Delete confirm ───────────────────────────────────────────────────────────

function DeleteConfirmModal({
  visible,
  onCancel,
  onConfirm,
  colors,
  description,
}: {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  colors: any;
  description: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={dcm.backdrop}>
        <View style={[dcm.card, { backgroundColor: colors.surface }]}>
          <View style={dcm.iconWrap}>
            <Trash2 size={28} color={colors.error} strokeWidth={1.5} />
          </View>
          <Text style={[dcm.title, { color: colors.text }]}>Delete Entry?</Text>
          <Text
            style={[dcm.sub, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {description}
          </Text>
          <View style={dcm.btnRow}>
            <TouchableOpacity
              style={[dcm.btn, { borderColor: colors.border }]}
              onPress={onCancel}
            >
              <Text style={[dcm.btnText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                dcm.btn,
                { backgroundColor: colors.error, borderColor: colors.error },
              ]}
              onPress={onConfirm}
            >
              <Text style={[dcm.btnText, { color: '#fff' }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const dcm = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 40,
  },
  card: { borderRadius: 16, padding: 24, alignItems: 'center' },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(239,68,68,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 17, fontWeight: '800', marginBottom: 8 },
  sub: { fontSize: 13, textAlign: 'center', marginBottom: 24, lineHeight: 18 },
  btnRow: { flexDirection: 'row', gap: 12, width: '100%' },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  btnText: { fontSize: 14, fontWeight: '700' },
});

// ─── CSV Export ───────────────────────────────────────────────────────────────

function exportGISToCSV(rows: GISRow[]): string {
  const header = 'Main,Group,Code,Description,Debit,Credit,Total\n';
  const body = rows
    .map((r) =>
      [
        r.main,
        r.group,
        r.code,
        `"${r.description}"`,
        r.debit,
        r.credit,
        r.total,
      ].join(','),
    )
    .join('\n');
  return header + body;
}

function exportSummaryToCSV(rows: SummaryRow[]): string {
  const header =
    'Item Code,Description,OpEx %,Computed Cost,Cost Contribution,Selling Price,Profit\n';
  const body = rows
    .map((r) => {
      const profit = r.sellingPrice - r.costContribution;
      return [
        r.itemCode,
        `"${r.description}"`,
        `${(r.opExPct * 100).toFixed(0)}%`,
        r.computedCost,
        r.costContribution,
        r.sellingPrice,
        profit,
      ].join(',');
    })
    .join('\n');
  return header + body;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const { colors, theme } = useTheme();
  const { width } = Dimensions.get('window');
  const isTablet = width >= 768;

  // ── State ────────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabKey>('expense');
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [gisRows, setGisRows] = useState<GISRow[]>(INITIAL_GIS_ROWS);
  const [summaryRows] = useState<SummaryRow[]>(INITIAL_SUMMARY_ROWS);
  const [datePreset, setDatePreset] = useState<DatePreset>('Last 6 Months');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<GISRow | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedCard, setSelectedCard] = useState<FinancialCardData | null>(
    null,
  );
  const [exportSuccess, setExportSuccess] = useState(false);

  const modalAnim = useRef(new Animated.Value(0)).current;
  const numColumns = getResponsiveColumns(width);
  const cardWidth = (width - 32) / numColumns;
  const chartWidth = isTablet
    ? Math.min((width - 280) * 0.95, 560)
    : width - 48;

  // ── Load persisted view mode ────────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(VIEW_MODE_KEY)
      .then((saved) => {
        if (saved === 'table' || saved === 'card')
          setViewMode(saved as ViewMode);
      })
      .catch(() => {});
  }, []);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    AsyncStorage.setItem(VIEW_MODE_KEY, mode).catch(() => {});
  }, []);

  // ── Chart data driven by date preset ─────────────────────────────────────────
  const chartData = useMemo(() => {
    const range = CHART_RANGE_LABELS[datePreset];
    const allSales = salesTrend.data;
    const allFinRev = financeData.revenueVsExpenses.revenue;
    const allFinExp = financeData.revenueVsExpenses.expenses;

    // Slice or derive based on preset
    const idxs = range.salesIdx;
    const salesData = idxs.map(
      (i) => (allSales[i] ?? allSales[allSales.length - 1]) / 1000,
    );
    const revData = idxs.map(
      (i) => (allFinRev[i] ?? allFinRev[allFinRev.length - 1]) / 1000,
    );
    const expData = idxs.map(
      (i) => (allFinExp[i] ?? allFinExp[allFinExp.length - 1]) / 1000,
    );

    return { labels: range.labels, salesData, revData, expData };
  }, [datePreset]);

  // ── Filtered dataset (search) ─────────────────────────────────────────────
  const activeDataset: FinancialCardData[] = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (activeTab === 'expense') {
      const filtered = q
        ? gisRows.filter(
            (r) =>
              r.description.toLowerCase().includes(q) ||
              r.group.toLowerCase().includes(q) ||
              r.code.toLowerCase().includes(q) ||
              r.main.toLowerCase().includes(q),
          )
        : gisRows;
      return filtered.map((r) => ({ type: 'gis' as const, row: r }));
    }
    const filtered = q
      ? summaryRows.filter(
          (r) =>
            r.description.toLowerCase().includes(q) ||
            r.itemCode.toLowerCase().includes(q),
        )
      : summaryRows;
    return filtered.map((r) => ({ type: 'summary' as const, row: r }));
  }, [activeTab, gisRows, summaryRows, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(activeDataset.length / PAGE_SIZE));

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSearchQuery('');
  };

  // When search changes, reset to page 1
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const pagedData = useMemo(
    () =>
      activeDataset.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE,
      ),
    [activeDataset, currentPage],
  );
  const pagedGISRows = useMemo(
    () =>
      gisRows
        .filter((r) => {
          const q = searchQuery.trim().toLowerCase();
          return (
            !q ||
            r.description.toLowerCase().includes(q) ||
            r.group.toLowerCase().includes(q) ||
            r.code.toLowerCase().includes(q)
          );
        })
        .slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [gisRows, searchQuery, currentPage],
  );
  const pagedSummaryRows = useMemo(
    () =>
      summaryRows
        .filter((r) => {
          const q = searchQuery.trim().toLowerCase();
          return (
            !q ||
            r.description.toLowerCase().includes(q) ||
            r.itemCode.toLowerCase().includes(q)
          );
        })
        .slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [summaryRows, searchQuery, currentPage],
  );

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = (row: GISRow) => setDeleteTarget(row);

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setGisRows((prev) => prev.filter((r) => r.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  // ── CSV Export ────────────────────────────────────────────────────────────
  const handleExport = () => {
    const csv =
      activeTab === 'expense'
        ? exportGISToCSV(gisRows)
        : exportSummaryToCSV(summaryRows);

    // In a real app use expo-file-system + expo-sharing:
    // await FileSystem.writeAsStringAsync(uri, csv);
    // await Sharing.shareAsync(uri);
    console.log('[CSV EXPORT]', csv);
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 2000);
  };

  // ── Card interaction ──────────────────────────────────────────────────────
  const handleCardPress = (data: FinancialCardData) => {
    setSelectedCard(data);
    setDetailModalVisible(true);
  };

  // ── Entry modal ───────────────────────────────────────────────────────────
  const openModal = () => {
    setSubmitSuccess(false);
    setModalVisible(true);
    Animated.spring(modalAnim, {
      toValue: 1,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();
  };

  const closeModal = () => {
    Animated.timing(modalAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setModalVisible(false);
      setForm(EMPTY_FORM);
    });
  };

  const handleSubmit = () => {
    const rawAmount = parseFloat(form.amount) || 0;
    const { net } = calcVatAndNet(rawAmount, form.vatType);
    const isIncome = form.accountTitle.startsWith('ACCOUNTS RECEIVABLE');
    const newRow: GISRow = {
      id: `g${Date.now()}`,
      main: isIncome ? 'Income' : 'Expenses',
      group: form.centerDept || 'General',
      code: form.orInvoice || `TXN-${Date.now().toString().slice(-5)}`,
      description: `${form.accountTitle} — ${form.notes || 'Entry'}`,
      debit: isIncome ? 0 : net,
      credit: isIncome ? net : 0,
      total: isIncome ? net : -net,
    };
    setGisRows((prev) => [newRow, ...prev]);
    setSubmitSuccess(true);
    setTimeout(() => closeModal(), 1400);
  };

  const modalTranslate = modalAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [80, 0],
  });
  const modalOpacity = modalAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  // ── Chart config ──────────────────────────────────────────────────────────
  const chartConfig = useMemo(
    () => ({
      backgroundColor: colors.card,
      backgroundGradientFrom: colors.card,
      backgroundGradientTo: colors.card,
      decimalPlaces: 0,
      color: (opacity = 1) =>
        theme === 'dark'
          ? `rgba(232, 119, 34, ${opacity})`
          : `rgba(27, 58, 107, ${opacity})`,
      labelColor: () => colors.textSecondary,
      propsForDots: { r: '4', strokeWidth: '2', stroke: colors.accent },
      propsForBackgroundLines: {
        strokeDasharray: '4,4',
        stroke: colors.border,
      },
    }),
    [colors, theme],
  );
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const revData = {
    labels: chartData.labels,
    datasets: [
      {
        data: chartData.revData,
        color: (o = 1) => `rgba(27, 58, 107, ${o})`,
        strokeWidth: 2,
      },
      {
        data: chartData.expData,
        color: (o = 1) => `rgba(232, 119, 34, ${o})`,
        strokeWidth: 2,
      },
    ],
    legend: ['Revenue (K)', 'Expenses (K)'],
  };

  // ─── Styles ────────────────────────────────────────────────────────────────
  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: 16, paddingBottom: 32 },
    // header row: section label + date picker
    rowBetween: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
      marginTop: 4,
    },
    sectionTitle: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 20,
    },
    statWrap: {
      width: isTablet ? undefined : '47.5%',
      flex: isTablet ? 1 : undefined,
      minWidth: isTablet ? 130 : undefined,
    },
    chartsRow: {
      flexDirection: isTablet ? 'row' : 'column',
      gap: 12,
      marginBottom: 4,
    },
    chartFlex: { flex: isTablet ? 1 : undefined },
    summaryRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 4,
      marginBottom: 8,
    },
    summaryCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    summaryValue: { fontSize: 15, fontWeight: '800', color: colors.text },
    summaryLabel: {
      fontSize: 10,
      color: colors.textSecondary,
      marginTop: 3,
      textAlign: 'center',
    },
    // search row inside toolbar
    toolbarFull: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 10,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    searchBox: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.background,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    searchInput: { flex: 1, fontSize: 13, color: colors.text },
    iconBtn: {
      padding: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    exportSuccess: {
      position: 'absolute',
      top: 60,
      alignSelf: 'center',
      backgroundColor: colors.success,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
    },
    exportSuccessText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  });

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* KEY METRICS */}
      <View style={styles.rowBetween}>
        <Text style={styles.sectionTitle}>Key Metrics</Text>
        <DateRangePicker
          selected={datePreset}
          onSelect={setDatePreset}
          colors={colors}
        />
      </View>
      <View style={styles.statsGrid}>
        <View style={styles.statWrap}>
          <StatCard
            label="Total Sales"
            value={fmt(dashboardStats.totalSales)}
            icon="sales"
            trend={dashboardStats.salesGrowth}
            trendUp
            accent
          />
        </View>
        <View style={styles.statWrap}>
          <StatCard
            label="Inventory Items"
            value={dashboardStats.inventoryItems}
            icon="inventory"
            trend={dashboardStats.inventoryChange}
            trendUp={false}
          />
        </View>
        <View style={styles.statWrap}>
          <StatCard
            label="Employees"
            value={dashboardStats.employees}
            icon="hr"
            trend={dashboardStats.employeeChange}
            trendUp
          />
        </View>
        <View style={styles.statWrap}>
          <StatCard
            label="Monthly Profit"
            value={fmt(dashboardStats.monthlyProfit)}
            icon="profit"
            trend={dashboardStats.profitGrowth}
            trendUp
          />
        </View>
      </View>

      {/* CHARTS */}
      <View style={styles.rowBetween}>
        <Text style={styles.sectionTitle}>Analytics</Text>
        <Text style={{ fontSize: 11, color: colors.textSecondary }}>
          {datePreset}
        </Text>
      </View>
      <View style={styles.chartsRow}>
        <View style={styles.chartFlex}>
          <ChartCard
            title="Sales Trend"
            subtitle={`Monthly revenue · ${datePreset}`}
          >
            <LineChart
              data={{
                labels: chartData.labels,
                datasets: [{ data: chartData.salesData }],
              }}
              width={chartWidth}
              height={180}
              chartConfig={chartConfig}
              bezier
              withInnerLines
              withOuterLines={false}
              style={{ borderRadius: 8, marginLeft: -16 }}
            />
          </ChartCard>
        </View>
        <View style={styles.chartFlex}>
          <ChartCard
            title="Inventory Distribution"
            subtitle="Units by product category"
          >
            <BarChart
              data={{
                labels: inventoryDistribution.labels,
                datasets: [{ data: inventoryDistribution.data }],
              }}
              width={chartWidth}
              height={180}
              chartConfig={{
                ...chartConfig,
                color: (o = 1) => `rgba(232, 119, 34, ${o})`,
              }}
              style={{ borderRadius: 8, marginLeft: -16 }}
              showValuesOnTopOfBars
              yAxisLabel=""
              yAxisSuffix=""
            />
          </ChartCard>
        </View>
      </View>

      {/* QUICK SUMMARY */}
      <Text style={[styles.sectionTitle, { marginBottom: 10 }]}>
        Quick Summary
      </Text>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{fmt(financeData.revenue)}</Text>
          <Text style={styles.summaryLabel}>Total Revenue</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{fmt(financeData.expenses)}</Text>
          <Text style={styles.summaryLabel}>Total Expenses</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: colors.success }]}>
            {fmt(financeData.profit)}
          </Text>
          <Text style={styles.summaryLabel}>Net Profit</Text>
        </View>
      </View>

      {/* REVENUE VS EXPENSES */}
      <ChartCard
        title="Revenue vs Expenses"
        subtitle={`6-month financial overview · ${datePreset}`}
      >
        <LineChart
          data={revData}
          width={isTablet ? chartWidth * 2 + 12 : chartWidth}
          height={200}
          chartConfig={chartConfig}
          bezier
          withInnerLines
          withOuterLines={false}
          style={{ borderRadius: 8, marginLeft: -16 }}
        />
      </ChartCard>

      {/* TABS */}
      <View
        style={[
          s.tabBar,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        {[
          {
            key: 'expense' as TabKey,
            label: 'Expense Summary',
            Icon: FileText,
          },
          {
            key: 'itemnet' as TabKey,
            label: 'Item Net Summary',
            Icon: BarChart2,
          },
        ].map(({ key, label, Icon }) => {
          const isActive = activeTab === key;
          return (
            <TouchableOpacity
              key={key}
              style={[
                s.tab,
                isActive && {
                  borderBottomColor: colors.primary,
                  borderBottomWidth: 2.5,
                },
              ]}
              onPress={() => handleTabChange(key)}
              activeOpacity={0.8}
            >
              <Icon
                size={15}
                color={isActive ? colors.primary : colors.textSecondary}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <Text
                style={[
                  s.tabLabel,
                  {
                    color: isActive ? colors.primary : colors.textSecondary,
                    fontWeight: isActive ? '700' : '500',
                  },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* TABLE / CARD AREA */}
      <ScrollView
        style={[s.tableArea, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* TOOLBAR: search + view toggle + export */}
        <View style={styles.toolbarFull}>
          <View style={styles.searchBox}>
            <Search size={13} color={colors.textSecondary} strokeWidth={2} />
            <TextInput
              style={styles.searchInput}
              placeholder={
                activeTab === 'expense' ? 'Search entries…' : 'Search items…'
              }
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={13} color={colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>
          <ViewToggle
            viewMode={viewMode}
            onChange={handleViewModeChange}
            colors={colors}
          />

          <TouchableOpacity
            style={[styles.iconBtn, { borderColor: colors.border }]}
            onPress={() => setExportModalOpen(true)}
            activeOpacity={0.8}
          >
            <Download size={15} color={colors.textSecondary} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* result count */}
        <View style={{ paddingHorizontal: 0, paddingTop: 8, paddingBottom: 4 }}>
          <Text style={{ fontSize: 11, color: colors.textSecondary }}>
            {activeDataset.length}{' '}
            {activeTab === 'expense' ? 'entries' : 'items'}
            {searchQuery ? ` matching "${searchQuery}"` : ''}
          </Text>
        </View>

        <View style={{ paddingTop: 12 }}>
          {viewMode === 'table' ? (
            activeTab === 'expense' ? (
              <GISTable
                rows={pagedGISRows}
                colors={colors}
                onDeleteRow={handleDelete}
              />
            ) : (
              <SummaryTable rows={pagedSummaryRows} colors={colors} />
            )
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {pagedData.map((item) => (
                <FinancialCard
                  key={item.type === 'gis' ? item.row.id : item.row.id}
                  data={item}
                  colors={colors}
                  cardWidth={cardWidth}
                  onPress={handleCardPress}
                  onDelete={
                    item.type === 'gis'
                      ? () => handleDelete(item.row as GISRow)
                      : undefined
                  }
                />
              ))}
            </View>
          )}
        </View>

        <PaginationControls
          page={currentPage}
          totalPages={totalPages}
          totalItems={activeDataset.length}
          onPrev={() => setCurrentPage((p) => Math.max(1, p - 1))}
          onNext={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          colors={colors}
        />
      </ScrollView>
      <ExportModal
        visible={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        gisRows={gisRows}
        summaryRows={summaryRows}
        defaultTab={activeTab}
        defaultDate={datePreset}
      />
      {/* NEW ENTRY BUTTON */}
      <TouchableOpacity
        style={[s.newEntryBtn, { backgroundColor: colors.primary }]}
        onPress={openModal}
        activeOpacity={0.88}
      >
        <FileText size={16} color="#fff" strokeWidth={2} />
        <Text style={s.newEntryBtnText}>New Entry</Text>
      </TouchableOpacity>

      {/* EXPORT SUCCESS TOAST */}
      {exportSuccess && (
        <View style={styles.exportSuccess} pointerEvents="none">
          <Text style={styles.exportSuccessText}>✓ Exported to CSV</Text>
        </View>
      )}

      {/* DETAIL MODAL */}
      <FinancialDetailModal
        visible={detailModalVisible}
        data={selectedCard}
        onClose={() => setDetailModalVisible(false)}
        colors={colors}
      />

      {/* DELETE CONFIRM */}
      <DeleteConfirmModal
        visible={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        colors={colors}
        description={deleteTarget?.description ?? ''}
      />

      {/* ENTRY MODAL */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={s.modalBackdrop}>
            <TouchableOpacity
              style={{ flex: 1 }}
              activeOpacity={1}
              onPress={closeModal}
            />
            <Animated.View
              style={[
                s.modalSheet,
                { backgroundColor: colors.surface },
                {
                  opacity: modalOpacity,
                  transform: [{ translateY: modalTranslate }],
                },
              ]}
            >
              <View
                style={[s.modalHandle, { backgroundColor: colors.border }]}
              />
              <View
                style={[s.modalHeader, { borderBottomColor: colors.border }]}
              >
                <Text style={[s.modalTitle, { color: colors.text }]}>
                  New Journal Entry
                </Text>
                <TouchableOpacity
                  onPress={closeModal}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <X size={20} color={colors.textSecondary} strokeWidth={2} />
                </TouchableOpacity>
              </View>

              {submitSuccess ? (
                <View style={s.successState}>
                  <CheckCircle2
                    size={52}
                    color={colors.success}
                    strokeWidth={1.5}
                  />
                  <Text style={[s.successText, { color: colors.text }]}>
                    Entry Added Successfully
                  </Text>
                  <Text style={[s.successSub, { color: colors.textSecondary }]}>
                    The entry has been posted to the Expense Summary.
                  </Text>
                </View>
              ) : (
                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={s.modalBody}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>
                    OR / Invoice No.
                  </Text>
                  <TextInput
                    style={[
                      s.input,
                      {
                        color: colors.text,
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                    placeholder="e.g. OR-2026-00123"
                    placeholderTextColor={colors.textSecondary}
                    value={form.orInvoice}
                    onChangeText={(v) =>
                      setForm((f) => ({ ...f, orInvoice: v }))
                    }
                  />

                  <View
                    style={{
                      flexDirection: isTablet ? 'row' : 'column',
                      gap: 12,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <DropdownField
                        label="Center / Dept"
                        value={form.centerDept}
                        options={CENTER_DEPT_OPTIONS}
                        onSelect={(v) =>
                          setForm((f) => ({ ...f, centerDept: v }))
                        }
                        colors={colors}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <DropdownField
                        label="Sub Center"
                        value={form.subCenter}
                        options={SUB_CENTER_OPTIONS}
                        onSelect={(v) =>
                          setForm((f) => ({ ...f, subCenter: v }))
                        }
                        colors={colors}
                      />
                    </View>
                  </View>

                  <DropdownField
                    label="VAT Type"
                    value={form.vatType}
                    options={VAT_TYPE_OPTIONS}
                    onSelect={(v) => setForm((f) => ({ ...f, vatType: v }))}
                    colors={colors}
                  />

                  <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>
                    Amount (₱)
                  </Text>
                  <TextInput
                    style={[
                      s.input,
                      {
                        color: colors.text,
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                    placeholder="0.00"
                    placeholderTextColor={colors.textSecondary}
                    value={form.amount}
                    onChangeText={(v) => setForm((f) => ({ ...f, amount: v }))}
                    keyboardType="decimal-pad"
                  />

                  {form.amount && form.vatType
                    ? (() => {
                        const { vat, net } = calcVatAndNet(
                          parseFloat(form.amount) || 0,
                          form.vatType,
                        );
                        return (
                          <View
                            style={[
                              s.vatPreview,
                              {
                                backgroundColor: colors.background,
                                borderColor: colors.border,
                              },
                            ]}
                          >
                            <View style={s.vatRow}>
                              <Text
                                style={[
                                  s.vatLabel,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                VAT Amount
                              </Text>
                              <Text
                                style={[s.vatValue, { color: colors.accent }]}
                              >
                                {formatPeso(vat)}
                              </Text>
                            </View>
                            <View style={s.vatRow}>
                              <Text
                                style={[
                                  s.vatLabel,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                Net Amount
                              </Text>
                              <Text
                                style={[s.vatValue, { color: colors.success }]}
                              >
                                {formatPeso(net)}
                              </Text>
                            </View>
                          </View>
                        );
                      })()
                    : null}

                  <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>
                    Notes
                  </Text>
                  <TextInput
                    style={[
                      s.input,
                      s.textarea,
                      {
                        color: colors.text,
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                    placeholder="Optional description…"
                    placeholderTextColor={colors.textSecondary}
                    value={form.notes}
                    onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />

                  <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>
                    Requested by Staff
                  </Text>
                  <TextInput
                    style={[
                      s.input,
                      {
                        color: colors.text,
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                    placeholder="Staff name"
                    placeholderTextColor={colors.textSecondary}
                    value={form.requestedBy}
                    onChangeText={(v) =>
                      setForm((f) => ({ ...f, requestedBy: v }))
                    }
                  />

                  <DropdownField
                    label="Account Title"
                    value={form.accountTitle}
                    options={ACCOUNT_TITLE_OPTIONS}
                    onSelect={(v) =>
                      setForm((f) => ({ ...f, accountTitle: v }))
                    }
                    colors={colors}
                    placeholder="Select account title…"
                  />

                  <TouchableOpacity
                    style={[
                      s.submitBtn,
                      {
                        backgroundColor: colors.primary,
                        opacity:
                          !form.amount || !form.vatType || !form.accountTitle
                            ? 0.5
                            : 1,
                      },
                    ]}
                    onPress={handleSubmit}
                    disabled={
                      !form.amount || !form.vatType || !form.accountTitle
                    }
                    activeOpacity={0.85}
                  >
                    <Text style={s.submitBtnText}>Add Entry</Text>
                  </TouchableOpacity>
                  <View style={{ height: 20 }} />
                </ScrollView>
              )}
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}
