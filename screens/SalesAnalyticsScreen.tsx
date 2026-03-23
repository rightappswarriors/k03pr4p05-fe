// screens/SalesAnalyticsScreen.tsx
// Full ERP Sales Analytics — searchable outlet dropdown with skeleton,
// period filter, product detail modal, responsive layout

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
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import {
  ChevronDown,
  Search,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import ChartCard from '@/components/erp/ChartCard';
import {
  dashboardStats,
  financeData,
  salesTrend,
  salesTrendByQuarter,
  topProducts,
} from '@/data/erpMockData';

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = 'Monthly' | 'Quarterly';
type OutletKey = string;

interface Outlet {
  id: string;
  name: string;
  city: string;
}

// ─── Mock outlet database (simulates API) ─────────────────────────────────────

const ALL_OUTLETS: Outlet[] = [
  { id: 'all', name: 'All Outlets', city: '' },
  { id: 'main', name: 'Main Branch', city: 'Iloilo' },
  { id: 'cebu', name: 'Cebu Branch', city: 'Cebu City' },
  { id: 'davao', name: 'Davao Branch', city: 'Davao City' },
  { id: 'mnl', name: 'Manila Branch', city: 'Manila' },
  { id: 'bohol', name: 'Bohol Outlet', city: 'Tagbilaran' },
  { id: 'bacd', name: 'Bacolod Branch', city: 'Bacolod' },
  { id: 'gensan', name: 'GenSan Outlet', city: 'General Santos' },
  { id: 'cdo', name: 'Cagayan de Oro', city: 'Cagayan de Oro' },
  { id: 'zam', name: 'Zamboanga Outlet', city: 'Zamboanga City' },
  { id: 'iriga', name: 'Iriga City Outlet', city: 'Iriga' },
  { id: 'lipa', name: 'Lipa Branch', city: 'Lipa City' },
];

const OUTLET_MULTIPLIERS: Record<OutletKey, number> = {
  all: 1,
  main: 0.52,
  cebu: 0.31,
  davao: 0.17,
  mnl: 0.44,
  bohol: 0.09,
  bacd: 0.19,
  gensan: 0.13,
  cdo: 0.21,
  zam: 0.08,
  iriga: 0.06,
  lipa: 0.15,
};

// Simulated search — filters locally but with a 1000ms delay to mimic API
function simulateSearch(query: string): Promise<Outlet[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const q = query.trim().toLowerCase();
      const results = q
        ? ALL_OUTLETS.filter(
            (o) =>
              o.name.toLowerCase().includes(q) ||
              o.city.toLowerCase().includes(q),
          )
        : ALL_OUTLETS;
      resolve(results);
    }, 1000);
  });
}

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmtK = (n: number) => `₱${(n / 1000).toFixed(1)}K`;
const fmtM = (n: number) =>
  n >= 1_000_000
    ? `₱${(n / 1_000_000).toFixed(2)}M`
    : `₱${(n / 1_000).toFixed(0)}K`;
const fmtFull = (n: number) =>
  '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 0 });

// ─── Skeleton pulse ───────────────────────────────────────────────────────────

function SkeletonPulse({ style, colors }: { style: any; colors: any }) {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    ).start();
    return () => anim.stopAnimation();
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

// ─── Skeleton layouts ─────────────────────────────────────────────────────────

function HeroSkeleton({ colors }: { colors: any }) {
  return (
    <View
      style={{
        backgroundColor: colors.primary,
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
      }}
    >
      <SkeletonPulse
        colors={{ border: 'rgba(255,255,255,0.15)' }}
        style={{ width: 200, height: 14, marginBottom: 14 }}
      />
      <SkeletonPulse
        colors={{ border: 'rgba(255,255,255,0.2)' }}
        style={{ width: 150, height: 48, marginBottom: 12 }}
      />
      <SkeletonPulse
        colors={{ border: 'rgba(255,255,255,0.15)' }}
        style={{ width: 180, height: 14, marginBottom: 20 }}
      />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              backgroundColor: 'rgba(255,255,255,0.08)',
              borderRadius: 10,
              padding: 12,
            }}
          >
            <SkeletonPulse
              colors={{ border: 'rgba(255,255,255,0.18)' }}
              style={{ width: '80%', height: 20, marginBottom: 6 }}
            />
            <SkeletonPulse
              colors={{ border: 'rgba(255,255,255,0.12)' }}
              style={{ width: '60%', height: 11 }}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

