/**
 * GymDeck Member Mobile - Centralized HTTP Client
 * 
 * Features:
 * - Environment & version-aware base URL
 * - Request interceptor: Injects Bearer token & X-Device-Id
 * - Response interceptor: Single-flight 401 token refresh queue
 * - Automatic error normalization to AppError
 */

import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { Config } from '../../config';
import { SecureTokenStorage } from '../storage/SecureTokenStorage';
import { AppError } from '../../errors';
import { Logger } from '../../observability';
import { ApiResponse, RefreshTokenResponse } from './types';

// Mutex / queue management for simultaneous 401s
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

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

// Response Interceptor: 401 Single-Flight Token Refresh
apiClient.interceptors.response.use(
  (response) => {
    Logger.debug(`[ApiClient] Response: ${response.status} ${response.config.url}`);
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (!error.response || !originalRequest) {
      return Promise.reject(normalizeAxiosError(error));
    }

    // Check if error is 401 and request was not already retried
    if (error.response.status === 401 && !originalRequest._retry) {
      if (originalRequest.url?.includes('/auth/refresh') || originalRequest.url?.includes('/auth/login')) {
        // Refresh or login itself failed - cannot refresh
        await SecureTokenStorage.clearTokens();
        return Promise.reject(AppError.unauthorized());
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
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await SecureTokenStorage.getRefreshToken();
        if (!refreshToken) {
          throw AppError.unauthorized('No refresh token available.');
        }

        Logger.info('[ApiClient] Access token expired. Executing single-flight refresh...');

        const refreshResponse = await axios.post<ApiResponse<RefreshTokenResponse>>(
          `${baseURL}/auth/refresh`,
          { refreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        );

        const newAccessToken = refreshResponse.data.data.accessToken;
        const newRefreshToken = refreshResponse.data.data.refreshToken || refreshToken;

        await SecureTokenStorage.saveTokens({
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          expiresIn: refreshResponse.data.data.expiresIn,
          tokenType: 'Bearer',
        });

        processQueue(null, newAccessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        return apiClient(originalRequest);
      } catch (refreshErr) {
        Logger.error('[ApiClient] Token refresh failed. Clearing local session.', refreshErr);
        processQueue(refreshErr, null);
        await SecureTokenStorage.clearTokens();
        return Promise.reject(AppError.unauthorized('Session expired. Please sign in again.'));
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(normalizeAxiosError(error));
  }
);

export const normalizeAxiosError = (error: unknown): AppError => {
  if (error instanceof AppError) return error;

  if (axios.isAxiosError(error)) {
    const axiosErr = error as AxiosError<{ message?: string; error?: { message?: string; code?: string; validationErrors?: Record<string, string[]> } }>;

    if (axiosErr.code === 'ECONNABORTED' || axiosErr.message.includes('timeout')) {
      return AppError.timeout();
    }

    if (!axiosErr.response) {
      return AppError.network();
    }

    const status = axiosErr.response.status;
    const data = axiosErr.response.data;
    const serverMessage = data?.error?.message || data?.message;
    const validationErrors = data?.error?.validationErrors;

    switch (status) {
      case 401:
        return AppError.unauthorized(serverMessage);
      case 403:
        return AppError.forbidden(serverMessage);
      case 422:
      case 400:
        return AppError.validation(validationErrors, serverMessage);
      case 500:
      case 502:
      case 503:
        return AppError.server(serverMessage);
      default:
        return new AppError({
          domain: 'SERVER',
          code: data?.error?.code || `HTTP_${status}`,
          userMessage: serverMessage || 'Request failed. Please try again.',
          statusCode: status,
        });
    }
  }

  return AppError.fromUnknown(error);
};

export default apiClient;
