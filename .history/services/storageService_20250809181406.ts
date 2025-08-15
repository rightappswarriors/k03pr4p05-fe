import AsyncStorage from '@react-native-async-storage/async-storage';
import { SyncLog, Transaction } from '@/types';

const TRANSACTION_KEY = 'offline_orders';
const SYNC_LOGS_KEY = 'sync_logs';

export class StorageService {
  static async saveOrder(order: Transaction): Promise<void> {
    try {
      const existingOrders = await this.getOfflineOrders();
      const updatedOrders = [...existingOrders, order];
      await AsyncStorage.setItem(TRANSACTION_KEY, JSON.stringify(updatedOrders));
    } catch (error) {
      console.error('Failed to save order:', error);
      throw new Error('Failed to save order locally');
    }
  }

  static async getOfflineOrders(): Promise<Transaction[]> {
    try {
      const transactionJson = await AsyncStorage.getItem(TRANSACTION_KEY);
      return transactionJson ? JSON.parse(transactionJson) : [];
    } catch (error) {
      console.error('Failed to get offline orders:', error);
      return [];
    }
  }

  static async updateOrderStatus(orderId: string, status: Transaction['status'], syncedAt?: string): Promise<void> {
    try {
      const orders = await this.getOfflineOrders();
      const updatedOrders = orders.map(order => 
        order.id === orderId 
          ? { ...order, status, syncedAt: syncedAt || order.syncedAt }
          : order
      );
      await AsyncStorage.setItem(TRANSACTION_KEY, JSON.stringify(updatedOrders));
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  }

  static async removeOrder(orderId: string): Promise<void> {
    try {
      const orders = await this.getOfflineOrders();
      const filteredOrders = orders.filter(order => order.id !== orderId);
      await AsyncStorage.setItem(TRANSACTION_KEY, JSON.stringify(filteredOrders));
    } catch (error) {
      console.error('Failed to remove order:', error);
    }
  }

  static async getPendingOrders(): Promise<Transaction[]> {
    const orders = await this.getOfflineOrders();
    return orders.filter(order => order.status === 'pending');
  }

  static async saveSyncLog(log: SyncLog): Promise<void> {
    try {
      const existingLogs = await this.getSyncLogs();
      const updatedLogs = [log, ...existingLogs].slice(0, 100); // Keep last 100 logs
      await AsyncStorage.setItem(SYNC_LOGS_KEY, JSON.stringify(updatedLogs));
    } catch (error) {
      console.error('Failed to save sync log:', error);
    }
  }

  static async getSyncLogs(): Promise<SyncLog[]> {
    try {
      const logsJson = await AsyncStorage.getItem(SYNC_LOGS_KEY);
      return logsJson ? JSON.parse(logsJson) : [];
    } catch (error) {
      console.error('Failed to get sync logs:', error);
      return [];
    }
  }

  static async clearAllData(): Promise<void> {
    try {
      const transactions = await this.getOfflineOrders()
      const transactionsToKeep = transactions.filter(transaction => transaction.status === 'pending' || transaction.status === 'failed')
      await AsyncStorage.setItem(TRANSACTION_KEY, JSON.stringify(transactionsToKeep));
      await AsyncStorage.removeItem(SYNC_LOGS_KEY);
    } catch (error) {
      console.error('Failed to clear data:', error);
    }
  }
}