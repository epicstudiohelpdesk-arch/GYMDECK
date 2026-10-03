/**
 * GymDeck Owner Mobile - Centralized HTTP Client
 * 
 * Features:
 * - Environment & version-aware base URL
 * - Request interceptor: Injects Bearer token & X-Device-Id
 * - Response interceptor: Single-flight 401 token refresh queue
 * - Automatic error normalization to AppError
 * - Development diagnostics (request timing, error classification, without sensitive data)
 */

import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { Config } from '../../config';
import { SecureTokenStorage } from '../storage/SecureTokenStorage';
import { AppError } from '../../errors';
import { Logger } from '../../observability';
import { ApiResponse, AuthTokens } from '../../types';

// Mutex / queue management for simultaneous 401s
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

type SessionExpiredCallback = () => void;
let sessionExpiredCallback: SessionExpiredCallback | null = null;

export const setSessionExpiredCallback = (cb: SessionExpiredCallback | null): void => {
  sessionExpiredCallback = cb;
};

const notifySessionExpired = (): void => {
  if (sessionExpiredCallback) {
    try {
      sessionExpiredCallback();
    } catch (e) {
      Logger.warn('[ApiClient] Error in sessionExpiredCallback', { error: e });
    }
  }
};

const processQueue = (error: unknown, token: string | null = null): void => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const baseURL = `${Config.api.baseUrl}/${Config.api.version}`;

Logger.info(`[ApiClient] Configured with Base URL: ${baseURL} (Env: ${Config.env})`);

export const apiClient: AxiosInstance = axios.create({
  baseURL,
  timeout: Config.api.timeoutMs,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request Interceptor: Attach Bearer Token & Device Identifier
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    (config as any).__startTime = Date.now();

    try {
      const accessToken = await SecureTokenStorage.getAccessToken();
      if (accessToken && config.headers) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }

      const deviceSecret = await SecureTokenStorage.getDeviceSecret();
      if (deviceSecret && config.headers) {
        config.headers['X-Device-Id'] = deviceSecret;
      }
    } catch (err) {
      Logger.warn('[ApiClient] Failed to attach auth headers', { error: err });
    }

    Logger.debug(`[ApiClient] Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(normalizeAxiosError(error));
  }
);

// Response Interceptor: 401 Single-Flight Token Refresh & Diagnostics
apiClient.interceptors.response.use(
  (response) => {
    const startTime = (response.config as any).__startTime;
    const duration = startTime ? Date.now() - startTime : 0;
    Logger.debug(`[ApiClient] Response: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url} (${duration}ms)`);
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean; __startTime?: number };
    const startTime = originalRequest?.__startTime;
    const duration = startTime ? Date.now() - startTime : 0;

    if (!error.response || !originalRequest) {
      Logger.warn(`[ApiClient] Network/Transport Error: ${error.code || 'ECONNABORTED/NETWORK'} on ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url} (${duration}ms)`);
      return Promise.reject(normalizeAxiosError(error));
    }

    Logger.debug(`[ApiClient] HTTP Error: ${error.response.status} on ${originalRequest.method?.toUpperCase()} ${originalRequest.url} (${duration}ms)`);

    // Check if error is 401 and request was not already retried
    if (error.response.status === 401 && !originalRequest._retry) {
      if (
        originalRequest.url?.includes('/auth/owner/refresh') ||
        originalRequest.url?.includes('/auth/owner/login')
      ) {
        // Refresh or login itself failed - cannot refresh
        await SecureTokenStorage.clearTokens();
        if (originalRequest.url?.includes('/auth/owner/refresh')) {
          notifySessionExpired();
        }
        const responseData = error.response?.data as { error?: { message?: string } } | undefined;
        const message =
          responseData?.error?.message ||
          (originalRequest.url?.includes('/auth/owner/login')
            ? 'Invalid email or password.'
            : 'Session expired. Please log in again.');
        return Promise.reject(AppError.unauthorized(message));
      }

      if (isRefreshing) {
        // Queue the request until the active refresh completes
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      const refreshToken = await SecureTokenStorage.getRefreshToken();
      if (!refreshToken) {
        // No stored session exists - do not notify session expired
        return Promise.reject(normalizeAxiosError(error));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await axios.post<ApiResponse<AuthTokens>>(
          `${baseURL}/auth/owner/refresh`,
          { refreshToken },
          { timeout: Config.api.timeoutMs }
        );

        const newTokens = refreshResponse.data.data;
        await SecureTokenStorage.saveTokens(newTokens);

        processQueue(null, newTokens.accessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        await SecureTokenStorage.clearTokens();
        notifySessionExpired();
        return Promise.reject(AppError.unauthorized('Session has expired. Please log in again.'));
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(normalizeAxiosError(error));
  }
);

function normalizeAxiosError(error: unknown): AppError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const responseData = error.response?.data as { error?: { message?: string; domain?: string } } | undefined;
    const message = responseData?.error?.message || error.message || 'An unexpected network error occurred.';

    if (!error.response) {
      return AppError.network(message);
    }

    if (status === 401) return AppError.unauthorized(message);
    if (status === 403) return AppError.forbidden(message);
    if (status === 400) return AppError.validation(message);

    return new AppError(message, 'SERVER', status);
  }

  if (error instanceof AppError) return error;

  return new AppError(error instanceof Error ? error.message : 'Unknown error occurred.', 'UNKNOWN');
}

export default apiClient;
