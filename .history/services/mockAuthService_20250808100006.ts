import { StorageService } from './storageService';
import { DeviceService } from './deviceService';
import { Transaction, SyncLog } from '@/types';
import uuid from 'react-native-uuid';

export class MockSyncService {
  private static syncInProgress = false;
  private static syncRetryCount = 0;
  private static maxRetries = 3;
  private static retryDelayMs = 2000;

  static async startBackgroundSync(): Promise<void> {
    // Check for pending orders periodically
    setInterval(async () => {
      if (!this.syncInProgress) {
        await this.attemptSync();
      }
    }, 10000); // Check every 10 seconds for demo
  }

  static async attemptSync(): Promise<void> {
    if (this.syncInProgress) {
      return;
    }

    this.syncInProgress = true;

    try {
      const pendingOrders = await StorageService.getPendingOrders();
      
      if (pendingOrders.length === 0) {
        this.syncInProgress = false;
        return;
      }

      await this.mockSyncOrders(pendingOrders);
      this.syncRetryCount = 0;
    } catch (error) {
      console.error('Sync failed:', error);
      await this.handleSyncFailure();
    } finally {
      this.syncInProgress = false;
    }
  }

  private static async mockSyncOrders(transactions: Transaction[]): Promise<void> {
    const deviceInfo = await DeviceService.getDeviceInfo();
    const syncStartTime = Date.now();
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Simulate 90% success rate
    const successRate = 0.9;
    const syncedOrderIds: string[] = [];
    
    for (const transaction of transactions) {
      if (Math.random() < successRate) {
        syncedOrderIds.push(transaction.id);
        await StorageService.updateOrderStatus(transaction.id, 'synced', new Date().toISOString());
      }
    }

    // Create sync log
    const syncLog: SyncLog = {
      id: uuid.v4() as string,
      storeId: transactions[0]?.storeId || '',
      deviceId: deviceInfo.deviceId,
      deviceInfo,
      ordersCount: syncedOrderIds.length,
      status: syncedOrderIds.length === transactions.length ? 'success' : 'failed',
      errorMessage: syncedOrderIds.length < transactions.length ? 'Some orders failed to sync' : undefined,
      timestamp: new Date().toISOString(),
      duration: Date.now() - syncStartTime,
    };

    await StorageService.saveSyncLog(syncLog);

    // Handle failed orders
    const failedTransactions = transactions.filter(transaction => !syncedOrderIds.includes(transaction.id));
    for (const failedTransaction of failedTransactions) {
      const newRetryCount = failedTransaction.retryCount + 1;
      if (newRetryCount >= this.maxRetries) {
        await StorageService.updateOrderStatus(failedTransaction.id, 'failed');
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
      return true;
    } catch (error) {
      console.error('Force sync failed:', error);
      return false;
    }
  }
}