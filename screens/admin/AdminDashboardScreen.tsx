// screens/admin/AdminDashboardScreen.tsx
import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  Animated,
  Platform,
} from 'react-native';
import { Calendar } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import {
  DashboardStats,
  DashboardFilterPreset,
  RecentOrganization,
  RecentUser,
  RecentPOSOrder,
  RecentEcommerceOrder,
  FILTER_PRESETS,
  FILTER_PRESET_LABELS,
  formatCurrency,
  formatDate,
  formatShortDate,
  formatStatus,
} from '@/services/adminDashboardService';
import DateRangePickerModal from '@/components/DateRangePickerModal';

// ─── Breakpoints ──────────────────────────────────────────────────────────────

function useBreakpoint() {
  const { width } = useWindowDimensions();
  return useMemo(() => {
    if (width >= 1440) return 'xl' as const;
    if (width >= 1024) return 'lg' as const;
    if (width >= 768) return 'md' as const;
    return 'sm' as const;
  }, [width]);
}

function useCardWidth(): number {
  const { width } = useWindowDimensions();
  const bp = useBreakpoint();
  return useMemo(() => {
    const cardsPerRow = bp === 'sm' ? 1 : bp === 'md' ? 2 : 4;
    const horizontalPadding = bp === 'sm' ? 16 : 24;
    const cardGap = 12;
    const totalGap = cardGap * (cardsPerRow - 1);
    return (width - horizontalPadding * 2 - totalGap) / cardsPerRow;
  }, [width, bp]);
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  verified: { bg: '#D1FAE5', text: '#065F46' },
  active: { bg: '#D1FAE5', text: '#065F46' },
  completed: { bg: '#D1FAE5', text: '#065F46' },
  paid: { bg: '#D1FAE5', text: '#065F46' },
  confirmed: { bg: '#D1FAE5', text: '#065F46' },
  delivered: { bg: '#D1FAE5', text: '#065F46' },
  received: { bg: '#D1FAE5', text: '#065F46' },
  inactive: { bg: '#FEE2E2', text: '#991B1B' },
  cancelled: { bg: '#FEE2E2', text: '#991B1B' },
  failed: { bg: '#FEE2E2', text: '#991B1B' },
  unpaid: { bg: '#FEE2E2', text: '#991B1B' },
  pending: { bg: '#FEF3C7', text: '#92400E' },
  processing: { bg: '#FEF3C7', text: '#92400E' },
  in_delivery: { bg: '#FEF3C7', text: '#92400E' },
  out_for_delivery: { bg: '#FEF3C7', text: '#92400E' },
  preparing: { bg: '#DBEAFE', text: '#1E40AF' },
  packed: { bg: '#DBEAFE', text: '#1E40AF' },
  unverified: { bg: '#F3F4F6', text: '#374151' },
};

const StatusBadge = memo(({ status }: { status: string }) => {
  const key = status.toLowerCase();
  const palette = STATUS_COLORS[key] ?? { bg: '#F3F4F6', text: '#374151' };
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.badgeText, { color: palette.text }]}>
        {formatStatus(status)}
      </Text>
    </View>
  );
});

// ─── SkeletonBox ─────────────────────────────────────────────────────────────

const SkeletonBox = memo(
  ({ width, height, style }: { width?: number | `${number}%`; height: number; style?: object }) => {
    const { colors } = useTheme();
    const opacity = React.useRef(new Animated.Value(0.4)).current;

    React.useEffect(() => {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
        ]),
      );
      anim.start();
      return () => anim.stop();
    }, [opacity]);

    const resolvedWidth: number | `${number}%` = width ?? '100%';

    return (
      <Animated.View
        style={[
          { width: resolvedWidth, height, borderRadius: 8, backgroundColor: colors.border, opacity },
          style,
        ]}
      />
    );
  },
);

// ─── Filter Bar ───────────────────────────────────────────────────────────────

interface FilterBarProps {
  activePreset: DashboardFilterPreset;
  customStart?: Date;
  customEnd?: Date;
  onSelectPreset: (preset: DashboardFilterPreset) => void;
  onOpenCustom: () => void;
}

