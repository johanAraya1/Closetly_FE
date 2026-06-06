/**
 * Marketplace Store
 * Store global para el feed público de prendas (marketplace)
 *
 * Arquitectura: Screen -> Store -> Service -> API
 * Store independiente de garmentsStore porque marketplace es un concern público
 * y no requiere autenticación.
 */

import { create } from 'zustand';
import type { Garment } from '@/types';
import * as marketplaceService from '@/services/marketplaceService';

const DEFAULT_PAGE_LIMIT = 20;

interface MarketplaceState {
  garments: Garment[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  page: number;
  total: number;
  error: string | null;

  // Actions
  loadPublicGarments: () => Promise<void>;
  loadMorePublicGarments: () => Promise<void>;
  clearError: () => void;
  resetStore: () => void;
}

const initialState = {
  garments: [],
  isLoading: false,
  isLoadingMore: false,
  hasMore: false,
  page: 0,
  total: 0,
  error: null,
};

export const useMarketplaceStore = create<MarketplaceState>((set, get) => {
  let _abortController: AbortController | null = null;

  const abortPrevious = (): AbortSignal => {
    _abortController?.abort();
    _abortController = new AbortController();
    return _abortController.signal;
  };

  return {
    ...initialState,

    /**
     * Carga inicial de prendas públicas (resetea el estado)
     */
    loadPublicGarments: async () => {
      const signal = abortPrevious();
      set({ isLoading: true, error: null, page: 0, hasMore: false });

      const result = await marketplaceService.getPublicGarments(0, DEFAULT_PAGE_LIMIT);

      if (signal.aborted) return;
      if (result.error) {
        set({ isLoading: false, error: result.error });
        return;
      }

      set({
        garments: result.data,
        isLoading: false,
        total: result.total ?? result.data.length,
        hasMore: result.hasMore ?? false,
        page: 1,
      });
    },

    /**
     * Carga la siguiente página y la agrega al listado existente
     */
    loadMorePublicGarments: async () => {
      const { isLoadingMore, hasMore, page } = get();
      if (isLoadingMore || !hasMore) return;

      const signal = abortPrevious();
      set({ isLoadingMore: true });

      const result = await marketplaceService.getPublicGarments(page, DEFAULT_PAGE_LIMIT);

      if (signal.aborted) return;
      if (result.error) {
        set({ isLoadingMore: false, error: result.error });
        return;
      }

      if (result.data) {
        set((state) => ({
          garments: [...state.garments, ...result.data],
          isLoadingMore: false,
          total: result.total ?? state.total,
          hasMore: result.hasMore ?? false,
          page: state.page + 1,
        }));
      }
    },

    clearError: () => set({ error: null }),

    resetStore: () => set(initialState),
  };
});
