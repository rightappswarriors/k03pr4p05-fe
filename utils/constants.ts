import { GraphQLClient } from 'graphql-request';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

let API_BASE_URL: string | undefined;
let clientInstance: GraphQLClient | undefined;

async function initAPIBaseUrl() {
  // ✅ Production build — use real deployed API, skip all network detection
  if (!__DEV__) {
    API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;
    return API_BASE_URL;
  }

  // ✅ Dev — web browser
  if (Platform.OS === 'web') {
    API_BASE_URL = process.env.EXPO_PUBLIC_API_URL_WEB;
    return API_BASE_URL;
  }

  // ✅ Dev — Android/iOS physical device or emulator
  if (Platform.OS === 'android' || Platform.OS === 'ios') {
    try {
      const state = await NetInfo.fetch();
      //const isWifi = state.isConnected && state.type === 'wifi' && state.details?.ipAddress;


      // No Wi-Fi → likely an emulator
     // console.log('🖥️ No Wi-Fi, assuming emulator');
      API_BASE_URL = process.env.EXPO_PUBLIC_API_URL_ANDROID_EMULATOR;

    } catch (error) {
      //console.error('Error getting network info:', error);
      // Safe fallback during dev
      API_BASE_URL = process.env.EXPO_PUBLIC_API_URL_ANDROID_EMULATOR;
    }
  }

  console.log('✅ API_BASE_URL:', API_BASE_URL);
  return API_BASE_URL;
}

export async function getGraphQLClient(): Promise<GraphQLClient> {
  // ✅ Reuse existing client instance
  if (clientInstance) return clientInstance;

  if (!API_BASE_URL) {
    await initAPIBaseUrl();
  }

  if (!API_BASE_URL) {
    throw new Error('❌ Could not determine API_BASE_URL');
  }

  clientInstance = new GraphQLClient(`${API_BASE_URL}/graphql`);
  return clientInstance;
}