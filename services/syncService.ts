import { StorageService } from './storageService';
import { ApiService } from './apiService';
import { Transaction } from '@/types';

export class SyncService {
  private static syncInProgress = false;
  private static syncRetryCount = 0;
  private static maxRetries = 3;
  private static retryDelayMs = 5000;

  static async startBackgroundSync(): Promise<void> {
    // Check network status periodically
    setInterval(async () => {
      if (!this.syncInProgress) {
        await this.attemptSync();
      }
    }, 30000); // Check every 30 seconds
  }

  static async attemptSync(): Promise<void> {
    if (this.syncInProgress) {
      return;
    }

    const isOnline = await ApiService.isOnline();
    if (!isOnline) {
      return;
    }

    this.syncInProgress = true;

    try {
      const pendingOrders = await StorageService.getPendingOrders();
      
      if (pendingOrders.length === 0) {
        this.syncInProgress = false;
        return;
      }

      await this.syncOrdersBatch(pendingOrders);
      this.syncRetryCount = 0;
    } catch (error) {
      console.error('Sync failed:', error);
      await this.handleSyncFailure();
    } finally {
      this.syncInProgress = false;
    }
  }

  private static async syncOrdersBatch(orders: Transaction[]): Promise<void> {
    // Sort orders by creation time to maintain order
    const sortedOrders = orders.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const batchSize = 10;
    const batches = this.chunkArray(sortedOrders, batchSize);

    for (const batch of batches) {
      try {
        const result = await ApiService.syncOrders(batch);
        
        // Update synced orders
        for (const orderId of result.syncedOrderIds) {
          await StorageService.updateOrderStatus(orderId, 'synced', new Date().toISOString());
        }

        // Handle failed orders
        const failedOrders = batch.filter(order => 
          !result.syncedOrderIds.includes(order.id)
        );

        for (const failedOrder of failedOrders) {
          const newRetryCount = failedOrder.retryCount + 1;
          if (newRetryCount >= this.maxRetries) {
            await StorageService.updateOrderStatus(failedOrder.id, 'failed');
          } else {
            await StorageService.updateOrderStatus(failedOrder.id, 'pending');
            // Update retry count in storage
          }
        }
      } catch (error) {
        console.error('Batch sync failed:', error);
        throw error;
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

  private static chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
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