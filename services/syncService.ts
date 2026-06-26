import { StorageService } from './storageService';
import { DeviceService } from './deviceService';
import { SyncLog, Transaction } from '@/types';
import uuid from 'react-native-uuid';
import eventBus from '@/utils/eventBus';
import { gql } from 'graphql-request';
import { AuthService } from './authService';
import { getGraphQLClient } from '@/utils/constants';

export class SyncService {
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

    if (__DEV__) console.log('Background sync started');

    setInterval(async () => {
      const pendingNow = await StorageService.getPendingOrders();
      if (!pendingNow || pendingNow.length === 0) {
        //console.log('No pending orders - waiting for new ones');
        return; // don't stop, just skip this cycle
      }

      if (!this.syncInProgress) {
        await this.attemptSync();
        //console.log('Syncing Pending Order');
        eventBus.emit('orderSynced');
      }
    }, 120000);
  }
  static async attemptSync(): Promise<void> {
    if (this.syncInProgress) {
      return;
    }

    this.syncInProgress = true;
    try {
      // ✅ Get ALL offline orders, not just pending
      const offlineOrders = await StorageService.getOfflineOrders();

      // ✅ Filter for orders that need syncing
      const toSync = offlineOrders.filter(
        (o) => o.status === 'PENDING' || o.status === 'FAILED'
      );

      if (toSync.length === 0) {
        //console.log('No pending or failed orders to sync');
        this.syncInProgress = false;
        return;
      }

      // ✅ Attempt syncing both pending + previously failed ones
      await this.syncOrders(toSync);
      this.syncRetryCount = 0;
    } catch (error) {
      //console.error('Sync failed:', error);
      await this.handleSyncFailure();
    } finally {
      this.syncInProgress = false;
    }
  }

  private static async syncOrders(orders: Transaction[]): Promise<void> {
    const deviceInfo = await DeviceService.getDeviceInfo();
    const syncStartTime = Date.now();

    // Simulate 90% success rate
    //const successRate = 0.9;
    const syncedOrderIds: string[] = [];
    const failedOrderIds: string[] = [];
    try {
      // syncService.ts — update the mutation
      const NEWTRANSACTION_MUTATION = gql`
        mutation Mutation(
          $outletId: Int!
          $cashierId: Int!
          $total: Float!
          $subtotal: Float!
          $vatAmount: Float!
          $paymentMethod: PaymentMethod!
          $status: Status!
          $createdAt: String!
          $itemsSold: [CartItemInput!]!
          $cashReceived: Float
          $change: Float
        ) {
          createTransaction(
            outletId: $outletId
            cashierId: $cashierId
            total: $total
            subtotal: $subtotal
            vatAmount: $vatAmount
            paymentMethod: $paymentMethod
            status: $status
            createdAt: $createdAt
            itemsSold: $itemsSold
            cashReceived: $cashReceived
            change: $change
          ) {
            id
            cashier { fullname }
          }
        }
      `;
      const { accessToken } = await AuthService.getTokens();
      const client = await getGraphQLClient();

      for (const order of orders) {
        try {
          //order.items.map((item)=> (
          //console.log("ItemId:",item.id)
          //))
          const response = (await client.request(
            NEWTRANSACTION_MUTATION,
            {
              outletId: Number(order.outletId),
              cashierId: Number(order.cashierId),
              total: order.total,
              subtotal: order.subtotal,
              vatAmount: order.vatAmount ?? order.vatAmount ?? 0,
              cashReceived: order.cashReceived,
              change: order.change,
              paymentMethod: order.paymentMethod,
              status: 'SYNCED',
              createdAt: order.createdAt,
              itemsSold: order.items.map((item) => ({
                itemId: Number(item.id.split('_')[0]), // ← handles "123_unitId" cart key
                price: item.priceAtSale ?? item.price,
                priceAtSale: item.priceAtSale ?? item.price,  // ← add
                quantity: item.quantity,
                unitId: item.unitId ?? null,                   // ← add
                unitName: item.unitName ?? null,               // ← add
              })),
            },
            {
              Authorization: `Bearer ${accessToken}`,
            }
          )) as any;
          if (response?.createTransaction?.id) {
            syncedOrderIds.push(order.id);
            await StorageService.updateOrderStatus(
              order.id,
              'SYNCED',
              new Date().toISOString()
            );
          }
        } catch (error: any) {
          // ✅ Handle HTTP 400 or GraphQL validation errors
          if (error.response?.status === 400) {
            //console.error(
            //  `⚠️ GraphQL validation error (400) for order ${order.id}:`,
            //  error.response?.errors ?? error.message
            //);
          } else {
            //console.error(
            //  `❌ Unexpected sync error for order ${order.id}:`,
            //  error
            //);
          }

          failedOrderIds.push(order.id);
          await StorageService.updateOrderStatus(
            order.id,
            'FAILED',
            new Date().toISOString()
          );

          // ✅ Continue syncing the rest (don’t throw)
          continue;
        }
      }
    } catch (error) {
      //console.error('❌ Error seding data transactions to server:', error);
      throw new Error('Error seding data transactions to server');
    }
    // Create sync log
    const syncLog: SyncLog = {
      id: uuid.v4() as string,
      outletId: orders[0]?.outletId,
      deviceId: deviceInfo.deviceId,
      deviceInfo,
      ordersCount: syncedOrderIds.length,
      status: syncedOrderIds.length === orders.length ? 'SYNCED' : 'FAILED',
      errorMessage:
        syncedOrderIds.length < orders.length
          ? 'Some orders failed to sync'
          : undefined,
      timestamp: new Date().toISOString(),
      duration: Date.now() - syncStartTime,
    };

    await StorageService.saveSyncLog(syncLog);

    const failedOrders = orders.filter(
      (order) => !syncedOrderIds.includes(order.id)
    );
    for (const failedOrder of failedOrders) {
      const newRetryCount = (failedOrder.retryCount || 0) + 1;
      if (newRetryCount >= this.maxRetries) {
        await StorageService.updateOrderStatus(failedOrder.id, 'FAILED');
      } else {
        await StorageService.updateOrderStatus(failedOrder.id, 'PENDING');
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
          await StorageService.updateOrderStatus(order.id, 'FAILED');
        }
      }
      this.syncRetryCount = 0;
    }
  }

  static async forceSyncNow(): Promise<boolean> {
    try {
      await this.attemptSync();
      eventBus.emit('orderSynced');
      //console.log('OrderSyncing');
      return true;
    } catch (error) {
      //console.error('Force sync failed:', error);
      return false;
    }
  }
}
