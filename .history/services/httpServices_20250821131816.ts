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
api.interceptors.request.use(async (config) => {
  const { accessToken } = await AuthService.getTokens();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

/**
 * Response Interceptor for 'api' instance: Catches 401 Unauthorized errors and attempts to refresh the token.
 * This interceptor is crucial for keeping the user session active without constant re-logging.
 */
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Check if the error is a 401 and it's not the refresh token call itself
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If a refresh is already in progress, add the failed request to a queue
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
        .then(token => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return api(originalRequest);
        })
        .catch(err => {
          return Promise.reject(`Error API interceptors: ${err}`);
        });
      }
      
      originalRequest._retry = true;
      isRefreshing = true;
      
      const { refreshToken } = await AuthService.getTokens();
      
      if (refreshToken) {
        try {
          const newAccessToken = await AuthService.refreshAccessToken(refreshToken);
          
          // Update the queue with the new access token
          processQueue(null, newAccessToken);
          
          // Retry the original request with the new token
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          // If the refresh token is also invalid, clear auth data and force logout
          await AuthService.removeUser();
          processQueue(refreshError);
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      } else {
        // No refresh token, so just clear the auth data and throw the error
        await AuthService.removeUser();
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);
