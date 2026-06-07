/**
 * Stats Store
 * Store global para estadísticas del closet
 */

import { create } from 'zustand';
import type { ClosetStats } from '@/types';
import { apiClient } from '@/utils/apiClient';

interface StatsState {
  stats: ClosetStats | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;

  fetchStats: () => Promise<void>;
  clearStats: () => void;
}

const initialState = {
  stats: null,
  isLoading: false,
  error: null,
  lastUpdated: null,
};

export const useStatsStore = create<StatsState>((set) => ({
  ...initialState,

  fetchStats: async () => {
    set({ isLoading: true, error: null });

    try {
      const result = await apiClient.get<ClosetStats>('/stats/closet');

      if (result.error) {
        set({ isLoading: false, error: result.error });
        return;
      }

      if (result.data) {
        set({
          stats: result.data,
          isLoading: false,
          lastUpdated: new Date(),
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ isLoading: false, error: message });
    }
  },

  clearStats: () => set(initialState),
}));
