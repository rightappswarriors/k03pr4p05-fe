import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {
  ArrowLeft,
  MapPin,
  PhilippinePeso,
  Users,
  Circle,
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AdminService } from '@/services/adminService';
import { AdminOutlet, OutletRevenue } from '@/types';
import { DateRangeFilter, getDateRange } from '@/utils/dateHelpers';
import DateRangePickerModal from '@/components/DateRangePickerModal';
import { useWebSocket } from '@/contexts/WSContext';
import { useTheme } from '@/contexts/ThemeContext';

const FILTERS: DateRangeFilter[] = [
  'today',
  'this_week',
  'this_month',
  'custom',
];

export default function OutletListScreen() {
  const { branchId, branchName } = useLocalSearchParams<{
    branchId: string;
    branchName: string;
  }>();
  const { colors } = useTheme();
  const [outlets, setOutlets] = useState<AdminOutlet[]>([]);
  const [outletRevenues, setOutletRevenues] = useState<
    Record<string, OutletRevenue>
  >({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<DateRangeFilter>('today');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customStart, setCustomStart] = useState<Date | undefined>(undefined);
  const [customEnd, setCustomEnd] = useState<Date | undefined>(undefined);

  const socket = useWebSocket();

  useEffect(() => {
    if (!socket) return;
    socket.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      socket.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'NEW_TRANSACTION') {
          const { outletId, total } = data.payload;
          setOutletRevenues((prev) => ({
            ...prev,
            [outletId]: {
              ...prev[outletId],
              revenue: (prev[outletId]?.totalRevenue || 0) + total,
            },
          }));
        }
      };
    };
  }, [socket]);

  const loadOutlets = useCallback(async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = getDateRange(
        activeFilter,
        customStart,
        customEnd,
      );
      const outletData = await AdminService.getOutletsByBranch(branchId);
      setOutlets(outletData);

      const revenueResults = await Promise.all(
        outletData.map(async (outlet) => {
          const revenue = await AdminService.getOutletRevenue(
            outlet.id,
            startDate,
            endDate,
          );
          return { outletId: outlet.id, revenue };
        }),
      );

      const revenueMap = revenueResults.reduce(
        (acc, { outletId, revenue }) => {
          acc[outletId] = revenue;
          return acc;
        },
        {} as Record<string, OutletRevenue>,
      );

      setOutletRevenues(revenueMap);
    } catch (error) {
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

  const navigateToOutletDetail = (outletId: string, outletName: string) => {
    router.push({
      pathname: '/(admin)/outlet-detail',
      params: { outletId, outletName, branchName },
    });
  };

  const handleCustomRange = (start: Date, end: Date) => {
    setCustomStart(start);
    setCustomEnd(end);
    setActiveFilter('custom');
  };

  const getStatusColor = (status: AdminOutlet['status']) => {
    switch (status) {
      case 'open':
        return colors.success;
      case 'closed':
        return colors.error;
      case 'maintenance':
        return colors.warning;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusText = (status: AdminOutlet['status']) =>
    status.charAt(0).toUpperCase() + status.slice(1);

  if (loading && outlets.length === 0) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.loading}>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading outlets...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.card }]}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.title, { color: colors.text }]}>
            {branchName}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Outlets Overview
          </Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={[styles.filterContainer, { backgroundColor: colors.card }]}>
        {FILTERS.map((filter) => {
          const { label } = getDateRange(filter, customStart, customEnd);
          const isActive = activeFilter === filter;
          return (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterTab,
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
                  styles.filterTabText,
                  { color: isActive ? '#FFFFFF' : colors.textSecondary },
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

      <ScrollView
        style={styles.outletList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {outlets.length} Outlet{outlets.length !== 1 ? 's' : ''}
        </Text>

        {outlets.map((outlet) => {
          const revenue = outletRevenues[outlet.id];
          const statusColor = getStatusColor(outlet.status);

          return (
            <TouchableOpacity
              key={outlet.id}
              style={[styles.outletCard, { backgroundColor: colors.card }]}
              onPress={() => navigateToOutletDetail(outlet.id, outlet.name)}
            >
              <View style={styles.outletHeader}>
                <View style={styles.outletInfo}>
                  <Text style={[styles.outletName, { color: colors.text }]}>
                    {outlet.name}
                  </Text>
                  {outlet.location && (
                    <View style={styles.locationRow}>
                      <MapPin size={14} color={colors.textSecondary} />
                      <Text
                        style={[
                          styles.outletLocation,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {outlet.location}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.statusContainer}>
                  <Circle size={12} color={statusColor} fill={statusColor} />
                  <Text style={[styles.statusText, { color: statusColor }]}>
                    {getStatusText(outlet.status)}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.outletStats,
                  { backgroundColor: colors.background },
                ]}
              >
                <View style={styles.statItem}>
                  <PhilippinePeso size={16} color={colors.success} />
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    ₱{revenue?.totalRevenue.toFixed(2) || '0.00'}
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: colors.textSecondary }]}
                  >
                    Revenue
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Users size={16} color={colors.primary} />
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {revenue?.transactionCount || 0}
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: colors.textSecondary }]}
                  >
                    Transactions
                  </Text>
                </View>
              </View>

              <View
                style={[styles.outletFooter, { borderTopColor: colors.border }]}
              >
                <Text
                  style={[styles.cashierInfo, { color: colors.textSecondary }]}
                >
                  {outlet.currentCashiers.length > 0
                    ? 'Cashier Active'
                    : 'No Active Cashier'}
                </Text>
                <Text style={[styles.viewDetails, { color: colors.primary }]}>
                  View Details →
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    gap: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: { flex: 1 },
  title: { fontSize: 24, fontWeight: 'bold' },
  subtitle: { fontSize: 14, marginTop: 2 },
  filterContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  filterTabText: { fontSize: 13, fontWeight: '500' },
  outletList: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  outletCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  outletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  outletInfo: { flex: 1 },
  outletName: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  outletLocation: { fontSize: 14 },
  statusContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText: { fontSize: 14, fontWeight: '500' },
  outletStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  statItem: { alignItems: 'center', gap: 4 },
  statValue: { fontSize: 18, fontWeight: 'bold' },
  statLabel: { fontSize: 12 },
  outletFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  cashierInfo: { fontSize: 14 },
  viewDetails: { fontSize: 14, fontWeight: '500' },
});
