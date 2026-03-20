import React, { useMemo } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useTheme } from '@/contexts/ThemeContext';
import ChartCard from '@/components/erp/ChartCard';
import { financeData } from '@/data/erpMockData';

const fmt = (n: number) =>
  n >= 1_000_000 ? `₱${(n / 1_000_000).toFixed(2)}M` : `₱${(n / 1_000).toFixed(1)}K`;

export default function FinanceScreen() {
  const { colors, theme } = useTheme();
  const { width } = Dimensions.get('window');
  const isTablet = width >= 768;
  const chartWidth = isTablet ? Math.min((width - 280) * 0.95, 580) : width - 48;

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
      propsForBackgroundLines: { strokeDasharray: '4,4', stroke: colors.border },
    }),
    [colors, theme],
  );

  const profitMargin = ((financeData.profit / financeData.revenue) * 100).toFixed(1);

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: 16 },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      marginBottom: 12,
      marginTop: 8,
    },
    cardsRow: {
      flexDirection: isTablet ? 'row' : 'column',
      gap: 12,
      marginBottom: 24,
    },
    finCard: {
      flex: 1,
      borderRadius: 14,
      padding: 20,
      borderWidth: 1,
    },
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
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Financial Summary</Text>
      <View style={styles.cardsRow}>
        <View style={[styles.finCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.finCardLabel, { color: colors.textSecondary }]}>Revenue</Text>
          <Text style={[styles.finCardValue, { color: colors.text }]}>{fmt(financeData.revenue)}</Text>
          <Text style={[styles.finCardSub, { color: colors.success }]}>▲ 14.2% YoY</Text>
        </View>
        <View style={[styles.finCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.finCardLabel, { color: colors.textSecondary }]}>Expenses</Text>
          <Text style={[styles.finCardValue, { color: colors.text }]}>{fmt(financeData.expenses)}</Text>
          <Text style={[styles.finCardSub, { color: colors.error }]}>▲ 6.1% YoY</Text>
        </View>
        <View style={[styles.finCard, { backgroundColor: colors.primary, borderColor: 'transparent' }]}>
          <Text style={[styles.finCardLabel, { color: 'rgba(255,255,255,0.65)' }]}>Net Profit</Text>
          <Text style={[styles.finCardValue, { color: '#fff' }]}>{fmt(financeData.profit)}</Text>
          <Text style={[styles.finCardSub, { color: 'rgba(255,255,255,0.8)' }]}>
            {profitMargin}% margin
          </Text>
        </View>
      </View>

      <ChartCard title="Revenue vs Expenses" subtitle="Monthly breakdown (in thousands)">
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
            <Text style={styles.legendText}>Revenue</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
            <Text style={styles.legendText}>Expenses</Text>
          </View>
        </View>
        <LineChart
          data={{
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

      <Text style={styles.sectionTitle}>Monthly Breakdown</Text>
      {financeData.revenueVsExpenses.labels.map((month, idx) => {
        const rev = financeData.revenueVsExpenses.revenue[idx];
        const exp = financeData.revenueVsExpenses.expenses[idx];
        const profit = rev - exp;
        return (
          <View
            key={month}
            style={{
              backgroundColor: colors.card,
              borderRadius: 10,
              padding: 14,
              marginBottom: 8,
              borderWidth: 1,
              borderColor: colors.border,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, width: 36 }}>{month}</Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>Rev: ₱{(rev / 1000).toFixed(0)}K</Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>Exp: ₱{(exp / 1000).toFixed(0)}K</Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: profit >= 0 ? colors.success : colors.error }}>
              +₱{(profit / 1000).toFixed(0)}K
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}