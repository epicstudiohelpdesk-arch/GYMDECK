/**
 * GymDeck Owner Mobile - Session & Authentication Store (Zustand)
 */

import { create } from 'zustand';
import { OwnerUser } from '../types';
import { SecureTokenStorage } from '../services/storage/SecureTokenStorage';
import { OwnerAuthApiService } from '../services/api/ownerAuthService';
import { queryClient } from '../services/api/queryClient';
import { Logger } from '../observability';

interface AuthState {
  user: OwnerUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  bootstrapSession: () => Promise<void>;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  bootstrapSession: async () => {
    set({ isLoading: true, error: null });
    try {
      const tokens = await SecureTokenStorage.getTokens();
      if (!tokens?.accessToken) {
        set({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }

      // Validate session with Cloud
      const user = await OwnerAuthApiService.getMe();
      set({ user, isAuthenticated: true, isLoading: false });
      Logger.info('[AuthStore] Session restored successfully', { userId: user.id, gymId: user.gymId });
    } catch (err) {
      Logger.warn('[AuthStore] Session bootstrap failed, resetting tokens', { error: err });
      await SecureTokenStorage.clearTokens();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const response = await OwnerAuthApiService.login(credentials);
      await SecureTokenStorage.saveTokens(response.tokens);
      queryClient.clear();
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      Logger.info('[AuthStore] Owner login successful', { userId: response.user.id, gymId: response.user.gymId });
    } catch (err: any) {
      const message = err?.message || 'Login failed. Please verify your credentials.';
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      const refreshToken = await SecureTokenStorage.getRefreshToken();
      await OwnerAuthApiService.logout(refreshToken || undefined);
    } catch (err) {
      Logger.warn('[AuthStore] Remote logout call error', { error: err });
    } finally {
      await SecureTokenStorage.clearTokens();
      queryClient.clear();
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
      Logger.info('[AuthStore] Local session cleared');
    }
  },

  clearError: () => set({ error: null }),
}));
