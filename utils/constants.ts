import { GraphQLClient } from 'graphql-request';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

let API_BASE_URL: string | undefined;

async function initAPIBaseUrl() {
  if (Platform.OS === 'web') {
    API_BASE_URL = 'http://localhost:4000'; // Browser testing
  } else if (Platform.OS === 'android' || Platform.OS === 'ios') {
    try {
      const state = await NetInfo.fetch();

      // Check if a Wi-Fi connection exists and has an IP address
      if (state.isConnected && state.type === 'wifi' && state.details?.ipAddress) {
        const localIP = state.details.ipAddress;
        console.log('📡 Device local IP (from NetInfo):', localIP);

        // Replace this with your PC's IP on the same Wi-Fi (from ipconfig)
        // You can use a development-specific IP for this purpose.
        const serverIP = '192.168.254.123'; 

        API_BASE_URL = `http://${serverIP}:4000`;
      } else {
        console.log('❌ Not connected to Wi-Fi with an IP address, or connection type is not Wi-Fi.');
        // Fallback for cases where NetInfo can't get the IP
        // Consider having a production API endpoint or a hardcoded default
        API_BASE_URL = `http://192.168.1.10:4000`;
      }
    } catch (error) {
      console.error('Error getting network info:', error);
      API_BASE_URL = `http://192.168.1.10:4000`; // Fallback on error
    }
  }

  console.log('✅ API_BASE_URL:', API_BASE_URL);
  return API_BASE_URL;
}

// Initialize before using GraphQLClient
export async function getGraphQLClient() {
  if (!API_BASE_URL) {
    await initAPIBaseUrl();
  }

  if (!API_BASE_URL) {
    throw new Error('❌ Could not determine API_BASE_URL');
  }

  return new GraphQLClient(`${API_BASE_URL}/graphql`);
}
