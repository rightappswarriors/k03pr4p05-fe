// screens/(admin)/outlets.tsx — OutletListScreen
// Responsive: 4/3/2/1 grid columns based on screen width

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ListRenderItemInfo,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Image,
  ScrollView,
} from 'react-native';
import {
  ArrowLeft,
  MapPin,
  PhilippinePeso,
  Users,
  Circle,
  Plus,
  X,
  Image as ImageIcon,
  Edit2,
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AdminService } from '@/services/ManagerService';
import { AdminOutlet, OutletRevenue } from '@/types';
import { DateRangeFilter, getDateRange } from '@/utils/dateHelpers';
import DateRangePickerModal from '@/components/DateRangePickerModal';
import { useSocket } from '@/contexts/SocketContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLimitGuard } from '@/components/LockedFeature';
import { SkeletonPulse } from './branch';
import { useResponsiveGrid } from '@/hooks/useResponsiveGrid';
import { AddOutletModal, OutletFormData } from '@/components/AddOutletModal';

export const FILTERS: DateRangeFilter[] = [
  'today',
  'this_week',
  'this_month',
  'custom',
];
// ─── Overlay styles ────────────────────────────────────────────────────────────

const isWeb = Platform.OS === 'web';

// Bottom sheet overlay — used only on native (modals on web use centeredOverlay)
export const bottomSheetOverlay: any = Platform.select({
  web: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'flex-end' as const,
    alignItems: 'center' as const,
    zIndex: 9999,
  },
  default: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end' as const,
  },
});

// Centered modal overlay — web only
export const centeredOverlay: any = Platform.select({
  web: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    zIndex: 9999,
  },
  default: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end' as const,
  },
});

// ─── Skeleton outlet card ──────────────────────────────────────────────────────

function SkeletonOutletCard({ colors }: { colors: any }) {
  return (
    <View style={[ols.outletCard, { backgroundColor: colors.card }]}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <View style={{ flex: 1, gap: 6 }}>
          <SkeletonPulse colors={colors} style={{ width: '55%', height: 16 }} />
          <SkeletonPulse colors={colors} style={{ width: '40%', height: 12 }} />
        </View>
        <SkeletonPulse
          colors={colors}
          style={{ width: 60, height: 22, borderRadius: 11 }}
        />
      </View>
      <SkeletonPulse
        colors={colors}
        style={{ width: '100%', height: 52, borderRadius: 8, marginBottom: 12 }}
      />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <SkeletonPulse colors={colors} style={{ width: 100, height: 12 }} />
        <SkeletonPulse colors={colors} style={{ width: 80, height: 12 }} />
      </View>
    </View>
  );
}



// ─── Edit Branch Modal ─────────────────────────────────────────────────────────

