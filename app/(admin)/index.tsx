// app/(admin)/index.tsx  — BranchOverviewScreen
// Added: Add Branch FAB + modal, subscription limit guard

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
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  MapPin,
  TrendingUp,
  LogOut,
  PhilippinePeso,
  ChevronDown,
  CheckCircle2,
  Plus,
  X,
  Building2,
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
import { useLimitGuard } from '@/components/LockedFeature';

const DATE_FILTERS: DateRangeFilter[] = [
  'today',
  'this_week',
  'this_month',
  'custom',
];

// ─── Skeleton ──────────────────────────────────────────────────────────────────

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

// ─── DropdownField ──────────────────────────────────────────────────────────────

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

// ─── Add Branch Modal ──────────────────────────────────────────────────────────

function AddBranchModal({
  visible,
  onClose,
  onAdd,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (branch: Partial<Branch>) => Promise<void>;
  colors: any;
}) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAdd = async () => {
    if (!name.trim()) {
      setError('Branch name is required.');
      return;
    }
    if (!address.trim()) {
      setError('Address is required.');
      return;
    }
    setLoading(true);
    try {
      await onAdd({
        name: name.trim(),
        address: address.trim(),
        phone: phone.trim() || undefined,
      });
      setName('');
      setAddress('');
      setPhone('');
      setError('');
      onClose();
    } catch {
      setError('Failed to create branch. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={s.modalBackdrop}>
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={onClose}
          />
          <View style={[s.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={[s.modalHandle, { backgroundColor: colors.border }]} />
            <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[s.modalTitle, { color: colors.text }]}>
                New Branch
              </Text>
              <TouchableOpacity onPress={onClose}>
                <X size={20} color={colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <ScrollView
              contentContainerStyle={s.modalBody}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>
                BRANCH NAME *
              </Text>
              <TextInput
                style={[
                  s.input,
                  {
                    color: colors.text,
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="e.g. Main Branch"
                placeholderTextColor={colors.textSecondary}
                value={name}
                onChangeText={setName}
              />

              <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>
                ADDRESS *
              </Text>
              <TextInput
                style={[
                  s.input,
                  s.textarea,
                  {
                    color: colors.text,
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Full address"
                placeholderTextColor={colors.textSecondary}
                value={address}
                onChangeText={setAddress}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>
                PHONE (optional)
              </Text>
              <TextInput
                style={[
                  s.input,
                  {
                    color: colors.text,
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="+63 9XX XXX XXXX"
                placeholderTextColor={colors.textSecondary}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />

              {error ? (
                <Text
                  style={{ fontSize: 12, color: colors.error, marginBottom: 8 }}
                >
                  {error}
                </Text>
              ) : null}

              <TouchableOpacity
                style={[
                  s.submitBtn,
                  {
                    backgroundColor: colors.primary,
                    opacity: loading ? 0.7 : 1,
                  },
                ]}
                onPress={handleAdd}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text style={s.submitBtnText}>
                  {loading ? 'Creating…' : 'Create Branch'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function BranchOverviewScreen() {
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const socket = useWebSocket();
  const { checkBranch, GuardModal } = useLimitGuard();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchRevenues, setBranchRevenues] = useState<
    Record<string, BranchRevenue>
  >({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<DateRangeFilter>('today');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();
  const [addModalOpen, setAddModalOpen] = useState(false);

  // WebSocket
  useEffect(() => {
    if (!socket) return;
    socket.onmessage = (event) => {
      const inner = JSON.parse(event.data);
      if (inner.type === 'NEW_TRANSACTION') {
        const { branchId, total } = inner.payload;
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
        branchData.map(async (b) => ({
          branchId: b.id,
          revenue: await AdminService.getBranchRevenue(
            b.id,
            startDate,
            endDate,
          ),
        })),
      );
      setBranchRevenues(
        revenueResults.reduce(
          (acc, { branchId, revenue }) => {
            acc[branchId] = revenue;
            return acc;
          },
          {} as Record<string, BranchRevenue>,
        ),
      );
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }, [activeFilter, customStart, customEnd]);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadBranches();
    setRefreshing(false);
  };

  const handleAddBranch = async (data: Partial<Branch>) => {
    // TODO: replace with AdminService.createBranch(data) when backend ready
    const mock: Branch = {
      id: `b_${Date.now()}`,
      name: data.name!,
      address: data.address!,
      outletIds: [],
      phone: data.phone,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    setBranches((prev) => [...prev, mock]);
  };

  const openAddModal = () => {
    if (!checkBranch(branches.length)) return; // blocked by subscription
    setAddModalOpen(true);
  };

  const getTotalRevenue = () =>
    Object.values(branchRevenues).reduce((s, r) => s + r.totalRevenue, 0);
  const getTotalTransactions = () =>
    Object.values(branchRevenues).reduce((s, r) => s + r.transactionCount, 0);
  const navigateToOutlets = (branchId: string, branchName: string) =>
    router.push({
      pathname: '/(admin)/outlets',
      params: { branchId, branchName },
    });

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
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

      {/* Date filter */}
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
        onApply={(start, end) => {
          setCustomStart(start);
          setCustomEnd(end);
          setActiveFilter('custom');
        }}
        initialStart={customStart}
        initialEnd={customEnd}
      />

      {/* Summary cards */}
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
                Branches
              </Text>
            </View>
          </>
        )}
      </View>

      {/* Branches list */}
      <View style={[s.branchSection, { backgroundColor: colors.background }]}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
          }}
        >
          <Text style={[s.sectionTitle, { color: colors.text }]}>Branches</Text>
          <Text style={{ fontSize: 11, color: colors.textSecondary }}>
            {branches.length} total
          </Text>
        </View>
        <ScrollView
          style={s.branchScroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          nestedScrollEnabled
        >
          {loading && branches.length === 0
            ? [1, 2, 3, 4].map((i) => (
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

      {/* FAB — Add Branch */}
      <TouchableOpacity
        style={[s.fab, { backgroundColor: colors.primary }]}
        onPress={openAddModal}
        activeOpacity={0.88}
      >
        <Plus size={22} color="#fff" strokeWidth={2.5} />
      </TouchableOpacity>

      <AddBranchModal
        visible={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={handleAddBranch}
        colors={colors}
      />
      <GuardModal />
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

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
    elevation: 2,
  },
  summaryValue: { fontSize: 16, fontWeight: '800', marginTop: 6 },
  summaryLabel: { fontSize: 10, marginTop: 3, textAlign: 'center' },
  branchSection: { paddingHorizontal: 16, paddingBottom: 6, flex: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  branchScroll: { flex: 1 },
  branchCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
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
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  // Modal styles (exported for reuse in DropdownField etc.)
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.48)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '70%',
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
    elevation: 10,
  },
  newEntryBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
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

const sk = StyleSheet.create({
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
  },
  branchCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
});
