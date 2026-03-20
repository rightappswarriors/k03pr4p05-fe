import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import {
  MapPin,
  TrendingUp,
  LogOut,
  PhilippinePeso,
  X,
  FileText,
  BarChart2,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  List,
  LayoutGrid,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { AdminService } from '@/services/adminService';
import { Branch, BranchRevenue } from '@/types';
import { DateRangeFilter, getDateRange } from '@/utils/dateHelpers';
import DateRangePickerModal from '@/components/DateRangePickerModal';
import { useWebSocket } from '@/contexts/WSContext';
import { useTheme } from '@/contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const VIEW_MODE_KEY = '@branch_overview_view_mode';

// ─── Types ───────────────────────────────────────────────────────────────────

type TabKey = 'expense' | 'itemnet';
type ViewMode = 'table' | 'card';

interface GISRow {
  id: string;
  main: string;
  group: string;
  code: string;
  description: string;
  debit: number;
  credit: number;
  total: number;
}

interface SummaryRow {
  id: string;
  itemCode: string;
  description: string;
  opExPct: number;
  baseCost: number;
  sellingPrice: number;
  computedCost: number;
  costContribution: number;
  net: number;
}

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

// ─── Constants ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 6;

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
const VAT_TYPE_OPTIONS = [
  'INCLUSIVE OF VAT',
  'EXCLUSIVE OF VAT',
  'MANUAL INPUT',
  'NON VAT / NO TAX',
];
const ACCOUNT_TITLE_OPTIONS = [
  'ACCOUNTS IN LITIGATION',
  'ACCOUNTS PAYABLE',
  'ACCOUNTS PAYABLE-CASH BOND',
  'ACCOUNTS PAYABLE-DELINQUENT',
  'ACCOUNTS PAYABLE-SANHEC',
  'ACCOUNTS PAYABLE-SINKING FUND',
  'ACCOUNTS RECEIVABLE-AUDIT',
  'ACCOUNTS RECEIVABLE-BRANCHES',
  'ACCOUNTS RECEIVABLE-CALAMITY LOAN',
  'ACCOUNTS RECEIVABLE-DECEASED',
  'ACCOUNTS RECEIVABLE-DONATIONS',
  'ACCOUNTS RECEIVABLE-EMPLOYEES',
  'ACCOUNTS RECEIVABLE-INSURANCE',
  'ACCOUNTS RECEIVABLE-OCS FARM',
  'ACCOUNTS RECEIVABLE-OCS FATIMA',
  'ACCOUNTS RECEIVABLE-OTHERS',
  'ACCOUNTS RECEIVABLE-SAN HEC',
  'ACCOUNTS RECEIVABLE-SHORTAGE',
  'ACCOUNTS RECEIVABLE-SSS',
  'ACCOUNTS RECEIVABLE-VALE',
  'ACCRUED EXPENSES PAYABLE',
  'ACCUM DEPRECIATION & AMORTIZATION',
  'ACCUM NET PROFIT',
  'ACCUM AMORT-COMPUTER SOFTWARE',
  'ACCUM DEPN.-FURNITURES & FIXTURES',
  'ACCUM DEPN.-LAND IMPROVEMENTS',
];
const DATE_FILTERS: DateRangeFilter[] = [
  'today',
  'this_week',
  'this_month',
  'custom',
];

// ─── Mock Data ────────────────────────────────────────────────────────────────

const INITIAL_GIS_ROWS: GISRow[] = [
  {
    id: 'g1',
    main: 'Income',
    group: 'Revenue',
    code: 'REV-001',
    description: 'Product Sales',
    debit: 0,
    credit: 1_250_000,
    total: 1_250_000,
  },
  {
    id: 'g2',
    main: 'Income',
    group: 'Revenue',
    code: 'REV-002',
    description: 'Service Revenue',
    debit: 0,
    credit: 380_000,
    total: 380_000,
  },
  {
    id: 'g3',
    main: 'Income',
    group: 'Other Income',
    code: 'OTH-001',
    description: 'Interest Income',
    debit: 0,
    credit: 12_500,
    total: 12_500,
  },
  {
    id: 'g4',
    main: 'Expenses',
    group: 'Cost of Sales',
    code: 'COS-001',
    description: 'Cost of Goods Sold',
    debit: 620_000,
    credit: 0,
    total: -620_000,
  },
  {
    id: 'g5',
    main: 'Expenses',
    group: 'Cost of Sales',
    code: 'COS-002',
    description: 'Direct Labor',
    debit: 95_000,
    credit: 0,
    total: -95_000,
  },
  {
    id: 'g6',
    main: 'Expenses',
    group: 'Operating',
    code: 'OPX-001',
    description: 'Rent Expense',
    debit: 55_000,
    credit: 0,
    total: -55_000,
  },
  {
    id: 'g7',
    main: 'Expenses',
    group: 'Operating',
    code: 'OPX-002',
    description: 'Salaries & Wages',
    debit: 210_000,
    credit: 0,
    total: -210_000,
  },
  {
    id: 'g8',
    main: 'Expenses',
    group: 'Operating',
    code: 'OPX-003',
    description: 'Utilities',
    debit: 28_000,
    credit: 0,
    total: -28_000,
  },
  {
    id: 'g9',
    main: 'Expenses',
    group: 'Operating',
    code: 'OPX-004',
    description: 'Depreciation',
    debit: 14_500,
    credit: 0,
    total: -14_500,
  },
  {
    id: 'g10',
    main: 'Expenses',
    group: 'Administrative',
    code: 'ADM-001',
    description: 'Office Supplies',
    debit: 8_200,
    credit: 0,
    total: -8_200,
  },
  {
    id: 'g11',
    main: 'Expenses',
    group: 'Administrative',
    code: 'ADM-002',
    description: 'Communication',
    debit: 5_800,
    credit: 0,
    total: -5_800,
  },
];

const INITIAL_SUMMARY_ROWS: SummaryRow[] = [
  {
    id: 's1',
    itemCode: 'ITM-001',
    description: 'Brewed Coffee',
    opExPct: 0.18,
    baseCost: 25,
    sellingPrice: 75,
    computedCost: 29.5,
    costContribution: 45.5,
    net: 45.5,
  },
  {
    id: 's2',
    itemCode: 'ITM-002',
    description: 'Espresso Shot',
    opExPct: 0.18,
    baseCost: 20,
    sellingPrice: 65,
    computedCost: 23.6,
    costContribution: 41.4,
    net: 41.4,
  },
  {
    id: 's3',
    itemCode: 'ITM-003',
    description: 'Milk Tea (L)',
    opExPct: 0.18,
    baseCost: 35,
    sellingPrice: 95,
    computedCost: 41.3,
    costContribution: 53.7,
    net: 53.7,
  },
  {
    id: 's4',
    itemCode: 'ITM-004',
    description: 'Pasta Carbonara',
    opExPct: 0.22,
    baseCost: 120,
    sellingPrice: 295,
    computedCost: 146.4,
    costContribution: 148.6,
    net: 148.6,
  },
  {
    id: 's5',
    itemCode: 'ITM-005',
    description: 'Club Sandwich',
    opExPct: 0.22,
    baseCost: 85,
    sellingPrice: 195,
    computedCost: 103.7,
    costContribution: 91.3,
    net: 91.3,
  },
  {
    id: 's6',
    itemCode: 'ITM-006',
    description: 'Bottled Water',
    opExPct: 0.1,
    baseCost: 8,
    sellingPrice: 30,
    computedCost: 8.8,
    costContribution: 21.2,
    net: 21.2,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcVatAndNet(
  amount: number,
  vatType: string,
): { vat: number; net: number } {
  const VAT_RATE = 0.12;
  switch (vatType) {
    case 'INCLUSIVE OF VAT': {
      const net = amount / (1 + VAT_RATE);
      return { vat: amount - net, net };
    }
    case 'EXCLUSIVE OF VAT':
      return { vat: amount * VAT_RATE, net: amount };
    default:
      return { vat: 0, net: amount };
  }
}

function formatPeso(n: number): string {
  return `₱${Math.abs(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPesoCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `₱${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `₱${(abs / 1_000).toFixed(1)}K`;
  return formatPeso(n);
}

function getResponsiveColumns(width: number): number {
  if (width >= 1200) return 4;
  if (width >= 900) return 3;
  if (width >= 600) return 2;
  return 1;
}

// ─── Skeleton Components ──────────────────────────────────────────────────────

function SkeletonPulse({ style, colors }: { style?: any; colors: any }) {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View
      style={[
        { backgroundColor: colors.border, borderRadius: 6, opacity: anim },
        style,
      ]}
    />
  );
}

function SkeletonStatCard({ colors }: { colors: any }) {
  return (
    <View style={[sk.statCard, { backgroundColor: colors.card }]}>
      <SkeletonPulse
        colors={colors}
        style={{ width: 22, height: 22, borderRadius: 11 }}
      />
      <SkeletonPulse
        colors={colors}
        style={{ width: '80%', height: 20, marginTop: 8 }}
      />
      <SkeletonPulse
        colors={colors}
        style={{ width: '60%', height: 12, marginTop: 6 }}
      />
    </View>
  );
}

function SkeletonBranchCard({ colors }: { colors: any }) {
  return (
    <View
      style={[
        sk.branchCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <View style={{ flex: 1, gap: 6 }}>
          <SkeletonPulse colors={colors} style={{ width: '55%', height: 15 }} />
          <SkeletonPulse colors={colors} style={{ width: '35%', height: 12 }} />
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <SkeletonPulse colors={colors} style={{ width: 80, height: 16 }} />
          <SkeletonPulse colors={colors} style={{ width: 55, height: 11 }} />
        </View>
      </View>
      <SkeletonPulse
        colors={colors}
        style={{ width: 90, height: 13, marginTop: 6 }}
      />
    </View>
  );
}

function SkeletonTableRow({ colors }: { colors: any }) {
  return (
    <View style={[sk.tableRow, { borderBottomColor: colors.border }]}>
      {[220, 200, 130, 130].map((w, i) => (
        <View key={i} style={{ width: w, padding: 10 }}>
          <SkeletonPulse colors={colors} style={{ height: 12, width: '85%' }} />
        </View>
      ))}
    </View>
  );
}

function SkeletonFinancialCard({
  colors,
  cardWidth,
}: {
  colors: any;
  cardWidth: number;
}) {
  return (
    <View
      style={[
        sk.financialCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          width: cardWidth - 12,
        },
      ]}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <SkeletonPulse colors={colors} style={{ width: '60%', height: 14 }} />
        <SkeletonPulse
          colors={colors}
          style={{ width: 18, height: 18, borderRadius: 9 }}
        />
      </View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <SkeletonPulse colors={colors} style={{ width: 70, height: 13 }} />
        <SkeletonPulse colors={colors} style={{ width: 80, height: 16 }} />
      </View>
    </View>
  );
}

// ─── Financial Card Component ─────────────────────────────────────────────────

interface FinancialCardGIS {
  type: 'gis';
  row: GISRow;
}
interface FinancialCardSummary {
  type: 'summary';
  row: SummaryRow;
}
type FinancialCardData = FinancialCardGIS | FinancialCardSummary;

function FinancialCard({
  data,
  colors,
  cardWidth,
  onPress,
}: {
  data: FinancialCardData;
  colors: any;
  cardWidth: number;
  onPress: (data: FinancialCardData) => void;
}) {
  const isGIS = data.type === 'gis';

  const name = isGIS ? data.row.description : data.row.description;
  const category = isGIS
    ? data.row.main
    : data.row.net >= 0
      ? 'Income'
      : 'Expense';
  const amount = isGIS ? data.row.total : data.row.net;
  const categoryColor = category === 'Income' ? colors.success : colors.error;

  return (
    <TouchableOpacity
      style={[
        fc.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          width: cardWidth - 12,
        },
      ]}
      onPress={() => onPress(data)}
      activeOpacity={0.82}
    >
      {/* Top row */}
      <View style={fc.topRow}>
        <Text style={[fc.name, { color: colors.text }]} numberOfLines={1}>
          {name}
        </Text>
        <ChevronRight size={16} color={colors.textSecondary} strokeWidth={2} />
      </View>
      {/* Bottom row */}
      <View style={fc.bottomRow}>
        <Text style={[fc.category, { color: categoryColor }]}>{category}</Text>
        <Text
          style={[
            fc.amount,
            { color: amount >= 0 ? colors.success : colors.error },
          ]}
        >
          {formatPesoCompact(amount)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function FinancialDetailModal({
  visible,
  data,
  onClose,
  colors,
}: {
  visible: boolean;
  data: FinancialCardData | null;
  onClose: () => void;
  colors: any;
}) {
  if (!data) return null;
  const isGIS = data.type === 'gis';

  const fields: { label: string; value: string; valueColor?: string }[] = isGIS
    ? [
        { label: 'Item Name', value: data.row.description },
        {
          label: 'Category',
          value: data.row.main,
          valueColor:
            data.row.main === 'Income' ? colors.success : colors.error,
        },
        { label: 'Item Code', value: data.row.code },
        { label: 'Group', value: data.row.group },
        {
          label: 'Debit',
          value: data.row.debit > 0 ? formatPeso(data.row.debit) : '—',
          valueColor: data.row.debit > 0 ? colors.error : colors.textSecondary,
        },
        {
          label: 'Credit',
          value: data.row.credit > 0 ? formatPeso(data.row.credit) : '—',
          valueColor:
            data.row.credit > 0 ? colors.success : colors.textSecondary,
        },
        {
          label: 'Net Total',
          value: formatPeso(data.row.total),
          valueColor: data.row.total >= 0 ? colors.success : colors.error,
        },
      ]
    : [
        { label: 'Item Name', value: data.row.description },
        {
          label: 'Category',
          value: data.row.net >= 0 ? 'Income' : 'Expense',
          valueColor: data.row.net >= 0 ? colors.success : colors.error,
        },
        { label: 'Item Code', value: data.row.itemCode },
        {
          label: '% OpEx Contribution',
          value: `${(data.row.opExPct * 100).toFixed(0)}%`,
        },
        {
          label: 'Total Sales (Selling Price)',
          value: formatPeso(data.row.sellingPrice),
        },
        { label: 'Computed Cost', value: formatPeso(data.row.computedCost) },
        {
          label: 'Cost Contribution',
          value: formatPeso(data.row.costContribution),
        },
        {
          label: 'Net Sales',
          value: formatPeso(data.row.net),
          valueColor: data.row.net >= 0 ? colors.success : colors.error,
        },
      ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableOpacity style={dm.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          style={[dm.sheet, { backgroundColor: colors.surface }]}
          activeOpacity={1}
          onPress={() => {}}
        >
          {/* Header */}
          <View style={[dm.header, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text
                style={[dm.title, { color: colors.text }]}
                numberOfLines={1}
              >
                {isGIS ? data.row.description : data.row.description}
              </Text>
              <Text style={[dm.subtitle, { color: colors.textSecondary }]}>
                {isGIS ? 'Expense Summary Entry' : 'Item Net Summary Entry'}
              </Text>
            </View>
            <TouchableOpacity
              style={[dm.closeBtn, { backgroundColor: colors.background }]}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={16} color={colors.text} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView
            contentContainerStyle={dm.body}
            showsVerticalScrollIndicator={false}
          >
            {fields.map((f) => (
              <View
                key={f.label}
                style={[dm.row, { borderBottomColor: colors.border }]}
              >
                <Text style={[dm.fieldLabel, { color: colors.textSecondary }]}>
                  {f.label}
                </Text>
                <Text
                  style={[
                    dm.fieldValue,
                    { color: f.valueColor || colors.text },
                  ]}
                >
                  {f.value}
                </Text>
              </View>
            ))}
            <View style={{ height: 20 }} />
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── View Toggle ──────────────────────────────────────────────────────────────

function ViewToggle({
  viewMode,
  onChange,
  colors,
}: {
  viewMode: ViewMode;
  onChange: (v: ViewMode) => void;
  colors: any;
}) {
  return (
    <View
      style={[
        vt.container,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      {(['table', 'card'] as ViewMode[]).map((mode) => {
        const isActive = viewMode === mode;
        const Icon = mode === 'table' ? List : LayoutGrid;
        return (
          <TouchableOpacity
            key={mode}
            style={[vt.btn, isActive && { backgroundColor: colors.primary }]}
            onPress={() => onChange(mode)}
            activeOpacity={0.8}
          >
            <Icon
              size={14}
              color={isActive ? '#fff' : colors.textSecondary}
              strokeWidth={2}
            />
            <Text
              style={[
                vt.label,
                { color: isActive ? '#fff' : colors.textSecondary },
              ]}
            >
              {mode === 'table' ? 'Table View' : 'Card View'}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Pagination Controls ──────────────────────────────────────────────────────

function PaginationControls({
  page,
  totalPages,
  onPrev,
  onNext,
  colors,
  totalItems,
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  colors: any;
  totalItems: number;
}) {
  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, totalItems);

  return (
    <View style={[pg.container, { borderTopColor: colors.border }]}>
      <Text style={[pg.info, { color: colors.textSecondary }]}>
        {start}–{end} of {totalItems}
      </Text>
      <View style={pg.controls}>
        <TouchableOpacity
          style={[
            pg.btn,
            { borderColor: colors.border, opacity: page <= 1 ? 0.4 : 1 },
          ]}
          onPress={onPrev}
          disabled={page <= 1}
          activeOpacity={0.75}
        >
          <Text style={[pg.btnText, { color: colors.text }]}>‹ Prev</Text>
        </TouchableOpacity>
        <View
          style={[pg.pageIndicator, { backgroundColor: colors.primary + '18' }]}
        >
          <Text style={[pg.pageText, { color: colors.primary }]}>
            {page} / {totalPages}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            pg.btn,
            {
              borderColor: colors.border,
              opacity: page >= totalPages ? 0.4 : 1,
            },
          ]}
          onPress={onNext}
          disabled={page >= totalPages}
          activeOpacity={0.75}
        >
          <Text style={[pg.btnText, { color: colors.text }]}>Next ›</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── DropdownField ────────────────────────────────────────────────────────────

function DropdownField({
  label,
  value,
  options,
  onSelect,
  colors,
  placeholder,
}: {
  label: string;
  value: string;
  options: string[];
  onSelect: (v: string) => void;
  colors: any;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ marginBottom: 14 }}>
      <Text
        style={{
          fontSize: 12,
          fontWeight: '600',
          color: colors.textSecondary,
          marginBottom: 5,
          textTransform: 'uppercase',
          letterSpacing: 0.6,
        }}
      >
        {label}
      </Text>
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 11,
          backgroundColor: colors.background,
        }}
        onPress={() => setOpen(true)}
        activeOpacity={0.75}
      >
        <Text
          style={{
            fontSize: 14,
            color: value ? colors.text : colors.textSecondary,
            flex: 1,
          }}
          numberOfLines={1}
        >
          {value || placeholder || 'Select…'}
        </Text>
        <ChevronDown size={16} color={colors.textSecondary} strokeWidth={2} />
      </TouchableOpacity>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.45)',
            justifyContent: 'center',
            padding: 24,
          }}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 14,
              overflow: 'hidden',
              maxHeight: 380,
            }}
          >
            <View
              style={{
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <Text
                style={{ fontSize: 14, fontWeight: '700', color: colors.text }}
              >
                {label}
              </Text>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                    backgroundColor:
                      item === value ? colors.primary + '15' : 'transparent',
                  }}
                  onPress={() => {
                    onSelect(item);
                    setOpen(false);
                  }}
                >
                  <Text style={{ fontSize: 13, color: colors.text, flex: 1 }}>
                    {item}
                  </Text>
                  {item === value && (
                    <CheckCircle2
                      size={16}
                      color={colors.primary}
                      strokeWidth={2}
                    />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─── GIS Table (Expense Summary) ─────────────────────────────────────────────
// Columns: Main | Group | Description | Debit | Credit | Total  (Code omitted)

function GISTable({ rows, colors }: { rows: GISRow[]; colors: any }) {
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const netIncome = totalCredit - totalDebit;

  // Code column removed; remaining 6 columns
  const COL_WIDTHS = [90, 110, 210, 120, 120, 120];
  const HEADERS = ['Main', 'Group', 'Description', 'Debit', 'Credit', 'Total'];
  const rowsBg = (idx: number) =>
    idx % 2 === 0 ? colors.card : colors.background;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator>
      <View>
        {/* Header */}
        <View style={{ flexDirection: 'row', backgroundColor: colors.primary }}>
          {HEADERS.map((h, i) => (
            <View
              key={h}
              style={{
                width: COL_WIDTHS[i],
                padding: 10,
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: '#fff',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                {h}
              </Text>
            </View>
          ))}
        </View>

        {/* Rows */}
        {rows.map((row, idx) => (
          <View
            key={row.id}
            style={{
              flexDirection: 'row',
              backgroundColor: rowsBg(idx),
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            {/* Main */}
            <View style={{ width: COL_WIDTHS[0], padding: 10 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: row.main === 'Income' ? colors.success : colors.error,
                }}
              >
                {row.main}
              </Text>
            </View>
            {/* Group */}
            <View style={{ width: COL_WIDTHS[1], padding: 10 }}>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                {row.group}
              </Text>
            </View>
            {/* Description (Code omitted) */}
            <View style={{ width: COL_WIDTHS[2], padding: 10 }}>
              <Text style={{ fontSize: 12, color: colors.text }}>
                {row.description}
              </Text>
            </View>
            {/* Debit */}
            <View
              style={{
                width: COL_WIDTHS[3],
                padding: 10,
                alignItems: 'flex-end',
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  color: row.debit > 0 ? colors.error : colors.textSecondary,
                }}
              >
                {row.debit > 0 ? formatPeso(row.debit) : '—'}
              </Text>
            </View>
            {/* Credit */}
            <View
              style={{
                width: COL_WIDTHS[4],
                padding: 10,
                alignItems: 'flex-end',
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  color: row.credit > 0 ? colors.success : colors.textSecondary,
                }}
              >
                {row.credit > 0 ? formatPeso(row.credit) : '—'}
              </Text>
            </View>
            {/* Total */}
            <View
              style={{
                width: COL_WIDTHS[5],
                padding: 10,
                alignItems: 'flex-end',
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: row.total >= 0 ? colors.success : colors.error,
                }}
              >
                {formatPeso(row.total)}
              </Text>
            </View>
          </View>
        ))}

        {/* Footer totals */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: colors.primary + '22',
            borderTopWidth: 2,
            borderTopColor: colors.primary,
          }}
        >
          <View
            style={{
              width: COL_WIDTHS[0] + COL_WIDTHS[1] + COL_WIDTHS[2],
              padding: 10,
            }}
          >
            <Text
              style={{ fontSize: 12, fontWeight: '800', color: colors.text }}
            >
              NET INCOME / (LOSS)
            </Text>
          </View>
          <View
            style={{
              width: COL_WIDTHS[3],
              padding: 10,
              alignItems: 'flex-end',
            }}
          >
            <Text
              style={{ fontSize: 12, fontWeight: '700', color: colors.error }}
            >
              {formatPeso(totalDebit)}
            </Text>
          </View>
          <View
            style={{
              width: COL_WIDTHS[4],
              padding: 10,
              alignItems: 'flex-end',
            }}
          >
            <Text
              style={{ fontSize: 12, fontWeight: '700', color: colors.success }}
            >
              {formatPeso(totalCredit)}
            </Text>
          </View>
          <View
            style={{
              width: COL_WIDTHS[5],
              padding: 10,
              alignItems: 'flex-end',
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: '800',
                color: netIncome >= 0 ? colors.success : colors.error,
              }}
            >
              {netIncome >= 0 ? '+' : '-'}
              {formatPeso(netIncome)}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

// ─── Summary Table (Item Net Summary) ────────────────────────────────────────
// Columns: Items | Contribution(%) Cost | Total Sales | Net Sales
// Example row: Keyboard  |  ₱100.00 (1%)  |  ₱350.00  |  ₱250.00

function SummaryTable({ rows, colors }: { rows: SummaryRow[]; colors: any }) {
  const totalSales = rows.reduce((s, r) => s + r.sellingPrice, 0);
  const totalContrib = rows.reduce((s, r) => s + r.costContribution, 0);
  const totalNet = rows.reduce((s, r) => s + r.net, 0);

  // Tighter widths — Items col just wide enough, contrib col fits ₱xx.xx (xx%) on one line
  const COL_WIDTHS = [160, 170, 110, 110];
  const HEADERS = ['Items', 'Contribution(%) Cost', 'Total Sales', 'Net Sales'];
  const rowsBg = (idx: number) =>
    idx % 2 === 0 ? colors.card : colors.background;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View>
        {/* Header */}
        <View style={{ flexDirection: 'row', backgroundColor: colors.accent }}>
          {HEADERS.map((h, i) => (
            <View
              key={h}
              style={{
                width: COL_WIDTHS[i],
                paddingHorizontal: 10,
                paddingVertical: 10,
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: '#fff',
                  textTransform: 'uppercase',
                  letterSpacing: 0.4,
                }}
              >
                {h}
              </Text>
            </View>
          ))}
        </View>

        {/* Rows */}
        {rows.map((row, idx) => {
          const itemPct =
            row.sellingPrice > 0
              ? (row.costContribution / row.sellingPrice) * 100
              : 0;

          return (
            <View
              key={row.id}
              style={{
                flexDirection: 'row',
                backgroundColor: rowsBg(idx),
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              {/* Items */}
              <View
                style={{
                  width: COL_WIDTHS[0],
                  paddingHorizontal: 10,
                  paddingVertical: 10,
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: colors.text,
                  }}
                  numberOfLines={2}
                >
                  {row.description}
                </Text>
              </View>

              {/* Contribution(%) Cost — ₱45.50 (39.3%) on one line */}
              <View
                style={{
                  width: COL_WIDTHS[1],
                  paddingHorizontal: 10,
                  paddingVertical: 10,
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: colors.text,
                  }}
                  numberOfLines={1}
                >
                  {formatPeso(row.costContribution)}{' '}
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '500',
                      color: colors.accent,
                    }}
                  >
                    ({itemPct.toFixed(1)}%)
                  </Text>
                </Text>
              </View>

              {/* Total Sales */}
              <View
                style={{
                  width: COL_WIDTHS[2],
                  paddingHorizontal: 10,
                  paddingVertical: 10,
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 12, color: colors.text }}>
                  {formatPeso(row.sellingPrice)}
                </Text>
              </View>

              {/* Net Sales */}
              <View
                style={{
                  width: COL_WIDTHS[3],
                  paddingHorizontal: 10,
                  paddingVertical: 10,
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: row.net >= 0 ? colors.success : colors.error,
                  }}
                >
                  {formatPeso(row.net)}
                </Text>
              </View>
            </View>
          );
        })}

        {/* Footer totals */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: colors.accent + '22',
            borderTopWidth: 2,
            borderTopColor: colors.accent,
          }}
        >
          <View
            style={{
              width: COL_WIDTHS[0],
              paddingHorizontal: 10,
              paddingVertical: 10,
            }}
          >
            <Text
              style={{ fontSize: 12, fontWeight: '800', color: colors.text }}
            >
              TOTALS
            </Text>
          </View>
          <View
            style={{
              width: COL_WIDTHS[1],
              paddingHorizontal: 10,
              paddingVertical: 10,
              alignItems: 'flex-end',
            }}
          >
            <Text
              style={{ fontSize: 12, fontWeight: '700', color: colors.text }}
              numberOfLines={1}
            >
              {formatPeso(totalContrib)}{' '}
              <Text style={{ fontSize: 11, color: colors.accent }}>
                (
                {totalSales > 0
                  ? ((totalContrib / totalSales) * 100).toFixed(1)
                  : '0.0'}
                %)
              </Text>
            </Text>
          </View>
          <View
            style={{
              width: COL_WIDTHS[2],
              paddingHorizontal: 10,
              paddingVertical: 10,
              alignItems: 'flex-end',
            }}
          >
            <Text
              style={{ fontSize: 12, fontWeight: '700', color: colors.text }}
            >
              {formatPeso(totalSales)}
            </Text>
          </View>
          <View
            style={{
              width: COL_WIDTHS[3],
              paddingHorizontal: 10,
              paddingVertical: 10,
              alignItems: 'flex-end',
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: '800',
                color: totalNet >= 0 ? colors.success : colors.error,
              }}
            >
              {formatPeso(totalNet)}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function BranchOverviewScreen() {
  const { user, logout } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchRevenues, setBranchRevenues] = useState<
    Record<string, BranchRevenue>
  >({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<DateRangeFilter>('today');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customStart, setCustomStart] = useState<Date | undefined>(undefined);
  const [customEnd, setCustomEnd] = useState<Date | undefined>(undefined);

  // Tab + view state
  const [activeTab, setActiveTab] = useState<TabKey>('expense');
  const [viewMode, setViewMode] = useState<ViewMode>('card'); // default: Card View
  const [gisRows, setGisRows] = useState<GISRow[]>(INITIAL_GIS_ROWS);
  const [summaryRows] = useState<SummaryRow[]>(INITIAL_SUMMARY_ROWS);

  // Load persisted view mode on mount
  useEffect(() => {
    AsyncStorage.getItem(VIEW_MODE_KEY)
      .then((saved) => {
        if (saved === 'table' || saved === 'card') {
          setViewMode(saved as ViewMode);
        }
      })
      .catch(() => {});
  }, []);

  // Persist view mode whenever it changes
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    AsyncStorage.setItem(VIEW_MODE_KEY, mode).catch(() => {});
  }, []);

  // Shared pagination state — does NOT reset on view toggle
  const [currentPage, setCurrentPage] = useState(1);

  // Card detail modal
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedCard, setSelectedCard] = useState<FinancialCardData | null>(
    null,
  );

  // Entry modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const modalAnim = useRef(new Animated.Value(0)).current;
  const [form, setForm] = useState<FormState>({
    orInvoice: '',
    centerDept: '',
    subCenter: '',
    vatType: '',
    amount: '',
    notes: '',
    requestedBy: '',
    accountTitle: '',
  });

  const socket = useWebSocket();
  const { colors } = useTheme();
  const { width } = Dimensions.get('window');
  const isTablet = width >= 768;
  const numColumns = getResponsiveColumns(width);
  const cardWidth = (width - 32) / numColumns;

  // ── WebSocket ──────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    socket.onmessage = async (event) => {
      const innerData = JSON.parse(event.data);
      if (innerData.type === 'NEW_TRANSACTION') {
        const { branchId, total } = innerData.payload;
        setBranchRevenues((prev) => ({
          ...prev,
          [branchId]: {
            ...prev[branchId],
            revenue: (prev[branchId]?.totalRevenue || 0) + total,
          },
        }));
      }
    };
  }, [socket]);

  // ── Data loading ────────────────────────────────────────────────
  const loadBranches = useCallback(async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = getDateRange(
        activeFilter,
        customStart,
        customEnd,
      );
      const branchData = await AdminService.getBranches();
      setBranches(branchData);
      const revenueResults = await Promise.all(
        branchData.map(async (branch) => ({
          branchId: branch.id,
          revenue: await AdminService.getBranchRevenue(
            branch.id,
            startDate,
            endDate,
          ),
        })),
      );
      const revenueMap = revenueResults.reduce(
        (acc, { branchId, revenue }) => {
          acc[branchId] = revenue;
          return acc;
        },
        {} as Record<string, BranchRevenue>,
      );
      setBranchRevenues(revenueMap);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }, [activeFilter, customStart, customEnd]);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  const handleCustomRange = (start: Date, end: Date) => {
    setCustomStart(start);
    setCustomEnd(end);
    setActiveFilter('custom');
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadBranches();
    setRefreshing(false);
  };

  const navigateToOutlets = (branchId: string, branchName: string) =>
    router.push({
      pathname: '/(admin)/outlets',
      params: { branchId, branchName },
    });

  const getTotalRevenue = () =>
    Object.values(branchRevenues).reduce((sum, r) => sum + r.totalRevenue, 0);
  const getTotalTransactions = () =>
    Object.values(branchRevenues).reduce(
      (sum, r) => sum + r.transactionCount,
      0,
    );

  // ── Pagination logic ────────────────────────────────────────────
  const activeDataset: FinancialCardData[] = useMemo(() => {
    if (activeTab === 'expense')
      return gisRows.map((r) => ({ type: 'gis' as const, row: r }));
    return summaryRows.map((r) => ({ type: 'summary' as const, row: r }));
  }, [activeTab, gisRows, summaryRows]);

  const totalPages = Math.max(1, Math.ceil(activeDataset.length / PAGE_SIZE));

  // When tab changes, reset to page 1
  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const pagedData = useMemo(
    () =>
      activeDataset.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE,
      ),
    [activeDataset, currentPage],
  );

  // Paged raw rows for table view
  const pagedGISRows = useMemo(
    () => gisRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [gisRows, currentPage],
  );
  const pagedSummaryRows = useMemo(
    () =>
      summaryRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [summaryRows, currentPage],
  );

  // ── Card interaction ────────────────────────────────────────────
  const handleCardPress = (data: FinancialCardData) => {
    setSelectedCard(data);
    setDetailModalVisible(true);
  };

  // ── Entry Modal helpers ─────────────────────────────────────────
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
      setForm({
        orInvoice: '',
        centerDept: '',
        subCenter: '',
        vatType: '',
        amount: '',
        notes: '',
        requestedBy: '',
        accountTitle: '',
      });
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
    setGisRows((prev) => [...prev, newRow]);
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

  // ── Render ───────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      {/* ── HEADER ─────────────────────────────────────────────── */}
      <View
        style={[
          s.header,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[s.title, { color: colors.text }]}>Admin Dashboard</Text>
          <Text style={[s.subtitle, { color: colors.textSecondary }]}>
            Welcome back, {user?.email}
          </Text>
        </View>
        <TouchableOpacity style={s.logoutButton} onPress={logout}>
          <LogOut size={18} color="white" strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* ── DATE FILTER BAR ────────────────────────────────────── */}
      <View style={[s.filterContainer, { backgroundColor: colors.card }]}>
        {DATE_FILTERS.map((filter) => {
          const { label } = getDateRange(filter, customStart, customEnd);
          const isActive = activeFilter === filter;
          return (
            <TouchableOpacity
              key={filter}
              style={[
                s.filterTab,
                isActive && { backgroundColor: colors.accent },
              ]}
              onPress={() =>
                filter === 'custom'
                  ? setShowDatePicker(true)
                  : setActiveFilter(filter)
              }
            >
              <Text
                style={[
                  s.filterTabText,
                  { color: isActive ? '#fff' : colors.text },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <DateRangePickerModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onApply={handleCustomRange}
        initialStart={customStart}
        initialEnd={customEnd}
      />

      {/* ── SUMMARY CARDS ──────────────────────────────────────── */}
      <View style={s.summaryContainer}>
        {loading && branches.length === 0 ? (
          <>
            <SkeletonStatCard colors={colors} />
            <SkeletonStatCard colors={colors} />
            <SkeletonStatCard colors={colors} />
          </>
        ) : (
          <>
            <View style={[s.summaryCard, { backgroundColor: colors.card }]}>
              <PhilippinePeso
                size={22}
                color={colors.success}
                strokeWidth={2}
              />
              <Text style={[s.summaryValue, { color: colors.text }]}>
                {formatPesoCompact(getTotalRevenue())}
              </Text>
              <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>
                Total Revenue
              </Text>
            </View>
            <View style={[s.summaryCard, { backgroundColor: colors.card }]}>
              <TrendingUp size={22} color={colors.accent} strokeWidth={2} />
              <Text style={[s.summaryValue, { color: colors.text }]}>
                {getTotalTransactions()}
              </Text>
              <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>
                Transactions
              </Text>
            </View>
            <View style={[s.summaryCard, { backgroundColor: colors.card }]}>
              <MapPin size={22} color={colors.warning} strokeWidth={2} />
              <Text style={[s.summaryValue, { color: colors.text }]}>
                {branches.length}
              </Text>
              <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>
                Active Branches
              </Text>
            </View>
          </>
        )}
      </View>

      {/* ── BRANCHES LIST ──────────────────────────────────────── */}
      <View style={[s.branchSection, { backgroundColor: colors.background }]}>
        <Text style={[s.sectionTitle, { color: colors.text }]}>Branches</Text>
        <ScrollView
          style={s.branchScroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          nestedScrollEnabled
        >
          {loading && branches.length === 0
            ? [1, 2, 3].map((i) => (
                <SkeletonBranchCard key={i} colors={colors} />
              ))
            : branches.map((branch) => {
                const revenue = branchRevenues[branch.id];
                return (
                  <TouchableOpacity
                    key={branch.id}
                    style={[
                      s.branchCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => navigateToOutlets(branch.id, branch.name)}
                    activeOpacity={0.82}
                  >
                    <View style={s.branchHeader}>
                      <View style={s.branchInfo}>
                        <Text style={[s.branchName, { color: colors.text }]}>
                          {branch.name}
                        </Text>
                        <View style={s.locationRow}>
                          <MapPin
                            size={13}
                            color={colors.textSecondary}
                            strokeWidth={2}
                          />
                          <Text
                            style={[
                              s.outletCount,
                              { color: colors.textSecondary },
                            ]}
                          >
                            {branch.outletIds.length} outlet
                            {branch.outletIds.length !== 1 ? 's' : ''}
                          </Text>
                        </View>
                      </View>
                      <View style={s.branchStats}>
                        <Text
                          style={[s.revenueAmount, { color: colors.success }]}
                        >
                          {formatPeso(revenue?.totalRevenue ?? 0)}
                        </Text>
                        <Text
                          style={[
                            s.transactionCount,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {revenue?.transactionCount ?? 0} txns
                        </Text>
                      </View>
                    </View>
                    <View
                      style={[
                        s.branchFooter,
                        { borderTopColor: colors.border },
                      ]}
                    >
                      <Text style={[s.viewDetails, { color: colors.primary }]}>
                        View Details →
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
        </ScrollView>
      </View>

      {/* ── TABS (renamed) ──────────────────────────────────────── */}
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

      {/* ── TABLE / CARD AREA ───────────────────────────────────── */}
      <ScrollView
        style={[s.tableArea, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* View Toggle + count info */}
        <View style={[s.tableToolbar, { borderBottomColor: colors.border }]}>
          <Text style={[s.tableToolbarInfo, { color: colors.textSecondary }]}>
            {activeDataset.length}{' '}
            {activeTab === 'expense' ? 'entries' : 'items'}
          </Text>
          <ViewToggle
            viewMode={viewMode}
            onChange={handleViewModeChange}
            colors={colors}
          />
        </View>

        <View style={{ padding: 12 }}>
          {loading ? (
            viewMode === 'table' ? (
              // Skeleton table rows
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                  {[...Array(7)].map((_, i) => (
                    <SkeletonTableRow key={i} colors={colors} />
                  ))}
                </View>
              </ScrollView>
            ) : (
              // Skeleton card grid
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {[...Array(6)].map((_, i) => (
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
              <GISTable rows={pagedGISRows} colors={colors} />
            ) : (
              <SummaryTable rows={pagedSummaryRows} colors={colors} />
            )
          ) : (
            // Card View
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {pagedData.map((item) => (
                <FinancialCard
                  key={item.type === 'gis' ? item.row.id : item.row.id}
                  data={item}
                  colors={colors}
                  cardWidth={cardWidth}
                  onPress={handleCardPress}
                />
              ))}
            </View>
          )}
        </View>

        {/* Pagination */}
        {!loading && (
          <PaginationControls
            page={currentPage}
            totalPages={totalPages}
            totalItems={activeDataset.length}
            onPrev={() => setCurrentPage((p) => Math.max(1, p - 1))}
            onNext={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            colors={colors}
          />
        )}
      </ScrollView>

      {/* ── NEW ENTRY BUTTON ────────────────────────────────────── */}
      <TouchableOpacity
        style={[s.newEntryBtn, { backgroundColor: colors.primary }]}
        onPress={openModal}
        activeOpacity={0.88}
      >
        <FileText size={16} color="#fff" strokeWidth={2} />
        <Text style={s.newEntryBtnText}>New Entry</Text>
      </TouchableOpacity>

      {/* ── FINANCIAL DETAIL MODAL ──────────────────────────────── */}
      <FinancialDetailModal
        visible={detailModalVisible}
        data={selectedCard}
        onClose={() => setDetailModalVisible(false)}
        colors={colors}
      />

      {/* ── ENTRY MODAL ─────────────────────────────────────────── */}
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
                    placeholder="e.g. OR-2024-00123"
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
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
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
    marginHorizontal: 16,
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

  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryValue: { fontSize: 16, fontWeight: '800', marginTop: 6 },
  summaryLabel: { fontSize: 10, marginTop: 3, textAlign: 'center' },

  branchSection: { paddingHorizontal: 16, paddingBottom: 6 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  branchScroll: { maxHeight: 230 },
  branchCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
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

  tabBar: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabLabel: { fontSize: 13, letterSpacing: 0.1 },

  tableArea: { flex: 1 },
  tableToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  tableToolbarInfo: { fontSize: 12, fontWeight: '500' },

  newEntryBtn: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 10,
  },
  newEntryBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.48)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 20,
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

  vatPreview: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
    gap: 6,
  },
  vatRow: { flexDirection: 'row', justifyContent: 'space-between' },
  vatLabel: { fontSize: 13 },
  vatValue: { fontSize: 13, fontWeight: '700' },

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

  successState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 14,
  },
  successText: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  successSub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});

// ─── Skeleton Styles ──────────────────────────────────────────────────────────

const sk = StyleSheet.create({
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  branchCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1 },
  financialCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
});

// ─── Financial Card Styles ────────────────────────────────────────────────────

const fc = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  name: { fontSize: 14, fontWeight: '600', flex: 1, marginRight: 8 },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  category: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amount: { fontSize: 15, fontWeight: '800' },
});

// ─── Detail Modal Styles ──────────────────────────────────────────────────────

const dm = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.52)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sheet: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  title: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  subtitle: { fontSize: 12, marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { paddingBottom: 20 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderBottomWidth: 1,
  },
  fieldLabel: { fontSize: 12, fontWeight: '500', flex: 1 },
  fieldValue: { fontSize: 13, fontWeight: '700', textAlign: 'right', flex: 1 },
});

// ─── View Toggle Styles ───────────────────────────────────────────────────────

const vt = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 9,
    borderWidth: 1,
    padding: 3,
    gap: 3,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 7,
  },
  label: { fontSize: 12, fontWeight: '600' },
});

// ─── Pagination Styles ────────────────────────────────────────────────────────

const pg = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    marginHorizontal: 12,
    marginTop: 4,
  },
  info: { fontSize: 12, fontWeight: '500' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  btnText: { fontSize: 13, fontWeight: '600' },
  pageIndicator: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 7 },
  pageText: { fontSize: 13, fontWeight: '700' },
});
