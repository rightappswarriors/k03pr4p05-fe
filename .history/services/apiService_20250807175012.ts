import * as Network from 'expo-network';
import { DeviceService } from './deviceService';
import { Order, Store, User, SyncLog, AuthState } from '@/types';

const API_BASE_URL = 'https://your-api-endpoint.com/api';

export class ApiService {
  private static token: string | null = null;

  static setToken(token: string) {
    this.token = token;
  }

  static async isOnline(): Promise<boolean> {
    const networkState = await Network.getNetworkStateAsync();
    return networkState.isConnected && networkState.isInternetReachable;
  }

  private static async makeRequest(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<Response> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response;
  }

  static async login(email: string, password: string): Promise<AuthState> {
    const deviceInfo = await DeviceService.getDeviceInfo();
    
    const response = await this.makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ 
        email, 
        password, 
        deviceInfo 
      }),
    });

    const data = await response.json();
    this.setToken(data.token);
    
    return {
      user: data.user,
      token: data.token,
      isAuthenticated: true,
      deviceBound: data.deviceBound,
    };
  }

  static async bindDevice(storeId: string): Promise<boolean> {
    const deviceInfo = await DeviceService.getDeviceInfo();
    
    const response = await this.makeRequest('/device/bind', {
      method: 'POST',
      body: JSON.stringify({ 
        storeId, 
        deviceInfo 
      }),
    });

    return response.ok;
  }

  static async syncOrders(orders: Order[]): Promise<{ success: boolean; syncedOrderIds: string[]; errors: string[] }> {
    const deviceInfo = await DeviceService.getDeviceInfo();
    const syncStartTime = Date.now();
    
    try {
      const response = await this.makeRequest('/orders/sync', {
        method: 'POST',
        body: JSON.stringify({ 
          orders,
          deviceInfo,
          timestamp: new Date().toISOString()
        }),
      });

      const result = await response.json();
      
      // Log successful sync
      await this.logSync({
        storeId: orders[0]?.storeId || '',
        deviceInfo,
        ordersCount: result.syncedOrderIds.length,
        status: 'success',
        timestamp: new Date().toISOString(),
        duration: Date.now() - syncStartTime,
      });

      return result;
    } catch (error) {
      // Log failed sync
      await this.logSync({
        storeId: orders[0]?.storeId || '',
        deviceInfo,
        ordersCount: orders.length,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        duration: Date.now() - syncStartTime,
      });

      throw error;
    }
  }

  private static async logSync(logData: Omit<SyncLog, 'id'>): Promise<void> {
    try {
      await this.makeRequest('/sync/log', {
        method: 'POST',
        body: JSON.stringify(logData),
      });
    } catch (error) {
      console.error('Failed to log sync:', error);
    }
  }

  static async getStore(storeId: string): Promise<Store> {
    const response = await this.makeRequest(`/stores/${storeId}`);
    return response.json();
  }

  static async getSyncLogs(storeId: string): Promise<SyncLog[]> {
    const response = await this.makeRequest(`/stores/${storeId}/sync-logs`);
    return response.json();
  }

  static async resetDeviceBinding(storeId: string): Promise<boolean> {
    const response = await this.makeRequest(`/stores/${storeId}/reset-device`, {
      method: 'POST',
    });
    return response.ok;
  }
}