const FilterBar = memo(
  ({ activePreset, customStart, customEnd, onSelectPreset, onOpenCustom }: FilterBarProps) => {
    const { colors } = useTheme();

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterBarContent}
        style={styles.filterBar}
      >
        {FILTER_PRESETS.map((preset) => {
          const isActive = activePreset === preset;
          const isCustom = preset === 'custom';

          const handlePress = () => {
            if (isCustom) {
              onOpenCustom();
            } else {
              onSelectPreset(preset);
            }
          };

          // Build label — for active custom, show the range dates
          let label = FILTER_PRESET_LABELS[preset];
          if (isCustom && isActive && customStart && customEnd) {
            label = `${formatShortDate(customStart)} – ${formatShortDate(customEnd)}`;
          }

          return (
            <TouchableOpacity
              key={preset}
              onPress={handlePress}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${FILTER_PRESET_LABELS[preset]}`}
              accessibilityState={{ selected: isActive }}
              style={[
                styles.filterChip,
                {
                  backgroundColor: isActive ? colors.primary : colors.card,
                  borderColor: isActive ? colors.primary : colors.border,
                },
                isCustom && styles.filterChipCustom,
              ]}
            >
              {isCustom && (
                <Calendar
                  size={13}
                  color={isActive ? '#FFFFFF' : colors.textSecondary}
                  style={{ marginRight: 5 }}
                />
              )}
              <Text
                style={[
                  styles.filterChipText,
                  { color: isActive ? '#FFFFFF' : colors.textSecondary },
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  },
);

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KPICardProps {
  title: string;
  value: string;
  subtitle: string;
  accent?: string;
  cardWidth: number;
}

const KPICard = memo(({ title, value, subtitle, accent, cardWidth }: KPICardProps) => {
  const { colors } = useTheme();
  const scale = React.useRef(new Animated.Value(1)).current;

  const onPressIn = useCallback(() => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 30 }).start();
  }, [scale]);
  const onPressOut = useCallback(() => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();
  }, [scale]);

  return (
    <Animated.View
      style={[
        styles.kpiCard,
        {
          width: cardWidth,
          backgroundColor: colors.card,
          borderColor: colors.border,
          transform: [{ scale }],
          ...Platform.select({
            ios: { shadowColor: colors.text, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
            android: { elevation: 3 },
          }),
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel={`${title}: ${value}`}
        style={styles.kpiCardInner}
      >
        {accent && <View style={[styles.kpiAccentBar, { backgroundColor: accent }]} />}
        <Text style={[styles.kpiTitle, { color: colors.textSecondary }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.kpiValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        <Text style={[styles.kpiSubtitle, { color: colors.textSecondary }]} numberOfLines={2}>
          {subtitle}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

const KPICardSkeleton = memo(({ cardWidth }: { cardWidth: number }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.kpiCard, { width: cardWidth, backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.kpiCardInner}>
        <SkeletonBox height={12} width={'50%'} style={{ marginBottom: 12 }} />
        <SkeletonBox height={28} width={'70%'} style={{ marginBottom: 8 }} />
        <SkeletonBox height={10} width={'90%'} />
      </View>
    </View>
  );
});

// ─── Section ─────────────────────────────────────────────────────────────────

const DashboardSection = memo(({ title, children }: { title: string; children: React.ReactNode }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionContainer}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            ...Platform.select({
              ios: { shadowColor: colors.text, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
              android: { elevation: 2 },
            }),
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
});

// ─── Table primitives ─────────────────────────────────────────────────────────

const TableHeader = memo(({ columns }: { columns: string[] }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.tableHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      {columns.map((col) => (
        <Text key={col} style={[styles.tableHeaderText, { color: colors.textSecondary, flex: 1 }]} numberOfLines={1}>
          {col}
        </Text>
      ))}
    </View>
  );
});

const TableRow = memo(({ cells, isLast, index }: { cells: React.ReactNode[]; isLast: boolean; index: number }) => {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.tableRow,
        {
          backgroundColor: index % 2 === 0 ? colors.card: colors.sidebar,
          borderBottomColor: isLast ? 'transparent' : colors.border,
          borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      {cells.map((cell, i) => (
        <View key={i} style={styles.tableCell}>
          {typeof cell === 'string' ? (
            <Text style={[styles.tableCellText, { color: colors.text }]} numberOfLines={1}>{cell}</Text>
          ) : cell}
        </View>
      ))}
    </View>
  );
});

const EmptyState = memo(({ message }: { message: string }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>{message}</Text>
    </View>
  );
});

const TableSkeleton = memo(({ rows = 5, cols = 3 }: { rows?: number; cols?: number }) => {
  const { colors } = useTheme();
  return (
    <View>
      <View style={[styles.tableHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonBox key={i} height={10} width={'25%'} style={{ flex: 1, marginHorizontal: 4 }} />
        ))}
      </View>
      {Array.from({ length: rows }).map((_, i) => (
        <View
          key={i}
          style={[styles.tableRow, { backgroundColor: i % 2 === 0 ? colors.card : colors.card, borderBottomColor: colors.border, borderBottomWidth: i < rows - 1 ? StyleSheet.hairlineWidth : 0 }]}
        >
          {Array.from({ length: cols }).map((__, j) => (
            <View key={j} style={[styles.tableCell, { flex: 1 }]}>
              <SkeletonBox height={10} width={'80%'} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
});

// ─── Data Tables ──────────────────────────────────────────────────────────────

const OrganizationsTable = memo(({ data, loading }: { data: RecentOrganization[]; loading: boolean }) => (
  <DashboardSection title="Latest Organizations">
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ minWidth: 360 }}>
        {loading ? <TableSkeleton rows={5} cols={3} /> : data.length === 0 ? (
          <EmptyState message="No recent organizations." />
        ) : (
          <>
            <TableHeader columns={['Organization', 'Role', 'Created']} />
            {data.map((org, i) => (
              <TableRow key={org.id} index={i} isLast={i === data.length - 1}
                cells={[org.name, org.roles.join(', '), formatDate(org.createdAt)]} />
            ))}
          </>
        )}
      </View>
    </ScrollView>
  </DashboardSection>
));

const UsersTable = memo(({ data, loading }: { data: RecentUser[]; loading: boolean }) => (
  <DashboardSection title="Latest Users">
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ minWidth: 480 }}>
        {loading ? <TableSkeleton rows={5} cols={5} /> : data.length === 0 ? (
          <EmptyState message="No recent users." />
        ) : (
          <>
            <TableHeader columns={['Name', 'Email', 'Verified', 'Active', 'Created']} />
            {data.map((user, i) => (
              <TableRow key={user.id} index={i} isLast={i === data.length - 1}
                cells={[
                  user.fullname,
                  user.email,
                  <StatusBadge status={user.isVerified ? 'Verified' : 'Unverified'} />,
                  <StatusBadge status={user.isActive ? 'Active' : 'Inactive'} />,
                  formatDate(user.createdAt),
                ]} />
            ))}
          </>
        )}
      </View>
    </ScrollView>
  </DashboardSection>
));

const POSOrdersTable = memo(({ data, loading }: { data: RecentPOSOrder[]; loading: boolean }) => (
  <DashboardSection title="Latest POS Orders">
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ minWidth: 400 }}>
        {loading ? <TableSkeleton rows={5} cols={4} /> : data.length === 0 ? (
          <EmptyState message="No recent POS orders." />
        ) : (
          <>
            <TableHeader columns={['Order #', 'Customer', 'Status', 'Grand Total']} />
            {data.map((order, i) => (
              <TableRow key={order.id} index={i} isLast={i === data.length - 1}
                cells={[
                  order.orderNumber,
                  order.customerName ?? '—',
                  <StatusBadge status={order.status} />,
                  formatCurrency(order.grandTotal),
                ]} />
            ))}
          </>
        )}
      </View>
    </ScrollView>
  </DashboardSection>
));

const EcommerceOrdersTable = memo(({ data, loading }: { data: RecentEcommerceOrder[]; loading: boolean }) => (
  <DashboardSection title="Latest E-commerce Orders">
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ minWidth: 420 }}>
        {loading ? <TableSkeleton rows={5} cols={4} /> : data.length === 0 ? (
          <EmptyState message="No recent e-commerce orders." />
        ) : (
          <>
            <TableHeader columns={['Transaction #', 'Status', 'Payment', 'Grand Total']} />
            {data.map((order, i) => (
              <TableRow key={order.id} index={i} isLast={i === data.length - 1}
                cells={[
                  order.transactionNumber,
                  <StatusBadge status={order.status} />,
                  <StatusBadge status={order.paymentStatus} />,
                  formatCurrency(order.grandTotal),
                ]} />
            ))}
          </>
        )}
      </View>
    </ScrollView>
  </DashboardSection>
));

// ─── KPI Config ───────────────────────────────────────────────────────────────

interface KPIConfig {
  title: string;
  getValue: (stats: DashboardStats) => string;
  subtitle: string;
  accent: string;
}

function useKPIConfigs(
  colors: ReturnType<typeof useTheme>['colors'],
  rangeLabel: string,
): KPIConfig[] {
  return useMemo(
    () => [
      // Row 1 — Platform-wide totals
      {
        title: 'Organizations',
        getValue: (s) => s.totalOrganizations.toLocaleString(),
        subtitle: 'Total registered organizations',
        accent: colors.primary,
      },
      {
        title: 'Users',
        getValue: (s) => s.totalUsers.toLocaleString(),
        subtitle: 'Platform users',
        accent: colors.primary,
      },
      {
        title: 'Outlets',
        getValue: (s) => s.totalOutlets.toLocaleString(),
        subtitle: 'Active outlets',
        accent: colors.primary,
      },
      {
        title: 'Products',
        getValue: (s) => s.totalProducts.toLocaleString(),
        subtitle: 'Total products in catalogue',
        accent: colors.primary,
      },
      // Row 2 — Range-scoped orders & sales
      {
        title: 'POS Orders',
        getValue: (s) => s.totalPOSOrdersInRange.toLocaleString(),
        subtitle: `POS transactions · ${rangeLabel}`,
        accent: colors.accent,
      },
      {
        title: 'E-commerce Orders',
        getValue: (s) => s.totalEcommerceOrdersInRange.toLocaleString(),
        subtitle: `Online orders · ${rangeLabel}`,
        accent: colors.accent,
      },
      {
        title: 'POS Sales',
        getValue: (s) => formatCurrency(s.totalPOSSalesInRange),
        subtitle: `POS revenue · ${rangeLabel}`,
        accent: colors.accent,
      },
      {
        title: 'E-commerce Sales',
        getValue: (s) => formatCurrency(s.totalEcommerceSalesInRange),
        subtitle: `Online revenue · ${rangeLabel}`,
        accent: colors.accent,
      },
      // Row 3 — Growth
      {
        title: 'New Organizations',
        getValue: (s) => s.newOrganizationsInRange.toLocaleString(),
        subtitle: `Organizations joined · ${rangeLabel}`,
        accent: colors.success,
      },
      {
        title: 'New Users',
        getValue: (s) => s.newUsersInRange.toLocaleString(),
        subtitle: `Users registered · ${rangeLabel}`,
        accent: colors.success,
      },
      {
        title: 'Active Organizations',
        getValue: (s) => s.activeOrganizations.toLocaleString(),
        subtitle: 'Currently active organizations',
        accent: colors.success,
      },
      {
        title: 'Active Users',
        getValue: (s) => s.activeUsers.toLocaleString(),
        subtitle: 'Currently active users',
        accent: colors.success,
      },
    ],
    [colors, rangeLabel],
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function AdminDashboardScreen() {
  const { colors } = useTheme();
  const {
    data,
    loading,
    initialising,
    error,
    filter,
    setPreset,
    setCustomRange,
    refetch,
  } = useAdminDashboard();

  const bp = useBreakpoint();
  const cardWidth = useCardWidth();

  // Build a human-readable range label for KPI subtitles
  const rangeLabel = useMemo(() => {
    if (filter.preset !== 'custom') {
      return FILTER_PRESET_LABELS[filter.preset];
    }
    return `${formatShortDate(filter.startDate)} – ${formatShortDate(filter.endDate)}`;
  }, [filter]);

  const kpiConfigs = useKPIConfigs(colors, rangeLabel);

  // Custom picker modal
  const [pickerVisible, setPickerVisible] = useState(false);

  const openCustomPicker = useCallback(() => setPickerVisible(true), []);
  const closeCustomPicker = useCallback(() => setPickerVisible(false), []);
  const handleCustomApply = useCallback(
    (start: Date, end: Date) => {
      closeCustomPicker();
      setCustomRange(start, end);
    },
    [closeCustomPicker, setCustomRange],
  );

  // Fade-in on mount
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const horizontalPadding = bp === 'sm' ? 16 : 24;
  const cardGap = 12;
  const tablesStacked = bp === 'sm' || bp === 'md';
  const stats = data?.stats;
  const isLoading = loading || initialising;

  return (
    <>
      <ScrollView
        style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>

          {/* ── Header ───────────────────────────────────────── */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Kompra Admin Dashboard
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                Platform overview
              </Text>
            </View>
          </View>

          {/* ── Filter Bar ───────────────────────────────────── */}
          <View
            style={[
              styles.filterCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                ...Platform.select({
                  ios: { shadowColor: colors.text, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
                  android: { elevation: 1 },
                }),
              },
            ]}
          >
            <FilterBar
              activePreset={filter.preset}
              customStart={filter.preset === 'custom' ? filter.startDate : undefined}
              customEnd={filter.preset === 'custom' ? filter.endDate : undefined}
              onSelectPreset={setPreset}
              onOpenCustom={openCustomPicker}
            />
          </View>

          {/* ── Error Banner ─────────────────────────────────── */}
          {error && (
            <View style={[styles.errorBanner, { backgroundColor: colors.error + '1A', borderColor: colors.error }]}>
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
              <TouchableOpacity
                onPress={refetch}
                style={[styles.retryButton, { backgroundColor: colors.error }]}
                accessibilityLabel="Retry loading dashboard"
                accessibilityRole="button"
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── KPI Cards ────────────────────────────────────── */}
          <View style={[styles.kpiGrid, { gap: cardGap }]}>
            {isLoading
              ? Array.from({ length: 12 }).map((_, i) => (
                <KPICardSkeleton key={i} cardWidth={cardWidth} />
              ))
              : kpiConfigs.map((cfg) => (
                <KPICard
                  key={cfg.title}
                  title={cfg.title}
                  value={stats ? cfg.getValue(stats) : '—'}
                  subtitle={cfg.subtitle}
                  accent={cfg.accent}
                  cardWidth={cardWidth}
                />
              ))}
          </View>

          {/* ── Tables Row 1 ─────────────────────────────────── */}
          {tablesStacked ? (
            <>
              <OrganizationsTable data={data?.recentOrganizations ?? []} loading={isLoading} />
              <UsersTable data={data?.recentUsers ?? []} loading={isLoading} />
            </>
          ) : (
            <View style={styles.tableRow2Col}>
              <View style={styles.tableCol}>
                <OrganizationsTable data={data?.recentOrganizations ?? []} loading={isLoading} />
              </View>
              <View style={styles.tableCol}>
                <UsersTable data={data?.recentUsers ?? []} loading={isLoading} />
              </View>
            </View>
          )}

          {/* ── Tables Row 2 ─────────────────────────────────── */}
          {tablesStacked ? (
            <>
              <POSOrdersTable data={data?.recentPOSOrders ?? []} loading={isLoading} />
              <EcommerceOrdersTable data={data?.recentEcommerceOrders ?? []} loading={isLoading} />
            </>
          ) : (
            <View style={styles.tableRow2Col}>
              <View style={styles.tableCol}>
                <POSOrdersTable data={data?.recentPOSOrders ?? []} loading={isLoading} />
              </View>
              <View style={styles.tableCol}>
                <EcommerceOrdersTable data={data?.recentEcommerceOrders ?? []} loading={isLoading} />
              </View>
            </View>
          )}

          <View style={styles.bottomSpacer} />
        </Animated.View>
      </ScrollView>

      {/* ── Custom Date Range Modal ───────────────────────────── */}
      <DateRangePickerModal
        visible={pickerVisible}
        onClose={closeCustomPicker}
        onApply={handleCustomApply}
        initialStart={filter.preset === 'custom' ? filter.startDate : undefined}
        initialEnd={filter.preset === 'custom' ? filter.endDate : undefined}
      />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingTop: 24, paddingBottom: 40 },

  // Header
  header: { marginBottom: 16 },
  headerTitle: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5, marginBottom: 4 },
  headerSubtitle: { fontSize: 14, fontWeight: '400' },

  // Filter bar
  filterCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 20,
    overflow: 'hidden',
  },
  filterBar: {},
  filterBarContent: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  filterChipCustom: { paddingHorizontal: 12 },
  filterChipText: { fontSize: 13, fontWeight: '600' },

  // Error
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    gap: 12,
  },
  errorText: { fontSize: 14, flex: 1 },
  retryButton: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  retryButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },

  // KPI
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 28 },
  kpiCard: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, marginBottom: 12, overflow: 'hidden', minHeight: 120 },
  kpiCardInner: { padding: 20, flex: 1 },
  kpiAccentBar: { height: 3, width: 32, borderRadius: 2, marginBottom: 14 },
  kpiTitle: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  kpiValue: { fontSize: 28, fontWeight: '700', letterSpacing: -1, marginBottom: 4 },
  kpiSubtitle: { fontSize: 12, lineHeight: 16 },

  // Section
  sectionContainer: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 10, letterSpacing: -0.2 },
  sectionCard: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },

  // Table
  tableHeader: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  tableHeaderText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, paddingRight: 8 },
  tableRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 11, alignItems: 'center' },
  tableCell: { flex: 1, paddingRight: 8, justifyContent: 'center' },
  tableCellText: { fontSize: 13, fontWeight: '400' },

  // Badge
  badge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '600' },

  // Empty
  emptyState: { padding: 32, alignItems: 'center' },
  emptyStateText: { fontSize: 14 },

  // 2-column layout
  tableRow2Col: { flexDirection: 'row', gap: 16 },
  tableCol: { flex: 1 },

  bottomSpacer: { height: 20 },
});