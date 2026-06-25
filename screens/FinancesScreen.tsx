// screens/FinanceScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { X } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
import ChartCard from '@/components/erp/ChartCard';
import { BudgetModule } from '@/components/finance/BudgetModule';
import { FinanceService, SalesService } from '@/services';
import { SummaryRow } from '@/data/SummaryData';
import { getProfitOrExpense } from '@/utils/moneyHelpers';

// ─── Types ────────────────────────────────────────────────────────────────────

type Year = '2024' | '2025' | '2026' | '2027';

interface MonthDetail {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

interface MonthlyData {
  month: string;
  revenue: number;
  expenses: number;
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

// Smart formatter that handles all number ranges
const fmt = (n: number): string => {
  const abs = Math.abs(n);

  if (abs >= 1_000_000) {
    return `₱${(n / 1_000_000).toFixed(2)}M`;
  } else if (abs >= 1_000) {
    return `₱${(n / 1_000).toFixed(1)}K`;
  } else {
    return `₱${n.toFixed(0)}`;
  }
};

const fmtFull = (n: number): string =>
  '₱' + Math.abs(n).toLocaleString('en-PH', { minimumFractionDigits: 2 });

// Group transactions by month with revenue from summary rows
const groupTransactionsByMonth = (
  transactions: any[],
  summaryRows: SummaryRow[],
  gisRows: any[],
): MonthlyData[] => {
  const monthlyData: Record<number, MonthlyData> = {};

  // Initialize all 12 months
  for (let i = 0; i < 12; i++) {
    monthlyData[i] = {
      month: MONTH_NAMES[i],
      revenue: 0,
      expenses: 0,
    };
  }
  const getMonthIndex = (value: any): number | null => {
    const date = new Date(value ?? '');
    if (Number.isNaN(date.getTime())) return null;
    const monthIndex = date.getMonth();
    return monthIndex >= 0 && monthIndex <= 11 ? monthIndex : null;
  };
  transactions.forEach((tx) => {
    const monthIndex = getMonthIndex(tx.createdAt);
    if (monthIndex === null) return;
    monthlyData[monthIndex].revenue += Number(tx.total) || 0;
  })

  // Aggregate revenue from summary rows (INCOME status)
  summaryRows.forEach((row) => {
    const monthIndex = getMonthIndex(row.createdAt);
    if (monthIndex === null) return;

    if (row.status === 'INCOME') {
      monthlyData[monthIndex].revenue += Math.abs(row.netProfit || 0);
    }
  });

  // Aggregate expenses from GIS rows (debit entries)
  gisRows.forEach((row) => {
    const monthIndex = getMonthIndex(row.createdAt);
    if (monthIndex === null) return;

    monthlyData[monthIndex].expenses += Number(row.debit) || 0;
  });

  // Also add LOSS from summary rows to expenses
  summaryRows.forEach((row) => {
    const monthIndex = getMonthIndex(row.createdAt);
    if (monthIndex === null) return;

    if (row.status === 'LOSS') {
      monthlyData[monthIndex].expenses += Math.abs(row.netProfit || 0);
    }
  });

  return Object.values(monthlyData);
};

// Calculate total expenses from GIS rows
const calculateExpensesFromGIS = (gisRows: any[]): number => {
  return gisRows.reduce((total, row) => {
    return total + (Number(row.debit) || 0);
  }, 0);
};

// Calculate revenue and expenses from Summary Rows
const calculateFromSummaryRows = (
  summaryRows: SummaryRow[],
): { loss: number; profit: number } => {
  return summaryRows.reduce(
    (acc, row) => {
      if (row.status === 'LOSS') {
        acc.loss += Math.abs(row.netProfit || 0);
      } else if (row.status === 'INCOME') {
        acc.profit += Math.abs(row.netProfit || 0);
      }
      return acc;
    },
    { loss: 0, profit: 0 },
  );
};

// Calculate YoY change
const calculateYoYChange = (
  currentYearData: number,
  previousYearData: number,
): { percentage: string; isUp: boolean } => {
  if (previousYearData === 0) {
    return { percentage: '—', isUp: false };
  }

  const change =
    ((currentYearData - previousYearData) / previousYearData) * 100;
  const isUp = change >= 0;

  return {
    percentage: `${isUp ? '▲' : '▼'} ${Math.abs(change).toFixed(1)}%`,
    isUp,
  };
};

// ─── Tooltip Component ────────────────────────────────────────────────────────

function CardTooltip({
  visible,
  value,
  color,
  position = 'bottom',
}: {
  visible: boolean;
  value: string;
  color: string;
  position?: 'bottom' | 'top';
}) {
  if (!visible) return null;

  return (
    <View
      style={[
        tooltipStyles.container,
        position === 'bottom' ? tooltipStyles.bottom : tooltipStyles.top,
        { backgroundColor: color },
      ]}
    >
      <Text style={tooltipStyles.text}>{value}</Text>
      <View
        style={[
          tooltipStyles.arrow,
          position === 'bottom' ? tooltipStyles.arrowUp : tooltipStyles.arrowDown,
          { borderBottomColor: position === 'bottom' ? color : 'transparent', borderTopColor: position === 'top' ? color : 'transparent' },
        ]}
      />
    </View>
  );
}

const tooltipStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    zIndex: 1000,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
      },
    }),
  },
  bottom: {
    bottom: -45,
    left: '50%',
    transform: [{ translateX: -50 }],
  },
  top: {
    top: -45,
    left: '50%',
    transform: [{ translateX: -50 }],
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  arrow: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    left: '50%',
    marginLeft: -6,
  },
  arrowUp: {
    top: -6,
    borderBottomWidth: 6,
  },
  arrowDown: {
    bottom: -6,
    borderTopWidth: 6,
  },
});

