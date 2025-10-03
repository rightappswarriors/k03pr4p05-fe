import { GraphQLClient } from 'graphql-request';
import { Platform } from 'react-native';
import { NetworkInfo } from 'react-native-network-info';

let API_BASE_URL: string | undefined;

async function initAPIBaseUrl() {
  if (Platform.OS === 'web') {
    API_BASE_URL = 'http://localhost:4000'; // Browser testing
  } else if (Platform.OS === 'android' || Platform.OS === 'ios') {
    // Get the phone's *own* local IP
    const localIP = await NetworkInfo.getIPAddress();
    console.log("IPV4: ",await NetworkInfo.getIPV4Address())

    // Replace this with your PC's IP on the same Wi-Fi (from ipconfig)
    const serverIP = '192.168.254.120'; 

    API_BASE_URL = `http://${serverIP}:4000`;
    console.log('📡 Device local IP:', localIP);
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
