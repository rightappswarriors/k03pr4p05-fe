import { useState, useEffect } from 'react';
import * as Network from 'expo-network';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let intervalId: number;

    const checkNetworkStatus = async () => {
      try {
        const networkState = await Network.getNetworkStateAsync();
        const isConnected = networkState.isConnected ?? false;
        const isReachable = networkState.isInternetReachable ?? false;

        const online = isConnected && isReachable;

        setIsOnline(online);
      } catch (error: any) {
        console.error('Network check failed:', error);
        setIsOnline(false);
        throw new Error("Error uppon checking network:", error)
      } finally {
        setIsChecking(false);
      }
    };

    // Initial check
    checkNetworkStatus();

    // Set up periodic checks
    intervalId = setInterval(checkNetworkStatus, 5000);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);

  return { isOnline, isChecking };
}
