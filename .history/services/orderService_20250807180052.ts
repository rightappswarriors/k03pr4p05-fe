import uuid from 'react-native-uuid';
import { StorageService } from './storageService';
import { DeviceService } from './deviceService';
import { AuthService } from './authService';
import { Order, OrderItem } from '@/types';

export class OrderService {
  static async createOrder(
    items: OrderItem[],
    paymentMethod: Order['paymentMethod']
  ): Promise<Order> {
    const user = await AuthService.getCurrentUser();
    const deviceId = await DeviceService.getDeviceId();
    
    if (!user || !user.storeId) {
      throw new Error('User not authenticated or store not assigned');
    }

    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.08; // 8% tax rate
    const total = subtotal + tax;

    const order: Order = {
      id: uuid.v4() as string,
      storeId: user.storeId,
      deviceId,
      items,
      total: Math.round(total * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      subtotal: Math.round(subtotal * 100) / 100,
      paymentMethod,
      status: 'pending',
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };

    await StorageService.saveOrder(order);
    return order;
  }

  static async getAllOrders(): Promise<Order[]> {
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