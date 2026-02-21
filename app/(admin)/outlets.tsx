import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { ArrowLeft, MapPin, DollarSign, Users, Circle } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AdminService } from '@/services/adminService';
import { AdminOutlet, OutletRevenue } from '@/types';

export default function OutletListScreen() {
  const { branchId, branchName } = useLocalSearchParams<{ branchId: string; branchName: string }>();
  const [outlets, setOutlets] = useState<AdminOutlet[]>([]);
  const [outletRevenues, setOutletRevenues] = useState<Record<string, OutletRevenue>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (branchId) {
      loadOutlets();
    }
  }, [branchId]);

  const loadOutlets = async () => {
    try {
      setLoading(true);
      const outletData = await AdminService.getOutletsByBranch(branchId);
      setOutlets(outletData);

      // Load revenue for each outlet
      const revenuePromises = outletData.map(async (outlet) => {
        const startDate = `${selectedDate}T00:00:00Z`;
        const endDate = `${selectedDate}T23:59:59Z`;
        const revenue = await AdminService.getOutletRevenue(outlet.id, startDate, endDate);
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
  };

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
                  <DollarSign size={16} color="#059669" />
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