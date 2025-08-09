import AsyncStorage from '@react-native-async-storage/async-storage';
import { Order, SyncLog } from '@/types';

const ORDERS_KEY = 'offline_orders';
const SYNC_LOGS_KEY = 'sync_logs';

export class StorageService {
  static async saveOrder(order: Order): Promise<void> {
    try {
      const existingOrders = await this.getOfflineOrders();
      const updatedOrders = [...existingOrders, order];
      await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(updatedOrders));
    } catch (error) {
      console.error('Failed to save order:', error);
      throw new Error('Failed to save order locally');
    }
  }

  static async getOfflineOrders(): Promise<Order[]> {
    try {
      const ordersJson = await AsyncStorage.getItem(ORDERS_KEY);
      return ordersJson ? JSON.parse(ordersJson) : [];
    } catch (error) {
      console.error('Failed to get offline orders:', error);
      return [];
    }
  }

  static async updateOrderStatus(orderId: string, status: Order['status'], syncedAt?: string): Promise<void> {
    try {
      const orders = await this.getOfflineOrders();
      const updatedOrders = orders.map(order => 
        order.id === orderId 
          ? { ...order, status, syncedAt: syncedAt || order.syncedAt }
          : order
      );
      await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(updatedOrders));
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  }

  static async removeOrder(orderId: string): Promise<void> {
    try {
      const orders = await this.getOfflineOrders();
      const filteredOrders = orders.filter(order => order.id !== orderId);
      await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(filteredOrders));
    } catch (error) {
      console.error('Failed to remove order:', error);
    }
  }

  static async getPendingOrders(): Promise<Order[]> {
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
      await AsyncStorage.multiRemove([ORDERS_KEY, SYNC_LOGS_KEY]);
    } catch (error) {
      console.error('Failed to clear data:', error);
    }
  }
}