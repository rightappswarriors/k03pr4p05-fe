// screens/DashboardScreen.tsx
// Full ERP Dashboard with:
//   - Date range picker (filters all charts + tables)
//   - Search/filter on expense summary
//   - Delete entry from journal
//   - CSV export
//   - Persisted last-used period (AsyncStorage)
//   - Custom date range via DateRangePickerModal
//   - Compact period picker + New Entry button on web
//   - Item Net Summary new entry with CatalogSearchModal

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
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
  Bell,
  Package,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { gql } from 'graphql-request';
import { getGraphQLClient } from '@/utils/constants';
import { AuthService } from '@/services/authService';
import { useTheme } from '@/contexts/ThemeContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Lock } from 'lucide-react-native';
import StatCard from '@/components/erp/StatCard';
import ChartCard from '@/components/erp/ChartCard';
import {
  InventoryService,
  SalesService,
  HrService,
  FinanceService,
} from '@/services';
import type { GISRow, SummaryRow } from '@/data/SummaryData';
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
  calVatAmount,
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
import { DropdownField } from '@/app/(erp)';
import { useAuth } from '@/contexts/AuthContext';
import DateRangePickerModal from '@/components/DateRangePickerModal';
import { CatalogSearchModal } from '@/components/CatalogSearchModal';
import type { CatalogItem, CostLine } from '@/types';
import { CenterService } from '@/services/centerService';
import { SubCenterService } from '@/services/subCenterService';
import { VatTypeService } from '@/services/vatTypeService';
import { MasterFileFinanceService } from '@/services/masterFileFinanceService';
import { autoCode } from '@/utils/autoCode';

// ─── Constants ────────────────────────────────────────────────────────────────
function getDateRange(
  preset: DatePreset,
  customStart?: Date | null,
  customEnd?: Date | null,
): { startDate: string; endDate: string } {
  const now = new Date();
  const endDate = new Date(now);
  endDate.setHours(23, 59, 59, 999);
  let startDate = new Date(now);

  switch (preset) {
    case 'This Month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'Last Month':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate.setTime(new Date(now.getFullYear(), now.getMonth(), 0).getTime());
      break;
    case 'Last 3 Months':
      startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      break;
    case 'Last 6 Months':
      startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      break;
    case 'This Year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    case 'Custom Range':
      return {
        startDate: (customStart ?? startDate).toISOString(),
        endDate: (customEnd ?? endDate).toISOString(),
      };
  }
  startDate.setHours(0, 0, 0, 0);
  return { startDate: startDate.toISOString(), endDate: endDate.toISOString() };
}

const DATE_PERIOD_KEY = 'dashboard_selected_period';

const DATE_PRESETS = [
  'This Month',
  'Last Month',
  'Last 3 Months',
  'Last 6 Months',
  'This Year',
  'Custom Range',
] as const;
type DatePreset = (typeof DATE_PRESETS)[number];

// ─── Dynamic chart range (replaces static CHART_RANGE_LABELS) ─────────────────
function getDynamicChartRange(preset: Exclude<DatePreset, 'Custom Range'>): {
  labels: string[];
  windowMonths: number;
  isWeekly: boolean;
} {
  const now = new Date();

  if (preset === 'This Month' || preset === 'Last Month') {
    return { labels: ['W1', 'W2', 'W3', 'W4'], windowMonths: 1, isWeekly: true };
  }

  if (preset === 'This Year') {
    return { labels: ['Q1', 'Q2', 'Q3', 'Q4'], windowMonths: 12, isWeekly: false };
  }

  // Last 3 Months or Last 6 Months — dynamically computed from today
  const count = preset === 'Last 3 Months' ? 3 : 6;
  const labels: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(d.toLocaleDateString('en-US', { month: 'short' }));
  }
  return { labels, windowMonths: count, isWeekly: false };
}

