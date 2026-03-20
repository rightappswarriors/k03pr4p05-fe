import React, { useMemo } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useTheme } from '@/contexts/ThemeContext';
import ChartCard from '@/components/erp/ChartCard';
import { salesTrend, topProducts } from '@/data/erpMockData';

const fmt = (n: number) => `₱${(n / 1000).toFixed(1)}K`;

export default function SalesAnalyticsScreen() {
  const { colors, theme } = useTheme();
  const { width } = Dimensions.get('window');
  const isTablet = width >= 768;
  const chartWidth = isTablet ? Math.min((width - 280) * 0.95, 580) : width - 48;
  const currentMonthRevenue = salesTrend.data[salesTrend.data.length - 1];
  const prevMonthRevenue = salesTrend.data[salesTrend.data.length - 2];
  const growth = (((currentMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100).toFixed(1);
  const maxProductRevenue = topProducts[0].revenue;

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
      propsForDots: { r: '5', strokeWidth: '2', stroke: colors.accent },
      propsForBackgroundLines: { strokeDasharray: '4,4', stroke: colors.border },
    }),
    [colors, theme],
  );

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
    heroCard: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      padding: 24,
      marginBottom: 24,
      flexDirection: isTablet ? 'row' : 'column',
      alignItems: isTablet ? 'center' : 'flex-start',
      justifyContent: 'space-between',
    },
    heroLeft: { marginBottom: isTablet ? 0 : 16 },
    heroLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: 'rgba(255,255,255,0.6)',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    heroValue: {
      fontSize: 42,
      fontWeight: '900',
      color: '#fff',
      letterSpacing: -1.5,
      marginBottom: 4,
    },
    heroGrowth: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.8)',
      fontWeight: '600',
    },
    heroRight: {
      alignItems: isTablet ? 'flex-end' : 'flex-start',
    },
    heroStat: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.accent,
    },
    heroStatLabel: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.6)',
      marginTop: 2,
    },
    productCard: {
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: 14,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    productRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    rank: {
      fontSize: 16,
      fontWeight: '900',
      color: colors.textSecondary,
      width: 24,
    },
    productName: { fontSize: 14, fontWeight: '700', color: colors.text, flex: 1, marginHorizontal: 8 },
    productRevenue: { fontSize: 14, fontWeight: '700', color: colors.accent },
    barTrack: { height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 3, backgroundColor: colors.primary },
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Revenue This Month</Text>
      <View style={styles.heroCard}>
        <View style={styles.heroLeft}>
          <Text style={styles.heroLabel}>Monthly Revenue</Text>
          <Text style={styles.heroValue}>{fmt(currentMonthRevenue)}</Text>
          <Text style={styles.heroGrowth}>▲ {growth}% vs last month</Text>
        </View>
        <View style={styles.heroRight}>
          <Text style={styles.heroStat}>{salesTrend.data.length}</Text>
          <Text style={styles.heroStatLabel}>Months tracked</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Top 5 Products by Revenue</Text>
      {topProducts.map((product, idx) => (
        <View key={product.name} style={styles.productCard}>
          <View style={styles.productRow}>
            <Text style={styles.rank}>#{idx + 1}</Text>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.productRevenue}>${product.revenue.toLocaleString()}</Text>
          </View>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${(product.revenue / maxProductRevenue) * 100}%` }]} />
          </View>
        </View>
      ))}

      <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Sales Trend</Text>
      <ChartCard title="Monthly Sales Performance" subtitle="Jan–Jun (in thousands)">
        <LineChart
          data={{
            labels: salesTrend.labels,
            datasets: [{ data: salesTrend.data.map((v) => v / 1000) }],
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
    </ScrollView>
  );
}