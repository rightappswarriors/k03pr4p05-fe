import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { CheckCircle, Clock, XCircle, RefreshCw } from 'lucide-react-native';
import { Transaction } from '@/types';
import { useTheme } from '@/contexts/ThemeContext'
import { useTransactionSync } from '@/hooks/useTransactionSync'

interface TransactionHistoryProps {
  refreshTrigger: number;
}
export function OrderHistory({ refreshTrigger }: TransactionHistoryProps) {
  const { 
    transactions,
    loading,
    getStatusText,
    retryTransactions, } = useTransactionSync({refreshTrigger})
  const { colors } = useTheme()


  const getStatusIcon = (status: Transaction['status']) => {
    switch (status) {
      case 'synced':
        return <CheckCircle size={20} color="#059669" />;
      case 'pending':
        return <Clock size={20} color="#D97706" />;
      case 'failed':
        return <XCircle size={20} color="#DC2626" />;
      default:
        return null;
    }
  };

  const renderTransactionItem = ({ item: order }: { item: Transaction }) => (
    <View style={[styles.orderCard, { backgroundColor: colors.card }]}>
      <View style={styles.orderHeader}>
        <Text style={[styles.orderId, { color: colors.text }]}>Order #{order.id.slice(-8)}</Text>
        <View style={styles.statusContainer}>
          {getStatusIcon(order.status)}
          <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
            {getStatusText(order.status)}
          </Text>
        </View>
      </View>

      <View style={styles.orderDetails}>
        <Text style={[styles.orderTime, { color: colors.textSecondary }]}>
          {new Date(order.createdAt).toLocaleString()}
        </Text>
        <Text style={styles.orderTotal}>₱{order.total.toFixed(2)}</Text>
      </View>

      <View style={styles.orderItems}>
        {order.items.map((item, index) => (
          <Text key={index} style={[styles.itemText, { color: colors.textSecondary }]}>
            {item.quantity}x {item.name} - ₱{(item.price * item.quantity).toFixed(2)}
          </Text>
        ))}
      </View>

      {order.status === 'failed' && (
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => retryTransactions(order.id)}
        >
          <RefreshCw size={16} color="white" />
          <Text style={[styles.retryButtonText, { color: colors.textSecondary }]}>Retry Sync</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const getStatusColor = (status: Transaction['status']) => {
    switch (status) {
      case 'synced':
        return '#059669';
      case 'pending':
        return '#D97706';
      case 'failed':
        return '#DC2626';
      default:
        return '#6B7280';
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <Text>Loading orders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={transactions}
        renderItem={renderTransactionItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  orderCard: {
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
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
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
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  orderTime: {
    fontSize: 14,
    color: '#6B7280',
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  orderItems: {
    marginBottom: 12,
  },
  itemText: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 2,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    padding: 8,
    borderRadius: 6,
    gap: 6,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
});