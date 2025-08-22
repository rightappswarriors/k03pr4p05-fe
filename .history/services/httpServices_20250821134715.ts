// File: src/services/httpService.ts
// A new file for handling all API calls with a token refresh interceptor.
import axios from 'axios';
import { AuthService, API_BASE_URL, AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY } from '@/services/authService';

/**
 * Public Axios Instance:
 * Used for all public API calls that do not require an access token,
 * such as login, registration, and password reset endpoints.
 */
export const publicApi = axios.create({
  baseURL: API_BASE_URL,
});

/**
 * Authenticated Axios Instance:
 * Used for all protected API calls that require a valid access token.
 * This instance is configured with interceptors for token handling and refreshing.
 */
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// A variable to prevent multiple simultaneous refresh token calls
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value: any) => void; reject: (reason?: any) => void }> = [];

const processQueue = (error: any | null, token: string | null = null) => {
  console.log(API_BASE_URL)
     failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Request Interceptor for 'api' instance: Adds the access token to the Authorization header.
 * This interceptor is only attached to the 'api' instance, which handles authenticated routes.
 */
api.interceptors.response.use(
     (response) => response,
     async (error) => {
       const originalRequest = error.config;
   
       if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes("/auth/refresh")) {
         if (isRefreshing) {
           return new Promise((resolve, reject) => {
             failedQueue.push({ resolve, reject });
           }).then((token) => {
             originalRequest.headers["Authorization"] = `Bearer ${token}`;
             return api(originalRequest);
           });
         }
   
         originalRequest._retry = true;
         isRefreshing = true;
   
         try {
           const { refreshToken } = await AuthService.getTokens();
           if (!refreshToken) throw new Error("No refresh token available");
   
           const newAccessToken = await AuthService.refreshAccessToken(refreshToken);
   
           // ✅ persist new tokens in Keychain
           await AuthService.storeTokens(newAccessToken, refreshToken);
   
           processQueue(null, newAccessToken);
   
           originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
           return api(originalRequest);
         } catch (refreshError) {
           processQueue(refreshError, null);
           await AuthService.removeUser();
           return Promise.reject(refreshError);
         } finally {
           isRefreshing = false;
         }
       }
   
       return Promise.reject(error);
     }
   );
   