import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { RefreshCw } from 'lucide-react-native';
import { OrderHistory } from '@/components/OrderHistory';
import { MockSyncService } from '@/services/mockSyncService';
import { TransactionService } from '@/services/orderService';
import { useTheme } from '@/contexts/ThemeContext'
export default function HistoryScreen() {
  const { colors } = useTheme()
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [orderStats, setOrderStats] = useState({
    total: 0,
    pending: 0,
    synced: 0,
    failed: 0,
  });

  useEffect(() => {
    loadOrderStats();
  }, [refreshTrigger]);

  const loadOrderStats = async () => {
    const stats = await TransactionService.getOrderStats();
    setOrderStats(stats);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await MockSyncService.forceSyncNow();
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background, borderColor: colors.border}]}>
      <View style={[styles.header, {backgroundColor: colors.card}]}>
        <Text style={[styles.title, { color: colors.text}]}>Order History</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw size={20} color="white" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{orderStats.total}</Text>
          <Text style={styles.statLabel}>Total Orders</Text>
        </View>
        <View style={[styles.statCard, styles.pendingCard]}>
          <Text style={styles.statValue}>{orderStats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={[styles.statCard, styles.syncedCard]}>
          <Text style={styles.statValue}>{orderStats.synced}</Text>
          <Text style={styles.statLabel}>Synced</Text>
        </View>
        <View style={[styles.statCard, styles.failedCard]}>
          <Text style={styles.statValue}>{orderStats.failed}</Text>
          <Text style={styles.statLabel}>Failed</Text>
        </View>
      </View>

      <OrderHistory refreshTrigger={refreshTrigger} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,

  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  refreshButton: {
    backgroundColor: '#2563EB',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
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
  pendingCard: {
    backgroundColor: '#FEF3C740',
  },
  syncedCard: {
    backgroundColor: '#D1FAE540',
  },
  failedCard: {
    backgroundColor: '#FEE2E240',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
});