// NEW — only abbreviates at 100K+, full number below that
const fmt = (n: number) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}₱${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 100_000) return `${sign}₱${(abs / 1_000).toFixed(0)}K`;
  return `${sign}₱${abs.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

// NEW — full precise tooltip value
const fmtFull = (n: number) =>
  (n < 0 ? '-' : '') +
  '₱' +
  Math.abs(n).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

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

// ─── Item Net Summary Form State ──────────────────────────────────────────────

interface ItemNetFormState {
  selectedItem: CatalogItem | null;
  itemName: string;
  itemCode: string;
  accountTitleId: string;
  costInputAmount: string;
  costLines: CostLine[];
  newCostLineLabel: string;
  newCostLineAmount: string;
  costInputMode: 'VAT_EXCLUSIVE' | 'VAT_INCLUSIVE';
  description: string;
  vatType: string;
  centerId: string;
  subCenterId: string;
  opExPct: string;
  sellingPriceInput: string;
  sellingPriceInputMode: 'VAT_EXCLUSIVE' | 'VAT_INCLUSIVE';
}

const EMPTY_ITEM_NET_FORM: ItemNetFormState = {
  selectedItem: null,
  itemName: '',
  itemCode: '',
  accountTitleId: '',
  costInputAmount: '',
  costLines: [],
  newCostLineLabel: '',
  newCostLineAmount: '',
  costInputMode: 'VAT_EXCLUSIVE',
  description: '',
  vatType: '',
  centerId: '',
  subCenterId: '',
  opExPct: '',
  sellingPriceInput: '',
  sellingPriceInputMode: 'VAT_EXCLUSIVE',
};

// ─── Date Range Picker ────────────────────────────────────────────────────────

function DateRangePicker({
  selected,
  onSelect,
  colors,
  customLabel,
  isTablet,
}: {
  selected: DatePreset;
  onSelect: (p: DatePreset) => void;
  colors: any;
  customLabel?: string;
  isTablet: boolean;
}) {
  const [open, setOpen] = useState(false);

  const displayLabel =
    selected === 'Custom Range' && customLabel ? customLabel : selected;

  return (
    <View style={{ position: 'relative', zIndex: 999 }}>
      <TouchableOpacity
        style={[
          drp.trigger,
          isTablet && drp.triggerCompact,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.8}
      >
        <Calendar
          size={isTablet ? 11 : 13}
          color={colors.primary}
          strokeWidth={2}
        />
        <Text
          style={[
            drp.triggerText,
            isTablet && drp.triggerTextCompact,
            { color: colors.text },
          ]}
          numberOfLines={1}
        >
          {displayLabel}
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: isTablet ? 9 : 11,
          }}
        >
          ▾
        </Text>
      </TouchableOpacity>

      {open && isTablet ? (
        <View
          style={[
            drp.inlineSheet,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
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
                <Text style={{ color: colors.primary, fontSize: 11 }}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      ) : open && !isTablet ? (
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
                    selected === p && {
                      backgroundColor: colors.primary + '14',
                    },
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
      ) : null}
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
  triggerCompact: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
    maxWidth: 140,
  },
  triggerText: { fontSize: 13, fontWeight: '600' },
  triggerTextCompact: { fontSize: 11, fontWeight: '600' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 32,
  },
  sheet: { borderRadius: 14, overflow: 'hidden' },
  inlineSheet: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 4,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 160,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 1000,
  },
  sheetTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    padding: 12,
    paddingBottom: 6,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  optionText: { fontSize: 13 },
});

function SummaryCard({
  label,
  value,
  fullValue,
  valueColor,
  colors,
  tooltipId,
  tooltipVisible,
  setTooltipVisible,
  isTablet,
  onPressOut,
}: {
  label: string;
  value: string;
  fullValue: string;
  valueColor?: string;
  colors: any;
  tooltipId: string;
  tooltipVisible: string | null;
  setTooltipVisible: (id: string | null) => void;
  isTablet: boolean;
  onPressOut?: () => void;
}) {
  const showTip = tooltipVisible === tooltipId;
  return (
    <TouchableOpacity
      style={{
        flex: 1,
        backgroundColor: colors.card,
        borderRadius: 10,
        padding: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: showTip ? colors.primary : colors.border,
      }}
      onPress={() => setTooltipVisible(showTip ? null : tooltipId)}
      onLongPress={() => setTooltipVisible(tooltipId)}
      onPressOut={onPressOut}
      activeOpacity={0.85}
    >
      {showTip && (
        <View
          style={{
            position: 'absolute',
            ...(isTablet
              ? { top: '100%', marginTop: 6 }
              : { bottom: '100%', marginBottom: 6 }),
            alignSelf: 'center',
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 5,
            zIndex: 999,
            minWidth: 140,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 6,
            elevation: 6,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
            {fullValue}
          </Text>
        </View>
      )}
      <Text
        style={{
          fontSize: 15,
          fontWeight: '800',
          color: valueColor ?? colors.text,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontSize: 10,
          color: colors.textSecondary,
          marginTop: 3,
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatShortDate(d: Date): string {
  return d.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: '2-digit',
  });
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const { colors, theme } = useTheme();
  const { width } = Dimensions.get('window');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  const isTablet = width >= 768;

  const { limits } = useSubscription();

  const [datePreset, setDatePreset] = useState<DatePreset>('Last 6 Months');
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(DATE_PERIOD_KEY)
      .then((saved) => {
        if (saved && DATE_PRESETS.includes(saved as DatePreset)) {
          setDatePreset(saved as DatePreset);
        }
      })
      .catch(() => {});
  }, []);

  const handlePeriodSelect = (p: DatePreset) => {
    if (p === 'Custom Range') {
      setShowCustomPicker(true);
      return;
    }
    setDatePreset(p);
    AsyncStorage.setItem(DATE_PERIOD_KEY, p).catch(() => {});
  };

  const handleCustomApply = (start: Date, end: Date) => {
    setCustomStartDate(start);
    setCustomEndDate(end);
    setDatePreset('Custom Range');
    AsyncStorage.setItem(DATE_PERIOD_KEY, 'Custom Range').catch(() => {});
  };

  const customLabel =
    customStartDate && customEndDate
      ? `${formatShortDate(customStartDate)} – ${formatShortDate(customEndDate)}`
      : 'Custom Range';

  const [activeTab, setActiveTab] = useState<TabKey>(
    limits.canAccessExpenseSummary ? 'expense' : 'itemnet',
  );
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [gisRows, setGisRows] = useState<GISRow[]>([]);
  const [summaryRows, setSummaryRows] = useState<SummaryRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [dashboardStats, setDashboardStats] = useState({
    totalSales: 0,
    salesGrowth: 0,
    inventoryItems: 0,
    inventoryChange: 0,
    employees: 0,
    employeeChange: 0,
    monthlyProfit: 0,
    profitGrowth: 0,
  });

  const [inventoryDistribution, setInventoryDistribution] = useState({
    labels: [] as any[],
    data: [] as any[],
  });
  const [accountTitles, setAccountTitles] = useState<
    { id: string; label: string }[]
  >([]);
  const [vatTypes, setVatTypes] = useState<
    { id: string; label: string; rate: number }[]
  >([]);
  const [financeData, setFinanceData] = useState({
    revenue: 0,
    expenses: 0,
    profit: 0,
    revenueVsExpenses: {
      revenue: [] as number[],
      expenses: [] as number[],
    },
  });

  const [salesTrendData, setSalesTrendData] = useState<number[]>([]);
  const [isLoadingDashboardData, setIsLoadingDashboardData] = useState(true);

  // ── Expense Entry modal ───────────────────────────────────────────────────
  const [modalVisible, setModalVisible] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  // ── Item Net Summary modal ─────────────────────────────────────────────────
  const [itemNetModalVisible, setItemNetModalVisible] = useState(false);
  const [itemNetSubmitSuccess, setItemNetSubmitSuccess] = useState(false);
  const [itemNetForm, setItemNetForm] =
    useState<ItemNetFormState>(EMPTY_ITEM_NET_FORM);

  const itemNetPreview = useMemo(() => {
    const costLinesTotal = itemNetForm.costLines.reduce(
      (sum, line) => sum + (line.amount || 0),
      0,
    );
    const costInput =
      costLinesTotal > 0
        ? costLinesTotal
        : parseFloat(itemNetForm.costInputAmount) || 0;
    const selectedVatType = vatTypes.find(
      (v) => v.id === String(itemNetForm.vatType),
    );
    const rate = selectedVatType?.rate ?? 0;
    const baseCost =
      itemNetForm.costInputMode === 'VAT_INCLUSIVE'
        ? costInput / (1 + rate)
        : costInput;
    const vatInput =
      itemNetForm.costInputMode === 'VAT_INCLUSIVE'
        ? costInput - baseCost
        : baseCost * rate;

    const rawSellingPrice = itemNetForm.selectedItem?.sellingPrice
      ? parseFloat(itemNetForm.selectedItem.sellingPrice)
      : parseFloat(itemNetForm.sellingPriceInput) || 0;
    const sellingPrice =
      itemNetForm.sellingPriceInputMode === 'VAT_INCLUSIVE'
        ? rawSellingPrice / (1 + rate)
        : rawSellingPrice;
    const vatOutput =
      itemNetForm.sellingPriceInputMode === 'VAT_INCLUSIVE'
        ? rawSellingPrice - sellingPrice
        : sellingPrice * rate;

    const opExPct = (parseFloat(itemNetForm.opExPct) || 0) / 100;
    const opExAmount = sellingPrice * opExPct;
    const grossProfit = sellingPrice - baseCost;
    const netProfit = grossProfit - opExAmount;
    const status = netProfit >= 0 ? 'INCOME' : 'LOSS';
    const warning =
      sellingPrice < baseCost ? 'Selling price is lower than cost' : '';

    return {
      baseCost,
      vatInput,
      sellingPrice,
      vatOutput,
      opExPct,
      opExAmount,
      grossProfit,
      netProfit,
      status,
      warning,
      rawSellingPrice,
    };
  }, [itemNetForm, vatTypes]);

  const [showCatalogSearch, setShowCatalogSearch] = useState(false);
  const itemNetModalAnim = useRef(new Animated.Value(0)).current;
  const [deleteTarget, setDeleteTarget] = useState<GISRow | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<FinancialCardData | null>(
    null,
  );
  const [exportSuccess, setExportSuccess] = useState(false);

  const [centers, setCenters] = useState<{ id: string; label: string }[]>([]);
  const [subCenters, setSubCenters] = useState<{ id: string; label: string }[]>(
    [],
  );
  const modalAnim = useRef(new Animated.Value(0)).current;

  // ── Raw transactions ref — needed for chartData to recompute per preset ───
  const rawTransactionsRef = useRef<any[]>([]);

  const numColumns = getResponsiveColumns(width);
  const cardWidth = (width - 32) / numColumns;
  const chartWidth = isTablet
    ? Math.min((width - 280) * 0.95, 560)
    : width - 48;

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

  // ── buildSalesTrend: accepts windowMonths, anchors from today ─────────────
  const buildSalesTrend = (transactions: any[], windowMonths = 6): number[] => {
    const now = new Date();
    const months = Array.from({ length: windowMonths }, (_, i) => {
      const d = new Date(
        now.getFullYear(),
        now.getMonth() - (windowMonths - 1 - i),
        1,
      );
      return `${d.getFullYear()}-${d.getMonth() + 1}`;
    });

    return months.map((monthKey) => {
      const [year, month] = monthKey.split('-').map(Number);
      return transactions
        .filter((tx) => {
          const txDate = new Date(tx.createdAt ?? tx.date ?? 0);
          return (
            txDate.getFullYear() === year && txDate.getMonth() + 1 === month
          );
        })
        .reduce((sum, tx) => sum + Number(tx.total ?? tx.amount ?? 0), 0);
    });
  };

  // ── buildExpenseTrend: accepts windowMonths, anchors from today ───────────
  const buildExpenseTrend = (
    gisRows: any[],
    summaryRows: SummaryRow[] = [],
    windowMonths = 6,
  ): number[] => {
    const now = new Date();
    const months = Array.from({ length: windowMonths }, (_, i) => {
      const d = new Date(
        now.getFullYear(),
        now.getMonth() - (windowMonths - 1 - i),
        1,
      );
      return `${d.getFullYear()}-${d.getMonth() + 1}`;
    });

    return months.map((monthKey) => {
      const [year, month] = monthKey.split('-').map(Number);

      const gisExpense = gisRows
        .filter((row) => {
          const rowDate = new Date(row.createdAt ?? row.date ?? 0);
          return (
            rowDate.getFullYear() === year && rowDate.getMonth() + 1 === month
          );
        })
        .reduce((sum, row) => {
          const isIncome = String(row.main ?? '').toLowerCase() === 'income';
          if (isIncome) return sum;
          const raw = Number(row.debit ?? row.total ?? row.amount ?? 0);
          return sum + Math.abs(raw);
        }, 0);

      const summaryExpense = summaryRows
        .filter((row) => {
          const rowDate = new Date(row.createdAt ?? 0);
          return (
            rowDate.getFullYear() === year && rowDate.getMonth() + 1 === month
          );
        })
        .reduce((sum, row) => {
          const loss =
            Number(row.costContribution ?? 0) - Number(row.sellingPrice ?? 0);
          return sum + (loss > 0 ? loss : 0);
        }, 0);

      return gisExpense + summaryExpense;
    });
  };

  const { user } = useAuth();
  if (!user?.orgId) {
    return null;
  }

  const loadDashboardData = useCallback(async () => {
    if (!user?.orgId) return;
    setIsLoadingDashboardData(true);

    const { startDate, endDate } = getDateRange(
      datePreset,
      customStartDate,
      customEndDate,
    );

    try {
      const { accessToken } = await AuthService.getTokens();
      const client = await getGraphQLClient();
      const notifData = await client
        .request(
          GET_NOTIFICATIONS,
          {},
          { Authorization: `Bearer ${accessToken}` },
        )
        .catch(() => ({ getNotifications: [], getUnreadCount: 0 }));

      setNotifications(notifData.getNotifications ?? []);
      setUnreadCount(notifData.getUnreadCount ?? 0);

      const [
        transactions,
        accountTitles,
        centers,
        subCenters,
        gisData,
        summaryData,
        inventoryStats,
        staffData,
        vatTypesData,
      ] = await Promise.all([
        SalesService.getTransactionsByOrgId(startDate, endDate).catch(() => []),
        MasterFileFinanceService.getAccountTitles(),
        CenterService.getCenters(),
        SubCenterService.getAll(),
        FinanceService.getGISRows(startDate, endDate).catch(() => []),
        FinanceService.getSummaryRows(startDate, endDate).catch(() => []),
        InventoryService.getDashboardInventoryStats().catch(() => ({
          skuCount: 0,
          totalUnits: 0,
          categoryBreakdown: [],
        })),
        HrService.getAllStaffs(user.orgId).catch(() => []),
        VatTypeService.getAll().catch(() => [
          { id: 'default', label: 'Default', rate: 0 },
        ]),
      ]);

      // Store raw transactions so chartData can recompute for any preset
      rawTransactionsRef.current = transactions;

      setVatTypes(
        vatTypesData.map((v: any) => ({
          id: String(v.id),
          label: `${v.name} (%${v.rate * 100})`,
          rate: v.rate,
        })),
      );
      const totalSales = transactions.reduce(
        (sum, tx) => sum + Number(tx.total ?? 0),
        0,
      );
      const expenses = gisData.reduce((sum: number, row: any) => {
        const isIncome = String(row.main ?? '').toLowerCase() === 'income';
        if (isIncome) return sum;
        return (
          sum + Math.abs(Number(row.debit ?? row.total ?? row.amount ?? 0))
        );
      }, 0);
      const summaryExpenses = (summaryData ?? []).reduce(
        (sum: number, row: any) => {
          const loss =
            Number(row.costContribution ?? 0) - Number(row.sellingPrice ?? 0);
          return sum + (loss > 0 ? loss : 0);
        },
        0,
      );
      const totalExpenses = expenses + summaryExpenses;
      setAccountTitles(
        accountTitles.map((c: any) => ({
          id: String(c.id),
          label: c.label || c.name || c.title || String(c.id),
        })),
      );
      setSubCenters(
        subCenters.map((c: any) => ({ id: String(c.id), label: c.label })),
      );
      setCenters(
        centers.map((c: any) => ({ id: String(c.id), label: c.label })),
      );
      setDashboardStats({
        totalSales,
        salesGrowth: 0,
        inventoryItems: inventoryStats.skuCount,
        inventoryChange: 0,
        employees: staffData?.length ?? 0,
        employeeChange: 0,
        monthlyProfit: totalSales - totalExpenses,
        profitGrowth: 0,
      });
      setInventoryDistribution({
        labels: inventoryStats.categoryBreakdown.map((c: any) => c.name),
        data: inventoryStats.categoryBreakdown.map((c: any) => c.totalStock),
      });

      setFinanceData({
        revenue: totalSales,
        expenses: totalExpenses,
        profit: totalSales - totalExpenses,
        revenueVsExpenses: {
          revenue: buildSalesTrend(transactions),
          expenses: buildExpenseTrend(gisData, summaryData),
        },
      });

      setSalesTrendData(buildSalesTrend(transactions));

      setGisRows(
        (gisData ?? []).map((row: any, index: number) => ({
          id: String(row.id ?? `g-${index}`),
          main: row.main ?? 'Expenses',
          group: row.group ?? 'Finance',
          code: row.code ?? `GIS-${row.id ?? index}`,
          description: row.description ?? row.accountTitle ?? '',
          amount: Number(
            row.amount ?? row.debit ?? Math.abs(Number(row.total ?? 0)) ?? 0,
          ),
          debit: Number(row.debit ?? 0),
          credit: Number(row.credit ?? 0),
          total: Number(row.total ?? row.amount ?? 0),
          createdAt: row.createdAt,
        })),
      );

      setSummaryRows(
        (summaryData ?? []).map((row: any, index: number) => ({
          id: String(row.id ?? `s-${index}`),
          itemCode: row.itemCode ?? row.itemId ?? `S-${row.id ?? index}`,
          description:
            row.itemName ?? row.description ?? `Summary ${row.id ?? index}`,
          itemName: row.itemName,
          costLines: Array.isArray(row.costLines)
            ? row.costLines.map((line: any) => ({
                label: String(line?.label ?? ''),
                amount: Number(line?.amount ?? 0),
              }))
            : [],
          opExPct: Number(row.opExPct ?? 0),
          baseCost: Number(row.baseCost ?? 0),
          vatInput: Number(row.vatInput ?? 0),
          sellingPrice: Number(row.sellingPrice ?? 0),
          vatOutput: Number(row.vatOutput ?? 0),
          opExAmount: Number(row.opExAmount ?? 0),
          grossProfit: Number(row.grossProfit ?? 0),
          netProfit: Number(row.netProfit ?? 0),
          status: row.status ?? 'INCOME',
          computedCost: Number(row.computedCost ?? row.amount ?? 0),
          costContribution: Number(
            row.costContribution ?? (row.amount ?? 0) * 0.7,
          ),
          createdAt: row.createdAt,
        })),
      );
    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setIsLoadingDashboardData(false);
    }
  }, [datePreset, customStartDate, customEndDate, user?.orgId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const GET_NOTIFICATIONS = gql`
    query {
      getNotifications(limit: 20) {
        id
        type
        title
        message
        isRead
        createdAt
        outlet {
          id
          name
        }
        item {
          id
          name
        }
      }
      getUnreadCount
    }
  `;

  // ── chartData: fully dynamic, driven by getDynamicChartRange ─────────────
  const chartData = useMemo(() => {
    const presetKey =
      datePreset === 'Custom Range' ? 'Last 6 Months' : datePreset;
    const { labels, windowMonths, isWeekly } = getDynamicChartRange(
      presetKey as Exclude<DatePreset, 'Custom Range'>,
    );

    let salesData: number[];
    let revData: number[];
    let expData: number[];

    if (isWeekly) {
      // Weekly breakdown — placeholder zeros (sub-month data needs POS-level timestamps)
      salesData = [0, 0, 0, 0];
      revData = [0, 0, 0, 0];
      expData = [0, 0, 0, 0];
    } else if (presetKey === 'This Year') {
      // Quarterly buckets for the current calendar year
      const now = new Date();
      const year = now.getFullYear();
      const quarters = [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
        [10, 11, 12],
      ];
      salesData = quarters.map((months) =>
        rawTransactionsRef.current
          .filter((tx) => {
            const d = new Date(tx.createdAt ?? tx.date ?? 0);
            return (
              d.getFullYear() === year && months.includes(d.getMonth() + 1)
            );
          })
          .reduce((sum, tx) => sum + Number(tx.total ?? tx.amount ?? 0), 0),
      );
      revData = salesData;
      expData = quarters.map((months) =>
        gisRows
          .filter((row) => {
            const d = new Date(row.createdAt ?? 0);
            return (
              d.getFullYear() === year && months.includes(d.getMonth() + 1)
            );
          })
          .reduce((sum, row) => {
            if (String(row.main ?? '').toLowerCase() === 'income') return sum;
            return (
              sum +
              Math.abs(Number(row.debit ?? row.total ?? row.amount ?? 0))
            );
          }, 0),
      );
    } else {
      // Monthly window: Last 3 Months or Last 6 Months — anchored to today
      salesData = buildSalesTrend(rawTransactionsRef.current, windowMonths);
      revData = salesData;
      expData = buildExpenseTrend(gisRows, summaryRows, windowMonths);
    }

    const maxSales = Math.max(...salesData, 1);
    const maxFinance = Math.max(...revData, ...expData, 1);
    const salesScale = maxSales >= 1000 ? 1000 : 1;
    const finScale = maxFinance >= 1000 ? 1000 : 1;

    return {
      labels,
      salesData: salesData.map((v) =>
        parseFloat((v / salesScale).toFixed(2)),
      ),
      revData: revData.map((v) => parseFloat((v / finScale).toFixed(2))),
      expData: expData.map((v) => parseFloat((v / finScale).toFixed(2))),
      salesUnit: salesScale === 1000 ? 'K' : '₱',
      finUnit: finScale === 1000 ? 'K' : '₱',
    };
  }, [datePreset, gisRows, summaryRows]);

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

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await FinanceService.deleteGISRow(Number(deleteTarget.id));
    } catch (e) {
      console.error('Delete failed', e);
    }
    setGisRows((prev) => {
      const nextRows = prev.filter((r) => r.id !== deleteTarget.id);
      setFinanceData((prevFinance) => {
        const nextExpenses = nextRows.reduce(
          (sum, row) =>
            sum + Math.abs(Number(row.debit ?? row.total ?? row.amount ?? 0)),
          0,
        );
        const nextProfit = prevFinance.revenue - nextExpenses;
        setDashboardStats((prevStats) => ({
          ...prevStats,
          monthlyProfit: nextProfit,
        }));
        return {
          ...prevFinance,
          expenses: nextExpenses,
          profit: nextProfit,
          revenueVsExpenses: {
            ...prevFinance.revenueVsExpenses,
            expenses: buildExpenseTrend(nextRows),
          },
        };
      });
      return nextRows;
    });
    setDeleteTarget(null);
  };

  // ── CSV Export ────────────────────────────────────────────────────────────
  const handleExport = () => {
    const csv =
      activeTab === 'expense'
        ? exportGISToCSV(gisRows)
        : exportSummaryToCSV(summaryRows);
    console.log('[CSV EXPORT]', csv);
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 2000);
  };

  // ── Card interaction ──────────────────────────────────────────────────────
  const handleCardPress = (data: FinancialCardData) => {
    setSelectedCard(data);
    setDetailModalVisible(true);
  };

  // ── Expense Entry modal ───────────────────────────────────────────────────
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

  const handleSubmit = async () => {
    const rawAmount = parseFloat(form.amount) || 0;
    const selectedVatType = vatTypes.find((v) => v.id === String(form.vatType));
    const { vat } = calcVatAndNet(
      rawAmount,
      selectedVatType || String(form.vatType),
    );
    const totalAmount = rawAmount + vat;

    const selectedAccountTitle =
      accountTitles.find((t) => t.id === String(form.accountTitle))?.label ||
      String(form.accountTitle);
    const isIncome = selectedAccountTitle.startsWith('ACCOUNTS RECEIVABLE');

    const payload = {
      main: isIncome ? 'Income' : 'Expenses',
      group: form.centerDept || 'General',
      code: form.orInvoice || `TXN-${Date.now().toString().slice(-5)}`,
      description: `${selectedAccountTitle} — ${form.notes || 'Entry'}`,
      debit: isIncome ? 0 : totalAmount,
      credit: isIncome ? totalAmount : 0,
      centerId: parseInt(String(form.centerDept), 10) || 0,
      subCenterId: parseInt(String(form.subCenter), 10) || 0,
      accountTitleId: parseInt(String(form.accountTitle), 10) || 0,
    };

    try {
      const saved = await FinanceService.createGISRow(payload);
      const newRow: GISRow = {
        id: String(saved.id),
        main: payload.main,
        group: payload.group,
        code: payload.code,
        description: payload.description,
        debit: Number(payload.debit),
        credit: Number(payload.credit),
        total: Math.abs(Number(payload.debit - payload.credit)),
        createdAt: saved.createdAt ?? new Date().toISOString(),
      };

      setGisRows((prev) => {
        const nextRows = [newRow, ...prev];
        setFinanceData((prevFinance) => {
          const nextExpenses =
            prevFinance.expenses +
            Math.abs(Number(payload.debit ?? payload.credit ?? 0));
          const nextProfit = prevFinance.revenue - nextExpenses;
          setDashboardStats((prevStats) => ({
            ...prevStats,
            monthlyProfit: nextProfit,
          }));
          return {
            ...prevFinance,
            expenses: nextExpenses,
            profit: nextProfit,
            revenueVsExpenses: {
              ...prevFinance.revenueVsExpenses,
              expenses: buildExpenseTrend(nextRows),
            },
          };
        });
        return nextRows;
      });
      setSubmitSuccess(true);
      setTimeout(() => closeModal(), 1400);
    } catch (error) {
      console.error('Failed to add GIS row', error);
    }
  };

  // ── Item Net Summary modal ─────────────────────────────────────────────────
  const openItemNetModal = () => {
    setItemNetSubmitSuccess(false);
    setItemNetForm(EMPTY_ITEM_NET_FORM);
    setItemNetModalVisible(true);
    Animated.spring(itemNetModalAnim, {
      toValue: 1,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();
  };

  const closeItemNetModal = () => {
    Animated.timing(itemNetModalAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setItemNetModalVisible(false);
      setItemNetForm(EMPTY_ITEM_NET_FORM);
    });
  };

  const handleItemNetSubmit = async () => {
    if (
      !itemNetForm.vatType ||
      !itemNetForm.accountTitleId ||
      !itemNetForm.centerId ||
      !itemNetForm.subCenterId ||
      (!itemNetForm.costInputAmount && itemNetForm.costLines.length === 0)
    ) {
      console.warn('Cannot submit item net summary: missing required fields');
      return;
    }

    const opExPct = parseFloat(itemNetForm.opExPct) || 0;
    const finalSellingPrice = itemNetForm.selectedItem?.sellingPrice
      ? parseFloat(itemNetForm.selectedItem.sellingPrice)
      : parseFloat(itemNetForm.sellingPriceInput) || 0;

    const itemName = itemNetForm.selectedItem
      ? itemNetForm.selectedItem.name
      : itemNetForm.itemName.trim();
    const finalItemCode =
      itemNetForm.selectedItem?.itemCode ||
      itemNetForm.itemCode.trim() ||
      autoCode(itemName);

    try {
      const saved = await FinanceService.createSummaryRow(
        user?.orgId,
        Number(itemNetForm.accountTitleId) || undefined,
        Number.isFinite(Number(itemNetForm.vatType))
          ? Number(itemNetForm.vatType)
          : undefined,
        Number(itemNetForm.centerId) || undefined,
        Number(itemNetForm.subCenterId) || undefined,
        itemNetForm.selectedItem
          ? parseInt(itemNetForm.selectedItem.id, 10)
          : undefined,
        itemName,
        itemNetForm.costLines.length > 0 ? itemNetForm.costLines : undefined,
        parseFloat(itemNetForm.costInputAmount) || 0,
        itemNetForm.costInputMode === 'VAT_INCLUSIVE',
        finalSellingPrice,
        itemNetForm.sellingPriceInputMode === 'VAT_INCLUSIVE',
        opExPct,
        itemNetForm.description?.trim(),
        finalItemCode,
      );

      const newRow: SummaryRow = {
        id: String(saved.id),
        itemCode: saved.itemCode,
        itemName: saved.itemName,
        itemId: saved.itemId ? String(saved.itemId) : undefined,
        description: saved.description ?? saved.itemName,
        baseCost: saved.baseCost,
        vatInput: saved.vatInput,
        sellingPrice: saved.sellingPrice,
        vatOutput: saved.vatOutput,
        opExPct: saved.opExPct,
        opExAmount: saved.opExAmount,
        grossProfit: saved.grossProfit,
        netProfit: saved.netProfit,
        status: saved.status,
        computedCost: saved.computedCost,
        costContribution: saved.costContribution,
        centerId: Number(saved.centerId),
        subCenterId: Number(saved.subCenterId),
        accountTitleId: Number(saved.accountTitleId),
        orgId: Number(saved.orgId),
        createdAt: saved.createdAt,
        costLines: saved.costLines,
      };

      const summaryLoss = Math.max(
        0,
        newRow.costContribution - newRow.sellingPrice,
      );
      const nextSummaryRows = [newRow, ...summaryRows];
      setSummaryRows(nextSummaryRows);
      setFinanceData((prevFinance) => {
        const nextExpenses = prevFinance.expenses + summaryLoss;
        const nextProfit = prevFinance.revenue - nextExpenses;
        setDashboardStats((prevStats) => ({
          ...prevStats,
          monthlyProfit: nextProfit,
        }));
        return {
          ...prevFinance,
          expenses: nextExpenses,
          profit: nextProfit,
          revenueVsExpenses: {
            ...prevFinance.revenueVsExpenses,
            expenses: buildExpenseTrend(gisRows, nextSummaryRows),
          },
        };
      });
      setItemNetSubmitSuccess(true);
      setTimeout(() => closeItemNetModal(), 1400);
    } catch (error) {
      console.error('Failed to add summary row', error);
    }
  };

  const handleCatalogItemSelect = (item: CatalogItem) => {
    const sp = item.sellingPrice ? parseFloat(item.sellingPrice) : 0;

    setItemNetForm((f) => ({
      ...f,
      selectedItem: item,
      itemName: item.name,
      itemCode: item.itemCode || f.itemCode,
      sellingPriceInput: sp > 0 ? String(sp) : f.sellingPriceInput,
      costLines: item.costLines ?? [],
      newCostLineLabel: '',
      newCostLineAmount: '',
    }));
  };

  const itemNetModalTranslate = itemNetModalAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [80, 0],
  });
  const itemNetModalOpacity = itemNetModalAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const modalTranslate = modalAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [80, 0],
  });
  const modalOpacity = modalAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

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

  const revData = {
    labels: chartData.labels,
    datasets: [
      {
        data: chartData.revData,
        color: (o = 1) =>
          theme === 'dark'
            ? `rgba(34, 197, 94, ${o})`
            : `rgba(22, 163, 74, ${o})`,
        strokeWidth: 2,
      },
      {
        data: chartData.expData,
        color: (o = 1) =>
          theme === 'dark'
            ? `rgba(239, 68, 68, ${o})`
            : `rgba(220, 38, 38, ${o})`,
        strokeWidth: 2,
      },
    ],
    legend: [
      `Revenue (${chartData.finUnit})`,
      `Expenses (${chartData.finUnit})`,
    ],
  };

  const periodDisplayLabel =
    datePreset === 'Custom Range' ? customLabel : datePreset;

  // ─── Styles ────────────────────────────────────────────────────────────────
  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: 16, paddingBottom: 32 },
    rowBetween: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
      marginTop: 4,
      zIndex: 999,
      position: 'relative',
    },
    rowBetweenAnalytics: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
      marginTop: 4,
      zIndex: 1,
      position: 'relative',
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
      zIndex: 1,
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
    toolbarFull: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      width: '100%',
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
      minWidth: 0,
    },
    searchInput: { flex: 1, fontSize: 13, color: colors.text, minWidth: 0 },
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
    newEntryBtn: isTablet
      ? {
          flexDirection: 'row' as const,
          alignItems: 'center' as const,
          justifyContent: 'center' as const,
          gap: 6,
          marginTop: 16,
          alignSelf: 'flex-end' as const,
          paddingVertical: 10,
          paddingHorizontal: 20,
          borderRadius: 10,
        }
      : {
          flexDirection: 'row' as const,
          alignItems: 'center' as const,
          justifyContent: 'center' as const,
          gap: 8,
          marginTop: 16,
          paddingVertical: 14,
          borderRadius: 12,
        },
    tableScrollWrapper: {
      flex: 1,
      minHeight: 300,
      borderRadius: 12,
      marginTop: 4,
      overflow: 'hidden',
      width: '100%',
    },
    tableContentPad: {
      width: '100%',
      paddingBottom: 100,
    },
    tableInner: {
      paddingHorizontal: 12,
      width: '100%',
    },
  });

  // ─── Render ────────────────────────────────────────────────────────────────
  const showWebScrollIndicator = Platform.OS === 'web';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={showWebScrollIndicator}
    >
      {/* KEY METRICS */}
      <View style={styles.rowBetween}>
        <Text style={styles.sectionTitle}>Key Metrics</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity
            onPress={() => setShowNotifications(true)}
            style={{ position: 'relative' }}
          >
            <Bell size={20} color={colors.text} strokeWidth={2} />
            {unreadCount > 0 && (
              <View
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  backgroundColor: '#EF4444',
                  borderRadius: 8,
                  minWidth: 16,
                  height: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 3,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <DateRangePicker
            selected={datePreset}
            onSelect={handlePeriodSelect}
            colors={colors}
            customLabel={customLabel}
            isTablet={isTablet}
          />
        </View>
      </View>

      <View style={styles.statsGrid}>
        {isLoadingDashboardData ? (
          [0, 1, 2, 3].map((i) => (
            <View key={i} style={styles.statWrap}>
              <SkeletonTableRow colors={colors} />
            </View>
          ))
        ) : (
          <>
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
                trend={Number(dashboardStats.inventoryChange)}
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
          </>
        )}
      </View>

      {/* CHARTS */}
      <View style={styles.rowBetweenAnalytics}>
        <Text style={styles.sectionTitle}>Analytics</Text>
        <Text style={{ fontSize: 11, zIndex: 1, color: colors.textSecondary }}>
          {periodDisplayLabel}
        </Text>
      </View>
      <View style={styles.chartsRow}>
        <View style={styles.chartFlex}>
          <ChartCard
            title="Sales Trend"
            subtitle={`Monthly revenue (${chartData.salesUnit}) · ${periodDisplayLabel}`}
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
        <SummaryCard
          label="Total Revenue"
          value={fmt(financeData.revenue)}
          fullValue={fmtFull(financeData.revenue)}
          colors={colors}
          tooltipId="revenue"
          tooltipVisible={tooltipVisible}
          onPressOut={() => {
            if (Platform.OS === 'web') {
              setTimeout(() => setTooltipVisible(null), 800);
            }
          }}
          setTooltipVisible={setTooltipVisible}
          isTablet={isTablet}
        />
        <SummaryCard
          label="Total Expenses"
          value={fmt(financeData.expenses)}
          fullValue={fmtFull(financeData.expenses)}
          colors={colors}
          tooltipId="expenses"
          tooltipVisible={tooltipVisible}
          setTooltipVisible={setTooltipVisible}
          isTablet={isTablet}
          onPressOut={() => {
            if (Platform.OS === 'web') {
              setTimeout(() => setTooltipVisible(null), 800);
            }
          }}
        />
        <SummaryCard
          label="Net Profit"
          value={fmt(financeData.profit)}
          fullValue={fmtFull(financeData.profit)}
          valueColor={financeData.profit >= 0 ? colors.success : colors.error}
          colors={colors}
          tooltipId="profit"
          tooltipVisible={tooltipVisible}
          setTooltipVisible={setTooltipVisible}
          isTablet={isTablet}
          onPressOut={() => {
            if (Platform.OS === 'web') {
              setTimeout(() => setTooltipVisible(null), 800);
            }
          }}
        />
      </View>

      {/* REVENUE VS EXPENSES */}
      <ChartCard
        title="Revenue vs Expenses"
        subtitle={`Financial overview · ${periodDisplayLabel}`}
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
        {limits.canAccessExpenseSummary ? (
          <TouchableOpacity
            style={[
              s.tab,
              activeTab === 'expense' && {
                borderBottomColor: colors.primary,
                borderBottomWidth: 2.5,
              },
            ]}
            onPress={() => handleTabChange('expense')}
            activeOpacity={0.8}
          >
            <FileText
              size={15}
              color={
                activeTab === 'expense' ? colors.primary : colors.textSecondary
              }
              strokeWidth={activeTab === 'expense' ? 2.5 : 2}
            />
            <Text
              style={[
                s.tabLabel,
                {
                  color:
                    activeTab === 'expense'
                      ? colors.primary
                      : colors.textSecondary,
                  fontWeight: activeTab === 'expense' ? '700' : '500',
                },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              Expense Summary
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[s.tab, { opacity: 0.5 }]}
            activeOpacity={0.7}
          >
            <Lock size={13} color={colors.textSecondary} strokeWidth={2} />
            <Text
              style={[
                s.tabLabel,
                { color: colors.textSecondary, fontWeight: '500' },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              Expense Summary
            </Text>
            <Lock
              size={10}
              color={colors.textSecondary}
              strokeWidth={2}
              style={{ marginLeft: 2 }}
            />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            s.tab,
            activeTab === 'itemnet' && {
              borderBottomColor: colors.primary,
              borderBottomWidth: 2.5,
            },
          ]}
          onPress={() => handleTabChange('itemnet')}
          activeOpacity={0.8}
        >
          <BarChart2
            size={15}
            color={
              activeTab === 'itemnet' ? colors.primary : colors.textSecondary
            }
            strokeWidth={activeTab === 'itemnet' ? 2.5 : 2}
          />
          <Text
            style={[
              s.tabLabel,
              {
                color:
                  activeTab === 'itemnet'
                    ? colors.primary
                    : colors.textSecondary,
                fontWeight: activeTab === 'itemnet' ? '700' : '500',
              },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            Item Net Summary
          </Text>
        </TouchableOpacity>
      </View>

      {/* TABLE / CARD AREA */}
      <View style={styles.tableScrollWrapper}>
        {/* TOOLBAR */}
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

          {limits.canExport ? (
            <TouchableOpacity
              style={[
                styles.iconBtn,
                {
                  borderColor: exportSuccess ? colors.success : colors.border,
                  backgroundColor: exportSuccess
                    ? colors.success + '20'
                    : undefined,
                },
              ]}
              onPress={handleExport}
              activeOpacity={0.8}
            >
              <Download
                size={15}
                color={exportSuccess ? colors.success : colors.textSecondary}
                strokeWidth={2}
              />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.iconBtn,
                { borderColor: colors.border, opacity: 0.45 },
              ]}
              activeOpacity={0.7}
            >
              <Lock size={15} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          )}
        </View>

        {/* result count */}
        <View
          style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4 }}
        >
          <Text style={{ fontSize: 11, color: colors.textSecondary }}>
            {activeDataset.length}{' '}
            {activeTab === 'expense' ? 'entries' : 'items'}
            {searchQuery ? ` matching "${searchQuery}"` : ''}
          </Text>
        </View>

        {/* Table / Card content */}
        <View style={styles.tableInner}>
          {isLoadingDashboardData ? (
            viewMode === 'table' ? (
              [0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <SkeletonTableRow key={i} colors={colors} />
              ))
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {[0, 1, 2, 3].map((i) => (
                  <SkeletonFinancialCard
                    key={i}
                    colors={colors}
                    cardWidth={cardWidth}
                  />
                ))}
              </View>
            )
          ) : viewMode === 'table' ? (
            activeTab === 'expense' ? (
              <View style={{ width: '100%' }}>
                <GISTable
                  rows={pagedGISRows}
                  colors={colors}
                  onDeleteRow={handleDelete}
                />
              </View>
            ) : (
              <View style={{ width: '100%' }}>
                <SummaryTable rows={pagedSummaryRows} colors={colors} />
              </View>
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
      </View>

      {/* NEW ENTRY BUTTON */}
      <TouchableOpacity
        style={[styles.newEntryBtn, { backgroundColor: colors.primary }]}
        onPress={activeTab === 'expense' ? openModal : openItemNetModal}
        activeOpacity={0.88}
      >
        <FileText size={isTablet ? 14 : 16} color="#fff" strokeWidth={2} />
        <Text style={[s.newEntryBtnText, isTablet && { fontSize: 13 }]}>
          {activeTab === 'expense'
            ? 'New Expense Entry'
            : 'New Item Net Summary'}
        </Text>
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

      {/* CUSTOM DATE RANGE PICKER */}
      <DateRangePickerModal
        visible={showCustomPicker}
        onClose={() => setShowCustomPicker(false)}
        onApply={handleCustomApply}
        initialStart={customStartDate ?? undefined}
        initialEnd={customEndDate ?? undefined}
      />

      {/* EXPENSE ENTRY MODAL */}
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
                isTablet && s.modalSheetTablet,
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
                  New Expense Entry
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
                  showsVerticalScrollIndicator={showWebScrollIndicator}
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
                        options={centers}
                        onSelect={(v) =>
                          setForm((f) => ({ ...f, centerDept: String(v.id) }))
                        }
                        colors={colors}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <DropdownField
                        label="Sub Center"
                        value={form.subCenter}
                        options={subCenters}
                        onSelect={(v) =>
                          setForm((f) => ({ ...f, subCenter: String(v.id) }))
                        }
                        colors={colors}
                      />
                    </View>
                  </View>

                  <DropdownField
                    label="VAT Type"
                    value={form.vatType}
                    options={vatTypes}
                    onSelect={(v) =>
                      setForm((f) => ({ ...f, vatType: String(v.id) }))
                    }
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
                        const baseAmount = parseFloat(form.amount) || 0;
                        const selectedVatType = vatTypes.find(
                          (v) => v.id === form.vatType,
                        );
                        const { vat } = calcVatAndNet(
                          baseAmount,
                          selectedVatType || form.vatType,
                        );
                        const totalAmount = baseAmount + vat;
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
                                Base Amount
                              </Text>
                              <Text
                                style={[s.vatValue, { color: colors.text }]}
                              >
                                {formatPeso(baseAmount)}
                              </Text>
                            </View>
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
                            <View
                              style={[
                                s.vatRow,
                                {
                                  paddingTop: 8,
                                  borderTopWidth: 1,
                                  borderTopColor: colors.border,
                                  marginTop: 8,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  s.vatLabel,
                                  {
                                    color: colors.textSecondary,
                                    fontWeight: '700',
                                  },
                                ]}
                              >
                                Total Amount
                              </Text>
                              <Text
                                style={[
                                  s.vatValue,
                                  { color: colors.primary, fontWeight: '800' },
                                ]}
                              >
                                {formatPeso(totalAmount)}
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
                    options={accountTitles}
                    onSelect={(v) =>
                      setForm((f) => ({ ...f, accountTitle: String(v.id) }))
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

      {/* ITEM NET SUMMARY MODAL */}
      <Modal
        visible={itemNetModalVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeItemNetModal}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={s.modalBackdrop}>
            <TouchableOpacity
              style={{ flex: 1 }}
              activeOpacity={1}
              onPress={closeItemNetModal}
            />
            <Animated.View
              style={[
                s.modalSheet,
                isTablet && s.modalSheetTablet,
                { backgroundColor: colors.surface },
                {
                  opacity: itemNetModalOpacity,
                  transform: [{ translateY: itemNetModalTranslate }],
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
                  New Item Net Summary
                </Text>
                <TouchableOpacity
                  onPress={closeItemNetModal}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <X size={20} color={colors.textSecondary} strokeWidth={2} />
                </TouchableOpacity>
              </View>

              {itemNetSubmitSuccess ? (
                <View style={s.successState}>
                  <CheckCircle2
                    size={52}
                    color={colors.success}
                    strokeWidth={1.5}
                  />
                  <Text style={[s.successText, { color: colors.text }]}>
                    Item Summary Added
                  </Text>
                  <Text style={[s.successSub, { color: colors.textSecondary }]}>
                    The entry has been posted to the Item Net Summary.
                  </Text>
                </View>
              ) : (
                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={s.modalBody}
                  showsVerticalScrollIndicator={showWebScrollIndicator}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* Item Selection */}
                  <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>
                    Select Item (Optional)
                  </Text>
                  <TouchableOpacity
                    style={[
                      ins.itemPickerBtn,
                      {
                        backgroundColor: colors.background,
                        borderColor: itemNetForm.selectedItem
                          ? colors.primary
                          : colors.border,
                      },
                    ]}
                    onPress={() => setShowCatalogSearch(true)}
                    activeOpacity={0.8}
                  >
                    {itemNetForm.selectedItem ? (
                      <View
                        style={{
                          flex: 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 10,
                        }}
                      >
                        <View
                          style={[
                            ins.itemIconWrap,
                            { backgroundColor: colors.primary + '18' },
                          ]}
                        >
                          <Package
                            size={16}
                            color={colors.primary}
                            strokeWidth={2}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: '600',
                              color: colors.text,
                            }}
                            numberOfLines={1}
                          >
                            {itemNetForm.selectedItem.name}
                          </Text>
                          {itemNetForm.selectedItem.category && (
                            <Text
                              style={{
                                fontSize: 11,
                                color: colors.textSecondary,
                                marginTop: 1,
                              }}
                            >
                              {itemNetForm.selectedItem.category}
                              {itemNetForm.selectedItem.barcode
                                ? ` · ${itemNetForm.selectedItem.barcode}`
                                : ''}
                            </Text>
                          )}
                        </View>
                        <TouchableOpacity
                          onPress={() =>
                            setItemNetForm((f) => ({
                              ...f,
                              selectedItem: null,
                              itemName: '',
                            }))
                          }
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <X
                            size={14}
                            color={colors.textSecondary}
                            strokeWidth={2}
                          />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <Search
                          size={14}
                          color={colors.textSecondary}
                          strokeWidth={2}
                        />
                        <Text
                          style={{ fontSize: 13, color: colors.textSecondary }}
                        >
                          Search item catalog…
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <Text
                    style={[
                      s.fieldLabel,
                      { color: colors.textSecondary, marginTop: 4 },
                    ]}
                  >
                    Item Name{' '}
                    {itemNetForm.selectedItem
                      ? '(from catalog)'
                      : '(manual if not in catalog)'}
                  </Text>
                  <TextInput
                    style={[
                      s.input,
                      {
                        color: colors.text,
                        backgroundColor: itemNetForm.selectedItem
                          ? colors.border + '40'
                          : colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                    placeholder="e.g. Premium Coffee Blend"
                    placeholderTextColor={colors.textSecondary}
                    value={
                      itemNetForm.selectedItem
                        ? itemNetForm.selectedItem.name
                        : itemNetForm.itemName
                    }
                    onChangeText={(v) => {
                      if (!itemNetForm.selectedItem) {
                        setItemNetForm((f) => ({ ...f, itemName: v }));
                      }
                    }}
                    editable={!itemNetForm.selectedItem}
                  />

                  <Text
                    style={[
                      s.fieldLabel,
                      { color: colors.textSecondary, marginTop: 4 },
                    ]}
                  >
                    Item Code{' '}
                    {itemNetForm.selectedItem?.itemCode
                      ? '(from catalog)'
                      : '(manual if empty, leave empty to auto-generate)'}
                  </Text>
                  <TextInput
                    style={[
                      s.input,
                      {
                        color: colors.text,
                        backgroundColor: itemNetForm.selectedItem
                          ? colors.border + '40'
                          : colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                    placeholder="E.g. COFF-PRM-001"
                    placeholderTextColor={colors.textSecondary}
                    value={
                      itemNetForm.selectedItem
                        ? itemNetForm.selectedItem.itemCode
                        : itemNetForm.itemCode
                    }
                    autoCapitalize="characters"
                    onChangeText={(v) => {
                      if (!itemNetForm.selectedItem) {
                        setItemNetForm((f) => ({ ...f, itemCode: v }));
                      }
                    }}
                    editable={
                      !itemNetForm.selectedItem || itemNetForm.itemCode === ''
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
                        value={itemNetForm.centerId}
                        options={centers}
                        onSelect={(v) =>
                          setItemNetForm((f) => ({
                            ...f,
                            centerId: String(v.id),
                          }))
                        }
                        colors={colors}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <DropdownField
                        label="Sub Center"
                        value={itemNetForm.subCenterId}
                        options={subCenters}
                        onSelect={(v) =>
                          setItemNetForm((f) => ({
                            ...f,
                            subCenterId: String(v.id),
                          }))
                        }
                        colors={colors}
                      />
                    </View>
                  </View>

                  <DropdownField
                    label="Account Title"
                    value={itemNetForm.accountTitleId}
                    options={accountTitles}
                    onSelect={(v) =>
                      setItemNetForm((f) => ({
                        ...f,
                        accountTitleId: String(v.id),
                      }))
                    }
                    colors={colors}
                    placeholder="Select account title…"
                  />

                  <DropdownField
                    label="VAT Type"
                    value={itemNetForm.vatType}
                    options={vatTypes}
                    onSelect={(v) =>
                      setItemNetForm((f) => ({ ...f, vatType: String(v.id) }))
                    }
                    colors={colors}
                  />

                  <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>
                    Cost (₱)
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
                    value={itemNetForm.costInputAmount}
                    onChangeText={(v) =>
                      setItemNetForm((f) => ({ ...f, costInputAmount: v }))
                    }
                    keyboardType="decimal-pad"
                  />

                  {/* Cost Lines */}
                  <View style={{ gap: 8, marginTop: 12 }}>
                    {itemNetForm.costLines.length > 0 && (
                      <View style={{ gap: 6 }}>
                        {itemNetForm.costLines.map((line) => (
                          <View
                            key={line.id}
                            style={{
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              paddingVertical: 6,
                              borderBottomWidth: 1,
                              borderBottomColor: colors.border,
                            }}
                          >
                            <Text style={{ color: colors.text, flex: 1 }}>
                              {line.label}
                            </Text>
                            <Text style={{ color: colors.textSecondary }}>
                              {formatPeso(line.amount)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TextInput
                        style={[
                          s.input,
                          {
                            flex: 1,
                            color: colors.text,
                            backgroundColor: colors.background,
                            borderColor: colors.border,
                          },
                        ]}
                        placeholder="Line label"
                        placeholderTextColor={colors.textSecondary}
                        value={itemNetForm.newCostLineLabel}
                        onChangeText={(v) =>
                          setItemNetForm((f) => ({ ...f, newCostLineLabel: v }))
                        }
                      />
                      <TextInput
                        style={[
                          s.input,
                          {
                            flex: 1,
                            color: colors.text,
                            backgroundColor: colors.background,
                            borderColor: colors.border,
                          },
                        ]}
                        placeholder="Amount"
                        placeholderTextColor={colors.textSecondary}
                        value={itemNetForm.newCostLineAmount}
                        onChangeText={(v) =>
                          setItemNetForm((f) => ({
                            ...f,
                            newCostLineAmount: v,
                          }))
                        }
                        keyboardType="decimal-pad"
                      />
                      <TouchableOpacity
                        style={{
                          flex: 0.8,
                          backgroundColor: colors.primary,
                          justifyContent: 'center',
                          alignItems: 'center',
                          borderRadius: 8,
                          paddingVertical: 14,
                        }}
                        onPress={() => {
                          const amount = parseFloat(
                            itemNetForm.newCostLineAmount,
                          );
                          if (
                            !itemNetForm.newCostLineLabel.trim() ||
                            Number.isNaN(amount)
                          ) {
                            return;
                          }
                          setItemNetForm((f) => ({
                            ...f,
                            costLines: [
                              ...f.costLines,
                              {
                                id: `costline-${Date.now()}-${f.costLines.length}`,
                                label: f.newCostLineLabel.trim(),
                                amount,
                              },
                            ],
                            newCostLineLabel: '',
                            newCostLineAmount: '',
                          }));
                        }}
                      >
                        <Text style={{ color: '#fff', fontWeight: '700' }}>
                          Add
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* VAT Calculation Preview */}
                  {(itemNetForm.costInputAmount ||
                    itemNetForm.sellingPriceInput) &&
                  itemNetForm.vatType ? (
                    <View
                      style={[
                        s.vatPreview,
                        {
                          backgroundColor: colors.background,
                          borderColor: colors.border,
                          marginTop: 10,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '700',
                          color: colors.textSecondary,
                          letterSpacing: 1,
                          marginBottom: 8,
                          textTransform: 'uppercase',
                        }}
                      >
                        ERP Preview
                      </Text>
                      <View style={s.vatRow}>
                        <Text
                          style={[s.vatLabel, { color: colors.textSecondary }]}
                        >
                          Base Cost
                        </Text>
                        <Text style={[s.vatValue, { color: colors.text }]}>
                          {formatPeso(itemNetPreview.baseCost)}
                        </Text>
                      </View>
                      <View style={s.vatRow}>
                        <Text
                          style={[s.vatLabel, { color: colors.textSecondary }]}
                        >
                          VAT Input
                        </Text>
                        <Text style={[s.vatValue, { color: colors.accent }]}>
                          {formatPeso(itemNetPreview.vatInput)}
                        </Text>
                      </View>
                      <View style={s.vatRow}>
                        <Text
                          style={[s.vatLabel, { color: colors.textSecondary }]}
                        >
                          Selling Price
                        </Text>
                        <Text style={[s.vatValue, { color: colors.text }]}>
                          {formatPeso(itemNetPreview.sellingPrice)}
                        </Text>
                      </View>
                      <View style={s.vatRow}>
                        <Text
                          style={[s.vatLabel, { color: colors.textSecondary }]}
                        >
                          VAT Output
                        </Text>
                        <Text style={[s.vatValue, { color: colors.accent }]}>
                          {formatPeso(itemNetPreview.vatOutput)}
                        </Text>
                      </View>
                      <View
                        style={[
                          s.vatRow,
                          {
                            paddingTop: 8,
                            borderTopWidth: 1,
                            borderTopColor: colors.border,
                            marginTop: 8,
                          },
                        ]}
                      >
                        <Text
                          style={[s.vatLabel, { color: colors.textSecondary }]}
                        >
                          OpEx Amount
                        </Text>
                        <Text style={[s.vatValue, { color: colors.text }]}>
                          {formatPeso(itemNetPreview.opExAmount)}
                        </Text>
                      </View>
                      <View style={s.vatRow}>
                        <Text
                          style={[s.vatLabel, { color: colors.textSecondary }]}
                        >
                          Gross Profit
                        </Text>
                        <Text
                          style={[
                            s.vatValue,
                            {
                              color:
                                itemNetPreview.grossProfit >= 0
                                  ? colors.success
                                  : colors.error,
                            },
                          ]}
                        >
                          {formatPeso(itemNetPreview.grossProfit)}
                        </Text>
                      </View>
                      <View style={s.vatRow}>
                        <Text
                          style={[s.vatLabel, { color: colors.textSecondary }]}
                        >
                          Net Profit
                        </Text>
                        <Text
                          style={[
                            s.vatValue,
                            {
                              color:
                                itemNetPreview.netProfit >= 0
                                  ? colors.success
                                  : colors.error,
                              fontWeight: '700',
                            },
                          ]}
                        >
                          {formatPeso(itemNetPreview.netProfit)}
                        </Text>
                      </View>
                      {itemNetPreview.warning ? (
                        <Text
                          style={{
                            color: colors.error,
                            marginTop: 10,
                            fontSize: 12,
                          }}
                        >
                          {itemNetPreview.warning}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}

                  {/* OpEx & Selling Price */}
                  <View style={{ gap: 12, marginTop: 10 }}>
                    <Text
                      style={[s.fieldLabel, { color: colors.textSecondary }]}
                    >
                      OpEx %
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
                      placeholder="e.g. 0.30 for 30%"
                      placeholderTextColor={colors.textSecondary}
                      value={itemNetForm.opExPct}
                      onChangeText={(v) =>
                        setItemNetForm((f) => ({ ...f, opExPct: v }))
                      }
                      keyboardType="decimal-pad"
                    />

                    <Text
                      style={[s.fieldLabel, { color: colors.textSecondary }]}
                    >
                      Selling Price
                    </Text>
                    <TextInput
                      style={[
                        s.input,
                        {
                          color: colors.text,
                          backgroundColor: itemNetForm.selectedItem
                            ? colors.border + '40'
                            : colors.background,
                          borderColor: itemNetForm.selectedItem
                            ? colors.primary
                            : colors.border,
                        },
                      ]}
                      placeholder="0.00"
                      placeholderTextColor={colors.textSecondary}
                      value={
                        itemNetForm.selectedItem?.sellingPrice
                          ? itemNetForm.selectedItem.sellingPrice
                          : itemNetForm.sellingPriceInput
                      }
                      onChangeText={(v) => {
                        if (!itemNetForm.selectedItem) {
                          setItemNetForm((f) => ({
                            ...f,
                            sellingPriceInput: v,
                          }));
                        }
                      }}
                      editable={!itemNetForm.selectedItem}
                      keyboardType="decimal-pad"
                    />
                  </View>

                  {/* Description */}
                  <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>
                    Description
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
                    value={itemNetForm.description}
                    onChangeText={(v) =>
                      setItemNetForm((f) => ({ ...f, description: v }))
                    }
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />

                  <TouchableOpacity
                    style={[
                      s.submitBtn,
                      {
                        backgroundColor: colors.primary,
                        opacity:
                          (!itemNetForm.costInputAmount &&
                            itemNetForm.costLines.length === 0) ||
                          !itemNetForm.vatType ||
                          !itemNetForm.accountTitleId ||
                          !itemNetForm.centerId ||
                          !itemNetForm.subCenterId
                            ? 0.5
                            : 1,
                      },
                    ]}
                    onPress={handleItemNetSubmit}
                    disabled={
                      (!itemNetForm.costInputAmount &&
                        itemNetForm.costLines.length === 0) ||
                      !itemNetForm.vatType ||
                      !itemNetForm.accountTitleId ||
                      !itemNetForm.centerId ||
                      !itemNetForm.subCenterId
                    }
                    activeOpacity={0.85}
                  >
                    <Text style={s.submitBtnText}>Add Item Summary</Text>
                  </TouchableOpacity>
                  <View style={{ height: 20 }} />
                </ScrollView>
              )}
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* CATALOG SEARCH MODAL */}
      <CatalogSearchModal
        visible={showCatalogSearch}
        onClose={() => setShowCatalogSearch(false)}
        onSelect={handleCatalogItemSelect}
        colors={colors}
      />

      {/* NOTIFICATIONS MODAL */}
      <Modal visible={showNotifications} transparent animationType="fade">
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
          activeOpacity={1}
          onPress={() => setShowNotifications(false)}
        />
        <View
          style={{
            position: 'absolute',
            top: 60,
            right: 16,
            width: 320,
            maxHeight: 480,
            backgroundColor: colors.surface,
            borderRadius: 14,
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Text
              style={{ fontSize: 15, fontWeight: '800', color: colors.text }}
            >
              Notifications
            </Text>
            {unreadCount > 0 && (
              <TouchableOpacity
                onPress={async () => {
                  const { accessToken } = await AuthService.getTokens();
                  const client = await getGraphQLClient();
                  await client.request(
                    gql`
                      mutation {
                        markAllNotificationsRead
                      }
                    `,
                    {},
                    { Authorization: `Bearer ${accessToken}` },
                  );
                  setUnreadCount(0);
                  setNotifications((prev) =>
                    prev.map((n) => ({ ...n, isRead: true })),
                  );
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.primary,
                    fontWeight: '600',
                  }}
                >
                  Mark all read
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <ScrollView>
            {notifications.length === 0 ? (
              <View style={{ padding: 32, alignItems: 'center' }}>
                <Bell size={32} color={colors.border} strokeWidth={1.5} />
                <Text
                  style={{
                    color: colors.textSecondary,
                    marginTop: 10,
                    fontSize: 13,
                  }}
                >
                  No notifications
                </Text>
              </View>
            ) : (
              notifications.map((n) => (
                <TouchableOpacity
                  key={n.id}
                  style={{
                    padding: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                    backgroundColor: n.isRead
                      ? 'transparent'
                      : colors.primary + '10',
                  }}
                  onPress={async () => {
                    if (!n.isRead) {
                      const { accessToken } = await AuthService.getTokens();
                      const client = await getGraphQLClient();
                      await client.request(
                        gql`
                          mutation MarkRead($id: Int!) {
                            markNotificationRead(id: $id) {
                              id
                            }
                          }
                        `,
                        { id: n.id },
                        { Authorization: `Bearer ${accessToken}` },
                      );
                      setNotifications((prev) =>
                        prev.map((x) =>
                          x.id === n.id ? { ...x, isRead: true } : x,
                        ),
                      );
                      setUnreadCount((prev) => Math.max(0, prev - 1));
                    }
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      gap: 10,
                    }}
                  >
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        marginTop: 4,
                        backgroundColor:
                          n.type === 'ORG_CRITICAL_STOCK'
                            ? '#EF4444'
                            : n.type === 'OUTLET_LOW_STOCK'
                              ? '#F59E0B'
                              : '#10B981',
                      }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '700',
                          color: colors.text,
                        }}
                      >
                        {n.title}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: colors.textSecondary,
                          marginTop: 2,
                          lineHeight: 17,
                        }}
                      >
                        {n.message}
                      </Text>
                      <Text
                        style={{
                          fontSize: 10,
                          color: colors.textSecondary,
                          marginTop: 4,
                        }}
                      >
                        {new Date(n.createdAt).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

// ─── Item Net Summary modal styles ────────────────────────────────────────────
const ins = StyleSheet.create({
  itemPickerBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 14,
    minHeight: 46,
    justifyContent: 'center',
  },
  itemIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  subtitle: { fontSize: 13, marginTop: 2 },
  logoutButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    marginTop: 12,
    borderRadius: 10,
    padding: 3,
    gap: 3,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
  },
  filterTabText: { fontSize: 12, fontWeight: '600' },
  summaryContainer: { flexDirection: 'row', paddingVertical: 12, gap: 10 },
  summaryCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
  },
  summaryValue: { fontSize: 16, fontWeight: '800', marginTop: 6 },
  summaryLabel: { fontSize: 10, marginTop: 3, textAlign: 'center' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    marginTop: 4,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  branchCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    elevation: 2,
    flex: 1,
  },
  branchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  branchInfo: { flex: 1 },
  branchName: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  branchStats: { alignItems: 'flex-end' },
  revenueAmount: { fontSize: 16, fontWeight: '800' },
  transactionCount: { fontSize: 11, marginTop: 2 },
  outletCount: { fontSize: 12 },
  branchFooter: { paddingTop: 10, borderTopWidth: 1 },
  viewDetails: { fontSize: 13, fontWeight: '600' },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.48)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 20,
    alignSelf: 'center',
  },
  modalSheetTablet: {
    alignSelf: 'center',
    width: 520,
    borderRadius: 16,
    height: '80%',
    marginBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  modalBody: { paddingHorizontal: 20, paddingTop: 16 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    marginBottom: 14,
  },
  textarea: { minHeight: 80, paddingTop: 10 },
  submitBtn: {
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginTop: 16,
    marginBottom: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabLabel: { fontSize: 13 },
  tableArea: {
    flex: 1,
    minHeight: 300,
    borderRadius: 12,
    marginTop: 4,
    overflow: 'hidden',
  },
  newEntryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
  },
  newEntryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  successState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  successText: { fontSize: 17, fontWeight: '800', textAlign: 'center' },
  successSub: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  vatPreview: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
    gap: 6,
  },
  vatLabel: { fontSize: 13 },
  vatValue: { fontSize: 14, fontWeight: '700' },
  vatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});