import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceService } from './deviceService';
import { AuthState, User } from '@/types';

const AUTH_TOKEN_KEY = 'auth_token';
const USER_DATA_KEY = 'user_data';
const DEVICE_BINDING_KEY = 'device_binding';

// Mock users for testing
const MOCK_USERS = [
  {
    id: 'user_1',
    email: 'cashier@store.com',
    password: 'password123',
    role: 'cashier' as const,
    storeId: 'store_001'
  },
  {
    id: 'user_2', 
    email: 'admin@store.com',
    password: 'admin123',
    role: 'admin' as const,
    storeId: 'store_001'
  }
];

export class MockAuthService {
  private static authState: AuthState = {
    user: null,
    token: null,
    isAuthenticated: false,
    deviceBound: false,
  };

  static async initializeAuth(): Promise<AuthState> {
    try {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      const userJson = await AsyncStorage.getItem(USER_DATA_KEY);
      const deviceBinding = await AsyncStorage.getItem(DEVICE_BINDING_KEY);
      
      if (token && userJson) {
        const user: User = JSON.parse(userJson);
        
        this.authState = {
          user,
          token,
          isAuthenticated: true,
          deviceBound: deviceBinding === 'true',
        };
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
    }
    
    return this.authState;
  }

  static async login(email: string, password: string): Promise<AuthState> {
    try {
      // Find user in mock data
      const mockUser = MOCK_USERS.find(u => u.email === email && u.password === password);
      
      if (!mockUser) {
        throw new Error('Invalid email or password');
      }

      const deviceId = await DeviceService.getDeviceId();
      const storedBinding = await AsyncStorage.getItem(`${DEVICE_BINDING_KEY}_${mockUser.storeId}`);
      
      // Check device binding
      if (storedBinding && storedBinding !== deviceId) {
        throw new Error('This device is not authorized for this store. Contact your administrator.');
      }

      // Bind device on first login
      if (!storedBinding) {
        await AsyncStorage.setItem(`${DEVICE_BINDING_KEY}_${mockUser.storeId}`, deviceId);
      }

      const user: User = {
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        storeId: mockUser.storeId,
      };

      const token = `mock_token_${Date.now()}`;

      // Store auth data locally
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
      await AsyncStorage.setItem(DEVICE_BINDING_KEY, 'true');
      
      this.authState = {
        user,
        token,
        isAuthenticated: true,
        deviceBound: true,
      };

      return this.authState;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  static async logout(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, USER_DATA_KEY, DEVICE_BINDING_KEY]);
      
      this.authState = {
        user: null,
        token: null,
        isAuthenticated: false,
        deviceBound: false,
      };
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  static async resetDeviceBinding(storeId: string): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(`${DEVICE_BINDING_KEY}_${storeId}`);
      return true;
    } catch (error) {
      console.error('Failed to reset device binding:', error);
      return false;
    }
  }

  static async bindDevice(storeId: string): Promise<boolean> {
    try {
      const deviceId = await DeviceService.getDeviceId();
      await AsyncStorage.setItem(`${DEVICE_BINDING_KEY}_${storeId}`, deviceId);
      this.authState.deviceBound = true;
      return true;
    } catch (error) {
      console.error('Device binding failed:', error);
      return false;
    }
  }

  static getAuthState(): AuthState {
    return this.authState;
  }

  static getCurrentUser(): User | null {
    return this.authState.user;
  }

  static isAuthenticated(): boolean {
    return this.authState.isAuthenticated;
  }

  static isDeviceBound(): boolean {
    return this.authState.deviceBound;
  }
}