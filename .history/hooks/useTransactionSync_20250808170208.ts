import { TransactionService } from '@/services/orderService';
import { Transaction } from '@/types';
import { useState, useEffect } from 'react'

interface TransactionHistoryProps {
     refreshTrigger: number;
   }

function useTransactionSync({refreshTrigger}: TransactionHistoryProps) {
     const [transactions, setTransactions] = useState<Transaction[]>([]);
       const [loading, setLoading] = useState(true);
       useEffect(() => {
         loadOrders();
       }, [refreshTrigger]);
     

     const loadOrders = async () => {
          try {
            const allTransactions = await TransactionService.getAllOrders();
            // Sort by creation date, newest first
            const sortedTransactions = allTransactions.sort((a, b) => 
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
      
} 