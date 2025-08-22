import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockUsers } from '@/data/mockData';
import type { User } from '@/types';
import { Platform } from 'react-native';
// Tokens
export const AUTH_TOKEN_KEY = 'auth_token';
export const USER_DATA_KEY = 'user_data';
export const BIOMETRIC_ENABLED_KEY = 'biometric_enable';

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
export const API_BASE_URL = 'http://localhost:3000/api';
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
        const errorData = await response.json(); // Log the specific error from the server
        console.error('Login failed:', errorData);
        throw new Error(
          errorData.message || 'Login failed. Please check your credentials.'
        );
      }

      const data = await response.json();
      const { user, token } = data;
     
      if (!user || !token) {
        throw new Error('Invalid server response');
      } // Use secureStorage for both user data and token for consistency

      await secureStorage.setItemAsync(AUTH_TOKEN_KEY, token);
      await secureStorage.setItemAsync(USER_DATA_KEY, JSON.stringify(user));
      console.log('Token',token)
      return user;
    } catch (error) {
      console.error('Login error:', error);
      throw new Error('An error occurred during login. Please try again.');
    }

    /**
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000));
  
      // Mock authentication - in production, should be real API call
  
      const user = mockUsers.find((u) => u.email === email);
  
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
    */
  }

  static async removeUser(): Promise<void> {
    await AsyncStorage.removeItem(USER_DATA_KEY);
    await secureStorage.deleteItemAsync(AUTH_TOKEN_KEY);
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
      console.log(token)
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
      const token = `token_${user.id}_${Date.now}`;
      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);

      return await this.getCurrentUser();
    } catch (error) {
      console.error('Auto login failed', error);
      return null;
    }
  }
}
