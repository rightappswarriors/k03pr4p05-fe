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

// IMPORTANT: Remember to update this to your Ngrok or local IP address URL
const API_BASE_URL = 'http://localhost:3000/api/';

export class AuthService {
  static async login(email: string, password: string): Promise<User> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Log the specific error from the server
        console.error('Login failed:', errorData);
        throw new Error(errorData.message || 'Login failed. Please check your credentials.');
      }

      const data = await response.json();
      const { user, token } = data;

      if (!user || !token) {
        throw new Error('Invalid server response');
      }

      // Use secureStorage for both user data and token for consistency
      await secureStorage.setItemAsync(AUTH_TOKEN_KEY, token);
      await secureStorage.setItemAsync(USER_DATA_KEY, JSON.stringify(user));

      return user;
    } catch (error) {
      console.error('Login error:', error);
      throw new Error('An error occurred during login. Please try again.');
    }
  }

  static async removeUser(): Promise<void> {
    // Use secureStorage for all removals
    await secureStorage.deleteItemAsync(USER_DATA_KEY);
    await secureStorage.deleteItemAsync(AUTH_TOKEN_KEY);
    await secureStorage.deleteItemAsync(BIOMETRIC_ENABLED_KEY); 
  }

  static async logout(): Promise<void> {
    // Use secureStorage for all removals
    await secureStorage.deleteItemAsync(AUTH_TOKEN_KEY);
    await secureStorage.deleteItemAsync(USER_DATA_KEY);
  }

  static async getCurrentUser(): Promise<User | null> {
    try {
      const token = await secureStorage.getItemAsync(AUTH_TOKEN_KEY);
      if (!token) return null;

      // Use secureStorage for all data retrieval
      const userData = await secureStorage.getItemAsync(USER_DATA_KEY);
      if (!userData) return null;

      return JSON.parse(userData);
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  static async isBiometricSupported(): Promise<boolean> {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  }

  static async isBiometricEnabled(): Promise<boolean> {
    const enabled = await secureStorage.getItemAsync(BIOMETRIC_ENABLED_KEY);
    return enabled === 'true';
  }

  static async setBiometricEnabled(enabled: boolean): Promise<void> {
    await secureStorage.setItemAsync(BIOMETRIC_ENABLED_KEY, enabled.toString());
  }

  static async authenticateWithBiometric(): Promise<boolean> {
    try {
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

  static async loginWithBiometric(): Promise<User | null> {
    const isEnabled = await this.isBiometricEnabled();

    if (!isEnabled) return null;

    const isAuthenticated = await this.authenticateWithBiometric();
    if (!isAuthenticated) return null;
    
    try {
      const userData = await secureStorage.getItemAsync(USER_DATA_KEY)
      if (!userData) return null

      const user: User =JSON.parse(userData)
      const token =`token_${user.id}_${Date.now()}`
      await secureStorage.setItemAsync(AUTH_TOKEN_KEY, token)

      return await this.getCurrentUser()

    } catch (error) {
      console.error('Auto login failed', error);
      return null;
    }
  }
}
