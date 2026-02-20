import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { ArrowLeft, User, Clock, ShoppingCart, DollarSign, Calendar } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AdminService } from '@/services/adminService';
import { AdminTransaction, Cashier } from '@/types';

export default function OutletDetailScreen() {
  const { outletId, outletName, branchName } = useLocalSearchParams<{ 
    outletId: string; 
    outletName: string; 
    branchName: string; 
  }>();
  
  const [currentCashier, setCurrentCashier] = useState<Cashier | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<AdminTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (outletId) {
      loadOutletDetails();
    }
  }, [outletId]);

  const loadOutletDetails = async () => {
    try {
      setLoading(true);
      
      const [cashier, transactions] = await Promise.all([
        AdminService.getCurrentCashier(outletId),
        AdminService.getRecentTransactions(outletId, 20)
      ]);

      setCurrentCashier(cashier);
      setRecentTransactions(transactions);
    } catch (error) {
      console.error('Failed to load outlet details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOutletDetails();
    setRefreshing(false);
  };

  const formatShiftDuration = (shiftStartTime?: string) => {
    if (!shiftStartTime) return 'N/A';
    
    const start = new Date(shiftStartTime);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${diffHours}h ${diffMinutes}m`;
  };

  const formatTransactionTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading outlet details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => {router.back()}}>
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.title}>{outletName}</Text>
          <Text style={styles.subtitle}>{branchName}</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Cashier Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Cashier</Text>
          
          {currentCashier ? (
            <View style={styles.cashierCard}>
              <View style={styles.cashierHeader}>
                <View style={styles.cashierInfo}>
                  <View style={styles.cashierNameRow}>
                    <User size={20} color="#2563EB" />
                    <Text style={styles.cashierName}>{currentCashier.name}</Text>
                  </View>
                  <Text style={styles.cashierEmail}>{currentCashier.email}</Text>
                </View>
                <View style={styles.activeIndicator}>
                  <View style={styles.activeDot} />
                  <Text style={styles.activeText}>Active</Text>
                </View>
              </View>
              
              <View style={styles.cashierStats}>
                <View style={styles.statItem}>
                  <Clock size={16} color="#D97706" />
                  <Text style={styles.statValue}>
                    {formatShiftDuration(currentCashier.shiftStartTime)}
                  </Text>
                  <Text style={styles.statLabel}>Shift Duration</Text>
                </View>
                
                <View style={styles.statItem}>
                  <ShoppingCart size={16} color="#059669" />
                  <Text style={styles.statValue}>
                    {currentCashier.totalTransactionsToday}
                  </Text>
                  <Text style={styles.statLabel}>Transactions Today</Text>
                </View>
              </View>
              
              {currentCashier.shiftStartTime && (
                <View style={styles.shiftInfo}>
                  <Calendar size={14} color="#6B7280" />
                  <Text style={styles.shiftText}>
                    Shift started at {new Date(currentCashier.shiftStartTime).toLocaleTimeString()}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.noCashierCard}>
              <User size={48} color="#9CA3AF" />
              <Text style={styles.noCashierText}>No active cashier</Text>
              <Text style={styles.noCashierSubtext}>This outlet is currently unattended</Text>
            </View>
          )}
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          
          {recentTransactions.length > 0 ? (
            <View style={styles.transactionsList}>
              {recentTransactions.map((transaction) => (
                <View key={transaction.id} style={styles.transactionCard}>
                  <View style={styles.transactionHeader}>
                    <Text style={styles.transactionId}>
                      #{transaction.id.slice(-8).toUpperCase()}
                    </Text>
                    <Text style={styles.transactionTime}>
                      {formatTransactionTime(transaction.createdAt)}
                    </Text>
                  </View>
                  
                  <View style={styles.transactionDetails}>
                    <View style={styles.transactionInfo}>
                      <Text style={styles.itemCount}>
                        {transaction.items.length} item{transaction.items.length !== 1 ? 's' : ''}
                      </Text>
                      <Text style={styles.paymentMethod}>
                        {transaction.paymentMethod.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.transactionTotal}>
                      ${transaction.total.toFixed(2)}
                    </Text>
                  </View>
                  
                  <View style={styles.transactionItems}>
                    {transaction.items.slice(0, 2).map((item, index) => (
                      <Text key={index} style={styles.itemText}>
                        {item.quantity}x {item.name}
                      </Text>
                    ))}
                    {transaction.items.length > 2 && (
                      <Text style={styles.moreItems}>
                        +{transaction.items.length - 2} more item{transaction.items.length - 2 !== 1 ? 's' : ''}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.noTransactionsCard}>
              <ShoppingCart size={48} color="#9CA3AF" />
              <Text style={styles.noTransactionsText}>No recent transactions</Text>
              <Text style={styles.noTransactionsSubtext}>Transactions will appear here once processed</Text>
            </View>
          )}
        </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  cashierCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cashierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cashierInfo: {
    flex: 1,
  },
  cashierNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cashierName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  cashierEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#059669',
  },
  activeText: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '500',
  },
  cashierStats: {
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
  shiftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  shiftText: {
    fontSize: 14,
    color: '#6B7280',
  },
  noCashierCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noCashierText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
  },
  noCashierSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  transactionsList: {
    gap: 12,
  },
  transactionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  transactionId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  transactionTime: {
    fontSize: 14,
    color: '#6B7280',
  },
  transactionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  transactionInfo: {
    flexDirection: 'row',
    gap: 12,
  },
  itemCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  paymentMethod: {
    fontSize: 12,
    color: '#2563EB',
    backgroundColor: '#EBF4FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '500',
  },
  transactionTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#059669',
  },
  transactionItems: {
    gap: 2,
  },
  itemText: {
    fontSize: 12,
    color: '#6B7280',
  },
  moreItems: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  noTransactionsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noTransactionsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
  },
  noTransactionsSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
});