function EditBranchModal({
  visible,
  onClose,
  branchId,
  branchName,
  branchAddress,
  branchPhone,
  onUpdated,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  branchId: string;
  branchName: string;
  branchAddress: string;
  branchPhone: string;
  onUpdated: (branch: {
    name: string;
    address: string;
    phone?: string;
  }) => void;
  colors: any;
}) {
  const [name, setName] = useState(branchName);
  const [address, setAddress] = useState(branchAddress);
  const [phone, setPhone] = useState(branchPhone);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setName(branchName);
      setAddress(branchAddress);
      setPhone(branchPhone);
      setError('');
    }
  }, [visible, branchName, branchAddress, branchPhone]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Branch name is required.');
      return;
    }
    if (!address.trim()) {
      setError('Branch address is required.');
      return;
    }
    setLoading(true);
    try {
      const updated = await AdminService.updateBranch(branchId, {
        name: name.trim(),
        address: address.trim(),
        phone: phone.trim() || undefined,
      });
      onUpdated({
        name: updated.name,
        address: updated.address,
        phone: updated.phone,
      });
      onClose();
    } catch (err) {
      setError('Unable to update branch. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // On web: centered dialog. On native: bottom sheet.
  const overlayStyle = isWeb ? centeredOverlay : bottomSheetOverlay;

  return (
    <Modal
      visible={visible}
      transparent
      animationType={isWeb ? 'fade' : 'slide'}
      onRequestClose={onClose}
    >
      <View style={overlayStyle}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onClose}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View
            style={[
              ebm.sheet,
              isWeb && ebm.webDialog,
              { backgroundColor: colors.surface },
            ]}
          >
            {/* Handle — native only */}
            {!isWeb && (
              <View style={[ebm.handle, { backgroundColor: colors.border }]} />
            )}

            <View style={[ebm.header, { borderBottomColor: colors.border }]}>
              <Text style={[ebm.title, { color: colors.text }]}>
                Edit Branch
              </Text>
              <TouchableOpacity onPress={onClose}>
                <X size={20} color={colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={ebm.body}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={[ebm.label, { color: colors.textSecondary }]}>
                Branch Name *
              </Text>
              <TextInput
                style={[
                  ebm.input,
                  {
                    color: colors.text,
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
                value={name}
                onChangeText={setName}
                placeholder="Branch name"
                placeholderTextColor={colors.textSecondary}
              />
              <Text style={[ebm.label, { color: colors.textSecondary }]}>
                Address *
              </Text>
              <TextInput
                style={[
                  ebm.input,
                  {
                    color: colors.text,
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
                value={address}
                onChangeText={setAddress}
                placeholder="Branch address"
                placeholderTextColor={colors.textSecondary}
              />
              <Text style={[ebm.label, { color: colors.textSecondary }]}>
                Phone
              </Text>
              <TextInput
                style={[
                  ebm.input,
                  {
                    color: colors.text,
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
                value={phone}
                onChangeText={setPhone}
                placeholder="Contact phone"
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
              />
              {error ? (
                <Text style={{ color: colors.error, marginTop: 8 }}>
                  {error}
                </Text>
              ) : null}
              <TouchableOpacity
                style={[
                  ebm.saveBtn,
                  {
                    backgroundColor: colors.primary,
                    opacity: loading ? 0.7 : 1,
                  },
                ]}
                onPress={handleSave}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text style={ebm.saveTxt}>
                  {loading ? 'Updating…' : 'Save Changes'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── Outlet Card ───────────────────────────────────────────────────────────────

function OutletCard({
  outlet,
  revenue,
  colors,
  onPress,
  getStatusColor,
}: {
  outlet: AdminOutlet;
  revenue: OutletRevenue | undefined;
  colors: any;
  onPress: () => void;
  getStatusColor: (s: string) => string;
}) {
  const statusColor = getStatusColor(outlet.status);
  if (__DEV__) console.log('outlet.bannerImage:', outlet.name, outlet.bannerImage);
  return (
    <TouchableOpacity
      style={[ols.outletCard, { backgroundColor: colors.card }]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      {outlet.bannerImage ? (
        <Image
          source={{ uri: outlet.bannerImage }}
          style={{
            width: '100%',
            height: 120,
            borderRadius: 10,
            marginBottom: 10,
          }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            width: '100%',
            height: 120,
            borderRadius: 10,
            backgroundColor: colors.border,
            marginBottom: 10,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: colors.textSecondary }}>No image</Text>
        </View>
      )}
      <View style={ols.outletHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[ols.outletName, { color: colors.text }]}>
            {outlet.name}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              marginTop: 4,
            }}
          >
            <View
              style={[
                ols.typeBadge,
                { backgroundColor: colors.primary + '18' },
              ]}
            >
              <Text style={[ols.typeText, { color: colors.primary }]}>
                {outlet.outletType}
              </Text>
            </View>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Circle size={10} color={statusColor} fill={statusColor} />
          <Text style={[ols.statusText, { color: statusColor }]}>
            {outlet.status.charAt(0).toUpperCase() + outlet.status.slice(1)}
          </Text>
        </View>
      </View>
      <View style={[ols.statsRow, { backgroundColor: colors.background }]}>
        <View style={ols.statItem}>
          <PhilippinePeso size={14} color={colors.success} strokeWidth={2} />
          <Text style={[ols.statVal, { color: colors.text }]}>
            ₱{(revenue?.totalRevenue ?? 0).toLocaleString()}
          </Text>
          <Text style={[ols.statLbl, { color: colors.textSecondary }]}>
            Revenue
          </Text>
        </View>
        <View style={ols.statItem}>
          <MapPin size={14} color={colors.accent} strokeWidth={2} />
          <Text style={[ols.statVal, { color: colors.text }]}>
            {revenue?.transactionCount ?? 0}
          </Text>
          <Text style={[ols.statLbl, { color: colors.textSecondary }]}>
            Transactions
          </Text>
        </View>
        <View style={ols.statItem}>
          <Users size={14} color={colors.primary} strokeWidth={2} />
          <Text style={[ols.statVal, { color: colors.text }]}>
            {outlet.currentCashiers.length}
          </Text>
          <Text style={[ols.statLbl, { color: colors.textSecondary }]}>
            Active Staff
          </Text>
        </View>
      </View>
      <View style={[ols.footer, { borderTopColor: colors.border }]}>
        <Text style={[ols.viewDetails, { color: colors.primary }]}>
          View Details →
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function OutletListScreen() {
  const { branchId, branchName } = useLocalSearchParams<{
    branchId: string;
    branchName: string;
  }>();
  const { colors } = useTheme();
  const { subscribe } = useSocket();
  const { checkOutlet, renderGuardModal } = useLimitGuard();
  const grid = useResponsiveGrid();

  const [outlets, setOutlets] = useState<AdminOutlet[]>([]);
  const [outletRevenues, setOutletRevenues] = useState<
    Record<string, OutletRevenue>
  >({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<DateRangeFilter>('today');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editBranchModalOpen, setEditBranchModalOpen] = useState(false);
  const [currentBranchName, setCurrentBranchName] = useState(branchName ?? '');
  const [currentBranchAddress, setCurrentBranchAddress] = useState('');
  const [currentBranchPhone, setCurrentBranchPhone] = useState('');

  useEffect(() => {
    const unsubscribe = subscribe(({ event, type, payload }) => {
      if ((event || type) !== 'transaction:new') return;
      const { outletId, total } = payload;
      if (!outletId || total == null) return;
      setOutletRevenues((prev) => ({
        ...prev,
        [outletId]: {
          ...prev[outletId],
          totalRevenue: (prev[outletId]?.totalRevenue || 0) + total,
        },
      }));
    });
    return unsubscribe;
  }, [subscribe]);

  const loadOutlets = useCallback(async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = getDateRange(
        activeFilter,
        customStart,
        customEnd,
      );
      const branchData = await AdminService.getBranchById(branchId);
      if (branchData) {
        setCurrentBranchName(branchData.name || branchName || '');
        setCurrentBranchAddress(branchData.address || '');
        setCurrentBranchPhone(branchData.phone || '');
      }
      const outletData = await AdminService.getOutletsByBranch(branchId);
      setOutlets(outletData);
      const revenueResults = await Promise.all(
        outletData.map(async (o) => ({
          outletId: o.id,
          revenue: await AdminService.getOutletRevenue(
            o.id,
            startDate,
            endDate,
          ),
        })),
      );
      setOutletRevenues(
        revenueResults.reduce(
          (acc, { outletId, revenue }) => {
            acc[outletId] = revenue;
            return acc;
          },
          {} as Record<string, OutletRevenue>,
        ),
      );
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }, [branchId, activeFilter, customStart, customEnd]);

  useEffect(() => {
    if (branchId) loadOutlets();
  }, [loadOutlets]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOutlets();
    setRefreshing(false);
  };

  const handleAddOutlet = async (data: OutletFormData) => {
    try {
      const newOutlet = await AdminService.createOutlet(branchId!, {
        name: data.name,
        address: data.address,
        phone: data.phone,
        outletType: data.outletType,
        status: data.status,
        code: data.code,
        governmentTax: parseFloat(data.governmentTax) || 0,
        serviceCharge: parseFloat(data.serviceCharge) || 0,
        latitude: data.latitude,
        longitude: data.longitude,
        bannerImage: data.bannerImage,
        wifiSSID: data.wifiSSID,
        isActive: data.isActive,
        tin: data.tin,
        ptu: data.ptu,
        bir: data.bir,
        isVatRegistered: data.isVatRegistered,
        vatZeroSale: data.vatZeroSale ? parseFloat(data.vatZeroSale) : undefined,
        vatTypeId: data.vatTypeId,
        outletPromos: data.outletPromos,
      });
      setOutlets((prev) => [
        ...prev,
        { ...newOutlet, bannerImagePath: data.bannerImagePath },
      ]);
    } catch (error) {
      if (__DEV__) console.error('Failed to create outlet:', error);
      throw error;
    }
  };

  const openAddModal = () => {
    if (!checkOutlet(outlets.length)) return;
    setAddModalOpen(true);
  };

  const getStatusColor = (status: string) => {
    if (status === 'open') return colors.success;
    if (status === 'closed') return colors.error;
    if (status === 'maintenance') return colors.warning;
    return colors.textSecondary;
  };

  const skeletonData = [1, 2, 3, 4, 5, 6];

  const renderOutletItem = ({ item }: ListRenderItemInfo<AdminOutlet>) => (
    <View style={{ flex: 1, padding: grid.screenPadding / 2 }}>
      <OutletCard
        outlet={item}
        revenue={outletRevenues[item.id]}
        colors={colors}
        getStatusColor={getStatusColor}
        onPress={() =>
          router.push({
            pathname: '/(erp)/outlet-detail',
            params: {
              outletId: item.id,
              outletName: item.name,
              branchName,
              branchId,
            },
          })
        }
      />
    </View>
  );

  const renderSkeletonItem = ({ item }: ListRenderItemInfo<number>) => (
    <View style={{ flex: 1, padding: grid.screenPadding / 2 }}>
      <SkeletonOutletCard colors={colors} />
    </View>
  );

  return (
    <SafeAreaView
      style={[ols.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View
        style={[
          ols.header,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity
          style={[ols.backBtn, { backgroundColor: colors.card }]}
          onPress={() => router.back()}
        >
          <ArrowLeft size={22} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[ols.title, { color: colors.text }]}>
            {currentBranchName}
          </Text>
          <Text style={[ols.subtitle, { color: colors.textSecondary }]}>
            Outlets Overview
          </Text>
        </View>
        <TouchableOpacity
          style={[
            ols.editBtn,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
          onPress={() => setEditBranchModalOpen(true)}
          activeOpacity={0.8}
        >
          <Edit2 size={15} color={colors.primary} strokeWidth={2} />
          <Text style={[ols.editBtnTxt, { color: colors.primary }]}>Edit</Text>
        </TouchableOpacity>
      </View>

      {/* Centred content wrapper */}
      <View
        style={{
          flex: 1,
          alignSelf: 'center',
          width: '100%',
          maxWidth: grid.maxContentWidth,
        }}
      >
        {/* Date filters */}
        <View
          style={[
            ols.filterContainer,
            {
              backgroundColor: colors.card,
              marginHorizontal: grid.screenPadding,
            },
          ]}
        >
          {FILTERS.map((filter) => {
            const { label } = getDateRange(filter, customStart, customEnd);
            const isActive = activeFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                style={[
                  ols.filterTab,
                  isActive && { backgroundColor: colors.primary },
                ]}
                onPress={() =>
                  filter === 'custom'
                    ? setShowDatePicker(true)
                    : setActiveFilter(filter)
                }
              >
                <Text
                  style={[
                    ols.filterTabText,
                    { color: isActive ? '#fff' : colors.textSecondary },
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
          onApply={(s, e) => {
            setCustomStart(s);
            setCustomEnd(e);
            setActiveFilter('custom');
          }}
          initialStart={customStart}
          initialEnd={customEnd}
        />

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: grid.screenPadding,
            marginBottom: 4,
            marginTop: 8,
          }}
        >
          <Text style={[ols.sectionTitle, { color: colors.text }]}>
            {outlets.length} Outlet{outlets.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {loading && outlets.length === 0 ? (
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
            key={`outlets-${grid.cols}`}
            data={outlets}
            keyExtractor={(item) => item.id}
            renderItem={renderOutletItem}
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
        style={[ols.fab, { backgroundColor: colors.primary }]}
        onPress={openAddModal}
        activeOpacity={0.88}
      >
        <Plus size={22} color="#fff" strokeWidth={2.5} />
      </TouchableOpacity>

      <AddOutletModal
        visible={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={handleAddOutlet}
        colors={colors}
        branchName={currentBranchName}
      />
      <EditBranchModal
        visible={editBranchModalOpen}
        onClose={() => setEditBranchModalOpen(false)}
        branchId={branchId}
        branchName={currentBranchName}
        branchAddress={currentBranchAddress}
        branchPhone={currentBranchPhone}
        onUpdated={(branch) => {
          setCurrentBranchName(branch.name);
          setCurrentBranchAddress(branch.address);
          setCurrentBranchPhone(branch.phone || '');
        }}
        colors={colors}
      />
      {renderGuardModal()}
    </SafeAreaView>
  );
}

const ols = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 20, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 2 },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  editBtnTxt: { fontSize: 13, fontWeight: '600' },
  filterContainer: {
    flexDirection: 'row',
    marginTop: 12,
    marginBottom: 4,
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
  filterTabText: { fontSize: 12, fontWeight: '500' },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  outletCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 0,
    elevation: 2,
    flex: 1,
  },
  outletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  outletName: { fontSize: 16, fontWeight: '700' },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusText: { fontSize: 13, fontWeight: '600' },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderRadius: 10,
    paddingVertical: 12,
    marginBottom: 12,
  },
  statItem: { alignItems: 'center', gap: 4 },
  statVal: { fontSize: 16, fontWeight: '800' },
  statLbl: { fontSize: 11 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 10,
    borderTopWidth: 1,
  },
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
});

const ebm = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%' as any,
  },
  // Web-only: centered dialog
  webDialog: {
    borderRadius: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    width: 480,
    maxWidth: '90vw' as any,
    maxHeight: '85vh' as any,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 24,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 17, fontWeight: '800' },
  body: { padding: 20, paddingBottom: 32 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 5,
    marginTop: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    marginBottom: 4,
  },
  saveBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  saveTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
