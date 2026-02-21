import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { MapPin, DollarSign, TrendingUp, LogOut, Calendar } from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { AdminService } from '@/services/adminService';
import { Branch, BranchRevenue } from '@/types';

export default function BranchOverviewScreen() {
  const { user, logout } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchRevenues, setBranchRevenues] = useState<Record<string, BranchRevenue>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadBranches();
  }, [selectedDate]);

  const loadBranches = async () => {
    //if (!user?.id) return;

    try {
      setLoading(true);
      const branchData = await AdminService.getBranches();
      setBranches(branchData);

      // Load revenue for each branch
      const revenuePromises = branchData.map(async (branch) => {
        const startDate = `${selectedDate}T00:00:00Z`;
        const endDate = `${selectedDate}T23:59:59Z`;
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
      console.error('Failed to load branches:', error);
    } finally {
      setLoading(false);
    }
  };

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

      {/* Date Selector */}
      <View style={styles.dateSelector}>
        <Calendar size={20} color="#2563EB" />
        <Text style={styles.dateText}>Revenue for: {new Date(selectedDate).toLocaleDateString()}</Text>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <DollarSign size={24} color="#059669" />
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
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    gap: 8,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
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