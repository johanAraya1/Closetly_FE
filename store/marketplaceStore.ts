/**
 * Marketplace Store
 * Store global para el feed público de prendas (marketplace)
 *
 * Arquitectura: Screen -> Store -> Service -> API
 * Store independiente de garmentsStore porque marketplace es un concern público
 * y no requiere autenticación.
 */

import { create } from 'zustand';
import type { Garment, PublicProfileResult } from '@/types';
import * as marketplaceService from '@/services/marketplaceService';
import { apiClient } from '@/utils/apiClient';

const DEFAULT_PAGE_LIMIT = 20;

interface MarketplaceState {
  garments: Garment[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  page: number;
  total: number;
  error: string | null;
  profilesByUserId: Record<string, PublicProfileResult>;

  // Actions
  loadPublicGarments: () => Promise<void>;
  loadMorePublicGarments: () => Promise<void>;
  loadProfilesForCurrentGarments: () => Promise<void>;
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
  profilesByUserId: {},
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

    /**
     * Carga los perfiles públicos de los vendedores cuyas prendas están
     * actualmente en el store. Omite userIds ya cargados (caché).
     */
    loadProfilesForCurrentGarments: async () => {
      const { garments, profilesByUserId } = get();

      // Extraer userIds únicos que aún no tenemos perfil
      const missingIds = [
        ...new Set(garments.map((g) => g.userId).filter(Boolean)),
      ].filter((id) => !profilesByUserId[id]);

      if (missingIds.length === 0) return;

      // Fetch en paralelo (máx 3 a la vez para no saturar)
      const BATCH_SIZE = 3;
      const newProfiles: Record<string, PublicProfileResult> = {};

      for (let i = 0; i < missingIds.length; i += BATCH_SIZE) {
        const batch = missingIds.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map((userId) =>
            apiClient.get<{ data: PublicProfileResult }>(
              `/users/public/${userId}`,
              { requiresAuth: false },
            ),
          ),
        );

        for (let j = 0; j < batch.length; j++) {
          const result = results[j];
          if (result.status === 'fulfilled' && result.value.data?.data) {
            const profile = result.value.data.data;
            newProfiles[batch[j]] = profile;
          }
        }
      }

      if (Object.keys(newProfiles).length > 0) {
        set((state) => ({
          profilesByUserId: { ...state.profilesByUserId, ...newProfiles },
        }));
      }
    },

    clearError: () => set({ error: null }),

    resetStore: () => set(initialState),
  };
});
