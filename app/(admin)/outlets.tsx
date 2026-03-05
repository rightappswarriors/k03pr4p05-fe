import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { ArrowLeft, MapPin, PhilippinePeso, Users, Circle } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AdminService } from '@/services/adminService';
import { AdminOutlet, OutletRevenue } from '@/types';
import { DateRangeFilter, getDateRange } from '@/utils/dateHelpers';
import DateRangePickerModal from '@/components/DateRangePickerModal';
import { useWebSocket } from '@/contexts/WSContext';
const FILTERS: DateRangeFilter[] = ['today', 'this_week', 'this_month', 'custom']

export default function OutletListScreen() {
  const { branchId, branchName } = useLocalSearchParams<{ branchId: string; branchName: string }>();
  const [outlets, setOutlets] = useState<AdminOutlet[]>([]);
  const [outletRevenues, setOutletRevenues] = useState<Record<string, OutletRevenue>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<DateRangeFilter>('today')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [customStart, setCustomStart] = useState<Date | undefined>(undefined)  // ✅ explicit undefined
  const [customEnd, setCustomEnd] = useState<Date | undefined>(undefined)      // ✅ explicit undefined

  const socket = useWebSocket();

  useEffect(() => {


    if (!socket) return;

    socket.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      if (process.env.NODE_ENV === "development") {
        console.log("Websocket response", data);
      }
      socket.onmessage = async (event) => {
        const data = JSON.parse(event.data);

        if (data.type === "NEW_TRANSACTION") {
          const { outletId, total } = data.payload;

          setOutletRevenues(prev => ({
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
    console.log('🔄 loadOutlets called with:', activeFilter, customStart, customEnd) // ✅ add this
    try {
      setLoading(true);
      const { startDate, endDate } = getDateRange(activeFilter, customStart, customEnd) // ✅ compute once outside map
      console.log('📅 Date range:', startDate, endDate) // ✅ and this
      const outletData = await AdminService.getOutletsByBranch(branchId);
      setOutlets(outletData);

      const revenuePromises = outletData.map(async (outlet) => {
        const revenue = await AdminService.getOutletRevenue(outlet.id, startDate, endDate); // ✅ reuse same dates
        return { outletId: outlet.id, revenue };
      });

      const revenueResults = await Promise.all(revenuePromises);
      const revenueMap = revenueResults.reduce((acc, { outletId, revenue }) => {
        acc[outletId] = revenue;
        return acc;
      }, {} as Record<string, OutletRevenue>);

      setOutletRevenues(revenueMap);
    } catch (error) {
      console.error('Failed to load outlets:', error);
    } finally {
      setLoading(false);
    }
  }, [branchId, activeFilter, customStart, customEnd])
  useEffect(() => {
    if (branchId) {
      loadOutlets();
    }
  }, [loadOutlets]);
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOutlets();
    setRefreshing(false);
  };

  const navigateToOutletDetail = (outletId: string, outletName: string) => {
    router.push({
      pathname: '/(admin)/outlet-detail',
      params: { outletId, outletName, branchName }
    });
  };

  const handleCustomRange = (start: Date, end: Date) => {
    setCustomStart(start)
    setCustomEnd(end)
    setActiveFilter('custom')
  }
  const getStatusColor = (status: AdminOutlet['status']) => {
    switch (status) {
      case 'open':
        return '#059669';
      case 'closed':
        return '#DC2626';
      case 'maintenance':
        return '#D97706';
      default:
        return '#6B7280';
    }
  };

  const getStatusText = (status: AdminOutlet['status']) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (loading && outlets.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading outlets...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.title}>{branchName}</Text>
          <Text style={styles.subtitle}>Outlets Overview</Text>
        </View>
      </View>

      <View style={styles.filterContainer}>
        {FILTERS.map((filter) => {
          const { label } = getDateRange(filter, customStart, customEnd)
          const isActive = activeFilter === filter
          return (
            <TouchableOpacity
              key={filter}
              style={[styles.filterTab, isActive && styles.filterTabActive]}
              onPress={() => filter === 'custom' ? setShowDatePicker(true) : setActiveFilter(filter)}
            >
              <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Modal */}
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
        <Text style={styles.sectionTitle}>
          {outlets.length} Outlet{outlets.length !== 1 ? 's' : ''}
        </Text>

        {outlets.map((outlet) => {
          const revenue = outletRevenues[outlet.id];

          return (
            <TouchableOpacity
              key={outlet.id}
              style={styles.outletCard}
              onPress={() => navigateToOutletDetail(outlet.id, outlet.name)}
            >
              <View style={styles.outletHeader}>
                <View style={styles.outletInfo}>
                  <Text style={styles.outletName}>{outlet.name}</Text>
                  {outlet.location && (
                    <View style={styles.locationRow}>
                      <MapPin size={14} color="#6B7280" />
                      <Text style={styles.outletLocation}>{outlet.location}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.statusContainer}>
                  <Circle
                    size={12}
                    color={getStatusColor(outlet.status)}
                    fill={getStatusColor(outlet.status)}
                  />
                  <Text style={[styles.statusText, { color: getStatusColor(outlet.status) }]}>
                    {getStatusText(outlet.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.outletStats}>
                <View style={styles.statItem}>
                  <PhilippinePeso size={16} color="#059669" />
                  <Text style={styles.statValue}>
                    ${revenue?.totalRevenue.toFixed(2) || '0.00'}
                  </Text>
                  <Text style={styles.statLabel}>Today's Revenue</Text>
                </View>

                <View style={styles.statItem}>
                  <Users size={16} color="#2563EB" />
                  <Text style={styles.statValue}>
                    {revenue?.transactionCount || 0}
                  </Text>
                  <Text style={styles.statLabel}>Transactions</Text>
                </View>
              </View>

              <View style={styles.outletFooter}>
                <Text style={styles.cashierInfo}>
                  {outlet.currentCashiers.length > 0 ? 'Cashier Active' : 'No Active Cashier'}
                </Text>
                <Text style={styles.viewDetails}>View Details →</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 16,
  },

  filterContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: 'white',
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
  filterTabActive: {
    backgroundColor: '#2563EB',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterTabTextActive: {
    color: 'white',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  outletList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  outletCard: {
    backgroundColor: 'white',
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
  outletInfo: {
    flex: 1,
  },
  outletName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  outletLocation: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  outletStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  outletFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cashierInfo: {
    fontSize: 14,
    color: '#6B7280',
  },
  viewDetails: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '500',
  },
});