import { TransactionService } from '@/services/orderService';
import { Transaction } from '@/types';
import { useState, useEffect } from 'react';
import eventBus from '@/utils/eventBus'
import { StorageService } from '@/services/storageService';
interface TransactionHistoryProps {
     refreshTrigger: number;
   }

export function useTransactionSync({ refreshTrigger }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    loadOrders();
    
  // Listen for new orders and synced orders
  eventBus.on('orderCreated', loadOrders);
  eventBus.on('orderSynced', loadOrders);

  // Cleanup listeners on unmount
  return () => {
    eventBus.off('orderCreated', loadOrders);
    eventBus.off('orderSynced', loadOrders);
  };
  }, [refreshTrigger]);

  useEffect(() => {
    const handler = async () => {
      const orders = await StorageService.getOfflineOrders();
      setTransactions(orders);
    };
    
    eventBus.on('transactionsCleared', handler);
    return () => eventBus.off('transactionsCleared', handler);
  }, []);

  const loadOrders = async () => {
    try {
      const allTransactions = await TransactionService.getAllOrders();
      // Sort by creation date, newest first
      const sortedTransactions = allTransactions.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setTransactions(sortedTransactions);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const retryTransactions = async (transactionsId: string) => {
    try {
      await TransactionService.retryFailedOrder(transactionsId);
      await loadOrders();
    } catch (error) {
      console.error('Failed to retry order:', error);
    }
  };

  

  const getStatusText = (status: Transaction['status']) => {
    switch (status) {
      case 'synced':
        return 'Synced';
      case 'pending':
        return 'Pending Sync';
      case 'failed':
        return 'Sync Failed';
      default:
        return status;
    }
  };

  return {
    transactions,
    loading,
    loadOrders,
    getStatusText,
    setTransactions,
    retryTransactions,
  };
}
