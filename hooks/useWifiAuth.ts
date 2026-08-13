import { useState, useEffect } from 'react';
import { WiFiService, WiFiInfo } from '@/services/wifiService';
import { useAuth } from './useAuth';

export function useWiFiAuth() {
  const { user } = useAuth();
  const [wifiInfo, setWifiInfo] = useState<WiFiInfo>({
    ssid: null,
    isConnected: false,
    hasInternet: false,
  });
  const [isWiFiAuthorized, setIsWiFiAuthorized] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);

  useEffect(() => {
    if (user?.assignedStoreId && !isMonitoring) {
      startWiFiMonitoring();
    }
  }, [user?.assignedStoreId, isMonitoring]);

  const startWiFiMonitoring = async () => {
    if (!user?.assignedStoreId) return;

    setIsMonitoring(true);
    const requiredSSID = WiFiService.getRequiredSSIDForStore(user.assignedStoreId);

    await WiFiService.startWiFiMonitoring(
      requiredSSID,
      (isAuthorized, currentWifiInfo) => {
        setIsWiFiAuthorized(isAuthorized);
        setWifiInfo(currentWifiInfo);
      }
    );
  };

  const checkWiFiAccess = async (): Promise<boolean> => {
    if (!user?.assignedStoreId) return false;
    
    const requiredSSID = WiFiService.getRequiredSSIDForStore(user.assignedStoreId);
    return await WiFiService.isConnectedToStoreWiFi(requiredSSID);
  };

  const getRequiredSSID = (): string | null => {
    if (!user?.assignedStoreId) return null;
    return WiFiService.getRequiredSSIDForStore(user.assignedStoreId);
  };

  return {
    wifiInfo,
    isWiFiAuthorized,
    checkWiFiAccess,
    getRequiredSSID,
  };
}