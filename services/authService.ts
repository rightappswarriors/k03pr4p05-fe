import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '@/types';
import { Platform } from 'react-native';
import http from './httpServices';
import Constants from 'expo-constants';

import axios from 'axios';
import { mockUsers } from '@/data/mockData';

interface LoginResponse {
  user: User;
  //accessToken: string;
  //refreshToken: string;
}
// Tokens
export const AUTH_TOKEN_KEY = Constants.expoConfig?.extra?.AUTH_TOKEN_KEY ?? "auth_token";
export const USER_DATA_KEY = Constants.expoConfig?.extra?.USER_DATA_KEY ?? "user_data";
export const BIOMETRIC_ENABLED_KEY = Constants.expoConfig?.extra?.BIOMETRIC_ENABLED_KEY ?? "biometric_enabled";
export const REFRESH_TOKEN_KEY = Constants.expoConfig?.extra?.REFRESH_TOKEN_KEY ?? "refresh_token";

// Platform-specific storage for auth tokens
export const secureStorage = {
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
  },
};
let API_BASE_URL = '';

if (Platform.OS === 'web') {
  API_BASE_URL = 'http://localhost:3000/api'; // works in browser
} else if (Platform.OS === 'android') {
  API_BASE_URL = 'http://10.0.2.2:3000/api'; // Android emulator
} else {
  API_BASE_URL = 'http://192.168.1.100:3000/api'; // iOS simulator or real device (replace with your LAN IP)
}

export { API_BASE_URL };

export class AuthService {
  /**
   * Helper function to retrieve all stored tokens.
   * @returns {Promise<{accessToken: string | null, refreshToken: string | null}>}
   */
  static async getTokens() {
    // ✅ Corrected: Use the correct keys for each token.
    const accessToken = await secureStorage.getItemAsync(AUTH_TOKEN_KEY);

    
    const refreshToken = await secureStorage.getItemAsync(REFRESH_TOKEN_KEY);
    return { accessToken, refreshToken };
  }
  static async storeTokens(
    accessToken: string,
    refreshToken: string
  ): Promise<void> {
    await secureStorage.setItemAsync(AUTH_TOKEN_KEY, accessToken);
    await secureStorage.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  }
  /**
   * Calls the login API, stores tokens, and returns the user.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<User>}
   */
  static async login(email: string, password: string): Promise<User> {
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mock authentication - in production, should be real API call
    console.log('// Mock authentication')
    const user = mockUsers.find((u) => u.email === email);
    console.log('Login is user Found?', user)
    if (!user) {
      throw new Error('Invalid Email or Password');
    }

    // Mock password validation (in production, this would be handled by backend)
    const validPasswords: Record<string, string> = {
      'owner@techstore.com': 'owner123',
      'cashier1@techstore.com': 'cashier123',
      'cashier2@techstore.com': 'cashier123',
    };

    if (validPasswords[email] !== password) {
      throw new Error('Invalid email or password');
    }

    // Store auth token and user data
    const token = `token_${user.id}_${Date.now()}`;
    await secureStorage.setItemAsync(AUTH_TOKEN_KEY, token);
    await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(user));

    return user;
  }

  /**
   * Calls the refresh token API and returns the new access token.
   * This function is crucial and will be used by the HTTP interceptor.
   * @param {string} refreshToken
   * @returns {Promise<string>}
   */
  static async refreshAccessToken(refreshToken: string): Promise<string> {
    try {
      const response = await axios.post(`${API_BASE_URL}/users/refresh`, {
        refreshToken,
      });

      const accessToken: string = response.data.accessToken;
      return accessToken;
    } catch (error) {
      console.error('Refresh token error:', error);
      await this.removeUser();
      throw error;
    }
  }

  static async removeUser(): Promise<void> {
    await AsyncStorage.removeItem(USER_DATA_KEY);
    await secureStorage.deleteItemAsync(AUTH_TOKEN_KEY);
    await secureStorage.deleteItemAsync(REFRESH_TOKEN_KEY);
    await AsyncStorage.removeItem(BIOMETRIC_ENABLED_KEY);
  } // Delete the token
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
      const userData = await AsyncStorage.getItem(USER_DATA_KEY);
      if (!userData) return null;

      const user: User = JSON.parse(userData);
      console.log('USER LOGGED IN:', user);
      const token = `token_${user.id}_${Date.now}`;
      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);

      return await this.getCurrentUser();
    } catch (error) {
      console.error('Auto login failed', error);
      return null;
    }
  }
}
