import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { MapPin, TrendingUp, LogOut, PhilippinePeso } from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { AdminService } from '@/services/adminService';
import { Branch, BranchRevenue } from '@/types';
import { DateRangeFilter, getDateRange } from '@/utils/dateHelpers';
import DateRangePickerModal from '@/components/DateRangePickerModal'
import { useWebSocket } from '@/contexts/WSContext';

export default function BranchOverviewScreen() {
  const { user, logout } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchRevenues, setBranchRevenues] = useState<Record<string, BranchRevenue>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<DateRangeFilter>('today')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [customStart, setCustomStart] = useState<Date | undefined>(undefined)  // ✅ explicit undefined
  const [customEnd, setCustomEnd] = useState<Date | undefined>(undefined)      // ✅ explicit undefined
  const FILTERS: DateRangeFilter[] = ['today', 'this_week', 'this_month', 'custom']

  const socket = useWebSocket();

  useEffect(() => {
    //console.log("Test Websocket");

    if (!socket) return;

    //console.log("Test Websocket found");
    socket.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      if (process.env.NODE_ENV === "development") {
        //console.log("Websocket response", data);
      }
      socket.onmessage = async (event) => {
        const data = JSON.parse(event.data);

        if (data.type === "NEW_TRANSACTION") {
          const { branchId, total } = data.payload;

          setBranchRevenues(prev => ({
            ...prev,
            [branchId]: {
              ...prev[branchId],
              revenue: (prev[branchId]?.totalRevenue || 0) + total,
            },
          }));
        }
      };
    };
  }, [socket]);

  // ✅ useCallback so loadBranches is stable and captures latest state
  const loadBranches = useCallback(async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = getDateRange(activeFilter, customStart, customEnd)
      const branchData = await AdminService.getBranches();
      setBranches(branchData);

      const revenuePromises = branchData.map(async (branch) => {
        const revenue = await AdminService.getBranchRevenue(branch.id, startDate, endDate);
        return { branchId: branch.id, revenue };
      });

      const revenueResults = await Promise.all(revenuePromises);
      const revenueMap = revenueResults.reduce((acc, { branchId, revenue }) => {
        acc[branchId] = revenue;
        return acc;
      }, {} as Record<string, BranchRevenue>);

      setBranchRevenues(revenueMap);
    } catch (error) {
      //console.error('Failed to load branches:', error);
    } finally {
      setLoading(false);
    }
  }, [activeFilter, customStart, customEnd])  // ✅ dependencies here instead of useEffect

  // ✅ useEffect just calls it — no deps needed since loadBranches already has them
  useEffect(() => {
    loadBranches();
  }, [loadBranches])

  const handleCustomRange = (start: Date, end: Date) => {
    setCustomStart(start)
    setCustomEnd(end)
    setActiveFilter('custom')
  }

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadBranches();
    setRefreshing(false);
  };

  const navigateToOutlets = (branchId: string, branchName: string) => {
    router.push({
      pathname: '/(admin)/outlets',
      params: { branchId, branchName }
    });
  };

  const getTotalRevenue = () => {
    return Object.values(branchRevenues).reduce((sum, revenue) => sum + revenue.totalRevenue, 0);
  };

  const getTotalTransactions = () => {
    return Object.values(branchRevenues).reduce((sum, revenue) => sum + revenue.transactionCount, 0);
  };

  if (loading && branches.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading branches...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Admin Dashboard</Text>
          <Text style={styles.subtitle}>Welcome back, {user?.email}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <LogOut size={20} color="white" />
        </TouchableOpacity>
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

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <PhilippinePeso size={24} color="#059669" />
          <Text style={styles.summaryValue}>${getTotalRevenue().toFixed(2)}</Text>
          <Text style={styles.summaryLabel}>Total Revenue</Text>
        </View>
        <View style={styles.summaryCard}>
          <TrendingUp size={24} color="#2563EB" />
          <Text style={styles.summaryValue}>{getTotalTransactions()}</Text>
          <Text style={styles.summaryLabel}>Transactions</Text>
        </View>
        <View style={styles.summaryCard}>
          <MapPin size={24} color="#D97706" />
          <Text style={styles.summaryValue}>{branches.length}</Text>
          <Text style={styles.summaryLabel}>Active Branches</Text>
        </View>
      </View>

      <ScrollView
        style={styles.branchList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Text style={styles.sectionTitle}>Branches</Text>

        {branches.map((branch) => {
          const revenue = branchRevenues[branch.id];

          return (
            <TouchableOpacity
              key={branch.id}
              style={styles.branchCard}
              onPress={() => navigateToOutlets(branch.id, branch.name)}
            >
              <View style={styles.branchHeader}>
                <View style={styles.branchInfo}>
                  <Text style={styles.branchName}>{branch.name}</Text>
                  <View style={styles.locationRow}>
                    <MapPin size={14} color="#6B7280" />
                    {/**<Text style={styles.branchLocation}>{branch.location.address}</Text> */}
                  </View>
                </View>
                <View style={styles.branchStats}>
                  <Text style={styles.revenueAmount}>
                    ${revenue?.totalRevenue.toFixed(2) || '0.00'}
                  </Text>
                  <Text style={styles.transactionCount}>
                    {revenue?.transactionCount || 0} transactions
                  </Text>
                </View>
              </View>

              <View style={styles.branchFooter}>
                <Text style={styles.outletCount}>
                  {branch.outletIds.length} outlet{branch.outletIds.length !== 1 ? 's' : ''}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
  logoutButton: {
    backgroundColor: '#DC2626',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
  summaryContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  branchList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  branchCard: {
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
  branchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  branchInfo: {
    flex: 1,
  },
  branchName: {
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
  branchLocation: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  branchStats: {
    alignItems: 'flex-end',
  },
  revenueAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#059669',
  },
  transactionCount: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  branchFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  outletCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  viewDetails: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '500',
  },
});