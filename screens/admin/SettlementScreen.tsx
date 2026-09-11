// SettlementScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RefreshCw } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  getAdminSettlements,
  type AdminPurchaseOrderSettlement,
  type AdminSettlementsData,
  type SettlementEnvironment,
} from '@/services/adminSettlementService';

const php = (value: number | null | undefined) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value ?? 0);

const ENVIRONMENTS: SettlementEnvironment[] = ['SANDBOX', 'PRODUCTION'];
const PAGE_SIZE_OPTIONS = [30, 50, 100, 200];
const DEFAULT_PAGE_SIZE = 30;

const STATUS_COLORS: Record<string, string> = {
  POSTED: '#10B981',
  PENDING: '#F59E0B',
  FAILED: '#EF4444',
};
const getStatusColor = (status: string) => STATUS_COLORS[status] ?? '#6B7280';

// ─── KPI Card (matches UserManagementScreen's KpiCard) ─────────────────────
interface KpiCardProps {
  icon: string;
  label: string;
  value: string | number;
  accent: string;
  sub?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ icon, label, value, accent, sub }) => {
  const { colors } = useTheme();
  return (
    <View style={[kpiStyles.card, { borderColor: accent + '33', backgroundColor: colors.surface }]}>
      <View style={[kpiStyles.iconWrap, { backgroundColor: accent + '18' }]}>
        <Text style={kpiStyles.icon}>{icon}</Text>
      </View>
      <Text style={[kpiStyles.value, { color: accent }]}>{value}</Text>
      <Text style={[kpiStyles.label, { color: colors.textSecondary }]}>{label}</Text>
      {sub ? <Text style={[kpiStyles.sub, { color: colors.textSecondary }]}>{sub}</Text> : null}
    </View>
  );
};

const kpiStyles = StyleSheet.create({
  row: { paddingVertical: 14, paddingHorizontal: 0 },
  scrollContent: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    minWidth: 150,
    flex: 1,
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  icon: { fontSize: 18 },
  value: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5, marginBottom: 2 },
  label: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  sub: { fontSize: 10, marginTop: 3 },
});

// ─── Badge ───────────────────────────────────────────────────────────────────
const Badge: React.FC<{ label: string; color: string }> = ({ label, color }) => (
  <View style={{ backgroundColor: color + '22', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' }}>
    <Text style={{ color, fontSize: 11, fontWeight: '700' }}>{label}</Text>
  </View>
);

// ─── Filter Chip (matches UserManagementScreen's environment toggle) ───────
const FilterChip: React.FC<{ label: string; active: boolean; onPress: () => void }> = ({ label, active, onPress }) => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.filterChip, { backgroundColor: active ? colors.primary : colors.border }]}
      onPress={onPress}
    >
      <Text style={[styles.filterChipText, { color: active ? '#fff' : colors.textSecondary }]}>{label}</Text>
    </TouchableOpacity>
  );
};

