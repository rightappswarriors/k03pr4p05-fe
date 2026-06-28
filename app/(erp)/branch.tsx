// screens/(erp)/index.tsx  — BranchOverviewScreen
// Responsive: 4/3/2/1 grid columns based on screen width

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Animated,
  ListRenderItemInfo,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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
  Package,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { AdminService } from '@/services/ManagerService';
import { Branch, BranchRevenue } from '@/types';
import { DateRangeFilter, getDateRange } from '@/utils/dateHelpers';
import DateRangePickerModal from '@/components/DateRangePickerModal';
import { useWebSocket } from '@/contexts/WSContext';
import { useTheme } from '@/contexts/ThemeContext';
import { formatPeso, formatPesoCompact } from '@/utils/moneyHelpers';
import { useLimitGuard } from '@/components/LockedFeature';
import { useResponsiveGrid } from '@/hooks/useResponsiveGrid';
import { useResponsive } from '@/hooks/useResponsive';

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
  options: { id: string; label: string }[];
  onSelect: (item: { id: string; label: string }) => void;
  colors: any;
  placeholder?: string;
}) {
  const selectedItem = options.find((o) => o.id === value);
  const { isMobile } = useResponsive();
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
          {selectedItem?.label || placeholder || 'Select…'}
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
            alignItems: 'center',
          }}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 14,
              overflow: 'hidden',
              maxWidth: isMobile ? '100%' : 600,
              alignSelf: 'center',
              width: '100%',
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
            {options.length === 0 ? (
              <View
                style={{
                  padding: 24,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Package
                  size={isMobile ? 26 : 40}
                  color={colors.textSecondary}
                  strokeWidth={1.5}
                />

                <Text
                  style={{
                    marginTop: 10,
                    fontSize: 14,
                    fontWeight: '600',
                    color: colors.text,
                  }}
                >
                  No {label}
                </Text>

                <Text
                  style={{
                    fontSize: 12,
                    color: colors.textSecondary,
                    marginTop: 4,
                    textAlign: 'center',
                  }}
                >
                  No {label.toLowerCase()} found in the masterfile.
                  {'\n'}
                  Create one first.
                </Text>
              </View>
            ) : (
              <ScrollView
                style={{ maxHeight: 380 }}
                showsVerticalScrollIndicator={Platform.OS === 'web'}
              >
                {options.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 14,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                      backgroundColor:
                        item.id === value ? colors.primary + '15' : 'transparent',
                    }}
                    onPress={() => {
                      onSelect(item);
                      setOpen(false);
                    }}
                  >
                    <Text style={{ fontSize: 13, color: colors.text, flex: 1 }}>
                      {item.label}
                    </Text>

                    {item.id === value && (
                      <CheckCircle2
                        size={16}
                        color={colors.primary}
                        strokeWidth={2}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
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
  const { isMobile } = useResponsive(); // ← already imported

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
      animationType={isMobile ? 'slide' : 'fade'}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Backdrop */}
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.48)',
            // On web: centre the sheet; on mobile: push it to bottom
            justifyContent: isMobile ? 'flex-end' : 'center',
            alignItems: 'center',
          }}
          activeOpacity={1}
          onPress={onClose}
        >
          {/* Sheet — stops touch propagation so tapping inside won't close */}
          <TouchableOpacity
            activeOpacity={1}
            style={{ width: isMobile ? '100%' : 560, alignSelf: 'center' }}
          >
            <View
              style={[
                s.modalSheet,
                {
                  backgroundColor: colors.surface,
                  // Mobile: square top corners become pill bottom sheet
                  borderRadius: isMobile ? 0 : 16,
                  borderTopLeftRadius: 16,
                  borderTopRightRadius: 16,
                  maxHeight: '100%',
                },
              ]}
            >
              {/* Drag handle — only visible on mobile */}
              {isMobile && (
                <View
                  style={[s.modalHandle, { backgroundColor: colors.border }]}
                />
              )}

              <View
                style={[s.modalHeader, { borderBottomColor: colors.border }]}
              >
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
                    style={{
                      fontSize: 12,
                      color: colors.error,
                      marginBottom: 8,
                    }}
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
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Branch Card ───────────────────────────────────────────────────────────────

function BranchCard({
  branch,
  revenue,
  colors,
  onPress,
}: {
  branch: Branch;
  revenue: BranchRevenue | undefined;
  colors: any;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        s.branchCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <View style={s.branchHeader}>
        <View style={s.branchInfo}>
          <Text style={[s.branchName, { color: colors.text }]}>
            {branch.name}
          </Text>
          <View style={s.locationRow}>
            <MapPin size={13} color={colors.textSecondary} strokeWidth={2} />
            <Text style={[s.outletCount, { color: colors.textSecondary }]}>
              {branch.outletIds.length} outlet
              {branch.outletIds.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
        <View style={s.branchStats}>
          <Text style={[s.revenueAmount, { color: colors.success }]}>
            {formatPeso(revenue?.totalRevenue ?? 0)}
          </Text>
          <Text style={[s.transactionCount, { color: colors.textSecondary }]}>
            {revenue?.transactionCount ?? 0} txns
          </Text>
        </View>
      </View>
      <View style={[s.branchFooter, { borderTopColor: colors.border }]}>
        <Text style={[s.viewDetails, { color: colors.primary }]}>
          View Details →
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function BranchOverviewScreen() {
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const socket = useWebSocket();
  const { checkBranch, renderGuardModal } = useLimitGuard();
  const grid = useResponsiveGrid();

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
    try {
      const newBranch = await AdminService.createBranch({
        name: data.name!,
        address: data.address!,
        phone: data.phone,
      });
      setBranches((prev) => [...prev, newBranch]);
    } catch (error) {
      if (__DEV__) console.error('Failed to create branch:', error);
    }
  };

  const openAddModal = () => {
    if (!checkBranch(branches.length)) return;
    setAddModalOpen(true);
  };

  const getTotalRevenue = () =>
    Object.values(branchRevenues).reduce((s, r) => s + r.totalRevenue, 0);
  const getTotalTransactions = () =>
    Object.values(branchRevenues).reduce((s, r) => s + r.transactionCount, 0);
  const navigateToOutlets = (branchId: string, branchName: string) =>
    router.push({
      pathname: '/(erp)/outlets',
      params: { branchId, branchName },
    });

  // Skeleton items for grid loading state
  const skeletonData = [1, 2, 3, 4, 5, 6, 7, 8];

  const renderBranchItem = ({ item }: ListRenderItemInfo<Branch>) => {
    const revenue = branchRevenues[item.id];
    return (
      <View style={{ flex: 1, padding: grid.screenPadding / 2 }}>
        <BranchCard
          branch={item}
          revenue={revenue}
          colors={colors}
          onPress={() => navigateToOutlets(item.id, item.name)}
        />
      </View>
    );
  };

  const renderSkeletonItem = ({ item }: ListRenderItemInfo<number>) => (
    <View style={{ flex: 1, padding: grid.screenPadding / 2 }}>
      <SkeletonBranchCard colors={colors} />
    </View>
  );

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
          <Text style={[s.title, { color: colors.text }]}>Branch and Outlets</Text>
          
        </View>
      </View>

      {/* Centred content wrapper for wide screens */}
      <View
        style={{
          flex: 1,
          alignSelf: 'center',
          width: '100%',
          maxWidth: grid.maxContentWidth,
        }}
      >
        {/* Date filter */}
        <View
          style={[
            s.filterContainer,
            {
              backgroundColor: colors.card,
              marginHorizontal: grid.screenPadding,
            },
          ]}
        >
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

        {/* Summary cards — always 3 across */}
        <View
          style={[
            s.summaryContainer,
            { paddingHorizontal: grid.screenPadding },
          ]}
        >
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

        {/* Section header */}
        <View
          style={[s.sectionHeader, { paddingHorizontal: grid.screenPadding }]}
        >
          <Text style={[s.sectionTitle, { color: colors.text }]}>Branches</Text>
          <Text style={{ fontSize: 11, color: colors.textSecondary }}>
            {branches.length} total
          </Text>
        </View>

        {/* Branch grid — numColumns changes with screen width */}
        {loading && branches.length === 0 ? (
          <FlatList
            key={`skeleton-${grid.cols}`}
            data={skeletonData}
            keyExtractor={(item) => `skel-${item}`}
            renderItem={renderSkeletonItem}
            numColumns={grid.cols}
            contentContainerStyle={{
              paddingHorizontal: grid.screenPadding / 2,
              paddingBottom: 100,
            }}
            scrollEnabled={false}
          />
        ) : (
          <FlatList
            key={`branches-${grid.cols}`}
            data={branches}
            keyExtractor={(item) => item.id}
            renderItem={renderBranchItem}
            numColumns={grid.cols}
            contentContainerStyle={{
              paddingHorizontal: grid.screenPadding / 2,
              paddingBottom: 100,
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
              />
            }
          />
        )}
      </View>

      {/* FAB */}
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
      {renderGuardModal()}
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
  summaryContainer: { flexDirection: 'row', paddingVertical: 12, gap: 10 },
  summaryCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
  },
  summaryValue: { fontSize: 16, fontWeight: '800', marginTop: 6 },
  summaryLabel: { fontSize: 10, marginTop: 3, textAlign: 'center' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    marginTop: 4,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  // Branch card — fills its grid cell
  branchCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    elevation: 2,
    flex: 1,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.48)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalSheet: {
    borderRadius: 16,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 20,
    alignSelf: 'center',
    width: '100%',
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
  modalBody: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
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
});

const sk = StyleSheet.create({
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
  },
  branchCard: { borderRadius: 12, padding: 14, borderWidth: 1, flex: 1 },
});
