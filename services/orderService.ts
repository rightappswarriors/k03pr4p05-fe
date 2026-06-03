import uuid from 'react-native-uuid';
import { StorageService } from './storageService';
import { DeviceService } from './deviceService';
import { Transaction, Item, CartItem } from '@/types';
import eventBus from '@/utils/eventBus';

export class TransactionService {
  // Create Order
  static async createOrder(
    items: CartItem[],
    cashierId: number,
    outletId: number,
    paymentMethod: Transaction['paymentMethod'],
    cashReceived: number,
    vatAmount: number,
    total: number,
    subtotal: number,
    change: number,
    status: Transaction['status'] = 'PENDING', // default
    id?: string,
  ): Promise<Transaction> {
    const deviceId = await DeviceService.getDeviceId();
    
    let outlet = Number(outletId);
    let cashier = Number(cashierId);
    const order: Transaction = {
      id: id ?? (uuid.v4() as string),
      outletId: outlet,
      cashierId: cashier,
      deviceId,
      items,
      cashReceived,
      change,
      total,
      vatAmount,
      subtotal,
      paymentMethod,
      status,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };

    await StorageService.saveOrder(order);
    // Listen for order Creation, to refresh history ui => display automatically
    eventBus.emit('orderCreated', order);
    //console.log('Save order');
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
    return {
      total: orders.length,
      pending: orders.filter((o) => o.status === 'PENDING').length,
      synced: orders.filter((o) => o.status === 'SYNCED').length,
      failed: orders.filter((o) => o.status === 'FAILED').length,
    };
  }

  static async retryFailedOrder(orderId: string): Promise<void> {
    await StorageService.updateOrderStatus(orderId, 'PENDING');
  }
}
