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

function normalizeApiUrl(path?: string) {
  if (!path) return undefined;
  return stripTrailingSlash(stripTrailingGraphQL(path));
}

async function initAPIBaseUrl() {
  // Use the general API URL outside emulator-specific development flows.
  if (!__DEV__) {
    API_BASE_URL = normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL);
    return API_BASE_URL;
  }

  // Web always talks to the general URL so localhost works in the browser.
  if (Platform.OS === 'web') {
    API_BASE_URL = normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL);
    return API_BASE_URL;
  }

  // Native dev prefers emulator-specific routing, then falls back to the general URL.
  if (Platform.OS === 'android' || Platform.OS === 'ios') {
    try {
      await NetInfo.fetch();
    } catch {
      // Ignore connectivity lookup failures and use env fallback below.
    }

    API_BASE_URL = normalizeApiUrl(
      process.env.EXPO_PUBLIC_API_URL_ANDROID_EMULATOR ||
      process.env.EXPO_PUBLIC_API_URL,
    );
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
