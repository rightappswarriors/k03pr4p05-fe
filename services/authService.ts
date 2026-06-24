import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthState, User } from '@/types';
import { Alert, Platform } from 'react-native';
import Constants from 'expo-constants';
import { getGraphQLClient } from '@/utils/constants';
import { graphQLRequest } from './apiClient';
import { gql } from 'graphql-request';
import { DeviceService } from './deviceService';
import { OrganizationService } from './organizationService';
import { SubscriptionService } from './subscriptionService';
import { gqlErrorMessage } from '@/utils/gqlErrorMessage';
interface AuthPayload {
  user: User;
  token: string;
  refresh_token: string;
}

const DEVICE_BINDING_KEY = 'device_binding';

interface LoginResponse {
  login: AuthPayload;
}

interface RefreshResponse {
  refreshToken: AuthPayload;
}
// Tokens
export const AUTH_TOKEN_KEY =
  Constants.expoConfig?.extra?.AUTH_TOKEN_KEY ?? 'auth_token';
export const USER_DATA_KEY =
  Constants.expoConfig?.extra?.USER_DATA_KEY ?? 'user_data';
export const BIOMETRIC_ENABLED_KEY =
  Constants.expoConfig?.extra?.BIOMETRIC_ENABLED_KEY ?? 'biometric_enabled';
export const REFRESH_TOKEN_KEY =
  Constants.expoConfig?.extra?.REFRESH_TOKEN_KEY ?? 'refresh_token';

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

