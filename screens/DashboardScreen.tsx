import React, { useMemo } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';

import { useTheme } from '@/contexts/ThemeContext';
import StatCard from '@/components/erp/StatCard';
import ChartCard from '@/components/erp/ChartCard';
import {
  dashboardStats,
  salesTrend,
  inventoryDistribution,
  financeData,
} from '@/data/erpMockData';

const fmt = (n: number) =>
  n >= 1_000_000
    ? `₱${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
      ? `₱${(n / 1_000).toFixed(0)}K`
      : `₱${n}`;

export default function DashboardScreen() {
  const { colors, theme } = useTheme();
  const { width } = Dimensions.get('window');
  const isTablet = width >= 768;

  // On mobile the cards sit in a 2-column wrap, so chart width accounts for padding only
  const chartWidth = isTablet
    ? Math.min((width - 280) * 0.95, 560)
    : width - 48;

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
      propsForDots: {
        r: '4',
        strokeWidth: '2',
        stroke: colors.accent,
      },
      propsForBackgroundLines: {
        strokeDasharray: '4,4',
        stroke: colors.border,
      },
    }),
    [colors, theme],
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      padding: 16,
      paddingBottom: 32,
    },
    sectionTitle: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      marginBottom: 10,
      marginTop: 4,
    },
    // ── Stat cards: 2-column grid, equal height via alignItems stretch ──
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 20,
    },
    statWrap: {
      // Each card takes ~half the width minus gap
      width: isTablet ? undefined : '47.5%',
      flex: isTablet ? 1 : undefined,
      minWidth: isTablet ? 130 : undefined,
    },
    // ── Charts ───────────────────────────────────────────────────────────
    chartsRow: {
      flexDirection: isTablet ? 'row' : 'column',
      gap: 12,
      marginBottom: 4,
    },
    chartFlex: {
      flex: isTablet ? 1 : undefined,
    },
    // ── Quick summary ────────────────────────────────────────────────────
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
    summaryValue: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.text,
    },
    summaryLabel: {
      fontSize: 10,
      color: colors.textSecondary,
      marginTop: 3,
      textAlign: 'center',
    },
  });

  const revData = {
    labels: financeData.revenueVsExpenses.labels,
    datasets: [
      {
        data: financeData.revenueVsExpenses.revenue.map((v) => v / 1000),
        color: (o = 1) => `rgba(27, 58, 107, ${o})`,
        strokeWidth: 2,
      },
      {
        data: financeData.revenueVsExpenses.expenses.map((v) => v / 1000),
        color: (o = 1) => `rgba(232, 119, 34, ${o})`,
        strokeWidth: 2,
      },
    ],
    legend: ['Revenue (K)', 'Expenses (K)'],
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* ── KEY METRICS ─────────────────────────────────────────── */}
      <Text style={styles.sectionTitle}>Key Metrics</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statWrap}>
          <StatCard
            label="Total Sales"
            value={fmt(dashboardStats.totalSales)}
            icon="sales"
            trend="+12%"
            trendUp
            accent
          />
        </View>
        <View style={styles.statWrap}>
          <StatCard
            label="Inventory Items"
            value={dashboardStats.inventoryItems}
            icon="inventory"
            trend="-3%"
            trendUp={false}
          />
        </View>
        <View style={styles.statWrap}>
          <StatCard
            label="Employees"
            value={dashboardStats.employees}
            icon="hr"
            trend="+2"
            trendUp
          />
        </View>
        <View style={styles.statWrap}>
          <StatCard
            label="Monthly Profit"
            value={fmt(dashboardStats.monthlyProfit)}
            icon="profit"
            trend="+8%"
            trendUp
          />
        </View>
      </View>

      {/* ── ANALYTICS CHARTS ────────────────────────────────────── */}
      <Text style={styles.sectionTitle}>Analytics</Text>
      <View style={styles.chartsRow}>
        <View style={styles.chartFlex}>
          <ChartCard title="Sales Trend" subtitle="Monthly revenue (Jan–Jun)">
            <LineChart
              data={{
                labels: salesTrend.labels,
                datasets: [{ data: salesTrend.data.map((v) => v / 1000) }],
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

      {/* ── REVENUE VS EXPENSES ─────────────────────────────────── */}
      <ChartCard
        title="Revenue vs Expenses"
        subtitle="6-month financial overview (₱ thousands)"
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

      {/* ── QUICK SUMMARY ───────────────────────────────────────── */}
      <Text style={styles.sectionTitle}>Quick Summary</Text>
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
    </ScrollView>
  );
}