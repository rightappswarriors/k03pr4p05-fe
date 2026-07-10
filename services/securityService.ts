import AsyncStorage from '@react-native-async-storage/async-storage'
import { DeviceService } from './deviceService'

export interface SecuritySession {
  id: string
  deviceName: string
  platform: string
  ipAddress: string
  location: string
  lastActiveAt: string
  current: boolean
  status: 'ACTIVE' | 'TERMINATED'
}

export interface TrustedDevice {
  id: string
  deviceName: string
  platform: string
  osVersion: string
  appVersion: string
  trustedAt: string
  lastUsedAt: string
  current: boolean
}

const SESSIONS_KEY = 'supplierSecurity:activeSessions'
const DEVICES_KEY = 'supplierSecurity:trustedDevices'

async function ensureCurrentSession(): Promise<{ session: SecuritySession; device: TrustedDevice }> {
  const info = await DeviceService.getDeviceInfo()
  const now = new Date().toISOString()
  const session: SecuritySession = {
    id: info.deviceId,
    deviceName: info.deviceName || 'Current device',
    platform: info.platform,
    ipAddress: 'Current network',
    location: 'Active session',
    lastActiveAt: now,
    current: true,
    status: 'ACTIVE',
  }
  const device: TrustedDevice = {
    id: info.deviceId,
    deviceName: info.deviceName || 'Current device',
    platform: info.platform,
    osVersion: info.osVersion || 'Unknown',
    appVersion: info.appVersion || '1.0.0',
    trustedAt: now,
    lastUsedAt: now,
    current: true,
  }
  return { session, device }
}

export class SecurityService {
  static async getActiveSessions(): Promise<SecuritySession[]> {
    const { session } = await ensureCurrentSession()
    const saved = await AsyncStorage.getItem(SESSIONS_KEY)
    const sessions: SecuritySession[] = saved ? JSON.parse(saved) : []
    const merged = [session, ...sessions.filter((item) => item.id !== session.id && item.status === 'ACTIVE')]
    await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(merged))
    return merged
  }

  static async terminateSession(id: string): Promise<void> {
    const sessions = await this.getActiveSessions()
    await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions.map((item) => item.id === id ? { ...item, status: 'TERMINATED' } : item)))
  }

  static async getTrustedDevices(): Promise<TrustedDevice[]> {
    const { device } = await ensureCurrentSession()
    const saved = await AsyncStorage.getItem(DEVICES_KEY)
    const devices: TrustedDevice[] = saved ? JSON.parse(saved) : []
    const merged = [device, ...devices.filter((item) => item.id !== device.id)]
    await AsyncStorage.setItem(DEVICES_KEY, JSON.stringify(merged))
    return merged
  }

  static async removeTrustedDevice(id: string): Promise<void> {
    const devices = await this.getTrustedDevices()
    await AsyncStorage.setItem(DEVICES_KEY, JSON.stringify(devices.filter((item) => item.id !== id)))
  }
}
