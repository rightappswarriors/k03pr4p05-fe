import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockUsers } from '@/data/mockData';
import type { User } from '@/types';
import { Platform } from 'react-native';
// Tokens
const AUTH_TOKEN_KEY = 'auth_token';
export const USER_DATA_KEY = 'user_data';
export const BIOMETRIC_ENABLED_KEY = 'biometric_enable';

// Platform-specific storage for auth tokens
const secureStorage = {
  async setItemAsync(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  
  async getItemAsync(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return await AsyncStorage.getItem(key);
    } else {
      return await SecureStore.getItemAsync(key);
    }
  },
  
  async deleteItemAsync(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  }
};

const API_BASE_URL = 'http://localhost:3000/api';

export class AuthService {
  static async login(email: string, password: string): Promise<User> {
    // Simulate API call delay
    try {
      // 1. Make the API call
      const response = await fetch(`${API_BASE_URL}/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      // 2. Handle a failed response (e.g., 401 Unauthorized)
      if (!response.ok) {
        // Parse the error message from the server if available
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed. Please check your credentials.');
      }

      // 3. Parse the successful response
      const data = await response.json();

      // Assuming your server returns an object like { user: User, token: string }
      const { user, token } = data;

      if (!user || !token) {
        throw new Error('Invalid server response');
      }

      // 4. Store the user data and authentication token
      await secureStorage.setItemAsync(AUTH_TOKEN_KEY, token);
      await secureStorage.setItemAsync(USER_DATA_KEY, JSON.stringify(user));

      // 5. Return the user object
      return user;

    } catch (error) {
      // Catch network errors or errors from the server
      console.error('Login error:', error);
      throw new Error('An error occurred during login. Please try again.');
    }
  }

  static async removeUser(): Promise<void> {
   await AsyncStorage.removeItem(USER_DATA_KEY);
   await secureStorage.deleteItemAsync(AUTH_TOKEN_KEY);
   await AsyncStorage.removeItem(BIOMETRIC_ENABLED_KEY); 
  }  // Delete the token
  static async logout(): Promise<void> {
    await secureStorage.deleteItemAsync(AUTH_TOKEN_KEY);
    // await AsyncStorage.removeItem(BIOMETRIC_ENABLED_KEY);
  }

  static async getCurrentUser(): Promise<User | null> {
    try {
      // get token  data after login
      const token = await secureStorage.getItemAsync(AUTH_TOKEN_KEY);
      if (!token) return null;

      // get user data after login
      const userData = await AsyncStorage.getItem(USER_DATA_KEY);
      if (!userData) return null;

      return JSON.parse(userData);
    } catch (error) {
      console.error('Error geeting current user:', error);
      return null;
    }
  }
  // checks if have camera or finger print scan
  static async isBiometricSupported(): Promise<boolean> {
    // 	Checks if the device supports biometrics.
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    // Checks if the user has enrolled biometrics (e.g., added fingerprints).
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  }

  static async isBiometricEnabled(): Promise<boolean> {
    const enabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
    return enabled === 'true';
  }

  static async setBiometricEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, enabled.toString());
  }
  // AUTHENTICATE with biometrics True or False
  static async authenticateWithBiometric(): Promise<boolean> {
    try {
      // Triggers the actual fingerprint/Face ID prompt.
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access POS',
        fallbackLabel: 'Use Password',
        cancelLabel: 'Cancel',
      });
     
      return result.success;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return false;
    }
  }

  // Authenticate user using the biometrics, and get current user if Authenticated
  static async loginWithBiometric(): Promise<User | null> {
    const isEnabled = await this.isBiometricEnabled();

    if (!isEnabled) return null;


    const isAuthenticated = await this.authenticateWithBiometric();
    if (!isAuthenticated) return null;
    
    // make another token
    try {
      const userData = await AsyncStorage.getItem(USER_DATA_KEY)
      if (!userData) return null

      const user: User =JSON.parse(userData)
      const token =`token_${user.id}_${Date.now}`
      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token)

      return await this.getCurrentUser()

    } catch (error) {
      console.error('Auto login failed', error);
      return null;
    }
    
  }
}
