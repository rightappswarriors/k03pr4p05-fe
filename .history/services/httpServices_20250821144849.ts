import axios from "axios";
import { AuthService } from "./authService";

const API_BASE_URL = "http://localhost:3000/api";

const http = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// ⏳ Prevents multiple refresh calls at the same time
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onRrefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

// ✅ Attach accessToken to every request
http.interceptors.request.use(async (config) => {
  const { accessToken } = await AuthService.getTokens();
  console.log('Access token retrieved in interceptor:', accessToken);
  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// ✅ Handle 401 and refresh token
http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only refresh once per batch of failed requests
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue the request until refresh is done
        return new Promise((resolve) => {
          subscribeTokenRefresh((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(http(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { refreshToken } = await AuthService.getTokens();
        if (!refreshToken) throw new Error("No refresh token available");

        // 🔹 Call backend refresh endpoint
        const { data } = await axios.post(`${API_BASE_URL}/users/refresh`, {
          refresh_token: refreshToken,
        });

        const newAccessToken = data.token;
        const newRefreshToken = data.refresh_token;

        // 🔹 Save updated tokens in Keychain
        await AuthService.storeTokens(newAccessToken, newRefreshToken);

        // 🔹 Notify queued requests
        onRrefreshed(newAccessToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return http(originalRequest);
      } catch (err) {
        await AuthService.removeUser(); // clear everything
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default http;
