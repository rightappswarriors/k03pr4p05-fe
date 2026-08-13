import * as Network from "expo-network";
import { useEffect, useState } from "react";

export default function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState<boolean>(true);

  useEffect(() => {
    // Subscribe to network state changes
    const subscription = Network.addNetworkStateListener((state) => {
      const connected =
        !!state.isConnected && !!state.isInternetReachable;
      setIsConnected(connected);
    });

    // Initial check (in case subscription doesn’t fire immediately)
    (async () => {
      const state = await Network.getNetworkStateAsync();
      const connected =
        !!state.isConnected && !!state.isInternetReachable;
      setIsConnected(connected);
    })();

    return () => subscription.remove();
  }, []);

  return isConnected;
}
