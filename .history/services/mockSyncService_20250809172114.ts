import { StorageService } from './storageService';
import { DeviceService } from './deviceService';
import { SyncLog, Transaction } from '@/types';
import uuid from 'react-native-uuid';
import eventBus from '@/utils/eventBus';

export class MockSyncService {
  private static syncInProgress = false;
  private static syncRetryCount = 0;
  private static maxRetries = 3;
  private static retryDelayMs = 2000;
  private static backgroundSyncStarted = false;

  static async startBackgroundSync(): Promise<void> {
    if (this.backgroundSyncStarted) {
      return;
    }
    this.backgroundSyncStarted = true;
  
    console.log('Background sync started');
  
    setInterval(async () => {
      const pendingNow = await StorageService.getPendingOrders();
  
      if (!pendingNow || pendingNow.length === 0) {
        console.log('No pending orders - waiting for new ones');
        return; // don't stop, just skip this cycle
      }
  
      if (!this.syncInProgress) {
        await this.attemptSync();
        console.log('Syncing Pending Order');
        eventBus.emit('orderSynced');
      }
    }, 60000);
  }

  static async attemptSync(): Promise<void> {
    if (this.syncInProgress) {
      return;
    }
    this.syncInProgress = true;
    try {
      const pendingOrders = await StorageService.getPendingOrders();
      console.log("No pending orders — skipping sync");
      if (pendingOrders.length === 0) {
        this.syncInProgress = false;
        return;
      }
      console.log(`Syncing ${pendingOrders.length} orders...`);
      await this.mockSyncOrders(pendingOrders);
      console.log('synced!🤩🤗')
      this.syncRetryCount = 0;
    } catch (error) {
      console.error('Sync failed:', error);
      await this.handleSyncFailure();
    } finally {
      this.syncInProgress = false;
    }
  }

  private static async mockSyncOrders(orders: Transaction[]): Promise<void> {
    const deviceInfo = await DeviceService.getDeviceInfo();
    const syncStartTime = Date.now();
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Simulate 90% success rate
    const successRate = 0.9;
    const syncedOrderIds: string[] = [];
    
    for (const order of orders) {
      if (Math.random() < successRate) {
        syncedOrderIds.push(order.id);
        await StorageService.updateOrderStatus(order.id, 'synced', new Date().toISOString());
      }
    }

    // Create sync log
    const syncLog: SyncLog = {
      id: uuid.v4() as string,
      storeId: orders[0]?.storeId || '',
      deviceId: deviceInfo.deviceId,
      deviceInfo,
      ordersCount: syncedOrderIds.length,
      status: syncedOrderIds.length === orders.length ? 'success' : 'failed',
      errorMessage: syncedOrderIds.length < orders.length ? 'Some orders failed to sync' : undefined,
      timestamp: new Date().toISOString(),
      duration: Date.now() - syncStartTime,
    };

    await StorageService.saveSyncLog(syncLog);

    // Handle failed orders
    const failedOrders = orders.filter(order => !syncedOrderIds.includes(order.id));
    for (const failedOrder of failedOrders) {
      const newRetryCount = failedOrder.retryCount + 1;
      if (newRetryCount >= this.maxRetries) {
        await StorageService.updateOrderStatus(failedOrder.id, 'failed');
      }
    }
  }

  private static async handleSyncFailure(): Promise<void> {
    this.syncRetryCount++;
    
    if (this.syncRetryCount < this.maxRetries) {
      // Retry with exponential backoff
      const delay = this.retryDelayMs * Math.pow(2, this.syncRetryCount - 1);
      setTimeout(() => {
        this.attemptSync();
      }, delay);
    } else {
      // Mark orders as failed after max retries
      const pendingOrders = await StorageService.getPendingOrders();
      for (const order of pendingOrders) {
        if (order.retryCount >= this.maxRetries) {
          await StorageService.updateOrderStatus(order.id, 'failed');
        }
      }
      this.syncRetryCount = 0;
    }
  }

  static async forceSyncNow(): Promise<boolean> {
    try {
      await this.attemptSync();
      eventBus.emit('orderSynced');
      console.log('OrderSyncing')
      return true;
    } catch (error) {
      console.error('Force sync failed:', error);
      return false;
    }
  }
}