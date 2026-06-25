// screens/SalesAnalyticsScreen.tsx
// CHANGES (2025-06-17):
// - FEAT: Item Performance table view with sortable columns (Rank, Item, Revenue,
//         Profit, Margin, Units Sold, Status, Trend); horizontally scrollable.
// - FEAT: Cards / Table toggle (LayoutGrid / TableProperties icons) shown only
//         on tablet+ (≥768 px). Mobile always forces card view.
// - FEAT: AsyncStorage key 'salesAnalytics_itemViewMode' persists the toggle
//         across sessions, merged into existing mount effect.
// - FEAT: Responsive card grid — 3 cols on desktop (≥1100), 2 cols on tablet
//         (≥768), 1 col on mobile. Cards use flexWrap + percentage widths.
// - FIX:  Guard against table mode being restored on narrow screens.

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
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Package,
  BarChart2,
  Building2,
  X,
  Calendar,
  LayoutGrid,
  TableProperties,
} from 'lucide-react-native';
import { gql } from 'graphql-request';
import { useTheme } from '@/contexts/ThemeContext';
import ChartCard from '@/components/erp/ChartCard';
import DateRangePickerModal from '@/components/DateRangePickerModal';
import { graphQLRequest } from '@/services/apiClient';
import {
  AnalyticsService,
  type DateRangePreset,
  type SalesAnalyticsPayload,
  type BranchPerformance,
  type ItemPerformance,
  type PaginatedItemAnalyticsPayload,
  type SourceBreakdown,
} from '@/services/analyticsService';
import { formatShortDate } from '@/utils/dateHelpers';
import ItemControls from '@/components/ItemControls';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawBranch {
  id: number;
  name: string;
  address: string;
  isActive: boolean;
}

type ItemViewMode = 'card' | 'table';
type TableSortKey = 'rank' | 'revenue' | 'profit' | 'margin' | 'units';
type TableSortDir = 'asc' | 'desc';

// ─── Constants ────────────────────────────────────────────────────────────────

const ITEM_VIEW_MODE_KEY = 'salesAnalytics_itemViewMode';

const PRESETS: { key: DateRangePreset; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'this_week', label: 'This Week' },
  { key: 'this_month', label: 'This Month' },
  { key: 'all', label: 'All Time' },
  { key: 'custom', label: 'Custom' },
];

const STATUS_META: Record<
  ItemPerformance['status'],
  { label: string; bg: string; text: string }
> = {
  top_seller: { label: 'Top Seller', bg: '#D1FAE5', text: '#065F46' },
  stable: { label: 'Stable', bg: '#DBEAFE', text: '#1E40AF' },
  slow_mover: { label: 'Slow Mover', bg: '#FEF3C7', text: '#92400E' },
  loss_item: { label: 'Loss Item', bg: '#FEE2E2', text: '#991B1B' },
};

const SOURCE_META: Record<
  SourceBreakdown['source'],
  { label: string; color: string }
