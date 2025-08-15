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
    const handleOrderCreated = ()=> loadOrders();
    // Listen for new ordersasdasd

    const handleOrderSynced = (orderId: string) => {
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === orderId ? { ...t, status: 'synced' } : t
        )
      );
    };
  
    eventBus.on('orderCreated', handleOrderCreated);
    eventBus.on("orderSynced", (orderId) => {
      const id = orderId as string;
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: "synced" } : t))
      );
    });
    // Cleanup listener on unmount
    return () => {
      eventBus.off('orderCreated', handleOrderCreated);
      eventBus.off("orderSynced", (orderId) => {
        const id = orderId as string;
        setTransactions((prev) =>
          prev.map((t) => (t.id === id ? { ...t, status: "synced" } : t))
        );
      });
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
