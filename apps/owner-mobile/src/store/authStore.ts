/**
 * GymDeck Owner Mobile - Session & Authentication Store (Zustand)
 *
 * Implements 5-state lifecycle model:
 * - BOOTSTRAPPING: Validating initial secure hardware storage & restoring session
 * - AUTHENTICATED: Valid session verified by Cloud tenant identity
 * - UNAUTHENTICATED: No credentials; public auth flows active
 * - AUTH_EXPIRED: Token expired or rejected by server; session revoked
 * - AUTH_ERROR: Operational or network authentication error
 */

import { create } from 'zustand';
import { OwnerUser, AuthStatus, OwnerSignupInput } from '../types';
import { SecureTokenStorage } from '../services/storage/SecureTokenStorage';
import { OwnerAuthApiService } from '../services/api/ownerAuthService';
import { setSessionExpiredCallback } from '../services/api/client';
import { queryClient } from '../services/api/queryClient';
import { Logger } from '../observability';
import { LocalDatabaseManager } from '../database/LocalDatabaseManager';

interface AuthState {
  status: AuthStatus;
  user: OwnerUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  sessionExpiredMessage: string | null;

  bootstrapSession: () => Promise<void>;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  signup: (payload: OwnerSignupInput) => Promise<void>;
  logout: () => Promise<void>;
  handleSessionExpired: (message?: string) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'BOOTSTRAPPING',
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isSubmitting: false,
  error: null,
  sessionExpiredMessage: null,

