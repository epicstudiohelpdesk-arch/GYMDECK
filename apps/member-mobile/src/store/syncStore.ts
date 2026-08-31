/**
 * GymDeck Member Mobile - Offline Sync Metadata Store
 */

import { create } from 'zustand';

export interface QueuedMutation {
  id: string;
  idempotencyKey: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
  retryCount: number;
}

interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  queuedMutations: QueuedMutation[];
  lastSyncTimestamp: string | null;

  setOnlineStatus: (isOnline: boolean) => void;
  setSyncing: (isSyncing: boolean) => void;
  addMutation: (mutation: Omit<QueuedMutation, 'retryCount'>) => void;
  removeMutation: (id: string) => void;
  setLastSyncTimestamp: (timestamp: string) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  isOnline: true,
  isSyncing: false,
  queuedMutations: [],
  lastSyncTimestamp: null,

  setOnlineStatus: (isOnline) => set({ isOnline }),
  setSyncing: (isSyncing) => set({ isSyncing }),
  addMutation: (mutation) =>
    set((state) => ({
      queuedMutations: [...state.queuedMutations, { ...mutation, retryCount: 0 }],
    })),
  removeMutation: (id) =>
    set((state) => ({
      queuedMutations: state.queuedMutations.filter((m) => m.id !== id),
    })),
  setLastSyncTimestamp: (lastSyncTimestamp) => set({ lastSyncTimestamp }),
}));

export default useSyncStore;