function SummaryCardsSkeleton({ colors }: { colors: any }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          style={{
            flex: 1,
            backgroundColor: colors.card,
            borderRadius: 12,
            padding: 14,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <SkeletonPulse
            colors={colors}
            style={{ width: '60%', height: 10, marginBottom: 8 }}
          />
          <SkeletonPulse colors={colors} style={{ width: '80%', height: 22 }} />
        </View>
      ))}
    </View>
  );
}

function ProductCardSkeleton({ colors }: { colors: any }) {
  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 14,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <View
        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}
      >
        <SkeletonPulse colors={colors} style={{ width: 28, height: 18 }} />
        <SkeletonPulse
          colors={colors}
          style={{ flex: 1, height: 16, marginHorizontal: 8 }}
        />
        <SkeletonPulse colors={colors} style={{ width: 60, height: 16 }} />
      </View>
      <SkeletonPulse
        colors={colors}
        style={{ width: '100%', height: 6, borderRadius: 3, marginBottom: 8 }}
      />
      <SkeletonPulse colors={colors} style={{ width: 100, height: 11 }} />
    </View>
  );
}

function ChartSkeleton({
  colors,
  height = 220,
}: {
  colors: any;
  height?: number;
}) {
  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <SkeletonPulse
        colors={colors}
        style={{ width: 160, height: 16, marginBottom: 6 }}
      />
      <SkeletonPulse
        colors={colors}
        style={{ width: 120, height: 11, marginBottom: 16 }}
      />
      <SkeletonPulse
        colors={colors}
        style={{ width: '100%', height, borderRadius: 8 }}
      />
    </View>
  );
}

// ─── Outlet Search Dropdown ───────────────────────────────────────────────────

