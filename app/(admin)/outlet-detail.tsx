import React, { useState, useEffect } from 'react';
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
  User,
  Clock,
  ShoppingCart,
  Calendar,
  Users,
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AdminService } from '@/services/adminService';
import { AdminTransaction, Cashier } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';

export default function OutletDetailScreen() {
  const { outletId, outletName, branchName } = useLocalSearchParams<{
    outletId: string;
    outletName: string;
    branchName: string;
  }>();
  const { colors } = useTheme();
  const [currentCashiers, setCurrentCashiers] = useState<Cashier[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<
    AdminTransaction[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCashierModal, setShowCashierModal] = useState(false);

  useEffect(() => {
    if (outletId) loadOutletDetails();
  }, [outletId]);

  const loadOutletDetails = async () => {
    try {
      setLoading(true);
      const [cashiers, transactions] = await Promise.all([
        AdminService.getCurrentCashiers(outletId),
        AdminService.getRecentTransactions(outletId, 20),
      ]);
      setCurrentCashiers(cashiers);
      setRecentTransactions(transactions);
    } catch (error) {
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
    const diffMs = new Date().getTime() - new Date(shiftStartTime).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHours}h ${diffMinutes}m`;
  };

  const formatTransactionTime = (timestamp: string) =>
    new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.loading}>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading outlet details...
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
            {outletName}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {branchName}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Current Cashiers */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Current Cashiers
            </Text>
            {currentCashiers.length > 0 && (
              <TouchableOpacity
                style={[
                  styles.viewAllButton,
                  { backgroundColor: colors.primary + '18' },
                ]}
                onPress={() => setShowCashierModal(true)}
              >
                <Users size={16} color={colors.primary} />
                <Text
                  style={[styles.viewAllButtonText, { color: colors.primary }]}
                >
                  View All ({currentCashiers.length})
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {currentCashiers.length > 0 ? (
            <View
              style={[styles.cashierCard, { backgroundColor: colors.card }]}
            >
              <View style={styles.cashierHeader}>
                <View style={styles.cashierInfo}>
                  <View style={styles.cashierNameRow}>
                    <User size={20} color={colors.primary} />
                    <Text style={[styles.cashierName, { color: colors.text }]}>
                      {currentCashiers[0].fullname}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.cashierEmail,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {currentCashiers[0].email}
                  </Text>
                </View>
                <View style={styles.activeIndicator}>
                  <View style={styles.activeDot} />
                  <Text style={styles.activeText}>Active</Text>
                </View>
              </View>

              <View
                style={[
                  styles.cashierStats,
                  { backgroundColor: colors.background },
                ]}
              >
                <View style={styles.statItem}>
                  <Clock size={16} color={colors.warning} />
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {formatShiftDuration(currentCashiers[0].shiftStartTime)}
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: colors.textSecondary }]}
                  >
                    Shift Duration
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <ShoppingCart size={16} color={colors.success} />
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {currentCashiers[0].totalTransactionsToday}
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: colors.textSecondary }]}
                  >
                    Transactions Today
                  </Text>
                </View>
              </View>

              {currentCashiers[0].shiftStartTime && (
                <View
                  style={[styles.shiftInfo, { borderTopColor: colors.border }]}
                >
                  <Calendar size={14} color={colors.textSecondary} />
                  <Text
                    style={[styles.shiftText, { color: colors.textSecondary }]}
                  >
                    Shift started at{' '}
                    {new Date(
                      currentCashiers[0].shiftStartTime,
                    ).toLocaleTimeString()}
                  </Text>
                </View>
              )}

              {currentCashiers.length > 1 && (
                <View
                  style={[
                    styles.moreCashiers,
                    { borderTopColor: colors.border },
                  ]}
                >
                  <Text
                    style={[styles.moreCashiersText, { color: colors.primary }]}
                  >
                    +{currentCashiers.length - 1} more cashier
                    {currentCashiers.length - 1 !== 1 ? 's' : ''} active
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View
              style={[styles.noCashierCard, { backgroundColor: colors.card }]}
            >
              <User size={48} color={colors.textSecondary} />
              <Text
                style={[styles.noCashierText, { color: colors.textSecondary }]}
              >
                No active cashier
              </Text>
              <Text
                style={[
                  styles.noCashierSubtext,
                  { color: colors.textSecondary },
                ]}
              >
                This outlet is currently unattended
              </Text>
            </View>
          )}
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Recent Transactions
          </Text>

          {recentTransactions.length > 0 ? (
            <View style={styles.transactionsList}>
              {recentTransactions.map((transaction) => (
                <View
                  key={transaction.id}
                  style={[
                    styles.transactionCard,
                    { backgroundColor: colors.card },
                  ]}
                >
                  <View style={styles.transactionHeader}>
                    <Text
                      style={[styles.transactionId, { color: colors.text }]}
                    >
                      #{transaction.id.slice(-8).toUpperCase()}
                    </Text>
                    <Text
                      style={[
                        styles.transactionTime,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {formatTransactionTime(transaction.createdAt)}
                    </Text>
                  </View>

                  <View style={styles.transactionDetails}>
                    <View style={styles.transactionInfo}>
                      <Text
                        style={[
                          styles.itemCount,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {transaction.items.length} item
                        {transaction.items.length !== 1 ? 's' : ''}
                      </Text>
                      <Text
                        style={[
                          styles.paymentMethod,
                          {
                            color: colors.primary,
                            backgroundColor: colors.primary + '18',
                          },
                        ]}
                      >
                        {transaction.paymentMethod.toUpperCase()}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.transactionTotal,
                        { color: colors.success },
                      ]}
                    >
                      ${transaction.total.toFixed(2)}
                    </Text>
                  </View>

                  <View style={styles.transactionItems}>
                    {transaction.items.slice(0, 2).map((item, index) => (
                      <Text
                        key={index}
                        style={[
                          styles.itemText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {item.quantity}x {item.name}
                      </Text>
                    ))}
                    {transaction.items.length > 2 && (
                      <Text
                        style={[
                          styles.moreItems,
                          { color: colors.textSecondary },
                        ]}
                      >
                        +{transaction.items.length - 2} more item
                        {transaction.items.length - 2 !== 1 ? 's' : ''}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View
              style={[
                styles.noTransactionsCard,
                { backgroundColor: colors.card },
              ]}
            >
              <ShoppingCart size={48} color={colors.textSecondary} />
              <Text
                style={[
                  styles.noTransactionsText,
                  { color: colors.textSecondary },
                ]}
              >
                No recent transactions
              </Text>
              <Text
                style={[
                  styles.noTransactionsSubtext,
                  { color: colors.textSecondary },
                ]}
              >
                Transactions will appear here once processed
              </Text>
            </View>
          )}
        </View>
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
  content: { flex: 1, paddingHorizontal: 20 },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  viewAllButtonText: { fontSize: 14, fontWeight: '500' },
  cashierCard: {
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
  cashierInfo: { flex: 1 },
  cashierNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cashierName: { fontSize: 18, fontWeight: 'bold' },
  cashierEmail: { fontSize: 14 },
  activeIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#059669',
  },
  activeText: { fontSize: 14, color: '#059669', fontWeight: '500' },
  cashierStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  statItem: { alignItems: 'center', gap: 4 },
  statValue: { fontSize: 18, fontWeight: 'bold' },
  statLabel: { fontSize: 12 },
  shiftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  shiftText: { fontSize: 14 },
  moreCashiers: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  moreCashiersText: { fontSize: 14, fontWeight: '500' },
  noCashierCard: {
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noCashierText: { fontSize: 18, fontWeight: '600', marginTop: 12 },
  noCashierSubtext: { fontSize: 14, marginTop: 4, textAlign: 'center' },
  transactionsList: { gap: 12 },
  transactionCard: {
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
  transactionId: { fontSize: 16, fontWeight: 'bold' },
  transactionTime: { fontSize: 14 },
  transactionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  transactionInfo: { flexDirection: 'row', gap: 12 },
  itemCount: { fontSize: 14 },
  paymentMethod: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '500',
  },
  transactionTotal: { fontSize: 18, fontWeight: 'bold' },
  transactionItems: { gap: 2 },
  itemText: { fontSize: 12 },
  moreItems: { fontSize: 12, fontStyle: 'italic' },
  noTransactionsCard: {
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noTransactionsText: { fontSize: 18, fontWeight: '600', marginTop: 12 },
  noTransactionsSubtext: { fontSize: 14, marginTop: 4, textAlign: 'center' },
});
