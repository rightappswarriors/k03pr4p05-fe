import * as Network from 'expo-network';
import { Platform } from 'react-native';

export interface WiFiInfo {
  ssid: string | null;
  isConnected: boolean;
  hasInternet: boolean;
}

export class WiFiService {
  private static currentSSID: string | null = null;
  private static lastCheck: number = 0;
  private static checkInterval = 5000; // Check every 5 seconds

  static async getCurrentWiFiInfo(): Promise<WiFiInfo> {
    try {
      const networkState = await Network.getNetworkStateAsync();
      
      // For web platform, we'll simulate WiFi detection
      if (Platform.OS === 'web') {
        return this.getWebWiFiInfo(networkState);
      }

      // For mobile platforms, get actual WiFi info
      return this.getMobileWiFiInfo(networkState);
    } catch (error) {
      //console.error('Failed to get WiFi info:', error);
      return {
        ssid: null,
        isConnected: false,
        hasInternet: false,
      };
    }
  }

  private static getWebWiFiInfo(networkState: any): WiFiInfo {
    // For web demo, simulate being connected to store WiFi
    const demoSSIDs = ['StoreWiFi_001', 'CoffeeShop_Main', 'RetailStore_Guest'];
    const simulatedSSID = demoSSIDs[0]; // Default to first store
    
    return {
      ssid: networkState.isConnected ? simulatedSSID : null,
      isConnected: networkState.isConnected || false,
      hasInternet: networkState.isInternetReachable || false,
    };
  }

  private static async getMobileWiFiInfo(networkState: any): Promise<WiFiInfo> {
    let ssid: string | null = null;

    if (networkState.type === Network.NetworkStateType.WIFI) {
      try {
        // Note: Getting WiFi SSID requires special permissions on mobile
        // For demo purposes, we'll simulate this
        ssid = 'StoreWiFi_001';
      } catch (error) {
        //console.warn('Could not get WiFi SSID:', error);
      }
    }

    return {
      ssid,
      isConnected: networkState.isConnected || false,
      hasInternet: networkState.isInternetReachable || false,
    };
  }

  static async isConnectedToStoreWiFi(requiredSSID: string): Promise<boolean> {
    const wifiInfo = await this.getCurrentWiFiInfo();
    return wifiInfo.isConnected && wifiInfo.ssid === requiredSSID;
  }

  static async startWiFiMonitoring(
    requiredSSID: string,
    onWiFiStatusChange: (isAuthorized: boolean, wifiInfo: WiFiInfo) => void
  ): Promise<void> {
    const checkWiFi = async () => {
      const wifiInfo = await this.getCurrentWiFiInfo();
      const isAuthorized = wifiInfo.isConnected && wifiInfo.ssid === requiredSSID;
      onWiFiStatusChange(isAuthorized, wifiInfo);
    };

    // Initial check
    await checkWiFi();

    // Set up periodic monitoring
    setInterval(checkWiFi, this.checkInterval);
  }

  static getRequiredSSIDForStore(storeId: string): string {
    // In a real app, this would come from the backend
    const storeSSIDMap: Record<string, string> = {
      'store_001': 'StoreWiFi_001',
      'store_002': 'CoffeeShop_Main',
      'store_003': 'RetailStore_Guest',
    };
    
    return storeSSIDMap[storeId] || 'StoreWiFi_001';
  }
}