function OutletDropdown({
  selected,
  onSelect,
  colors,
}: {
  selected: Outlet;
  onSelect: (o: Outlet) => void;
  colors: any;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  // Start with the full list — no loading on open
  const [results, setResults] = useState<Outlet[]>(ALL_OUTLETS);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Only called when user taps the Search button or presses return
  const doSearch = useCallback(async () => {
    setLoading(true);
    const res = await simulateSearch(query);
    setResults(res);
    setLoading(false);
  }, [query]);

  const handleOpen = () => {
    setOpen(true);
    setQuery('');
    setResults(ALL_OUTLETS); // show full list immediately, no spinner
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  const handleClear = () => {
    setQuery('');
    setResults(ALL_OUTLETS); // reset to full list instantly
  };

  const handleSelect = (o: Outlet) => {
    onSelect(o);
    setOpen(false);
    setQuery('');
  };

  return (
    <>
      {/* Trigger button */}
      <TouchableOpacity
        style={[
          odd.trigger,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
        onPress={handleOpen}
        activeOpacity={0.8}
      >
        <View
          style={[
            odd.dot,
            {
              backgroundColor:
                selected.id === 'all' ? colors.primary : colors.accent,
            },
          ]}
        />
        <Text
          style={[odd.triggerText, { color: colors.text }]}
          numberOfLines={1}
        >
          {selected.id === 'all' ? 'All Outlets' : selected.name}
        </Text>
        <ChevronDown size={14} color={colors.textSecondary} strokeWidth={2} />
      </TouchableOpacity>

      {/* Dropdown modal */}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
        statusBarTranslucent
      >
        <TouchableOpacity
          style={odd.backdrop}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <TouchableOpacity
            style={[odd.sheet, { backgroundColor: colors.surface }]}
            activeOpacity={1}
            onPress={() => {}}
          >
            {/* Search row — input + Search button + clear */}
            <View style={[odd.searchRow, { borderBottomColor: colors.border }]}>
              <TextInput
                ref={inputRef}
                style={[odd.searchInput, { color: colors.text }]}
                placeholder="Search outlet or city…"
                placeholderTextColor={colors.textSecondary}
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
                returnKeyType="search"
                onSubmitEditing={doSearch} // keyboard search key still works
              />
              {/* Clear button — only when there's text and not loading */}
              {!loading && query.length > 0 && (
                <TouchableOpacity
                  onPress={handleClear}
                  style={odd.clearBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={13} color={colors.textSecondary} strokeWidth={2} />
                </TouchableOpacity>
              )}
              {/* Search button — tapping this is the main trigger */}
              <TouchableOpacity
                style={[
                  odd.searchBtn,
                  { backgroundColor: loading ? colors.border : colors.primary },
                ]}
                onPress={doSearch}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Search size={14} color="#fff" strokeWidth={2.5} />
                )}
              </TouchableOpacity>
            </View>

            {/* Hint text */}
            {!loading && results.length === ALL_OUTLETS.length && (
              <View
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  backgroundColor: colors.background,
                }}
              >
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                  {query
                    ? 'Tap Search to filter results'
                    : `${ALL_OUTLETS.length} outlets · type to filter`}
                </Text>
              </View>
            )}

            {/* Result list */}
            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 320 }}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isActive = selected.id === item.id;
                return (
                  <TouchableOpacity
                    style={[
                      odd.resultRow,
                      { borderBottomColor: colors.border },
                      isActive && { backgroundColor: colors.primary + '14' },
                    ]}
                    onPress={() => handleSelect(item)}
                    activeOpacity={0.75}
                  >
                    <View
                      style={[
                        odd.resultDot,
                        {
                          backgroundColor:
                            item.id === 'all' ? colors.primary : colors.accent,
                        },
                      ]}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          odd.resultName,
                          {
                            color: isActive ? colors.primary : colors.text,
                            fontWeight: isActive ? '700' : '500',
                          },
                        ]}
                      >
                        {item.name}
                      </Text>
                      {item.city ? (
                        <Text
                          style={[
                            odd.resultCity,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {item.city}
                        </Text>
                      ) : null}
                    </View>
                    {isActive && (
                      <Text style={{ color: colors.primary, fontSize: 16 }}>
                        ✓
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                    No outlets found
                  </Text>
                </View>
              }
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const odd = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    maxWidth: 220,
  },
  dot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  triggerText: { fontSize: 13, fontWeight: '600', flex: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 20,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 4 },
  clearBtn: { padding: 4 },
  searchBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
  },
  resultDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  resultName: { fontSize: 14 },
  resultCity: { fontSize: 11, marginTop: 1 },
});

// ─── Product Detail Modal ─────────────────────────────────────────────────────

