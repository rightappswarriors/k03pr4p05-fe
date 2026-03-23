import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Animated,
  FlatList,
} from 'react-native';
import {
  MapPin,
  TrendingUp,
  LogOut,
  PhilippinePeso,
  ChevronDown,
  CheckCircle2,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { AdminService } from '@/services/adminService';
import { Branch, BranchRevenue } from '@/types';
import { DateRangeFilter, getDateRange } from '@/utils/dateHelpers';
import DateRangePickerModal from '@/components/DateRangePickerModal';
import { useWebSocket } from '@/contexts/WSContext';
import { useTheme } from '@/contexts/ThemeContext';
import { formatPeso, formatPesoCompact } from '@/utils/moneyHelpers';

const DATE_FILTERS: DateRangeFilter[] = [
  'today',
  'this_week',
  'this_month',
  'custom',
];

// ─── Skeleton Components ──────────────────────────────────────────────────────

export function SkeletonPulse({ style, colors }: { style?: any; colors: any }) {
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

// ─── DropdownField ────────────────────────────────────────────────────────────

export function DropdownField({
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

// ─── Summary Table (Item Net Summary) ────────────────────────────────────────
// Columns: Items | Contribution(%) Cost | Total Sales | Net Sales
// Example row: Keyboard  |  ₱100.00 (1%)  |  ₱350.00  |  ₱250.00

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
  const socket = useWebSocket();
  const { colors } = useTheme();

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
            ? [1, 2, 3, 4, 5, 6].map((i) => (
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
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
export const s = StyleSheet.create({
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

  branchSection: { paddingHorizontal: 16, paddingBottom: 6, flex: 1 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  branchScroll: {
    flex: 1, // ✅ makes ScrollView grow
  },
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
