// screens/FinanceScreen.tsx
// Full ERP Finance Module:
//   - Year selector (switches all data between 2025 / 2026)
//   - Monthly breakdown row → tap → detail modal
//   - Budget module wired in

import React, { useMemo, useState } from 'react';
import {
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { X } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import ChartCard from '@/components/erp/ChartCard';
import { BudgetModule } from '@/components/finance/BudgetModule';
import { INITIAL_GIS_ROWS } from '@/data/SummaryData';
import { financeData } from '@/data/erpMockData';

// ─── Types ────────────────────────────────────────────────────────────────────

type Year = '2024' | '2025' | '2026' | '2027';
const YEARS: Year[] = ['2024', '2025', '2026', '2027'];

interface MonthDetail {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

// ─── Per-year finance data ─────────────────────────────────────────────────────
// In the real app this comes from financeByYear[year] in erpMockData.
// We derive it here by applying a multiplier per year so the year picker
// actually changes the numbers visibly.

const YEAR_MULTIPLIERS: Record<Year, number> = {
  '2024': 0.72,
  '2025': 0.88,
  '2026': 1.0,
  '2027': 1.14,
};

const YOY_LABELS: Record<
  Year,
  { rev: string; exp: string; revUp: boolean; expUp: boolean }
> = {
  '2024': {
    rev: '▼ 12.0% vs 2023',
    exp: '▼ 8.5% vs 2023',
    revUp: false,
    expUp: false,
  },
  '2025': {
    rev: '▲ 8.3% vs 2024',
    exp: '▲ 5.1% vs 2024',
    revUp: true,
    expUp: true,
  },
  '2026': {
    rev: '▲ 14.2% vs 2025',
    exp: '▲ 6.1% vs 2025',
    revUp: true,
    expUp: true,
  },
  '2027': {
    rev: '▲ 9.7% proj.',
    exp: '▲ 4.2% proj.',
    revUp: true,
    expUp: true,
  },
};

function getYearData(year: Year) {
  const m = YEAR_MULTIPLIERS[year];
  const rev = financeData.revenueVsExpenses.revenue.map((v) =>
    Math.round(v * m),
  );
  const exp = financeData.revenueVsExpenses.expenses.map((v) =>
    Math.round(v * m),
  );
  const totalRev = rev.reduce((s, v) => s + v, 0);
  const totalExp = exp.reduce((s, v) => s + v, 0);
  return {
    revenue: totalRev,
    expenses: totalExp,
    profit: totalRev - totalExp,
    labels: financeData.revenueVsExpenses.labels,
    revenueByMonth: rev,
    expensesByMonth: exp,
  };
}

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n >= 1_000_000
    ? `₱${(n / 1_000_000).toFixed(2)}M`
    : `₱${(n / 1_000).toFixed(1)}K`;

const fmtFull = (n: number) =>
  '₱' + Math.abs(n).toLocaleString('en-PH', { minimumFractionDigits: 0 });

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
        {/* Header */}
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
          {/* Summary row */}
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

          {/* Detail section */}
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
              ['Expense Ratio', `${expRatio}%`, colors.accent],
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

          {/* Waterfall visual */}
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
            {/* Revenue bar */}
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
            {/* Expenses bar */}
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
                  width: `${expRatio}%`,
                  backgroundColor: colors.error,
                  borderRadius: 6,
                }}
              />
            </View>
            {/* Profit bar */}
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
                  width: `${Math.abs(parseFloat(margin))}%`,
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
  const isTablet = width >= 768;
  const chartWidth = isTablet
    ? Math.min((width - 280) * 0.95, 580)
    : width - 48;

  const [activeYear, setActiveYear] = useState<Year>('2026');
  const [selectedMonth, setSelectedMonth] = useState<MonthDetail | null>(null);
  const [monthModalOpen, setMonthModalOpen] = useState(false);

  const data = useMemo(() => getYearData(activeYear), [activeYear]);
  const yoy = YOY_LABELS[activeYear];
  const profitMargin =
    data.revenue > 0 ? ((data.profit / data.revenue) * 100).toFixed(1) : '0';

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
    // Year selector
    yearRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
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
    // Finance cards
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
    // Legend
    legendRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { fontSize: 13, fontWeight: '600', color: colors.text },
    // Monthly breakdown rows
    monthRow: {
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: 14,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
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
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Year selector ─────────────────────────────────────────────────────── */}
      <View style={styles.yearRow}>
        {YEARS.map((y) => (
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

      {/* ── Finance summary cards ──────────────────────────────────────────────── */}
      <Text style={styles.sectionTitle}>Financial Summary · {activeYear}</Text>
      <View style={styles.cardsRow}>
        <View
          style={[
            styles.finCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.finCardLabel, { color: colors.textSecondary }]}>
            Revenue
          </Text>
          <Text style={[styles.finCardValue, { color: colors.text }]}>
            {fmt(data.revenue)}
          </Text>
          <Text
            style={[
              styles.finCardSub,
              { color: yoy.revUp ? colors.success : colors.error },
            ]}
          >
            {yoy.rev}
          </Text>
        </View>
        <View
          style={[
            styles.finCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.finCardLabel, { color: colors.textSecondary }]}>
            Expenses
          </Text>
          <Text style={[styles.finCardValue, { color: colors.text }]}>
            {fmt(data.expenses)}
          </Text>
          <Text
            style={[
              styles.finCardSub,
              { color: yoy.expUp ? colors.error : colors.success },
            ]}
          >
            {yoy.exp}
          </Text>
        </View>
        <View
          style={[
            styles.finCard,
            { backgroundColor: colors.primary, borderColor: 'transparent' },
          ]}
        >
          <Text
            style={[styles.finCardLabel, { color: 'rgba(255,255,255,0.65)' }]}
          >
            Net Profit
          </Text>
          <Text style={[styles.finCardValue, { color: '#fff' }]}>
            {fmt(data.profit)}
          </Text>
          <Text style={[styles.finCardSub, { color: 'rgba(255,255,255,0.8)' }]}>
            {profitMargin}% margin
          </Text>
        </View>
      </View>

      {/* ── Revenue vs Expenses chart ──────────────────────────────────────────── */}
      <ChartCard
        title="Revenue vs Expenses"
        subtitle={`Monthly breakdown · ${activeYear} (in thousands)`}
      >
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendDot, { backgroundColor: colors.primary }]}
            />
            <Text style={styles.legendText}>Revenue</Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendDot, { backgroundColor: colors.accent }]}
            />
            <Text style={styles.legendText}>Expenses</Text>
          </View>
        </View>
        <LineChart
          data={{
            labels: data.labels,
            datasets: [
              {
                data: data.revenueByMonth.map((v) => v / 1000),
                color: (o = 1) => `rgba(27, 58, 107, ${o})`,
                strokeWidth: 2,
              },
              {
                data: data.expensesByMonth.map((v) => v / 1000),
                color: (o = 1) => `rgba(232, 119, 34, ${o})`,
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
      </ChartCard>

      {/* ── Monthly breakdown — tappable ───────────────────────────────────────── */}
      <Text style={styles.sectionTitle}>Monthly Breakdown · {activeYear}</Text>
      {data.labels.map((month, idx) => {
        const rev = data.revenueByMonth[idx];
        const exp = data.expensesByMonth[idx];
        const profit = rev - exp;
        const isPos = profit >= 0;
        return (
          <TouchableOpacity
            key={month}
            style={styles.monthRow}
            onPress={() => {
              setSelectedMonth({ month, revenue: rev, expenses: exp, profit });
              setMonthModalOpen(true);
            }}
            activeOpacity={0.78}
          >
            <Text style={styles.monthLabel}>{month}</Text>
            <View style={{ flex: 1, paddingHorizontal: 8 }}>
              <Text style={styles.monthSub}>
                Rev: ₱{(rev / 1000).toFixed(0)}K
              </Text>
              <Text style={styles.monthSub}>
                Exp: ₱{(exp / 1000).toFixed(0)}K
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text
                style={[
                  styles.monthProfit,
                  { color: isPos ? colors.success : colors.error },
                ]}
              >
                {isPos ? '+' : '-'}₱{(Math.abs(profit) / 1000).toFixed(0)}K
              </Text>
              <Text style={styles.tapHint}>Details →</Text>
            </View>
          </TouchableOpacity>
        );
      })}

      {/* ── Budget module ─────────────────────────────────────────────────────── */}
      <Text style={styles.sectionTitle}>Budget Planning</Text>
      <BudgetModule gisRows={INITIAL_GIS_ROWS} colors={colors} />

      {/* Month detail modal */}
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