  bootstrapSession: async () => {
    set({ status: 'BOOTSTRAPPING', isLoading: true, error: null });
    Logger.info('[AuthBootstrap] AUTH_BOOTSTRAP_START');
    try {
      Logger.info('[AuthBootstrap] TOKEN_STORAGE_READ_START');
      const tokens = await SecureTokenStorage.getTokens();
      Logger.info(`[AuthBootstrap] TOKEN_STORAGE_READ_RESULT: ${tokens?.refreshToken ? 'present' : 'absent'}`);

      if (!tokens?.refreshToken) {
        set({
          user: null,
          status: 'UNAUTHENTICATED',
          isAuthenticated: false,
          isLoading: false,
        });
        Logger.info('[AuthBootstrap] AUTH_STATE: BOOTSTRAPPING → UNAUTHENTICATED (no persisted session)');
        return;
      }

      // If access token is present, attempt session verification
      if (tokens.accessToken) {
        try {
          const user = await OwnerAuthApiService.getMe();
          LocalDatabaseManager.getInstance().initialize(user.gymId).catch((dbErr) => {
            Logger.warn('[AuthStore] Database initialization deferred', { error: dbErr?.message });
          });
          set({
            user,
            status: 'AUTHENTICATED',
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          Logger.info('[AuthBootstrap] AUTH_STATE: BOOTSTRAPPING → AUTHENTICATED (access-token session)');
          Logger.info('[AuthStore] Session restored via access token', { userId: user.id, gymId: user.gymId });
          return;
        } catch {
          // Access token might be expired; attempt single-flight refresh below
        }
      }

      // Attempt to rotate/refresh using stored refresh token
      Logger.info('[AuthBootstrap] AUTH_REFRESH_START');
      try {
        const newTokens = await OwnerAuthApiService.refreshToken(tokens.refreshToken);
        await SecureTokenStorage.saveTokens(newTokens);
        const user = await OwnerAuthApiService.getMe();
        LocalDatabaseManager.getInstance().initialize(user.gymId).catch((dbErr) => {
          Logger.warn('[AuthStore] Database initialization deferred', { error: dbErr?.message });
        });
        set({
          user,
          status: 'AUTHENTICATED',
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        Logger.info('[AuthBootstrap] AUTH_REFRESH_RESULT: success');
        Logger.info('[AuthBootstrap] AUTH_STATE: BOOTSTRAPPING → AUTHENTICATED (refresh)');
        Logger.info('[AuthStore] Session refreshed successfully during bootstrap', { userId: user.id, gymId: user.gymId });
      } catch (refreshErr) {
        Logger.info('[AuthBootstrap] AUTH_REFRESH_RESULT: failure');
        Logger.warn('[AuthStore] Refresh token bootstrap failed, resetting local storage', { error: refreshErr });
        await SecureTokenStorage.clearTokens();
        queryClient.clear();
        set({
          user: null,
          status: 'UNAUTHENTICATED',
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
        Logger.info('[AuthBootstrap] AUTH_STATE: BOOTSTRAPPING → UNAUTHENTICATED (refresh failed)');
      }
    } catch (err) {
      Logger.warn('[AuthStore] Session bootstrap critical failure', { error: err });
      await SecureTokenStorage.clearTokens();
      queryClient.clear();
      set({
        user: null,
        status: 'UNAUTHENTICATED',
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
      Logger.info('[AuthBootstrap] AUTH_STATE: BOOTSTRAPPING → UNAUTHENTICATED (critical failure)');
    }
  },

  login: async (credentials) => {
    set({ isSubmitting: true, error: null, sessionExpiredMessage: null });
    try {
      const response = await OwnerAuthApiService.login(credentials);
      await SecureTokenStorage.saveTokens(response.tokens);
      queryClient.clear();
      LocalDatabaseManager.getInstance().initialize(response.user.gymId).catch((dbErr) => {
        Logger.warn('[AuthStore] Database initialization deferred', { error: dbErr?.message });
      });
      set({
        user: response.user,
        status: 'AUTHENTICATED',
        isAuthenticated: true,
        isSubmitting: false,
        isLoading: false,
        error: null,
        sessionExpiredMessage: null,
      });
      Logger.info('[AuthStore] Owner login successful', { userId: response.user.id, gymId: response.user.gymId });
    } catch (err: any) {
      const message = err?.message || 'Invalid email or password.';
      set({ isSubmitting: false, error: message });
      throw err;
    }
  },

  signup: async (payload) => {
    set({ isSubmitting: true, error: null, sessionExpiredMessage: null });
    try {
      const response = await OwnerAuthApiService.signup(payload);
      // Explicitly do not auto-login: user must sign in with their credentials
      await SecureTokenStorage.clearTokens();
      queryClient.clear();
      set({
        user: null,
        status: 'UNAUTHENTICATED',
        isAuthenticated: false,
        isSubmitting: false,
        isLoading: false,
        error: null,
        sessionExpiredMessage: null,
      });
      Logger.info('[AuthStore] Owner signup successful, awaiting user login', {
        userId: response.user.id,
        gymId: response.user.gymId,
      });
    } catch (err: any) {
      const message = err?.message || 'Account registration failed. Please try again.';
      set({ isSubmitting: false, error: message });
      throw err;
    }
  },

  logout: async () => {
    set({ isSubmitting: true });
    try {
      const refreshToken = await SecureTokenStorage.getRefreshToken();
      if (refreshToken) {
        await OwnerAuthApiService.logout(refreshToken);
      }
    } catch (err) {
      Logger.warn('[AuthStore] Remote logout call error', { error: err });
    } finally {
      await LocalDatabaseManager.getInstance().close().catch(() => {});
      await SecureTokenStorage.clearTokens();
      queryClient.clear();
      set({
        user: null,
        status: 'UNAUTHENTICATED',
        isAuthenticated: false,
        isLoading: false,
        isSubmitting: false,
        error: null,
        sessionExpiredMessage: null,
      });
      Logger.info('[AuthStore] Local session cleared');
    }
  },

  handleSessionExpired: (message?: string) => {
    LocalDatabaseManager.getInstance().close().catch(() => {});
    const wasAuth = get().isAuthenticated || get().status === 'AUTHENTICATED';
    queryClient.clear();
    if (wasAuth) {
      set({
        user: null,
        status: 'AUTH_EXPIRED',
        isAuthenticated: false,
        isLoading: false,
        isSubmitting: false,
        sessionExpiredMessage: message || 'Your session has expired. Please sign in to continue.',
      });
      Logger.info('[AuthBootstrap] AUTH_STATE: → AUTH_EXPIRED (session rejected)');
      Logger.warn('[AuthStore] Session transition: AUTH_EXPIRED');
    } else {
      set({
        user: null,
        status: 'UNAUTHENTICATED',
        isAuthenticated: false,
        isLoading: false,
        isSubmitting: false,
        sessionExpiredMessage: null,
      });
    }
  },

  clearError: () => set({ error: null, sessionExpiredMessage: null }),
}));

// Wire up the single-flight refresh failure callback
setSessionExpiredCallback(() => {
  useAuthStore.getState().handleSessionExpired();
});