// ─── Financial Card Component ─────────────────────────────────────────────────

function FinancialCard({
  label,
  value,
  subtitle,
  isPrimary = false,
  colors,
  fullValue,
  tooltipColor,
}: {
  label: string;
  value: string;
  subtitle: string;
  isPrimary?: boolean;
  colors: any;
  fullValue: string;
  tooltipColor: string;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const isWeb = Platform.OS === 'web';

  const handlePress = () => {
    if (!isWeb) {
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 2500);
    }
  };

  // Inline styles for the card component
  const cardStyles = {
    finCard: {
      flex: 1,
      borderRadius: 14,
      padding: 20,
      borderWidth: 1
    },
    finCardLabel: {
      fontSize: 12,
      fontWeight: '700' as const,
      letterSpacing: 1,
      textTransform: 'uppercase' as const,
      marginBottom: 8,
    },
    finCardValue: {
      fontSize: 28,
      fontWeight: '900' as const,
      letterSpacing: -1,
      marginBottom: 4,
    },
    finCardSub: {
      fontSize: 13,
      fontWeight: '500' as const
    },
  };

  const cardContent = (
    <View style={{ position: 'relative' }}>
      <Text
        style={[
          cardStyles.finCardLabel,
          {
            color: isPrimary
              ? 'rgba(255,255,255,0.65)'
              : colors.textSecondary,
          },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          cardStyles.finCardValue,
          { color: isPrimary ? '#fff' : colors.text },
        ]}
      >
        {value}
      </Text>
      <Text
        style={[
          cardStyles.finCardSub,
          {
            color: isPrimary
              ? 'rgba(255,255,255,0.8)'
              : subtitle.includes('▲')
                ? colors.success
                : subtitle.includes('▼')
                  ? colors.error
                  : colors.textSecondary,
          },
        ]}
      >
        {subtitle}
      </Text>
      <CardTooltip
        visible={showTooltip}
        value={fullValue}
        color={tooltipColor}
      />
    </View>
  );

  if (isWeb) {
    const WebView = View as any; // Type assertion for web-specific props
    return (
      <WebView
        style={[
          cardStyles.finCard,
          {
            backgroundColor: isPrimary ? colors.primary : colors.card,
            borderColor: isPrimary ? 'transparent' : colors.border,
          },
        ]}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {cardContent}
      </WebView>
    );
  }

  return (
    <TouchableOpacity
      style={[
        cardStyles.finCard,
        {
          backgroundColor: isPrimary ? colors.primary : colors.card,
          borderColor: isPrimary ? 'transparent' : colors.border,
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.85}
    >
      {cardContent}
    </TouchableOpacity>
  );
}

// ─── Chart Data Point Component ───────────────────────────────────────────────

function ChartDataPoint({
  x,
  y,
  index,
  revenue,
  expenses,
  colors,
  theme,
}: {
  x: number;
  y: number;
  index: number;
  revenue: number;
  expenses: number;
  colors: any;
  theme: string;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const isWeb = Platform.OS === 'web';

  const containerStyle = {
    position: 'absolute' as const,
    left: x - 12,
    top: y - 12,
    width: 24,
    height: 24,
  };

  const WebView = isWeb ? (View as any) : View;
  const webProps = isWeb ? {
    onMouseEnter: () => setShowTooltip(true),
    onMouseLeave: () => setShowTooltip(false),
  } : {};

  return (
    <WebView
      style={containerStyle}
      {...webProps}
    >
      <TouchableOpacity
        onPress={() => {
          if (!isWeb) {
            setShowTooltip(true);
            setTimeout(() => setShowTooltip(false), 2500);
          }
        }}
        style={{ width: '100%', height: '100%' }}
      >
        {showTooltip && (
          <View
            style={{
              position: 'absolute',
              bottom: 30,
              left: -40,
              backgroundColor: colors.card,
              padding: 10,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors.border,
              minWidth: 120,
              zIndex: 1000,
              ...Platform.select({
                web: {
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                },
                default: {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 4,
                  elevation: 5,
                },
              }),
            }}
          >
            <Text
              style={{
                fontSize: 11,
                color: colors.success,
                fontWeight: '700',
                marginBottom: 4,
              }}
            >
              Revenue: {fmtFull(revenue)}
            </Text>
            <Text
              style={{
                fontSize: 11,
                color: colors.error,
                fontWeight: '700',
              }}
            >
              Expenses: {fmtFull(expenses)}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </WebView>
  );
}

// ─── Month Detail Modal ───────────────────────────────────────────────────────

function MonthDetailModal({
  detail,
  visible,
  onClose,
  year,
  colors,
}: {
  detail: MonthDetail | null;
  visible: boolean;
  onClose: () => void;
  year: Year;
  colors: any;
}) {
  if (!detail) return null;

  const margin =
    detail.revenue > 0
      ? ((detail.profit / detail.revenue) * 100).toFixed(1)
      : '0';
  const expRatio =
    detail.revenue > 0 ? (detail.expenses / detail.revenue) * 100 : 0;
  const isProfit = detail.profit >= 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View
          style={[
            mdm.header,
            { backgroundColor: isProfit ? colors.primary : colors.error },
          ]}
        >
          <View>
            <Text style={mdm.headerSub}>{year} · Monthly Breakdown</Text>
            <Text style={mdm.headerTitle}>{detail.month}</Text>
          </View>
          <TouchableOpacity style={mdm.closeBtn} onPress={onClose}>
            <X size={16} color="#fff" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            {[
              {
                label: 'Revenue',
                value: fmtFull(detail.revenue),
                color: colors.success,
              },
              {
                label: 'Expenses',
                value: fmtFull(detail.expenses),
                color: colors.error,
              },
              {
                label: isProfit ? 'Profit' : 'Loss',
                value: fmtFull(detail.profit),
                color: isProfit ? colors.success : colors.error,
              },
            ].map((s) => (
              <View
                key={s.label}
                style={[
                  mdm.statCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={[mdm.statLabel, { color: colors.textSecondary }]}>
                  {s.label}
                </Text>
                <Text style={[mdm.statValue, { color: s.color }]}>
                  {s.value}
                </Text>
              </View>
            ))}
          </View>

          <View
            style={[
              mdm.section,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[mdm.sectionTitle, { color: colors.textSecondary }]}>
              FINANCIAL DETAIL
            </Text>
            {[
              ['Gross Revenue', fmtFull(detail.revenue), colors.text],
              ['Total Expenses', fmtFull(detail.expenses), colors.error],
              ['Expense Ratio', `${expRatio.toFixed(1)}%`, colors.accent],
              [
                'Net Profit / (Loss)',
                fmtFull(detail.profit),
                isProfit ? colors.success : colors.error,
              ],
              [
                'Profit Margin',
                `${margin}%`,
                isProfit ? colors.success : colors.error,
              ],
            ].map(([label, value, color], i, arr) => (
              <View
                key={label as string}
                style={[
                  mdm.row,
                  {
                    borderBottomColor: colors.border,
                    borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                  },
                ]}
              >
                <Text style={[mdm.rowLabel, { color: colors.textSecondary }]}>
                  {label as string}
                </Text>
                <Text style={[mdm.rowValue, { color: color as string }]}>
                  {value as string}
                </Text>
              </View>
            ))}
          </View>

          <View
            style={[
              mdm.section,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                marginTop: 12,
                padding: 16,
              },
            ]}
          >
            <Text
              style={[
                mdm.sectionTitle,
                { color: colors.textSecondary, marginBottom: 14 },
              ]}
            >
              BREAKDOWN
            </Text>
            <Text
              style={{
                fontSize: 11,
                color: colors.textSecondary,
                marginBottom: 4,
              }}
            >
              Revenue
            </Text>
            <View
              style={{
                height: 12,
                backgroundColor: colors.border,
                borderRadius: 6,
                overflow: 'hidden',
                marginBottom: 10,
              }}
            >
              <View
                style={{
                  height: '100%',
                  width: '100%',
                  backgroundColor: colors.success,
                  borderRadius: 6,
                }}
              />
            </View>
            <Text
              style={{
                fontSize: 11,
                color: colors.textSecondary,
                marginBottom: 4,
              }}
            >
              Expenses
            </Text>
            <View
              style={{
                height: 12,
                backgroundColor: colors.border,
                borderRadius: 6,
                overflow: 'hidden',
                marginBottom: 10,
              }}
            >
              <View
                style={{
                  height: '100%',
                  width: `${Math.min(expRatio, 100)}%`,
                  backgroundColor: colors.error,
                  borderRadius: 6,
                }}
              />
            </View>
            <Text
              style={{
                fontSize: 11,
                color: colors.textSecondary,
                marginBottom: 4,
              }}
            >
              {isProfit ? 'Profit' : 'Loss'}
            </Text>
            <View
              style={{
                height: 12,
                backgroundColor: colors.border,
                borderRadius: 6,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  height: '100%',
                  width: `${Math.min(Math.abs(parseFloat(margin)), 100)}%`,
                  backgroundColor: isProfit ? colors.primary : colors.error,
                  borderRadius: 6,
                }}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[mdm.closeFullBtn, { backgroundColor: colors.primary }]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>
              Close
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

const mdm = StyleSheet.create({
  header: {
    paddingTop: 52,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginBottom: 3 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#fff' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCard: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: { fontSize: 14, fontWeight: '900' },
  section: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    padding: 12,
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  rowLabel: { fontSize: 13, fontWeight: '500' },
  rowValue: { fontSize: 13, fontWeight: '700', textAlign: 'right' },
  closeFullBtn: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function FinanceScreen() {
  const { colors, theme } = useTheme();
  const { width } = Dimensions.get('window');
  const isDesktop = width >= 1024;

  const isTablet = width >= 768;
  const chartWidth = isTablet
    ? Math.min((width - 280) * 0.95, 580)
    : width - 48;

  // State
  const [activeYear, setActiveYear] = useState<Year>('2026');
  const [selectedMonth, setSelectedMonth] = useState<MonthDetail | null>(null);
  const [monthModalOpen, setMonthModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Data state
  const [currentYearData, setCurrentYearData] = useState<MonthlyData[]>([]);
  const [previousYearData, setPreviousYearData] = useState<MonthlyData[]>([]);
  const [gisRows, setGisRows] = useState<any[]>([]);
  const [summaryRows, setSummaryRows] = useState<any[]>([]);
  const [availableYears, setAvailableYears] = useState<Year[]>([]);

  // Load available years and data
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const currentYear = new Date().getFullYear();

        // Generate available years (org created year to current + 1)
        const years: Year[] = [];
        for (let y = 2024; y <= currentYear + 1; y++) {
          years.push(String(y) as Year);
        }
        setAvailableYears(years);

        // Load current year data
        const [transactions, gis, summaryRows] = await Promise.all([
          SalesService.getTransactionsByYear(activeYear),
          FinanceService.getGISRows(
            `${activeYear}-01-01T00:00:00.000Z`,
            `${activeYear}-12-31T23:59:59.999Z`,
          ),
          FinanceService.getSummaryRowFinance(
            `${activeYear}-01-01T00:00:00.000Z`,
            `${activeYear}-12-31T23:59:59.999Z`,
          ),
        ]);

        setGisRows(gis || []);
        setSummaryRows(summaryRows || []);

        // Use the new grouping function with all data sources
        const monthlyData = groupTransactionsByMonth(
          transactions,
          summaryRows || [],
          gis || [],
        );
        setCurrentYearData(monthlyData);

        // Load previous year data for YoY comparison
        const prevYear = String(parseInt(activeYear) - 1);
        const [prevTransactions, prevGis, prevSummaryRows] = await Promise.all([
          SalesService.getTransactionsByYear(prevYear),
          FinanceService.getGISRows(
            `${prevYear}-01-01T00:00:00.000Z`,
            `${prevYear}-12-31T23:59:59.999Z`,
          ),
          FinanceService.getSummaryRowFinance(
            `${prevYear}-01-01T00:00:00.000Z`,
            `${prevYear}-12-31T23:59:59.999Z`,
          ),
        ]);

        const prevMonthlyData = groupTransactionsByMonth(
          prevTransactions,
          prevSummaryRows || [],
          prevGis || [],
        );
        setPreviousYearData(prevMonthlyData);
      } catch (error) {
        if (__DEV__) console.error('Failed to load finance data:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [activeYear]);

  // Calculate totals
  const totals = useMemo(() => {
    const revenue = currentYearData.reduce((sum, m) => sum + m.revenue, 0);
    const expenses = currentYearData.reduce((sum, m) => sum + m.expenses, 0);
    const profit = revenue - expenses;

    const prevRevenue = previousYearData.reduce((sum, m) => sum + m.revenue, 0);
    const prevExpenses = previousYearData.reduce(
      (sum, m) => sum + m.expenses,
      0,
    );

    const revenueYoY = calculateYoYChange(revenue, prevRevenue);
    const expensesYoY = calculateYoYChange(expenses, prevExpenses);

    const profitMargin =
      revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : '0';

    return {
      revenue,
      expenses,
      profit,
      profitMargin,
      revenueYoY,
      expensesYoY,
    };
  }, [currentYearData, previousYearData]);

  // Chart configuration
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

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: 16, paddingBottom: 40 },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      marginBottom: 12,
      marginTop: 8,
    },
    yearRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
      flexWrap: 'wrap',
    },
    yearPill: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    yearPillAct: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    yearPillTxt: { fontSize: 13, fontWeight: '700', color: colors.text },
    yearPillTxtA: { color: '#fff' },
    cardsRow: {
      flexDirection: isTablet ? 'row' : 'column',
      gap: 12,
      marginBottom: 20,
    },
    finCard: { flex: 1, borderRadius: 14, padding: 20, borderWidth: 1 },
    finCardLabel: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    finCardValue: {
      fontSize: 28,
      fontWeight: '900',
      letterSpacing: -1,
      marginBottom: 4,
    },
    finCardSub: { fontSize: 13, fontWeight: '500' },
    legendRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { fontSize: 13, fontWeight: '600', color: colors.text },
    monthsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    monthRow: {
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      // Grid layout
      width: isDesktop
        ? `${(100 - 4) / 3}%` // 3 columns on desktop
        : isTablet
          ? `${(100 - 2) / 2}%` // 2 columns on tablet
          : '100%', // Full width on mobile
    },
    monthLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      width: 36,
    },
    monthSub: { fontSize: 12, color: colors.textSecondary },
    monthProfit: { fontSize: 14, fontWeight: '700' },
    tapHint: {
      fontSize: 10,
      color: colors.primary,
      marginTop: 2,
      textAlign: 'right',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 12,
    },
  });

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.emptyText}>Loading financial data...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* Year selector */}
      <View style={styles.yearRow}>
        {availableYears.map((y) => (
          <TouchableOpacity
            key={y}
            style={[styles.yearPill, activeYear === y && styles.yearPillAct]}
            onPress={() => setActiveYear(y)}
          >
            <Text
              style={[
                styles.yearPillTxt,
                activeYear === y && styles.yearPillTxtA,
              ]}
            >
              {y}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Financial Summary Cards */}
      <Text style={styles.sectionTitle}>Financial Summary · {activeYear}</Text>
      <View style={styles.cardsRow}>
        <FinancialCard
          label="Revenue"
          value={fmt(totals.revenue)}
          subtitle={`${totals.revenueYoY.percentage} vs ${parseInt(activeYear) - 1}`}
          fullValue={fmtFull(totals.revenue)}
          tooltipColor={colors.success}
          colors={colors}
        />
        <FinancialCard
          label="Expenses"
          value={fmt(totals.expenses)}
          subtitle={`${totals.expensesYoY.percentage} vs ${parseInt(activeYear) - 1}`}
          fullValue={fmtFull(totals.expenses)}
          tooltipColor={colors.error}
          colors={colors}
        />
        <FinancialCard
          label="Net Profit"
          value={fmt(totals.profit)}
          subtitle={`${totals.profitMargin}% margin`}
          fullValue={fmtFull(totals.profit)}
          tooltipColor={totals.profit >= 0 ? colors.success : colors.error}
          isPrimary
          colors={colors}
        />
      </View>

      {/* Revenue vs Expenses Chart */}
      <ChartCard
        title="Revenue vs Expenses"
        subtitle={`Monthly breakdown · ${activeYear}`}
      >
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendDot, { backgroundColor: colors.success }]}
            />
            <Text style={styles.legendText}>Revenue</Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendDot, { backgroundColor: colors.error }]}
            />
            <Text style={styles.legendText}>Expenses</Text>
          </View>
        </View>
        {currentYearData.length > 0 ? (
          <LineChart
            data={{
              labels: currentYearData.map((m) => m.month),
              datasets: [
                {
                  data: currentYearData.map((m) => m.revenue),
                  color: (o = 1) =>
                    theme === 'dark'
                      ? `rgba(34, 197, 94, ${o})` // Green for revenue
                      : `rgba(22, 163, 74, ${o})`,
                  strokeWidth: 2,
                },
                {
                  data: currentYearData.map((m) => m.expenses),
                  color: (o = 1) =>
                    theme === 'dark'
                      ? `rgba(239, 68, 68, ${o})` // Red for expenses
                      : `rgba(220, 38, 38, ${o})`,
                  strokeWidth: 2,
                },
              ],
            }}
            width={chartWidth}
            height={220}
            chartConfig={chartConfig}
            bezier
            withInnerLines
            withOuterLines={false}
            style={{ borderRadius: 8, marginLeft: -16 }}
          />
        ) : (
          <Text style={styles.emptyText}>
            No data available for {activeYear}
          </Text>
        )}
      </ChartCard>

      {/* Monthly Breakdown */}
      <Text style={styles.sectionTitle}>Monthly Breakdown · {activeYear}</Text>
      <View style={styles.monthsGrid}>
        {currentYearData.map((monthData) => {
          const profit = monthData.revenue - monthData.expenses;
          const isPos = profit >= 0;
          return (
            <TouchableOpacity
              key={monthData.month}
              style={styles.monthRow}
              onPress={() => {
                setSelectedMonth({
                  month: monthData.month,
                  revenue: monthData.revenue,
                  expenses: monthData.expenses,
                  profit,
                });
                setMonthModalOpen(true);
              }}
              activeOpacity={0.78}
            >
              <Text style={styles.monthLabel}>{monthData.month}</Text>
              <View style={{ flex: 1, paddingHorizontal: 8 }}>
                <Text style={[styles.monthSub, { color: colors.success }]}>
                  Rev: {fmt(monthData.revenue)}
                </Text>
                <Text style={[styles.monthSub, { color: colors.error }]}>
                  Exp: {fmt(monthData.expenses)}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text
                  style={[
                    styles.monthProfit,
                    { color: isPos ? colors.success : colors.error },
                  ]}
                >
                  {isPos ? '+' : ''}
                  {fmt(profit)}
                </Text>
                <Text style={styles.tapHint}>Details →</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Budget Module */}
      <Text style={styles.sectionTitle}>Budget Planning</Text>
      <BudgetModule gisRows={gisRows} colors={colors} />

      {/* Month Detail Modal */}
      <MonthDetailModal
        detail={selectedMonth}
        visible={monthModalOpen}
        onClose={() => setMonthModalOpen(false)}
        year={activeYear}
        colors={colors}
      />
    </ScrollView>
  );
}