// ─── Table Row ───────────────────────────────────────────────────────────────
const TableRow: React.FC<{ row: AdminPurchaseOrderSettlement }> = ({ row }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.tableRow, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
      <View style={[styles.tableCell, { flex: 2 }]}>
        <Text style={[styles.tableCellTextPrimary, { color: colors.text }]} numberOfLines={1}>
          {row.poNumber}
        </Text>
        <Text style={styles.tableCellTextSub} numberOfLines={1}>
          {row.supplierName}
        </Text>
      </View>
      <View style={[styles.tableCell, { flex: 1.2 }]}>
        <Text style={[styles.tableCellTextPrimary, { color: colors.text }]} numberOfLines={1}>
          {php(row.grossAmount)}
        </Text>
      </View>
      <View style={[styles.tableCell, { flex: 1 }]}>
        <Text style={[styles.tableCellText, { color: colors.textSecondary }]} numberOfLines={1}>
          {php(row.platformFee)}
        </Text>
      </View>
      <View style={[styles.tableCell, { flex: 1.3 }]}>
        <Text style={[styles.tableCellTextPrimary, { color: colors.text }]} numberOfLines={1}>
          {php(row.supplierNet)}
        </Text>
      </View>
      <View style={[styles.tableCell, { flex: 1 }]}>
        <Badge label={row.postingStatus} color={getStatusColor(row.postingStatus)} />
      </View>
      <View style={[styles.tableCell, { flex: 1 }]}>
        <Text style={[styles.tableCellText, { color: colors.textSecondary }]} numberOfLines={1}>
          {row.environment}
        </Text>
      </View>
      <View style={[styles.tableCell, { flex: 1 }]}>
        <Text style={[styles.tableCellText, { color: colors.textSecondary }]} numberOfLines={1}>
          {new Date(row.settledAt).toLocaleDateString('en-PH')}
        </Text>
      </View>
      <View style={[styles.tableCell, { flex: 1.6 }]}>
        {row.walletPostedAt ? (
          <View style={{ gap: 2 }}>
            <Text style={[styles.tableCellText, { color: colors.textSecondary }]} numberOfLines={1}>
              {new Date(row.walletPostedAt).toLocaleString('en-PH')}
            </Text>
            <Text style={styles.tableCellTextSub} numberOfLines={1}>
              Balance {php(row.balanceAfter)}
            </Text>
          </View>
        ) : (
          <Text style={[styles.tableCellText, { color: colors.textSecondary }]}>—</Text>
        )}
      </View>
    </View>
  );
};

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function SettlementScreen() {
  const { colors } = useTheme();

  const [environment, setEnvironment] = useState<SettlementEnvironment>(
    process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'SANDBOX',
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [data, setData] = useState<AdminSettlementsData>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(undefined);
      setData(await getAdminSettlements(environment, page, pageSize));
    } catch (e: any) {
      setError(e.message ?? 'Unable to load settlements.');
    } finally {
      setLoading(false);
    }
  }, [environment, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  // Reset to page 1 whenever the environment changes, so pagination doesn't
  // silently land on an out-of-range page for the new dataset.
  const handleEnvironmentChange = (value: SettlementEnvironment) => {
    setEnvironment(value);
    setPage(1);
  };

  const summary = data?.adminSettlementSummary;
  const settlements = data?.adminPurchaseOrderSettlements;
  const rows = settlements?.items ?? [];
  const totalPages = settlements ? Math.max(1, Math.ceil(settlements.total / pageSize)) : 1;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* ─── Toolbar ─────────────────────────────────────────────── */}
      <View style={styles.toolbar}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Settlements</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Read-only Purchase Order settlement and platform revenue visibility.
          </Text>
        </View>
        <View style={styles.toolbarRight}>
          {settlements ? (
            <Text style={[styles.toolbarCount, { color: colors.textSecondary }]}>
              {settlements.total.toLocaleString()} settlements
            </Text>
          ) : null}
          <TouchableOpacity onPress={() => void load()} style={[styles.refresh, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <RefreshCw color={colors.primary} size={18} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── Environment Toggle ─── */}
      <View style={styles.envRow}>
        {ENVIRONMENTS.map((value) => (
          <FilterChip
            key={value}
            label={value}
            active={environment === value}
            onPress={() => handleEnvironmentChange(value)}
          />
        ))}
      </View>

      {/* ─── Content ─── */}
      {loading && !data ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Text style={{ color: colors.error }}>{error}</Text>
        </View>
      ) : (
        <View style={{ flex: 1, gap: 16 }}>
          {/* ─── KPIs ─── */}
          <View style={kpiStyles.row}>
            <View style={kpiStyles.scrollContent}>
              <KpiCard icon="💰" label="Total Settled Gross" value={php(summary?.totalGross)} accent="#2563EB" />
              <KpiCard icon="💵" label="Platform Fees Earned" value={php(summary?.totalPlatformFees)} accent="#7C3AED" />
              <KpiCard icon="🏦" label="Supplier Net" value={php(summary?.totalSupplierNet)} accent="#16A34A" />
              <KpiCard
                icon="📊"
                label="Posted / Pending"
                value={`${summary?.postedCount ?? 0} / ${summary?.pendingCount ?? 0}`}
                accent="#F59E0B"
              />
            </View>
          </View>

          {/* ─── Table (flex:1 so it fills the remaining vertical space and
               pushes pagination to the bottom of the screen) ─── */}
          <View style={{ flex: 1 }}>
            {rows.length === 0 ? (
              <View style={styles.centerState}>
                <Text style={{ color: colors.textSecondary }}>No settlements found for the selected filters.</Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator
                style={{ flex: 1 }}
                contentContainerStyle={{ minWidth: 980, flexGrow: 1 }}
              >
                <View
                  style={{
                    minWidth: 980,
                    flex: 1,
                    borderRadius: 14,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <View style={[styles.tableRow, styles.tableHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                    <View style={[styles.tableCell, { flex: 1.8 }]}><Text style={[styles.tableHeaderText, { color: colors.textSecondary }]} numberOfLines={1}>Purchase Order</Text></View>
                    <View style={[styles.tableCell, { flex: 1.1 }]}><Text style={[styles.tableHeaderText, { color: colors.textSecondary }]} numberOfLines={1}>Gross</Text></View>
                    <View style={[styles.tableCell, { flex: 1 }]}><Text style={[styles.tableHeaderText, { color: colors.textSecondary }]} numberOfLines={1}>Platform Fee</Text></View>
                    <View style={[styles.tableCell, { flex: 1.2 }]}><Text style={[styles.tableHeaderText, { color: colors.textSecondary }]} numberOfLines={1}>Supplier Net</Text></View>
                    <View style={[styles.tableCell, { flex: 1 }]}><Text style={[styles.tableHeaderText, { color: colors.textSecondary }]} numberOfLines={1}>Status</Text></View>
                    <View style={[styles.tableCell, { flex: 1.3 }]}><Text style={[styles.tableHeaderText, { color: colors.textSecondary }]} numberOfLines={1}>Environment</Text></View>
                    <View style={[styles.tableCell, { flex: 1 }]}><Text style={[styles.tableHeaderText, { color: colors.textSecondary }]} numberOfLines={1}>Settled</Text></View>
                    <View style={[styles.tableCell, { flex: 1.6 }]}><Text style={[styles.tableHeaderText, { color: colors.textSecondary }]} numberOfLines={1}>Wallet Posting</Text></View>
                  </View>
                  <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
                    {rows.map((row) => (
                      <TableRow key={row.id} row={row} />
                    ))}
                  </ScrollView>
                </View>
              </ScrollView>
            )}
          </View>

          {/* ─── Pagination (sits at the bottom because the table View above
               takes up the flexible space) ─── */}
          {settlements ? (
            <View style={[styles.pagination, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.pageBtn, { backgroundColor: colors.border }, page === 1 && styles.pageBtnDisabled]}
                onPress={() => setPage(1)}
                disabled={page === 1}
              >
                <Text style={[styles.pageBtnText, { color: colors.text }]}>«</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pageBtn, { backgroundColor: colors.border }, page === 1 && styles.pageBtnDisabled]}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <Text style={[styles.pageBtnText, { color: colors.text }]}>‹</Text>
              </TouchableOpacity>

              <Text style={[styles.pageInfo, { color: colors.textSecondary }]}>{page} / {totalPages}</Text>

              <TouchableOpacity
                style={[styles.pageBtn, { backgroundColor: colors.border }, page >= totalPages && styles.pageBtnDisabled]}
                onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <Text style={[styles.pageBtnText, { color: colors.text }]}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pageBtn, { backgroundColor: colors.border }, page >= totalPages && styles.pageBtnDisabled]}
                onPress={() => setPage(totalPages)}
                disabled={page >= totalPages}
              >
                <Text style={[styles.pageBtnText, { color: colors.text }]}>»</Text>
              </TouchableOpacity>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginLeft: 8 }}>
                <View style={styles.pageSizeRow}>
                  {PAGE_SIZE_OPTIONS.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.pageSizeBtn, { backgroundColor: pageSize === s ? colors.primary : colors.border }]}
                      onPress={() => {
                        setPageSize(s);
                        setPage(1);
                      }}
                    >
                      <Text style={[styles.pageSizeBtnText, { color: pageSize === s ? '#fff' : colors.textSecondary }]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 18, gap: 16 },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  toolbarRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 24, fontWeight: '900' },
  subtitle: { fontSize: 13, marginTop: 2 },
  toolbarCount: { fontSize: 13, fontWeight: '600' },
  refresh: { padding: 10, borderRadius: 8, borderWidth: 1 },
  envRow: { flexDirection: 'row', gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20 },
  filterChipText: { fontSize: 12, fontWeight: '700' },
  centerState: { minHeight: 200, alignItems: 'center', justifyContent: 'center' },
  // ── Table ──
  tableHeader: { borderBottomWidth: 2 },
  tableHeaderText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  tableCell: { paddingHorizontal: 8, justifyContent: 'center' },
  tableCellText: { fontSize: 13 },
  tableCellTextPrimary: { fontSize: 13, fontWeight: '800' },
  tableCellTextSub: { fontSize: 11, fontWeight: '600', color: '#60A5FA', marginTop: 2 },
  // ── Pagination ──
  pagination: { flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: 1, borderRadius: 12 },
  pageBtn: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginHorizontal: 2 },
  pageBtnDisabled: { opacity: 0.35 },
  pageBtnText: { fontWeight: '700', fontSize: 16 },
  pageInfo: { fontSize: 13, fontWeight: '600', marginHorizontal: 10 },
  pageSizeRow: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  pageSizeBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  pageSizeBtnText: { fontSize: 12, fontWeight: '600' },
});