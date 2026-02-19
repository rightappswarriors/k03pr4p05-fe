import * as Device from 'expo-device';
import * as Application from 'expo-application';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { DeviceInfo } from '@/types';

const DEVICE_ID_KEY = 'device_id';

export class DeviceService {
  private static deviceId: string | null = null;


  static async getDeviceId(): Promise<string> {
    if (this.deviceId) {
      return this.deviceId;
    }

    let storedDeviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);

    if (!storedDeviceId) {
      // Generate a unique device ID
      const timestamp = Date.now().toString();
      const random = Math.random().toString(36).substring(2);
      storedDeviceId = `${Platform.OS}_${timestamp}_${random}`;
      await AsyncStorage.setItem(DEVICE_ID_KEY, storedDeviceId);
    }

    this.deviceId = storedDeviceId;
    return storedDeviceId;
  }

  static async getDeviceInfo(): Promise<DeviceInfo> {
    const deviceId = await this.getDeviceId();

    return {
      deviceId,
      deviceName: Device.deviceName || 'Unknown Device',
      platform: Platform.OS,
      osVersion: Device.osVersion || 'Unknown',
      appVersion: Application.nativeApplicationVersion || '1.0.0'
    };
  }

  static async clearDeviceId(): Promise<void> {
    await AsyncStorage.removeItem(DEVICE_ID_KEY);
    this.deviceId = null;
  }
}