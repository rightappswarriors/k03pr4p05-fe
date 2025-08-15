import uuid from 'react-native-uuid';
import { StorageService } from './storageService';
import { DeviceService } from './deviceService';
import { AuthService } from './authService';
import { Transaction, CartItem } from '@/types';
import eventBus from '@/utils/eventBus'

export class TransactionService {
  // Create Order
  static async createOrder(
    items: CartItem[],
    paymentMethod: Transaction['paymentMethod'],
    cashReceived: number 
  
  ): Promise<Transaction> {
    const user = await AuthService.getCurrentUser();
    const deviceId = await DeviceService.getDeviceId();
    console.log(user)
    if (!user || !user.assignedStoreId) {
      throw new Error('User not authenticated or store not assigned');
    }
  
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.08; // 8% tax rate
    const total = subtotal + tax;
    const roundedTotal = Math.round(total * 100) / 100;
    const change = Math.max(cashReceived - roundedTotal, 0); // ✅ calculate change
  
    const order: Transaction = {
      id: uuid.v4() as string,
      storeId: user.assignedStoreId,
      deviceId,
      cashierId: user.id,
      items,
      cashReceived: Math.round(cashReceived * 100) / 100,
      change: Math.round(change * 100) / 100,
      total: roundedTotal,
      tax: Math.round(tax * 100) / 100,
      subtotal: Math.round(subtotal * 100) / 100,
      paymentMethod,
      status: 'pending',
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };
  
    await StorageService.saveOrder(order);
    // Listen for order Creation, to refresh history ui => display automatically

    return order;
  }

  static async getAllOrders(): Promise<Transaction[]> {
    
    return StorageService.getOfflineOrders();
  }

  static async getPendingOrdersCount(): Promise<number> {
    const pendingOrders = await StorageService.getPendingOrders();
    return pendingOrders.length;
  }

  static async getOrderStats(): Promise<{
    total: number;
    pending: number;
    synced: number;
    failed: number;
  }> {
    const orders = await StorageService.getOfflineOrders();
    eventBus.emit('orderCreated', orders)
    return {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      synced: orders.filter(o => o.status === 'synced').length,
      failed: orders.filter(o => o.status === 'failed').length,
    };
  }

  static async retryFailedOrder(orderId: string): Promise<void> {
    await StorageService.updateOrderStatus(orderId, 'pending');
  }
}