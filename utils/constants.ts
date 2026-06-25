import { GraphQLClient } from 'graphql-request';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

let API_BASE_URL: string | undefined;
let clientInstance: GraphQLClient | undefined;

function stripTrailingSlash(path: string) {
  return path.replace(/\/$/, '');
}

function stripTrailingGraphQL(path: string) {
  return path.replace(/\/graphql\/?$/, '');
}

async function initAPIBaseUrl() {
  // ✅ Production build — use real deployed API, skip all network detection
  if (!__DEV__) {
    API_BASE_URL = process.env.EXPO_PUBLIC_API_URL_ANDROID_EMULATOR;
    if (API_BASE_URL) {
      API_BASE_URL = stripTrailingSlash(stripTrailingGraphQL(API_BASE_URL));
    }
    return API_BASE_URL;
  }

  // ✅ Dev — web browser
  if (Platform.OS === 'web') {
    API_BASE_URL = process.env.EXPO_PUBLIC_API_URL_ANDROID_EMULATOR || process.env.EXPO_PUBLIC_API_URL_ANDROID_EMULATOR;
    if (API_BASE_URL) {
      API_BASE_URL = stripTrailingSlash(stripTrailingGraphQL(API_BASE_URL));
    }
    return API_BASE_URL;
  }

  // ✅ Dev — Android/iOS physical device or emulator
  if (Platform.OS === 'android' || Platform.OS === 'ios') {
    try {
      const state = await NetInfo.fetch();
      // Optionally could use `state` to choose emulator vs device routing in the future
      // const isWifi = state.isConnected && state.type === 'wifi' && state.details?.ipAddress;

      API_BASE_URL =
        process.env.EXPO_PUBLIC_API_URL_ANDROID_EMULATOR ||
        process.env.EXPO_PUBLIC_API_URL;
    } catch (error) {
      // Safe fallback during dev
      API_BASE_URL =
        process.env.EXPO_PUBLIC_API_URL_ANDROID_EMULATOR ||
        process.env.EXPO_PUBLIC_API_URL;
    }

    if (API_BASE_URL) {
      API_BASE_URL = stripTrailingSlash(stripTrailingGraphQL(API_BASE_URL));
    }
  }

  if (__DEV__) console.log('✅ API_BASE_URL:', API_BASE_URL);
  return API_BASE_URL;
}

export async function getGraphQLClient(): Promise<GraphQLClient> {
  // ✅ Reuse existing client instance
  if (clientInstance) return clientInstance;

  if (!API_BASE_URL) {
    await initAPIBaseUrl();
  }

  if (!API_BASE_URL) {
    throw new Error(
      '❌ Could not determine API_BASE_URL. Set EXPO_PUBLIC_API_URL (and/or EXPO_PUBLIC_API_URL_ANDROID_EMULATOR) in your .env file.',
    );
  }

  const endpoint = API_BASE_URL.endsWith('/graphql')
    ? stripTrailingSlash(API_BASE_URL)
    : `${API_BASE_URL}/graphql`;

  clientInstance = new GraphQLClient(endpoint);
  return clientInstance;
}