export class AuthService {
  /**
   * Helper function to retrieve all stored tokens.
   * @returns {Promise<{accessToken: string | null, refreshToken: string | null}>}
   */
  static deviceBound: boolean = false;
  static async getTokens() {
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

  static async ensureAccessToken(): Promise<string | null> {
    const { accessToken, refreshToken } = await this.getTokens();
    if (accessToken && !this.isTokenExpiringSoon(accessToken)) return accessToken;
    if (!refreshToken) return null;
    if (this.isTokenExpiringSoon(refreshToken, 0)) {
      await this.removeUser();
      return null;
    }
    return await this.refreshAccessToken(refreshToken);
  }
  /**
   * Calls the login API, stores tokens, and returns the user.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<User>}
   */
  static async login(email: string, password: string): Promise<User> {
    const LOGIN_MUTATION = gql`
      mutation Login($email: String!, $password: String!) {
        login(email: $email, password: $password) {
          user {
            id
            email
            username
            role
            fullname
            isVerified
            orgId
            position {
              name
              description
              id
              permissions {
                canView
                canCreate
                canEdit
                canDelete
                page {
                  label
                  key
                  access
                }
              }
            }
            org {
              id
              name
              profileImg
              roles
              subscription {
                id
                plan
              }
            }
          }
          token
          refresh_token
        }
      }
    `;

    try {
      const client = await getGraphQLClient();

      const response = (await client.request(LOGIN_MUTATION, {
        email,
        password,
      })) as LoginResponse;

      const { user, token, refresh_token } = response.login;
      if (__DEV__) {
        console.log("User permissions", user)
      }
      await this.storeTokens(token, refresh_token);
      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
      return user;
    } catch (error: any) {
      // GraphQL errors come back in error.response.errors[]
      const graphqlMessage = gqlErrorMessage(error);
      console.error('Login error:', graphqlMessage, '\n\nFull error object:', error);
      throw new Error(graphqlMessage ?? (error instanceof Error ? error.message : String(error)));

    }
  }

  static async registerUser({
    fullname,
    email,
    password,
    contactNumber,
  }: {
    fullname: string;
    email: string;
    password: string;
    contactNumber?: string;
  }): Promise<any> {
    const REGISTER_MUTATION = gql`
      mutation RegisterUser($fullname: String!, $email: String!, $password: String!, $contactNumber: String) {
        registerUser(fullname: $fullname, email: $email, password: $password, contactNumber: $contactNumber) {
          id
          fullname
          email
          isVerified
          orgId
        }
      }
    `;

    try {
      const response = await graphQLRequest<{ registerUser: any }>(
        REGISTER_MUTATION,
        { fullname, email, password, contactNumber },
        { skipAuth: true }
      );

      return response.registerUser;
    } catch (error: any) {
      console.log("❌ Register Error:", error);

      // If using GraphQL (like graphql-request or Apollo)
      if (error.response) {
        console.log("📛 GraphQL Errors:", error.response.errors);
      }

      if (error.message) {
        console.log("📩 Message:", error.message);
      }

      throw error; // rethrow so UI can still handle it
    }

  }
  static async getMyOutletAssignment(): Promise<{ outletId: number; role: string, outletName: string } | null> {
    const GET_MY_OUTLET = gql`
    query GetMyOutletAssignment {
      myOutletAssignment {
        outletId
        role
      }
    }
  `;
    try {
      const client = await getGraphQLClient();
      const { accessToken } = await AuthService.getTokens();
      const data = await client.request(GET_MY_OUTLET, {}, {
        Authorization: `Bearer ${accessToken}`
      });
      return data.myOutletAssignment ?? null;
    } catch {
      return null;
    }
  }
  static async verifyEmail(email: string, code: string): Promise<User> {
    try {
      console.log(`[AuthService] Verifying email: ${email}`)

      const VERIFY_MUTATION = gql`
        mutation VerifyEmail($email: String!, $code: String!) {
          verifyEmail(email: $email, code: $code) {
            user {
              id
              email
              username
              role
              fullname
              isVerified
              orgId
              org {
                id
                name
                subscription {
                  id
                  plan
                }
              }
            }
            token
            refresh_token
          }
        }
      `;

      const response = await graphQLRequest<{ verifyEmail: AuthPayload }>(
        VERIFY_MUTATION,
        { email, code },
        { skipAuth: true }
      );

      const { user, token, refresh_token } = response.verifyEmail;

      // Store tokens immediately after verification for onboarding flow
      // User will use these to create organization and subscription
      await this.storeTokens(token, refresh_token);
      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(user));

      console.log(`[AuthService] ✅ Email verified successfully for:`, user.email)
      return user;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`[AuthService] ❌ Email verification error:`, errorMessage)
      throw error
    }
  }

  static async resendOTP(email: string): Promise<string> {
    const RESEND_OTP_MUTATION = gql`
      mutation ResendOTP($email: String!) {
        resendOTP(email: $email)
      }
    `;

    const response = await graphQLRequest<{ resendOTP: string }>(
      RESEND_OTP_MUTATION,
      { email },
      { skipAuth: true }
    );

    return response.resendOTP;
  }

  static async createOrganization(name: string, roles: string[] = ['SELLER']): Promise<any> {
    return OrganizationService.createOrganization(name, roles);
  }

  static async createSubscription(orgId: number, plan: 'BASIC' | 'GOLD'): Promise<any> {
    return SubscriptionService.createSubscription(orgId, plan);
  }

  /**
   * Calls the refresh token API and returns the new access token.
   * This function is crucial and will be used by the HTTP interceptor.
   * @param {string} refreshToken
   * @returns {Promise<string>}
   */
  static async refreshAccessToken(refreshToken: string): Promise<string> {
    const REFRESH_MUTATION = gql`
      mutation RefreshToken($refresh_token: String!) {
        refreshToken(refresh_token: $refresh_token) {
          user {
            id
          }
          token
          refresh_token
        }
      }
    `;
    try {
      const client = await getGraphQLClient();

      const response = (await client.request(REFRESH_MUTATION, {
        refresh_token: refreshToken,
      })) as RefreshResponse;
      const { token, refresh_token: newRefreshToken } = response.refreshToken;
      await secureStorage.setItemAsync(AUTH_TOKEN_KEY, token);
      await secureStorage.setItemAsync(REFRESH_TOKEN_KEY, newRefreshToken);
      return token;
    } catch (error) {
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
  static async logout(outletId?: number): Promise<void> {
    if (outletId) {
      const LOGOUT_MUTATION = gql`
      mutation Mutation($outletId: ID!) {
        StaffLogout(outletId: $outletId) 
      }`;
      const { accessToken } = await this.getTokens();
      const client = await getGraphQLClient();
      try {
        await client.request(LOGOUT_MUTATION, { outletId }, {
          Authorization: `Bearer ${accessToken}`,
        });
      } catch (error) {
        //console.error("Logout error in:", error)
      }
    }

    await this.removeUser();
  }

  //! Fetch user from backend
  static async fetchCurrentUser(): Promise<User | null> {
    const ME_QUERY = gql`
      query ME {
        ME {
          id
          username
          email
          profilePhoto
          fullname
          role
          isVerified
          orgId
          org {
            id
            name
            subscription {
              id
              plan
            }
          }
        }
      }
    `;

    const requestUser = async (token: string): Promise<User | null> => {
      try {
        const client = await getGraphQLClient();
        const response = (await client.request(
          ME_QUERY,
          {},
          { Authorization: `Bearer ${token}` }
        )) as any;

        const user = response.ME;
        if (user) {
          await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
        }
        return user;
      } catch (error) {
        return null;
      }
    };

    try {
      const { accessToken, refreshToken } = await this.getTokens();
      if (accessToken) {
        const user = await requestUser(accessToken);
        if (user) return user;
      }

      if (!refreshToken) {
        return null;
      }

      const newAccessToken = await this.refreshAccessToken(refreshToken);
      if (!newAccessToken) {
        return null;
      }

      return await requestUser(newAccessToken);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (process.env.EXPO_PUBLIC_ENV === 'development') {
        console.warn('[AuthService] fetchCurrentUser error:', errorMessage);
      }
      return null;
    }
  }

  static async getCurrentUser(): Promise<User | null> {
    try {
      // get user data after login
      const userData = await AsyncStorage.getItem(USER_DATA_KEY);
      if (!userData) return null;

      return JSON.parse(userData);
    } catch (error) {
      //console.error('Error getting current user:', error);
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
      //console.error('Biometric authentication error:', error);
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
      //console.log('USER LOGGED IN:', user);
      const token = `token_${user.id}_${Date.now}`;
      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);

      return await this.getCurrentUser();
    } catch (error) {
      //console.error('Auto login failed', error);
      return null;
    }
  }
  /**
    
    export interface AuthState {
      user: User | null;
      isLoading: boolean;
      isAuthenticated: boolean;
      deviceBound?: boolean;
      accessToken?: null | string;
      refreshToken?: null | string;
      wifiAuthorized?: boolean;
    }
    */
  static async getStoredAuthState(): Promise<AuthState | null> {
    const user = await this.getCurrentUser();
    const accessToken = await this.ensureAccessToken();
    const { refreshToken } = await this.getTokens();

    if (user && accessToken) {
      return {
        user,
        isLoading: false,
        accessToken,
        refreshToken,
        isAuthenticated: true,
      };
    }

    return null;
  }

  static async initializeAuth(): Promise<AuthState> {
    try {
      const storedAuthState = await this.getStoredAuthState();
      if (storedAuthState) {
        return storedAuthState;
      }

      const user = await this.fetchCurrentUser();
      const { accessToken, refreshToken } = await this.getTokens();

      if (!user || !accessToken) {
        return {
          user: null,
          isLoading: false,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        };
      }

      return {
        user,
        isLoading: false,
        accessToken,
        refreshToken,
        isAuthenticated: true,
      };
    } catch (error) {
      return {
        user: null,
        isLoading: false,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
      };
    }
  }

  static async bindDevice(storeId: string): Promise<boolean> {
    try {
      const deviceId = await DeviceService.getDeviceId();
      await AsyncStorage.setItem(`${DEVICE_BINDING_KEY}_${storeId}`, deviceId);
      this.deviceBound = true;
      return true;
    } catch (error) {
      //console.error('Device binding failed:', error);
      return false;
    }
  }
  /**
 * Decodes a JWT and returns its expiry timestamp (in ms), or null if invalid.
 */
  static getTokenExpiry(token: string): number | null {
    try {
      const [, payloadB64] = token.split('.');
      if (!payloadB64) return null;
      const decoded = JSON.parse(atob(payloadB64));
      return decoded.exp ? decoded.exp * 1000 : null;
    } catch {
      return null;
    }
  }

  /**
   * Returns true if the token is expired or expiring within the threshold.
   * Defaults to 2 minutes — gives enough runway to refresh before a request fails.
   */
  static isTokenExpiringSoon(token: string, thresholdMs = 2 * 60 * 1000): boolean {
    const expiry = this.getTokenExpiry(token);
    if (!expiry) return true; // treat undecodable as already expired
    return Date.now() >= expiry - thresholdMs;
  }

  /**
   * Silently refreshes the access token if it is expired or expiring soon.
   * Safe to call on every app foreground — no-ops if the token is still valid.
   *
   * Returns the valid access token, or null if refresh failed (user must log in again).
   */
  static async silentRefresh(): Promise<string | null> {
    try {
      const { accessToken, refreshToken } = await this.getTokens();

      // Token is still valid — nothing to do
      if (accessToken && !this.isTokenExpiringSoon(accessToken)) {
        return accessToken;
      }

      if (!refreshToken) return null;

      // Refresh token itself is expired — full re-login required
      if (this.isTokenExpiringSoon(refreshToken, 0)) {
        await this.removeUser();
        return null;
      }

      return await this.refreshAccessToken(refreshToken);
    } catch (error) {
      if (process.env.EXPO_PUBLIC_ENV === 'development') {
        console.warn('[AuthService] silentRefresh failed:', error instanceof Error ? error.message : error);
      }
      return null; // refreshAccessToken already called removeUser() on failure
    }
  }

  /**
   * Call this when the app returns to foreground (AppState → "active").
   * Refreshes the token silently and returns a fresh AuthState for your context.
   *
   * Example usage in your AuthContext or root layout:
   *
   *   useEffect(() => {
   *     const sub = AppState.addEventListener('change', async (next) => {
   *       if (next === 'active') {
   *         const updated = await AuthService.onAppForeground();
   *         if (updated) dispatch({ type: 'RESTORE_AUTH', payload: updated });
   *         else dispatch({ type: 'LOGOUT' });
   *       }
   *     });
   *     return () => sub.remove();
   *   }, []);
   */
  static async onAppForeground(): Promise<AuthState | null> {
    const token = await this.silentRefresh();
    if (!token) return null;

    const user = await this.getCurrentUser();
    if (!user) return null;

    const { refreshToken } = await this.getTokens();
    return {
      user,
      isLoading: false,
      isAuthenticated: true,
      accessToken: token,
      refreshToken: refreshToken ?? null,
    };
  }
}

