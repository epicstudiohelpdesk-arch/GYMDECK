/**
 * GymDeck Member Mobile - Client Auth & Session Store
 * 
 * Manages client UI session state.
 * Actual sensitive tokens are persisted strictly in SecureTokenStorage (Keychain).
 */

import { create } from 'zustand';
import { UserProfile, AuthTokens } from '../types';
import { SecureTokenStorage } from '../services/storage/SecureTokenStorage';
import { FastAppStorage } from '../services/storage/FastAppStorage';
import { queryClient } from './QueryClient';
import { Logger } from '../observability';

interface AuthState {
  isAuthenticated: boolean;
  isInitialized: boolean;
  isOnboarded: boolean;
  user: UserProfile | null;
  activeGymId: string | null;
  pendingVerificationEmail: string | null;

  setInitialized: (initialized: boolean) => void;
  setUser: (user: UserProfile | null) => void;
  setOnboarded: (onboarded: boolean) => void;
  setPendingVerificationEmail: (email: string | null) => void;
  setSession: (user: UserProfile, tokens: AuthTokens) => Promise<void>;
  clearSession: () => Promise<void>;
  initializeSession: () => Promise<void>;
}

const ACTIVE_USER_CACHE_KEY = 'gymdeck_cached_user';
const ACTIVE_GYM_CACHE_KEY = 'gymdeck_cached_gym_id';
const ONBOARDED_CACHE_KEY = 'gymdeck_onboarded_flag';

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isInitialized: false,
  isOnboarded: FastAppStorage.getBoolean(ONBOARDED_CACHE_KEY) ?? false,
  user: null,
  activeGymId: FastAppStorage.getString(ACTIVE_GYM_CACHE_KEY),
  pendingVerificationEmail: null,

  setInitialized: (isInitialized) => set({ isInitialized }),
  
  setOnboarded: (isOnboarded) => {
    FastAppStorage.setBoolean(ONBOARDED_CACHE_KEY, isOnboarded);
    set({ isOnboarded });
  },

  setPendingVerificationEmail: (pendingVerificationEmail) =>
    set({ pendingVerificationEmail }),

  setUser: (user) => {
    if (user) {
      FastAppStorage.setObject(ACTIVE_USER_CACHE_KEY, user);
      set({ user, activeGymId: user.gymId });
    } else {
      FastAppStorage.removeItem(ACTIVE_USER_CACHE_KEY);
      set({ user: null });
    }
  },

  setSession: async (user, tokens) => {
    try {
      await SecureTokenStorage.saveTokens(tokens);
      FastAppStorage.setObject(ACTIVE_USER_CACHE_KEY, user);
      if (user.gymId) {
        FastAppStorage.setString(ACTIVE_GYM_CACHE_KEY, user.gymId);
      }

      set({
        isAuthenticated: true,
        user,
        activeGymId: user.gymId || null,
        pendingVerificationEmail: null,
      });

      Logger.info('[AuthStore] User session established.', { userId: user.id });
    } catch (err) {
      Logger.error('[AuthStore] Failed to save session tokens', err);
      throw err;
    }
  },

  clearSession: async () => {
    try {
      await SecureTokenStorage.clearTokens();
      FastAppStorage.removeItem(ACTIVE_USER_CACHE_KEY);
      
      // Clear TanStack query cache completely to guarantee tenant and account data isolation
      queryClient.clear();

      set({
        isAuthenticated: false,
        user: null,
        pendingVerificationEmail: null,
      });

      Logger.info('[AuthStore] User session and query cache cleared.');
    } catch (err) {
      Logger.error('[AuthStore] Failed to clear session tokens', err);
    }
  },

  initializeSession: async () => {
    try {
      const accessToken = await SecureTokenStorage.getAccessToken();
      const cachedUser = FastAppStorage.getObject<UserProfile>(ACTIVE_USER_CACHE_KEY);
      const isOnboarded = FastAppStorage.getBoolean(ONBOARDED_CACHE_KEY) ?? false;

      if (accessToken && cachedUser) {
        set({
          isAuthenticated: true,
          user: cachedUser,
          activeGymId: cachedUser.gymId || null,
          isOnboarded,
          isInitialized: true,
        });
        Logger.debug('[AuthStore] Restored existing user session.');
      } else {
        set({
          isAuthenticated: false,
          user: null,
          isOnboarded,
          isInitialized: true,
        });
      }
    } catch (err) {
      Logger.warn('[AuthStore] Session initialization error', { error: err });
      set({
        isAuthenticated: false,
        user: null,
        isInitialized: true,
      });
    }
  },
}));

export default useAuthStore;