> = {
  pos: { label: 'POS Terminal', color: '#1B3A6B' },
  sales_order_walk_in: { label: 'Sales Order Walk-in', color: '#E87722' },
  sales_order_other: { label: 'Sales Orders', color: '#7C3AED' },
  kompra: { label: 'Kompra Orders', color: '#10B981' },
};

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmtM = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `₱${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 100_000) return `₱${Math.round(n / 1_000)}K`;
  return `₱${Math.round(n).toLocaleString('en-PH')}`;
};

const fmtFull = (n: number, decimals = 0) =>
  (n < 0 ? '-₱' : '₱') +
  Math.abs(n).toLocaleString('en-PH', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;

// ─── Skeleton Pulse ───────────────────────────────────────────────────────────

function SkeletonPulse({ style, color }: { style: any; color: string }) {
  const anim = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.35, duration: 650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View style={[{ backgroundColor: color, borderRadius: 6, opacity: anim }, style]} />
  );
}

function HeroSkeleton({ colors }: { colors: any }) {
  const bone = 'rgba(255,255,255,0.18)';
  return (
    <View style={{ backgroundColor: colors.primary, borderRadius: 16, padding: 20, marginBottom: 16 }}>
      <SkeletonPulse color={bone} style={{ width: 180, height: 12, marginBottom: 14 }} />
      <SkeletonPulse color={bone} style={{ width: 140, height: 44, marginBottom: 12 }} />
      <SkeletonPulse color={bone} style={{ width: 160, height: 12, marginBottom: 18 }} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: 12 }}>
            <SkeletonPulse color={bone} style={{ width: '75%', height: 18, marginBottom: 6 }} />
            <SkeletonPulse color={bone} style={{ width: '55%', height: 10 }} />
          </View>
        ))}
      </View>
    </View>
  );
}

function CardSkeleton({ colors }: { colors: any }) {
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border }}>
      <SkeletonPulse color={colors.border} style={{ width: '60%', height: 14, marginBottom: 8 }} />
      <SkeletonPulse color={colors.border} style={{ width: '40%', height: 11, marginBottom: 16 }} />
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={{ flex: 1 }}>
            <SkeletonPulse color={colors.border} style={{ width: '70%', height: 9, marginBottom: 5 }} />
            <SkeletonPulse color={colors.border} style={{ width: '90%', height: 16 }} />
          </View>
        ))}
      </View>
      <SkeletonPulse color={colors.border} style={{ width: '50%', height: 11 }} />
    </View>
  );
}

function ItemSkeleton({ colors }: { colors: any }) {
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: 12, padding: 13, marginBottom: 8, borderWidth: 1, borderColor: colors.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <SkeletonPulse color={colors.border} style={{ width: 26, height: 15 }} />
        <SkeletonPulse color={colors.border} style={{ flex: 1, height: 13, marginHorizontal: 8 }} />
        <SkeletonPulse color={colors.border} style={{ width: 54, height: 13 }} />
      </View>
      <SkeletonPulse color={colors.border} style={{ width: '100%', height: 5, borderRadius: 3 }} />
    </View>
  );
}

// ─── Mini Sparkline ───────────────────────────────────────────────────────────

function MiniSparkline({
  data, color, width = 56, height = 24,
}: {
  data: number[]; color: string; width?: number; height?: number;
}) {
  const max = Math.max(...data, 1);
  const barW = Math.max(2, Math.floor((width - (data.length - 1) * 2) / data.length));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', width, height, gap: 2 }}>
      {data.map((v, i) => {
        const h = v === 0 ? 2 : Math.max(2, Math.round((v / max) * height));
        return (
          <View
            key={i}
            style={{
              width: barW, height: h, backgroundColor: color, borderRadius: 2,
              opacity: v === 0 ? 0.18 : 0.5 + 0.5 * (i / Math.max(data.length - 1, 1)),
            }}
          />
        );
      })}
    </View>
  );
}

// ─── Date Filter Bar ──────────────────────────────────────────────────────────

function DateFilterBar({
  preset, onPresetChange, customStart, customEnd, onCustomApply, colors,
}: {
  preset: DateRangePreset; onPresetChange: (p: DateRangePreset) => void;
  customStart?: Date; customEnd?: Date; onCustomApply: (s: Date, e: Date) => void; colors: any;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const customLabel =
    customStart && customEnd
      ? `${formatShortDate(customStart)} – ${formatShortDate(customEnd)}`
      : 'Custom';

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
      {PRESETS.map((p) => {
        const isActive = preset === p.key;
        return (
          <TouchableOpacity
            key={p.key}
            style={[dfb.chip, { backgroundColor: isActive ? colors.primary : colors.card, borderColor: isActive ? colors.primary : colors.border }]}
            onPress={() => { if (p.key === 'custom') setPickerOpen(true); else onPresetChange(p.key); }}
            activeOpacity={0.8}
          >
            {p.key === 'custom' && (
              <Calendar size={11} color={isActive ? '#fff' : colors.textSecondary} strokeWidth={2} style={{ marginRight: 4 }} />
            )}
            <Text style={[dfb.chipText, { color: isActive ? '#fff' : colors.textSecondary }]}>
              {p.key === 'custom' ? customLabel : p.label}
            </Text>
          </TouchableOpacity>
        );
      })}
      <DateRangePickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onApply={(s, e) => { onCustomApply(s, e); setPickerOpen(false); onPresetChange('custom'); }}
        initialStart={customStart}
        initialEnd={customEnd}
      />
    </View>
  );
}

const dfb = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '600' },
});

// ─── Branch Card ──────────────────────────────────────────────────────────────

function BranchCard({ branch, analytics, colors, isTablet }: {
  branch: RawBranch; analytics?: BranchPerformance; colors: any; isTablet: boolean;
}) {
  const hasData = !!analytics && analytics.totalRevenue > 0;
  const profitable = hasData ? analytics!.isProfitable : false;
  const up = hasData ? analytics!.deltaRevenue >= 0 : true;
  const borderColor = hasData ? (profitable ? '#10B98144' : '#EF444444') : colors.border;

  return (
    <View style={[brc.card, { backgroundColor: colors.card, borderColor, borderWidth: 1, width: isTablet ? '48%' : '100%' }]}>
      <View style={brc.header}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <Building2 size={13} color={colors.primary} strokeWidth={2} />
            <Text style={[brc.name, { color: colors.text }]} numberOfLines={1}>{branch.name}</Text>
          </View>
          <Text style={[brc.address, { color: colors.textSecondary }]} numberOfLines={1}>{branch.address}</Text>
        </View>
        {hasData ? (
          <View style={[brc.badge, { backgroundColor: profitable ? '#D1FAE5' : '#FEE2E2' }]}>
            {profitable
              ? <CheckCircle size={11} color="#065F46" strokeWidth={2.5} />
              : <AlertTriangle size={11} color="#991B1B" strokeWidth={2.5} />}
            <Text style={[brc.badgeTxt, { color: profitable ? '#065F46' : '#991B1B' }]}>
              {profitable ? 'Profitable' : 'At Risk'}
            </Text>
          </View>
        ) : (
          <View style={[brc.badge, { backgroundColor: colors.border + '55' }]}>
            <Text style={[brc.badgeTxt, { color: colors.textSecondary }]}>No data yet</Text>
          </View>
        )}
      </View>
      <View style={brc.statsRow}>
        {[
          { lbl: 'Revenue', val: hasData ? fmtM(analytics!.totalRevenue) : '₱0', color: hasData ? colors.text : colors.textSecondary },
          { lbl: 'Profit', val: hasData ? fmtM(analytics!.grossProfit) : '₱0', color: hasData ? (profitable ? '#10B981' : '#EF4444') : colors.textSecondary },
          { lbl: 'Margin', val: hasData ? `${analytics!.profitMargin.toFixed(1)}%` : '—', color: hasData ? colors.text : colors.textSecondary },
          { lbl: 'Orders', val: hasData ? analytics!.totalOrders.toLocaleString() : '0', color: hasData ? colors.text : colors.textSecondary },
        ].map((s) => (
          <View key={s.lbl} style={brc.stat}>
            <Text style={[brc.statLbl, { color: colors.textSecondary }]}>{s.lbl}</Text>
            <Text style={[brc.statVal, { color: s.color }]}>{s.val}</Text>
          </View>
        ))}
      </View>
      <View style={[brc.footer, { borderTopColor: colors.border }]}>
        {hasData ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {up ? <TrendingUp size={13} color="#10B981" strokeWidth={2} /> : <TrendingDown size={13} color="#EF4444" strokeWidth={2} />}
              <Text style={{ fontSize: 12, fontWeight: '700', color: up ? '#10B981' : '#EF4444' }}>
                {fmtPct(analytics!.deltaRevenue)} vs prev period
              </Text>
            </View>
            <MiniSparkline data={analytics!.trend} color={up ? '#10B981' : '#EF4444'} width={60} height={22} />
          </>
        ) : (
          <>
            <Text style={{ fontSize: 11, color: colors.textSecondary, fontStyle: 'italic' }}>No sales recorded yet</Text>
            <MiniSparkline data={[0, 0, 0, 0, 0, 0]} color={colors.border} width={60} height={22} />
          </>
        )}
      </View>
    </View>
  );
}

const brc = StyleSheet.create({
  card: { borderRadius: 14, padding: 14, marginBottom: 10 },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  name: { fontSize: 14, fontWeight: '700' },
  address: { fontSize: 11, marginTop: 1 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  badgeTxt: { fontSize: 10, fontWeight: '700' },
  statsRow: { flexDirection: 'row', marginBottom: 10, gap: 2 },
  stat: { flex: 1 },
  statLbl: { fontSize: 9, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 2 },
  statVal: { fontSize: 14, fontWeight: '800' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1 },
});

// ─── Item Row (card view) ─────────────────────────────────────────────────────

function ItemRow({
  item, rank, maxRevenue, colors, onPress,
}: {
  item: ItemPerformance; rank: number; maxRevenue: number; colors: any; onPress: () => void;
}) {
  const hasData = item.totalRevenue > 0;
  const isLoss = hasData && item.grossProfit < 0;
  const meta = STATUS_META[item.status];
  const barW = hasData && maxRevenue > 0 ? (item.totalRevenue / maxRevenue) * 100 : 0;

  return (
    <TouchableOpacity
      style={[itr.card, { backgroundColor: colors.card, borderColor: isLoss ? '#EF444466' : colors.border, borderWidth: isLoss ? 1.5 : 1 }]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <View style={itr.topRow}>
        <View style={[itr.rankBadge, { backgroundColor: hasData && rank <= 3 ? colors.accent + '20' : colors.border + '40' }]}>
          <Text style={[itr.rankTxt, { color: hasData && rank <= 3 ? colors.accent : colors.textSecondary }]}>#{rank}</Text>
        </View>
        <View style={{ flex: 1, marginHorizontal: 10 }}>
          <Text style={[itr.name, { color: colors.text }]} numberOfLines={1}>{item.itemName}</Text>
          {item.categoryName && <Text style={[itr.cat, { color: colors.textSecondary }]}>{item.categoryName}</Text>}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[itr.revenue, { color: hasData ? (isLoss ? '#EF4444' : colors.accent) : colors.textSecondary }]}>
            {hasData ? fmtM(item.totalRevenue) : '₱0'}
          </Text>
          <Text style={[itr.sub, { color: colors.textSecondary }]}>
            {hasData ? `${item.unitsSold.toLocaleString()} sold` : 'no sales'}
          </Text>
        </View>
      </View>
      <View style={[itr.track, { backgroundColor: colors.border + '55' }]}>
        {barW > 0 && (
          <View style={[itr.fill, { width: `${barW}%`, backgroundColor: isLoss ? '#EF4444' : rank <= 3 ? colors.accent : colors.primary }]} />
        )}
      </View>
      <View style={itr.footer}>
        <Text style={[itr.meta, { color: colors.textSecondary }]}>
          {hasData ? `Margin ${item.profitMargin.toFixed(1)}%  ·  ${fmtM(item.grossProfit)} profit` : 'No sales in this period'}
        </Text>
        <View style={[itr.badge, { backgroundColor: hasData ? meta.bg : colors.border + '55' }]}>
          <Text style={[itr.badgeTxt, { color: hasData ? meta.text : colors.textSecondary }]}>
            {hasData ? meta.label : 'No sales'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const itr = StyleSheet.create({
  card: { borderRadius: 12, padding: 13, marginBottom: 8 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 9 },
  rankBadge: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rankTxt: { fontSize: 13, fontWeight: '900' },
  name: { fontSize: 13, fontWeight: '700' },
  cat: { fontSize: 10, marginTop: 1 },
  revenue: { fontSize: 13, fontWeight: '800' },
  sub: { fontSize: 10, marginTop: 1 },
  track: { height: 5, borderRadius: 3, overflow: 'hidden', marginBottom: 7 },
  fill: { height: '100%', borderRadius: 3 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  meta: { fontSize: 10, flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 },
  badgeTxt: { fontSize: 10, fontWeight: '700' },
});

// ─── Item Table View ──────────────────────────────────────────────────────────

function ItemTableView({
  items, startRank, maxRevenue, colors, onRowPress,
}: {
  items: ItemPerformance[];
  startRank: number;
  maxRevenue: number;
  colors: any;
  onRowPress: (item: ItemPerformance, rank: number) => void;
}) {
  const [sortKey, setSortKey] = useState<TableSortKey>('rank');
  const [sortDir, setSortDir] = useState<TableSortDir>('asc');

  const handleSort = (key: TableSortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir(key === 'rank' ? 'asc' : 'desc'); }
  };

  const withRanks = useMemo(
    () => items.map((item, idx) => ({ item, rank: startRank + idx })),
    [items, startRank],
  );

  const sorted = useMemo(() => {
    return [...withRanks].sort((a, b) => {
      let av = 0; let bv = 0;
      switch (sortKey) {
        case 'rank': av = a.rank; bv = b.rank; break;
        case 'revenue': av = a.item.totalRevenue; bv = b.item.totalRevenue; break;
        case 'profit': av = a.item.grossProfit; bv = b.item.grossProfit; break;
        case 'margin': av = a.item.profitMargin; bv = b.item.profitMargin; break;
        case 'units': av = a.item.unitsSold; bv = b.item.unitsSold; break;
      }
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }, [withRanks, sortKey, sortDir]);

  const arrow = (key: TableSortKey) =>
    sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  // Column flex weights — must match between header and rows
  const COL = {
    rank: { flex: 0.4, align: 'center' as const },
    item: { flex: 2.2, align: 'flex-start' as const },
    revenue: { flex: 1.1, align: 'flex-end' as const },
    profit: { flex: 1.0, align: 'flex-end' as const },
    margin: { flex: 0.85, align: 'flex-end' as const },
    units: { flex: 0.7, align: 'flex-end' as const },
    status: { flex: 1.05, align: 'center' as const },
    trend: { flex: 0.85, align: 'center' as const },
  };

  const TH = ({
    label, sk, col,
  }: {
    label: string; sk?: TableSortKey; col: keyof typeof COL;
  }) => (
    <TouchableOpacity
      disabled={!sk}
      onPress={sk ? () => handleSort(sk) : undefined}
      style={[tbl.th, { flex: COL[col].flex, alignItems: COL[col].align }]}
    >
      <Text style={[tbl.thTxt, { color: sk && sortKey === sk ? colors.primary : colors.textSecondary }]}>
        {label.toUpperCase()}{sk ? arrow(sk) : ''}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ width: '100%' }}>
      {/* ── Header ── */}
      <View style={[tbl.headerRow, { backgroundColor: colors.surface ?? colors.card, borderBottomColor: colors.border }]}>
        <TH label="#" sk="rank" col="rank" />
        <TH label="Item" col="item" />
        <TH label="Revenue" sk="revenue" col="revenue" />
        <TH label="Profit" sk="profit" col="profit" />
        <TH label="Margin" sk="margin" col="margin" />
        <TH label="Units" sk="units" col="units" />
        <TH label="Status" col="status" />
        <TH label="Trend" col="trend" />
      </View>

      {/* ── Rows ── */}
      {sorted.map(({ item, rank }, idx) => {
        const hasData = item.totalRevenue > 0;
        const isLoss = hasData && item.grossProfit < 0;
        const meta = STATUS_META[item.status];
        const isEven = idx % 2 === 0;

        return (
          <TouchableOpacity
            key={item.itemId}
            onPress={() => onRowPress(item, rank)}
            activeOpacity={0.75}
            style={[
              tbl.row,
              {
                backgroundColor: isLoss
                  ? '#FFF5F5'
                  : isEven ? colors.card : (colors.surface ?? colors.background),
                borderBottomColor: colors.border,
              },
            ]}
          >
            {/* Rank */}
            <View style={[tbl.cell, { flex: COL.rank.flex, alignItems: COL.rank.align }]}>
              <View style={[tbl.rankPill, { backgroundColor: hasData && rank <= 3 ? colors.accent + '22' : colors.border + '33' }]}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: hasData && rank <= 3 ? colors.accent : colors.textSecondary }}>
                  {rank}
                </Text>
              </View>
            </View>

            {/* Item name + category */}
            <View style={[tbl.cell, { flex: COL.item.flex, alignItems: COL.item.align }]}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                {item.itemName}
              </Text>
              {item.categoryName && (
                <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 1 }} numberOfLines={1}>
                  {item.categoryName}
                </Text>
              )}
            </View>

            {/* Revenue */}
            <View style={[tbl.cell, { flex: COL.revenue.flex, alignItems: COL.revenue.align }]}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: hasData ? colors.accent : colors.textSecondary }}>
                {hasData ? fmtM(item.totalRevenue) : '₱0'}
              </Text>
              {hasData && maxRevenue > 0 && (
                <View style={{ height: 3, width: '80%', borderRadius: 2, backgroundColor: colors.border + '44', marginTop: 4 }}>
                  <View style={{
                    height: 3, borderRadius: 2,
                    width: `${Math.round((item.totalRevenue / maxRevenue) * 100)}%`,
                    backgroundColor: colors.accent,
                  }} />
                </View>
              )}
            </View>

            {/* Profit */}
            <View style={[tbl.cell, { flex: COL.profit.flex, alignItems: COL.profit.align }]}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: hasData ? (isLoss ? '#EF4444' : '#10B981') : colors.textSecondary }}>
                {hasData ? fmtM(item.grossProfit) : '—'}
              </Text>
            </View>

            {/* Margin */}
            <View style={[tbl.cell, { flex: COL.margin.flex, alignItems: COL.margin.align }]}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: hasData ? (isLoss ? '#EF4444' : colors.text) : colors.textSecondary }}>
                {hasData ? `${item.profitMargin.toFixed(1)}%` : '—'}
              </Text>
            </View>

            {/* Units */}
            <View style={[tbl.cell, { flex: COL.units.flex, alignItems: COL.units.align }]}>
              <Text style={{ fontSize: 13, color: hasData ? colors.text : colors.textSecondary }}>
                {hasData ? item.unitsSold.toLocaleString() : '0'}
              </Text>
            </View>

            {/* Status */}
            <View style={[tbl.cell, { flex: COL.status.flex, alignItems: COL.status.align }]}>
              <View style={[tbl.statusPill, { backgroundColor: hasData ? meta.bg : colors.border + '44' }]}>
                <Text style={{ fontSize: 9, fontWeight: '800', color: hasData ? meta.text : colors.textSecondary }}>
                  {hasData ? meta.label : 'No Sales'}
                </Text>
              </View>
            </View>

            {/* Trend */}
            <View style={[tbl.cell, { flex: COL.trend.flex, alignItems: COL.trend.align }]}>
              {hasData ? (
                <>
                  {item.trend === 'up'
                    ? <TrendingUp size={13} color="#10B981" strokeWidth={2} />
                    : item.trend === 'down'
                      ? <TrendingDown size={13} color="#EF4444" strokeWidth={2} />
                      : <BarChart2 size={13} color={colors.textSecondary} strokeWidth={2} />}
                  <Text style={{ fontSize: 9, marginTop: 2, color: item.trend === 'up' ? '#10B981' : item.trend === 'down' ? '#EF4444' : colors.textSecondary }}>
                    {fmtPct(item.trendPct)}
                  </Text>
                </>
              ) : (
                <Text style={{ fontSize: 10, color: colors.textSecondary }}>—</Text>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
const tbl = StyleSheet.create({
  headerRow: { flexDirection: 'row', borderBottomWidth: 2, paddingVertical: 2 },
  th: { paddingHorizontal: 8, paddingVertical: 10, justifyContent: 'center' },
  thTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  row: { flexDirection: 'row', borderBottomWidth: 1, minHeight: 52, alignItems: 'center' },
  cell: { paddingHorizontal: 8, paddingVertical: 10, justifyContent: 'center' },
  rankPill: { width: 26, height: 26, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  statusPill: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 },
});

// ─── Item View Mode Toggle ────────────────────────────────────────────────────

function ItemViewToggle({ mode, onChange, colors }: { mode: ItemViewMode; onChange: (m: ItemViewMode) => void; colors: any }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: colors.border + '55', borderRadius: 9, padding: 3, gap: 2 }}>
      {(['card', 'table'] as ItemViewMode[]).map((m) => {
        const active = mode === m;
        return (
          <TouchableOpacity
            key={m}
            onPress={() => onChange(m)}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 5,
              paddingHorizontal: 10, paddingVertical: 6, borderRadius: 7,
              backgroundColor: active ? colors.primary : 'transparent',
            }}
            activeOpacity={0.8}
          >
            {m === 'card'
              ? <LayoutGrid size={12} color={active ? '#fff' : colors.textSecondary} strokeWidth={2} />
              : <TableProperties size={12} color={active ? '#fff' : colors.textSecondary} strokeWidth={2} />}
            <Text style={{ fontSize: 11, fontWeight: '700', color: active ? '#fff' : colors.textSecondary }}>
              {m === 'card' ? 'Cards' : 'Table'}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Item Detail Modal ────────────────────────────────────────────────────────

function ItemDetailModal({
  item, rank, visible, onClose, colors,
}: {
  item: ItemPerformance | null; rank: number; visible: boolean; onClose: () => void; colors: any;
}) {
  if (!item) return null;
  const hasData = item.totalRevenue > 0;
  const isLoss = hasData && item.grossProfit < 0;
  const meta = STATUS_META[item.status];
  const sourceBreakdown = [
    { label: 'POS Terminal', count: item.posSalesCount ?? 0, units: item.posUnitsSold ?? 0, color: colors.primary },
    { label: 'Sales Order Walk-in', count: item.salesOrderWalkInSalesCount ?? 0, units: item.salesOrderWalkInUnitsSold ?? 0, color: colors.accent },
    { label: 'Kompra Orders', count: item.kompraOrderCount ?? 0, units: item.kompraUnitsSold ?? 0, color: '#10B981' },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <TouchableOpacity style={mdl.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={[mdl.card, { backgroundColor: colors.surface ?? colors.card }]} activeOpacity={1} onPress={() => { }}>
          <View style={[mdl.header, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
                <View style={[mdl.badge, { backgroundColor: colors.primary }]}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#fff' }}>#{rank}</Text>
                </View>
                <View style={[mdl.badge, { backgroundColor: hasData ? meta.bg : colors.border + '55' }]}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: hasData ? meta.text : colors.textSecondary }}>
                    {hasData ? meta.label : 'No Sales Yet'}
                  </Text>
                </View>
              </View>
              <Text style={[mdl.name, { color: colors.text }]}>{item.itemName}</Text>
              {item.categoryName && (
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{item.categoryName}</Text>
              )}
            </View>
            <TouchableOpacity style={[mdl.closeBtn, { backgroundColor: colors.background }]} onPress={onClose}>
              <X size={15} color={colors.text} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <View style={mdl.grid}>
            {[
              { label: 'Total Revenue', value: hasData ? fmtFull(item.totalRevenue) : '₱0', color: hasData ? colors.accent : colors.textSecondary },
              { label: 'Gross Profit', value: hasData ? fmtFull(item.grossProfit) : '₱0', color: hasData ? (isLoss ? '#EF4444' : '#10B981') : colors.textSecondary },
              { label: 'Revenue/Unit', value: hasData ? fmtFull(item.revenuePerUnit, 2) : '—', color: colors.text },
              { label: 'Units Sold', value: hasData ? item.unitsSold.toLocaleString() : '0', color: hasData ? colors.text : colors.textSecondary },
              { label: 'Profit Margin', value: `${item.profitMargin.toFixed(1)}%`, color: isLoss ? '#EF4444' : '#10B981' },
              { label: 'Total Cost', value: hasData ? fmtFull(item.totalCost) : '—', color: colors.text },
            ].map((s) => (
              <View key={s.label} style={[mdl.cell, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[mdl.cellLbl, { color: colors.textSecondary }]}>{s.label.toUpperCase()}</Text>
                <Text style={[mdl.cellVal, { color: s.color }]}>{s.value}</Text>
              </View>
            ))}
          </View>

          <View style={mdl.sourceSection}>
            <Text style={[mdl.sourceTitle, { color: colors.textSecondary }]}>SOLD THROUGH</Text>
            <View style={mdl.sourceGrid}>
              {sourceBreakdown.map((source) => (
                <View key={source.label} style={[mdl.sourceCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[mdl.sourceLabel, { color: colors.textSecondary }]} numberOfLines={2}>{source.label}</Text>
                  <Text style={[mdl.sourceCount, { color: source.color }]}>{source.count.toLocaleString()}</Text>
                  <Text style={[mdl.sourceUnits, { color: colors.textSecondary }]}>{source.units.toLocaleString()} units</Text>
                </View>
              ))}
            </View>
          </View>

          {hasData && (
            <View style={{ paddingHorizontal: 18, paddingBottom: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {item.trend === 'up'
                  ? <TrendingUp size={14} color="#10B981" strokeWidth={2} />
                  : item.trend === 'down'
                    ? <TrendingDown size={14} color="#EF4444" strokeWidth={2} />
                    : <BarChart2 size={14} color={colors.textSecondary} strokeWidth={2} />}
                <Text style={{ fontSize: 13, fontWeight: '700', color: item.trend === 'up' ? '#10B981' : item.trend === 'down' ? '#EF4444' : colors.textSecondary }}>
                  {fmtPct(item.trendPct)} vs previous period
                </Text>
              </View>
            </View>
          )}

          {!hasData && (
            <View style={{ paddingHorizontal: 18, paddingBottom: 4 }}>
              <Text style={{ fontSize: 12, color: colors.textSecondary, fontStyle: 'italic' }}>
                This item hasn't recorded any sales in the selected period.
              </Text>
            </View>
          )}

          <TouchableOpacity style={[mdl.closeFullBtn, { backgroundColor: colors.primary }]} onPress={onClose} activeOpacity={0.85}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Close</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const mdl = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 460, borderRadius: 18, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'flex-start', padding: 18, borderBottomWidth: 1, gap: 10 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  name: { fontSize: 16, fontWeight: '800' },
  closeBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 16, paddingBottom: 10 },
  cell: { flex: 1, minWidth: '44%', borderRadius: 10, padding: 11, borderWidth: 1 },
  cellLbl: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  cellVal: { fontSize: 16, fontWeight: '900' },
  sourceSection: { paddingHorizontal: 18, paddingBottom: 14 },
  sourceTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  sourceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sourceCard: { flex: 1, minWidth: '28%', borderWidth: 1, borderRadius: 12, padding: 12 },
  sourceLabel: { fontSize: 10, fontWeight: '700', marginBottom: 6 },
  sourceCount: { fontSize: 16, fontWeight: '900', marginBottom: 2 },
  sourceUnits: { fontSize: 11, color: '#6B7280' },
  closeFullBtn: { margin: 16, marginTop: 10, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
});

// ─── Section Toggle ───────────────────────────────────────────────────────────

function SectionToggle({ active, onChange, colors }: { active: 'top' | 'bottom'; onChange: (v: 'top' | 'bottom') => void; colors: any }) {
  return (
    <View style={[tog.wrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {(['top', 'bottom'] as const).map((v) => (
        <TouchableOpacity key={v} style={[tog.btn, active === v && { backgroundColor: colors.primary }]} onPress={() => onChange(v)}>
          <Text style={[tog.txt, { color: active === v ? '#fff' : colors.textSecondary }]}>
            {v === 'top' ? '▲  Top Sellers' : '▼  Underperformers'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const tog = StyleSheet.create({
  wrap: { flexDirection: 'row', borderRadius: 10, borderWidth: 1, overflow: 'hidden', marginBottom: 12 },
  btn: { flex: 1, paddingVertical: 9, alignItems: 'center' },
  txt: { fontSize: 12, fontWeight: '700' },
});

// ─── Pagination Footer ────────────────────────────────────────────────────────

function PaginationFooter({
  itemPage, totalItemPages, totalItemCount, colors, onNext,
}: {
  itemPage: number; totalItemPages: number; totalItemCount: number; colors: any; onNext: () => void;
}) {
  if (totalItemPages <= 1) return null;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 6 }}>
      <Text style={{ fontSize: 11, color: colors.textSecondary }}>
        {totalItemCount} items · page {itemPage} of {totalItemPages}
      </Text>
      <TouchableOpacity
        style={{
          paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8,
          backgroundColor: itemPage < totalItemPages ? colors.primary : colors.border + '33',
          opacity: itemPage < totalItemPages ? 1 : 0.4,
        }}
        onPress={onNext}
        disabled={itemPage >= totalItemPages}
      >
        <Text style={{ fontSize: 13, fontWeight: '700', color: itemPage < totalItemPages ? '#fff' : colors.textSecondary }}>
          Next ›
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SalesAnalyticsScreen() {
  const { colors, theme } = useTheme();
  const { width } = Dimensions.get('window');
  const isTablet = width >= 768;
  const isDesktop = width >= 1100;

  // Responsive card columns: 3 on desktop, 2 on tablet, 1 on mobile
  const cardCols = isDesktop ? 3 : isTablet ? 2 : 1;

  const chartWidth = isDesktop
    ? Math.min((width - 340) * 0.46, 520)
    : isTablet
      ? Math.min(width - 260, 580)
      : width - 48;

  // ── State ─────────────────────────────────────────────────────────────────
  const [preset, setPreset] = useState<DateRangePreset>('this_month');
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();
  const [persistReady, setPersistReady] = useState(false);

  // Item view mode — persisted via AsyncStorage; forced to 'card' on mobile
  const [itemViewMode, setItemViewMode] = useState<ItemViewMode>('card');
  const [viewModeLoaded, setViewModeLoaded] = useState(false);

  // ── Restore filter + view mode on mount ───────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [savedFilter, savedMode] = await Promise.all([
          AsyncStorage.getItem('salesAnalyticsFilter'),
          AsyncStorage.getItem(ITEM_VIEW_MODE_KEY),
        ]);
        if (savedFilter) {
          const parsed = JSON.parse(savedFilter);
          if (parsed.preset) setPreset(parsed.preset);
          if (parsed.customStart) setCustomStart(new Date(parsed.customStart));
          if (parsed.customEnd) setCustomEnd(new Date(parsed.customEnd));
        }
        // Only restore 'table' on tablet+ — mobile always starts as card
        if (savedMode === 'table' && width >= 768) setItemViewMode('table');
        else if (savedMode === 'card') setItemViewMode('card');
      } catch (_) {
        // ignore storage errors
      } finally {
        setPersistReady(true);
        setViewModeLoaded(true);
      }
    })();
  }, []);

  // ── Persist filter ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!persistReady) return;
    AsyncStorage.setItem(
      'salesAnalyticsFilter',
      JSON.stringify({ preset, customStart: customStart?.toISOString(), customEnd: customEnd?.toISOString() }),
    ).catch(() => { });
  }, [preset, customStart, customEnd, persistReady]);

  // ── Handle view mode change + persist ─────────────────────────────────────
  const handleViewModeChange = useCallback((mode: ItemViewMode) => {
    setItemViewMode(mode);
    AsyncStorage.setItem(ITEM_VIEW_MODE_KEY, mode).catch(() => { });
  }, []);

  // Force card on mobile whenever width changes
  useEffect(() => {
    if (width < 768 && itemViewMode === 'table') setItemViewMode('card');
  }, [width]);

  // Effective mode — always card on mobile regardless of state
  const effectiveViewMode: ItemViewMode = isTablet ? itemViewMode : 'card';

  const [heroLoading, setHeroLoading] = useState(true);
  const [branchLoading, setBranchLoading] = useState(true);
  const [rawBranches, setRawBranches] = useState<RawBranch[]>([]);
  const [analytics, setAnalytics] = useState<SalesAnalyticsPayload | null>(null);

  // Item pagination
  const [itemSection, setItemSection] = useState<'top' | 'bottom'>('top');
  const [itemSearch, setItemSearch] = useState('');
  const [itemTake, setItemTake] = useState('20');
  const [itemPage, setItemPage] = useState(1);
  const [itemPaginated, setItemPaginated] = useState<PaginatedItemAnalyticsPayload | null>(null);
  const [itemPagLoading, setItemPagLoading] = useState(false);

  // Modal
  const [selectedItem, setSelectedItem] = useState<ItemPerformance | null>(null);
  const [selectedRank, setSelectedRank] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);

  const takeNum = useMemo(() => { const n = parseInt(itemTake, 10); return isNaN(n) || n <= 0 ? 20 : n; }, [itemTake]);

  // ── Load branches once ─────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        setBranchLoading(true);
        const BRANCHES_GQL = gql`query GetOrgBranches { getOrgBranches { id name address isActive } }`;
        const bRes = await graphQLRequest<{ getOrgBranches: RawBranch[] }>(BRANCHES_GQL, {});
        setRawBranches(bRes.getOrgBranches ?? []);
      } catch (e) {
        if (__DEV__) console.warn('branch fetch error', e);
        setRawBranches([]);
      } finally {
        setBranchLoading(false);
      }
    })();
  }, []);

  // ── Load summary analytics ─────────────────────────────────────────────────
  const loadAnalytics = useCallback(async () => {
    setHeroLoading(true);
    try {
      const dateRange = preset === 'custom' && customStart && customEnd
        ? { startDate: customStart.toISOString(), endDate: customEnd.toISOString() }
        : undefined;
      const result = await AnalyticsService.getSalesAnalytics(preset, dateRange);
      setAnalytics(result);
    } catch (e) {
      if (__DEV__) console.warn('analytics load error', e);
      setAnalytics(null);
    } finally {
      setHeroLoading(false);
    }
  }, [preset, customStart, customEnd]);

  useEffect(() => { if (!persistReady) return; loadAnalytics(); }, [loadAnalytics, persistReady]);

  // ── Paginated item loader ──────────────────────────────────────────────────
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerItemLoad = useCallback(
    (search: string, take: number, page: number, section: 'top' | 'bottom') => {
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
      const delay = search ? 350 : 0;
      searchDebounce.current = setTimeout(async () => {
        setItemPagLoading(true);
        try {
          const dateRange = preset === 'custom' && customStart && customEnd
            ? { startDate: customStart.toISOString(), endDate: customEnd.toISOString() }
            : undefined;
          const result = await AnalyticsService.getItemAnalyticsPaginated(preset, { dateRange, take, page, search, section });
          setItemPaginated(result);
        } catch (e) {
          if (__DEV__) console.warn('item paginated load error', e);
        } finally {
          setItemPagLoading(false);
        }
      }, delay);
    },
    [preset, customStart, customEnd],
  );

  useEffect(() => {
    if (!persistReady) return;
    setItemPage(1);
    triggerItemLoad(itemSearch, takeNum, 1, itemSection);
  }, [itemSearch, takeNum, itemSection, preset, customStart, customEnd, persistReady]);

  useEffect(() => { triggerItemLoad(itemSearch, takeNum, itemPage, itemSection); }, [itemPage]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const pagedItems = itemPaginated?.items ?? [];
  const totalItemPages = itemPaginated?.totalPages ?? 1;
  const totalItemCount = itemPaginated?.total ?? 0;
  const maxRevenue = useMemo(() => Math.max(...pagedItems.map((i) => i.totalRevenue), 1), [pagedItems]);

  const branchMap = useMemo(() => {
    const m: Record<number, BranchPerformance> = {};
    analytics?.branches.forEach((b) => (m[b.branchId] = b));
    return m;
  }, [analytics]);

  const chartConfig = useMemo(() => ({
    backgroundColor: colors.card, backgroundGradientFrom: colors.card, backgroundGradientTo: colors.card,
    decimalPlaces: 0,
    color: (o = 1) => theme === 'dark' ? `rgba(232,119,34,${o})` : `rgba(27,58,107,${o})`,
    labelColor: () => colors.textSecondary,
    propsForDots: { r: '4', strokeWidth: '2', stroke: colors.accent },
    propsForBackgroundLines: { strokeDasharray: '4,4', stroke: colors.border },
  }), [colors, theme]);

  const trendScale = useMemo(() => {
    const nonZeroPts = (analytics?.trend ?? []).filter((p) => p.revenue > 0 || p.cost > 0);
    const relevant = nonZeroPts.length ? nonZeroPts : (analytics?.trend ?? []);
    return Math.max(...relevant.map((p) => p.revenue), 0) >= 100_000 ? 1000 : 1;
  }, [analytics]);

  const trendScaleLabel = trendScale === 1000 ? '₱ in thousands' : '₱ (actual)';

  const trendChart = useMemo(() => {
    const pts = analytics?.trend ?? [];
    if (!pts.length) return null;
    const nonZero = pts.filter((p) => p.revenue > 0 || p.cost > 0);
    const source = nonZero.length >= 2 ? nonZero : pts;
    const s = source.length > 8 ? source.filter((_, i) => i % Math.ceil(source.length / 8) === 0) : source;
    const revenueData = s.map((p) => Math.round(p.revenue / trendScale));
    const costData = s.map((p) => Math.round(p.cost / trendScale));
    if (!revenueData.some((v) => v > 0) && !costData.some((v) => v > 0)) return null;
    return {
      labels: s.map((p) => p.label),
      datasets: [
        { data: revenueData, color: (o = 1) => `rgba(27,58,107,${o})`, strokeWidth: 2 },
        { data: costData, color: (o = 1) => `rgba(232,119,34,${o})`, strokeWidth: 2 },
      ],
      filteredPts: s,
    };
  }, [analytics, trendScale]);

  const s = analytics?.summary;
  const sourceCards = useMemo(() => {
    const totalRevenue = s?.totalRevenue ?? 0;
    return (analytics?.sourceBreakdown ?? []).map((source) => {
      const meta = SOURCE_META[source.source] ?? { label: source.source, color: colors.textSecondary };
      return { ...source, ...meta, revenueShare: totalRevenue > 0 ? (source.totalRevenue / totalRevenue) * 100 : 0 };
    });
  }, [analytics, colors.textSecondary, s?.totalRevenue]);

  const periodLabel =
    preset === 'today' ? 'Today'
      : preset === 'this_week' ? 'This Week'
        : preset === 'this_month' ? 'This Month'
          : preset === 'custom' && customStart && customEnd
            ? `${formatShortDate(customStart)} – ${formatShortDate(customEnd)}`
            : 'All Time';

  // ── Styles ────────────────────────────────────────────────────────────────
  const styles = useMemo(
    () => StyleSheet.create({
      container: { flex: 1, backgroundColor: colors.background },
      scroll: {
        padding: isDesktop ? 24 : 16, paddingBottom: 56,
        maxWidth: isDesktop ? 1200 : undefined,
        alignSelf: isDesktop ? ('center' as const) : undefined,
        width: isDesktop ? '100%' : undefined,
      },
      pageTitle: { fontSize: isDesktop ? 26 : 20, fontWeight: '900', color: colors.text, marginBottom: 14, letterSpacing: -0.5 },
      sectionTitle: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, letterSpacing: 1.1, textTransform: 'uppercase' as const, marginBottom: 10, marginTop: 8 },
      heroCard: { backgroundColor: colors.primary, borderRadius: 16, padding: 20, marginBottom: 16 },
      heroLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: 1.2, textTransform: 'uppercase' as const, marginBottom: 6 },
      heroValue: { fontSize: isDesktop ? 48 : 38, fontWeight: '900', color: '#fff', letterSpacing: -1.5, marginBottom: 4 },
      heroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 12 },
      heroStatsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
      heroStatBox: { flex: 1, minWidth: isTablet ? 100 : '22%', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: 11 },
      heroStatVal: { fontSize: 17, fontWeight: '800', color: '#fff' },
      heroStatLbl: { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
      summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
      summaryCard: { flex: 1, backgroundColor: colors.card, borderRadius: 12, padding: 13, borderWidth: 1, borderColor: colors.border },
      summaryLbl: { fontSize: 10, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.5, marginBottom: 4 },
      summaryVal: { fontSize: 15, fontWeight: '900' },
      sourceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
      sourceCard: { width: isDesktop ? '23.7%' : isTablet ? '48%' : '100%', backgroundColor: colors.card, borderRadius: 12, padding: 13, borderWidth: 1, borderColor: colors.border },
      sourceHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8 },
      sourceDot: { width: 9, height: 9, borderRadius: 5 },
      sourceLabel: { flex: 1, fontSize: 12, fontWeight: '800' },
      sourceShare: { fontSize: 11, fontWeight: '800' },
      sourceRevenue: { fontSize: 20, fontWeight: '900', marginBottom: 8 },
      sourceStats: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
      sourceStatLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' as const, marginBottom: 2 },
      sourceStatValue: { fontSize: 12, fontWeight: '800' },
      branchGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
      chartsRow: { flexDirection: isDesktop ? 'row' : 'column', gap: 12 },
      chartFlex: { flex: isDesktop ? 1 : undefined },
      // Responsive item card grid
      itemCardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
      // Each card wrapper — width driven by cardCols
      itemCardWrapper: {
        width: cardCols === 3 ? '32.3%' : cardCols === 2 ? '49%' : '100%',
      },
    }),
    [colors, isTablet, isDesktop, cardCols],
  );

  const openItemModal = (item: ItemPerformance, rank: number) => {
    setSelectedItem(item);
    setSelectedRank(rank);
    setModalOpen(true);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>Sales Analytics</Text>

      <DateFilterBar
        preset={preset} onPresetChange={setPreset}
        customStart={customStart} customEnd={customEnd}
        onCustomApply={(s, e) => { setCustomStart(s); setCustomEnd(e); }}
        colors={colors}
      />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      {heroLoading ? <HeroSkeleton colors={colors} /> : (
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>{periodLabel} · Revenue</Text>
          <Text style={styles.heroValue}>{fmtM(s?.totalRevenue ?? 0)}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {(s?.revenueChange ?? 0) >= 0
              ? <TrendingUp size={15} color="#34D399" strokeWidth={2} />
              : <TrendingDown size={15} color="#F87171" strokeWidth={2} />}
            <Text style={{ fontSize: 13, fontWeight: '600', color: (s?.revenueChange ?? 0) >= 0 ? '#34D399' : '#F87171' }}>
              {s ? `${fmtPct(s.revenueChange)} vs previous period` : 'No comparison data yet'}
            </Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroStatsRow}>
            {[
              { val: fmtM(s?.grossProfit ?? 0), lbl: 'Gross Profit' },
              { val: `${(s?.profitMargin ?? 0).toFixed(1)}%`, lbl: 'Profit Margin' },
              { val: (s?.totalOrders ?? 0).toLocaleString(), lbl: 'Orders' },
              { val: `${s?.profitableBranches ?? 0}/${s?.totalBranches ?? rawBranches.length}`, lbl: 'Profitable Branches' },
            ].map((stat) => (
              <View key={stat.lbl} style={styles.heroStatBox}>
                <Text style={styles.heroStatVal}>{stat.val}</Text>
                <Text style={styles.heroStatLbl}>{stat.lbl}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ── Summary cards ─────────────────────────────────────────────────── */}
      {!heroLoading && (
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLbl}>REVENUE</Text>
            <Text style={[styles.summaryVal, { color: '#10B981' }]}>{fmtM(s?.totalRevenue ?? 0)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLbl}>COST</Text>
            <Text style={[styles.summaryVal, { color: '#EF4444' }]}>{fmtM(s?.totalCost ?? 0)}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.primary, borderColor: 'transparent' }]}>
            <Text style={[styles.summaryLbl, { color: 'rgba(255,255,255,0.6)' }]}>NET PROFIT</Text>
            <Text style={[styles.summaryVal, { color: '#fff' }]}>{fmtM(s?.grossProfit ?? 0)}</Text>
          </View>
        </View>
      )}

      {/* ── Source breakdown ──────────────────────────────────────────────── */}
      {!heroLoading && sourceCards.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Sales by Source</Text>
          <View style={styles.sourceGrid}>
            {sourceCards.map((source) => (
              <View key={source.source} style={styles.sourceCard}>
                <View style={styles.sourceHeader}>
                  <View style={[styles.sourceDot, { backgroundColor: source.color }]} />
                  <Text style={[styles.sourceLabel, { color: colors.text }]} numberOfLines={1}>{source.label}</Text>
                  <Text style={[styles.sourceShare, { color: source.color }]}>{source.revenueShare.toFixed(1)}%</Text>
                </View>
                <Text style={[styles.sourceRevenue, { color: source.color }]} numberOfLines={1}>{fmtM(source.totalRevenue)}</Text>
                <View style={styles.sourceStats}>
                  <View>
                    <Text style={[styles.sourceStatLabel, { color: colors.textSecondary }]}>Orders</Text>
                    <Text style={[styles.sourceStatValue, { color: colors.text }]}>{source.totalOrders.toLocaleString()}</Text>
                  </View>
                  <View>
                    <Text style={[styles.sourceStatLabel, { color: colors.textSecondary }]}>Units</Text>
                    <Text style={[styles.sourceStatValue, { color: colors.text }]}>{source.unitsSold.toLocaleString()}</Text>
                  </View>
                  <View>
                    <Text style={[styles.sourceStatLabel, { color: colors.textSecondary }]}>Profit</Text>
                    <Text style={[styles.sourceStatValue, { color: source.grossProfit >= 0 ? '#10B981' : '#EF4444' }]}>{fmtM(source.grossProfit)}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      {/* ── Trend charts ──────────────────────────────────────────────────── */}
      {trendChart && (
        <>
          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Revenue vs Cost Trend</Text>
          <View style={styles.chartsRow}>
            <View style={styles.chartFlex}>
              <ChartCard title="Revenue vs Cost" subtitle={`${periodLabel} · ${trendScaleLabel}`}>
                <LineChart data={trendChart} width={chartWidth} height={220} chartConfig={chartConfig} bezier withInnerLines withOuterLines={false} style={{ borderRadius: 8, marginLeft: -16 }} />
              </ChartCard>
            </View>
            {isDesktop && (
              <View style={styles.chartFlex}>
                <ChartCard title="Gross Profit Trend" subtitle={`${periodLabel} · ${trendScaleLabel}`}>
                  <LineChart
                    data={{ labels: trendChart.labels, datasets: [{ data: trendChart.filteredPts.map((p) => Math.round(p.profit / trendScale)), color: (o = 1) => `rgba(16,185,129,${o})`, strokeWidth: 2 }] }}
                    width={chartWidth} height={220} chartConfig={chartConfig} bezier withInnerLines withOuterLines={false} style={{ borderRadius: 8, marginLeft: -16 }}
                  />
                </ChartCard>
              </View>
            )}
          </View>
          {!isDesktop && (
            <ChartCard title="Gross Profit Trend" subtitle={`${periodLabel} · ${trendScaleLabel}`}>
              <LineChart
                data={{ labels: trendChart.labels, datasets: [{ data: trendChart.filteredPts.map((p) => Math.round(p.profit / trendScale)), color: (o = 1) => `rgba(16,185,129,${o})`, strokeWidth: 2 }] }}
                width={chartWidth} height={200} chartConfig={chartConfig} bezier withInnerLines withOuterLines={false} style={{ borderRadius: 8, marginLeft: -16 }}
              />
            </ChartCard>
          )}
        </>
      )}

      {/* ── Branches ──────────────────────────────────────────────────────── */}
      <Text style={styles.sectionTitle}>Branch Performance</Text>
      {branchLoading ? (
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
          {[1, 2].map((i) => <View key={i} style={{ flex: 1 }}><CardSkeleton colors={colors} /></View>)}
        </View>
      ) : rawBranches.length === 0 ? (
        <View style={{ backgroundColor: colors.card, borderRadius: 12, padding: 20, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: colors.border }}>
          <Building2 size={28} color={colors.border} strokeWidth={1.5} />
          <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 8, textAlign: 'center' }}>
            No branches found. Add branches in your organization settings.
          </Text>
        </View>
      ) : (
        <View style={styles.branchGrid}>
          {rawBranches.map((branch) => (
            <BranchCard key={branch.id} branch={branch} analytics={branchMap[branch.id]} colors={colors} isTablet={isTablet} />
          ))}
        </View>
      )}

      {/* ── Item Performance ──────────────────────────────────────────────── */}
      {/* Section header row with Cards / Table toggle on tablet+ */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginBottom: 10 }}>
        <Text style={[styles.sectionTitle, { marginBottom: 0, marginTop: 0 }]}>Item Performance</Text>
        {isTablet && viewModeLoaded && (
          <ItemViewToggle mode={effectiveViewMode} onChange={handleViewModeChange} colors={colors} />
        )}
      </View>

      <SectionToggle active={itemSection} onChange={setItemSection} colors={colors} />

      <ItemControls
        search={itemSearch} onSearchChange={(v) => setItemSearch(v)}
        take={itemTake} onTakeChange={(v) => { setItemTake(v); setItemPage(1); }}
        page={itemPage} totalPages={totalItemPages}
        onPrev={() => setItemPage((p) => Math.max(1, p - 1))}
        onNext={() => setItemPage((p) => Math.min(totalItemPages, p + 1))}
        colors={colors}
      />

      {/* ── Loading skeletons ─────────────────────────────────────────────── */}
      {itemPagLoading ? (
        [1, 2, 3, 4, 5].map((i) => <ItemSkeleton key={i} colors={colors} />)

        /* ── Empty state ─────────────────────────────────────────────────── */
      ) : pagedItems.length === 0 ? (
        <View style={{ backgroundColor: colors.card, borderRadius: 12, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
          <Package size={28} color={colors.border} strokeWidth={1.5} />
          <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 8 }}>
            {itemSearch ? `No items matching "${itemSearch}"` : 'No items found in inventory.'}
          </Text>
        </View>

        /* ── Table view ──────────────────────────────────────────────────── */
      ) : effectiveViewMode === 'table' ? (
        <>
          <View style={{ backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 4, overflow: 'hidden' }}>
            <ItemTableView
              items={pagedItems}
              startRank={(itemPage - 1) * takeNum + 1}
              maxRevenue={maxRevenue}
              colors={colors}
              onRowPress={openItemModal}
            />
          </View>
          <PaginationFooter
            itemPage={itemPage} totalItemPages={totalItemPages} totalItemCount={totalItemCount}
            colors={colors} onNext={() => setItemPage((p) => Math.min(totalItemPages, p + 1))}
          />
        </>

        /* ── Card view (responsive grid) ─────────────────────────────────── */
      ) : (
        <>
          <View style={styles.itemCardGrid}>
            {pagedItems.map((item, idx) => {
              const rank = (itemPage - 1) * takeNum + idx + 1;
              return (
                <View key={item.itemId} style={styles.itemCardWrapper}>
                  <ItemRow
                    item={item} rank={rank} maxRevenue={maxRevenue} colors={colors}
                    onPress={() => openItemModal(item, rank)}
                  />
                </View>
              );
            })}
          </View>
          <PaginationFooter
            itemPage={itemPage} totalItemPages={totalItemPages} totalItemCount={totalItemCount}
            colors={colors} onNext={() => setItemPage((p) => Math.min(totalItemPages, p + 1))}
          />
        </>
      )}

      <ItemDetailModal item={selectedItem} rank={selectedRank} visible={modalOpen} onClose={() => setModalOpen(false)} colors={colors} />
    </ScrollView>
  );
}