function ProductDetailModal({
  product,
  rank,
  visible,
  onClose,
  colors,
  maxRevenue,
}: {
  product: (typeof topProducts)[0] | null;
  rank: number;
  visible: boolean;
  onClose: () => void;
  colors: any;
  maxRevenue: number;
}) {
  if (!product) return null;
  const share = maxRevenue > 0 ? (product.revenue / maxRevenue) * 100 : 0;
  const revenuePerUnit =
    product.units > 0 ? product.revenue / product.units : 0;
  const isTop = rank === 1;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableOpacity
        style={pdm.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          style={[pdm.card, { backgroundColor: colors.surface }]}
          activeOpacity={1}
          onPress={() => {}}
        >
          <View style={[pdm.header, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
                <View
                  style={[
                    pdm.badge,
                    { backgroundColor: isTop ? colors.accent : colors.primary },
                  ]}
                >
                  <Text style={pdm.badgeText}>#{rank}</Text>
                </View>
                {isTop && (
                  <View style={[pdm.badge, { backgroundColor: '#F59E0B' }]}>
                    <Text style={pdm.badgeText}>Top Seller</Text>
                  </View>
                )}
              </View>
              <Text style={[pdm.name, { color: colors.text }]}>
                {product.name}
              </Text>
            </View>
            <TouchableOpacity
              style={[pdm.closeBtn, { backgroundColor: colors.background }]}
              onPress={onClose}
            >
              <X size={16} color={colors.text} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <View style={pdm.grid}>
            {[
              {
                label: 'Total Revenue',
                value: fmtFull(product.revenue),
                color: colors.accent,
                big: true,
              },
              {
                label: 'Units Sold',
                value: product.units.toLocaleString(),
                color: colors.text,
                big: true,
              },
              {
                label: 'Revenue / Unit',
                value: fmtFull(revenuePerUnit),
                color: colors.primary,
                big: false,
              },
              {
                label: 'Share of Top 5',
                value: `${share.toFixed(1)}%`,
                color: colors.success,
                big: false,
              },
            ].map((stat) => (
              <View
                key={stat.label}
                style={[
                  pdm.statCell,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '700',
                    color: colors.textSecondary,
                    letterSpacing: 0.5,
                    marginBottom: 4,
                  }}
                >
                  {stat.label.toUpperCase()}
                </Text>
                <Text
                  style={{
                    fontSize: stat.big ? 20 : 16,
                    fontWeight: '900',
                    color: stat.color,
                  }}
                >
                  {stat.value}
                </Text>
              </View>
            ))}
          </View>

          <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
            <Text
              style={{
                fontSize: 10,
                fontWeight: '700',
                color: colors.textSecondary,
                letterSpacing: 0.5,
                marginBottom: 8,
              }}
            >
              SHARE OF TOTAL TOP-5 REVENUE
            </Text>
            <View
              style={{
                height: 10,
                backgroundColor: colors.border,
                borderRadius: 5,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  height: '100%',
                  width: `${share}%`,
                  backgroundColor: colors.accent,
                  borderRadius: 5,
                }}
              />
            </View>
            <Text
              style={{
                fontSize: 11,
                color: colors.textSecondary,
                marginTop: 4,
              }}
            >
              {share.toFixed(1)}% of top-5 revenue
            </Text>
          </View>

          <TouchableOpacity
            style={[pdm.closeFullBtn, { backgroundColor: colors.primary }]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>
              Close
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const pdm = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: { width: '100%', maxWidth: 440, borderRadius: 18, overflow: 'hidden' },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    gap: 12,
  },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  name: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    padding: 20,
    paddingBottom: 14,
  },
  statCell: {
    flex: 1,
    minWidth: '44%',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
  },
  closeFullBtn: {
    margin: 20,
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SalesAnalyticsScreen() {
  const { colors, theme } = useTheme();
  const { width } = Dimensions.get('window');
  const isTablet = width >= 768;
  const isDesktop = width >= 1024;

  const chartWidth = isDesktop
    ? Math.min((width - 320) * 0.47, 500)
    : isTablet
      ? Math.min((width - 280) * 0.95, 560)
      : width - 48;

  const [period, setPeriod] = useState<Period>('Monthly');
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet>(ALL_OUTLETS[0]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<
    (typeof topProducts)[0] | null
  >(null);
  const [selectedRank, setSelectedRank] = useState(1);
  const [productModalOpen, setProductModalOpen] = useState(false);

  // Simulate loading when outlet or period changes
  const prevOutlet = useRef(selectedOutlet.id);
  const prevPeriod = useRef(period);

  useEffect(() => {
    const outletChanged = prevOutlet.current !== selectedOutlet.id;
    const periodChanged = prevPeriod.current !== period;
    if (outletChanged || periodChanged) {
      prevOutlet.current = selectedOutlet.id;
      prevPeriod.current = period;
      setLoading(true);
      const t = setTimeout(() => setLoading(false), 1000);
      return () => clearTimeout(t);
    }
  }, [selectedOutlet.id, period]);

  const multiplier = OUTLET_MULTIPLIERS[selectedOutlet.id] ?? 1;

  // ── Derived chart data ──────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    if (period === 'Quarterly') {
      return {
        labels: salesTrendByQuarter.labels,
        data: salesTrendByQuarter.data.map((v) => (v * multiplier) / 1000),
        subtitle: `Quarterly · ${selectedOutlet.name}`,
      };
    }
    return {
      labels: salesTrend.labels,
      data: salesTrend.data.map((v) => (v * multiplier) / 1000),
      subtitle: `Monthly · Jan–Jun · ${selectedOutlet.name}`,
    };
  }, [period, multiplier, selectedOutlet.name]);

  const currentRevenue =
    (period === 'Monthly'
      ? salesTrend.data[salesTrend.data.length - 1]
      : salesTrendByQuarter.data[salesTrendByQuarter.data.length - 1]) *
    multiplier;

  const prevRevenue =
    (period === 'Monthly'
      ? salesTrend.data[salesTrend.data.length - 2]
      : salesTrendByQuarter.data[salesTrendByQuarter.data.length - 2]) *
    multiplier;

  const growth =
    prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0;
  const isGrowthUp = growth >= 0;

  const adjustedProducts = useMemo(
    () =>
      topProducts.map((p) => ({
        ...p,
        revenue: Math.round(p.revenue * multiplier),
        units: Math.round(p.units * multiplier),
      })),
    [multiplier],
  );
  const maxRevenue = adjustedProducts[0]?.revenue ?? 1;
  const totalRevenue = financeData.revenue * multiplier;
  const totalExpenses = financeData.expenses * multiplier;
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin =
    totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0';

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
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      marginBottom: 10,
      marginTop: 8,
    },
    // Top controls row — period toggle + outlet dropdown on same line
    controlsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 16,
    },
    segGroup: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    segBtn: { paddingHorizontal: 14, paddingVertical: 8 },
    segBtnActive: { backgroundColor: colors.primary },
    segBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    segBtnTextAct: { color: '#fff' },
    // Hero
    heroCard: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
    },
    heroLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: 'rgba(255,255,255,0.6)',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    heroValue: {
      fontSize: isDesktop ? 48 : 40,
      fontWeight: '900',
      color: '#fff',
      letterSpacing: -1.5,
      marginBottom: 4,
    },
    heroDivider: {
      height: 1,
      backgroundColor: 'rgba(255,255,255,0.15)',
      marginVertical: 14,
    },
    heroStatsRow: { flexDirection: 'row', gap: 12 },
    heroStatBox: {
      flex: 1,
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderRadius: 10,
      padding: 12,
    },
    heroStatVal: { fontSize: 18, fontWeight: '800', color: '#fff' },
    heroStatLbl: { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
    // Summary
    summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    summaryCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    summaryLbl: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    summaryVal: { fontSize: 16, fontWeight: '900' },
    // Products
    productCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    productRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    rank: {
      fontSize: 16,
      fontWeight: '900',
      color: colors.textSecondary,
      width: 28,
    },
    productName: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      flex: 1,
      marginHorizontal: 8,
    },
    productRev: { fontSize: 14, fontWeight: '700', color: colors.accent },
    barTrack: {
      height: 6,
      backgroundColor: colors.border,
      borderRadius: 3,
      overflow: 'hidden',
    },
    barFill: { height: '100%', borderRadius: 3 },
    unitText: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
    // Desktop charts side by side
    chartsRow: { flexDirection: isDesktop ? 'row' : 'column', gap: 12 },
    chartFlex: { flex: isDesktop ? 1 : undefined },
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Controls: period toggle + outlet search dropdown ─────────────────── */}
      <View style={styles.controlsRow}>
        {/* Period toggle */}
        <View style={styles.segGroup}>
          {(['Monthly', 'Quarterly'] as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.segBtn, period === p && styles.segBtnActive]}
              onPress={() => setPeriod(p)}
            >
              <Text
                style={[
                  styles.segBtnText,
                  period === p && styles.segBtnTextAct,
                ]}
              >
                {p}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Outlet dropdown — single line, never wraps */}
        <OutletDropdown
          selected={selectedOutlet}
          onSelect={(outlet) => setSelectedOutlet(outlet)}
          colors={colors}
        />
      </View>

      {/* ── Loading state — skeleton everything ──────────────────────────────── */}
      {loading ? (
        <>
          <HeroSkeleton colors={colors} />
          <SummaryCardsSkeleton colors={colors} />
          <SkeletonPulse
            colors={colors}
            style={{ width: 160, height: 11, marginBottom: 10 }}
          />
          {[1, 2, 3, 4, 5].map((i) => (
            <ProductCardSkeleton key={i} colors={colors} />
          ))}
          <SkeletonPulse
            colors={colors}
            style={{ width: 140, height: 11, marginTop: 16, marginBottom: 10 }}
          />
          <ChartSkeleton colors={colors} />
          <ChartSkeleton colors={colors} height={200} />
        </>
      ) : (
        <>
          {/* ── Hero card ─────────────────────────────────────────────────────── */}
          <View style={styles.heroCard}>
            <Text style={styles.heroLabel}>
              {period === 'Monthly' ? 'This Month' : 'This Quarter'} Revenue ·{' '}
              {selectedOutlet.name}
            </Text>
            <Text style={styles.heroValue}>{fmtM(currentRevenue)}</Text>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              {isGrowthUp ? (
                <TrendingUp size={16} color="#34D399" strokeWidth={2} />
              ) : (
                <TrendingDown size={16} color="#F87171" strokeWidth={2} />
              )}
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: isGrowthUp ? '#34D399' : '#F87171',
                }}
              >
                {isGrowthUp ? '▲' : '▼'} {Math.abs(growth).toFixed(1)}% vs
                previous {period === 'Monthly' ? 'month' : 'quarter'}
              </Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStatsRow}>
              <View style={styles.heroStatBox}>
                <Text style={styles.heroStatVal}>{fmtM(netProfit)}</Text>
                <Text style={styles.heroStatLbl}>Net Profit</Text>
              </View>
              <View style={styles.heroStatBox}>
                <Text style={styles.heroStatVal}>{profitMargin}%</Text>
                <Text style={styles.heroStatLbl}>Profit Margin</Text>
              </View>
              <View style={styles.heroStatBox}>
                <Text style={styles.heroStatVal}>
                  {period === 'Monthly'
                    ? salesTrend.data.length
                    : salesTrendByQuarter.data.length}
                </Text>
                <Text style={styles.heroStatLbl}>Periods tracked</Text>
              </View>
            </View>
          </View>

          {/* ── Summary cards ─────────────────────────────────────────────────── */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLbl}>REVENUE</Text>
              <Text style={[styles.summaryVal, { color: colors.success }]}>
                {fmtM(totalRevenue)}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLbl}>EXPENSES</Text>
              <Text style={[styles.summaryVal, { color: colors.error }]}>
                {fmtM(totalExpenses)}
              </Text>
            </View>
            <View
              style={[
                styles.summaryCard,
                { backgroundColor: colors.primary, borderColor: 'transparent' },
              ]}
            >
              <Text
                style={[styles.summaryLbl, { color: 'rgba(255,255,255,0.6)' }]}
              >
                NET PROFIT
              </Text>
              <Text style={[styles.summaryVal, { color: '#fff' }]}>
                {fmtM(netProfit)}
              </Text>
            </View>
          </View>

          {/* ── Top 5 products ────────────────────────────────────────────────── */}
          <Text style={styles.sectionTitle}>
            Top 5 Products · {selectedOutlet.name}
          </Text>
          {adjustedProducts.map((product, idx) => {
            const barW =
              maxRevenue > 0 ? (product.revenue / maxRevenue) * 100 : 0;
            const isFirst = idx === 0;
            return (
              <TouchableOpacity
                key={product.name}
                style={[
                  styles.productCard,
                  isFirst && { borderColor: colors.accent, borderWidth: 1.5 },
                ]}
                onPress={() => {
                  setSelectedProduct(product);
                  setSelectedRank(idx + 1);
                  setProductModalOpen(true);
                }}
                activeOpacity={0.82}
              >
                <View style={styles.productRow}>
                  <Text
                    style={[styles.rank, isFirst && { color: colors.accent }]}
                  >
                    #{idx + 1}
                  </Text>
                  <Text style={styles.productName} numberOfLines={1}>
                    {product.name}
                  </Text>
                  <Text style={styles.productRev}>{fmtK(product.revenue)}</Text>
                </View>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${barW}%`,
                        backgroundColor: isFirst
                          ? colors.accent
                          : colors.primary,
                      },
                    ]}
                  />
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginTop: 5,
                  }}
                >
                  <Text style={styles.unitText}>
                    {product.units.toLocaleString()} units sold
                  </Text>
                  <Text style={[styles.unitText, { color: colors.primary }]}>
                    Tap for details →
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}

          {/* ── Charts ────────────────────────────────────────────────────────── */}
          <Text style={[styles.sectionTitle, { marginTop: 16 }]}>
            Sales Trend · {selectedOutlet.name}
          </Text>
          <View style={styles.chartsRow}>
            <View style={styles.chartFlex}>
              <ChartCard
                title={`${period} Sales Performance`}
                subtitle={chartData.subtitle}
              >
                <LineChart
                  data={{
                    labels: chartData.labels,
                    datasets: [{ data: chartData.data }],
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
            </View>
            {isDesktop && (
              <View style={styles.chartFlex}>
                <ChartCard
                  title="Revenue vs Expenses"
                  subtitle={`Overview · ${selectedOutlet.name}`}
                >
                  <LineChart
                    data={{
                      labels: financeData.revenueVsExpenses.labels,
                      datasets: [
                        {
                          data: financeData.revenueVsExpenses.revenue.map(
                            (v) => (v * multiplier) / 1000,
                          ),
                          color: (o = 1) => `rgba(27, 58, 107, ${o})`,
                          strokeWidth: 2,
                        },
                        {
                          data: financeData.revenueVsExpenses.expenses.map(
                            (v) => (v * multiplier) / 1000,
                          ),
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
              </View>
            )}
          </View>

          {!isDesktop && (
            <ChartCard
              title="Revenue vs Expenses"
              subtitle={`6-month overview · ${selectedOutlet.name}`}
            >
              <LineChart
                data={{
                  labels: financeData.revenueVsExpenses.labels,
                  datasets: [
                    {
                      data: financeData.revenueVsExpenses.revenue.map(
                        (v) => (v * multiplier) / 1000,
                      ),
                      color: (o = 1) => `rgba(27, 58, 107, ${o})`,
                      strokeWidth: 2,
                    },
                    {
                      data: financeData.revenueVsExpenses.expenses.map(
                        (v) => (v * multiplier) / 1000,
                      ),
                      color: (o = 1) => `rgba(232, 119, 34, ${o})`,
                      strokeWidth: 2,
                    },
                  ],
                }}
                width={chartWidth}
                height={200}
                chartConfig={chartConfig}
                bezier
                withInnerLines
                withOuterLines={false}
                style={{ borderRadius: 8, marginLeft: -16 }}
              />
            </ChartCard>
          )}
        </>
      )}

      {/* Product detail modal */}
      <ProductDetailModal
        product={selectedProduct}
        rank={selectedRank}
        visible={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        colors={colors}
        maxRevenue={maxRevenue}
      />
    </ScrollView>
  );
}
