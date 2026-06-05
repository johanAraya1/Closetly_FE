/**
 * Outfits Store
 * Store global para gestionar outfits del usuario
 */

import { create } from 'zustand';
import type { Outfit, CreateOutfitDTO, UpdateOutfitDTO } from '@/types';
import * as outfitService from '@/services/outfitService';
import { useGarmentsStore } from '@/store/garmentsStore';

const DEFAULT_PAGE_LIMIT = 20;

interface OutfitsState {
  outfits: Outfit[];
  currentOutfit: Outfit | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  page: number;
  total: number;
  error: string | null;
  
  // Actions
  loadOutfits: (userId: string) => Promise<void>;
  loadMoreOutfits: (userId: string) => Promise<void>;
  loadOutfitById: (id: string) => Promise<void>;
  createOutfit: (userId: string, data: CreateOutfitDTO) => Promise<Outfit | null>;
  updateOutfit: (id: string, updates: UpdateOutfitDTO) => Promise<boolean>;
  deleteOutfit: (id: string) => Promise<boolean>;
  toggleFavorite: (id: string, isFavorite: boolean) => Promise<boolean>;
  clearError: () => void;
  resetStore: () => void;
  cancelRequests: () => void;
}

const initialState = {
  outfits: [],
  currentOutfit: null,
  isLoading: false,
  isLoadingMore: false,
  hasMore: false,
  page: 0,
  total: 0,
  error: null,
};

export const useOutfitsStore = create<OutfitsState>((set, get) => {
  let _abortController: AbortController | null = null;

  const abortPrevious = (): AbortSignal => {
    _abortController?.abort();
    _abortController = new AbortController();
    return _abortController.signal;
  };

  return {
    ...initialState,

    cancelRequests: () => {
      _abortController?.abort();
      _abortController = null;
    },

    loadOutfits: async (userId: string) => {
      const signal = abortPrevious();
      set({ isLoading: true, error: null, page: 0, hasMore: false });

      const result = await outfitService.getOutfits(userId, DEFAULT_PAGE_LIMIT, 0, signal);

      if (signal.aborted) return;
      if (result.error) {
        set({ isLoading: false, error: result.error });
        return;
      }

      if (result.data) {
        set({
          outfits: result.data,
          isLoading: false,
          total: result.total ?? result.data.length,
          hasMore: result.hasMore ?? false,
          page: 1,
        });
      }
    },

    loadMoreOutfits: async (userId: string) => {
      const { isLoadingMore, hasMore, page } = get();
      if (isLoadingMore || !hasMore) return;

      const signal = abortPrevious();
      set({ isLoadingMore: true });

      const offset = page * DEFAULT_PAGE_LIMIT;
      const result = await outfitService.getOutfits(userId, DEFAULT_PAGE_LIMIT, offset, signal);

      if (signal.aborted) return;
      if (result.error) {
        set({ isLoadingMore: false, error: result.error });
        return;
      }

      if (result.data) {
        set((state) => ({
          outfits: [...state.outfits, ...result.data!],
          isLoadingMore: false,
          total: result.total ?? state.total,
          hasMore: result.hasMore ?? false,
          page: state.page + 1,
        }));
      }
    },

    loadOutfitById: async (id: string) => {
      const signal = abortPrevious();
      set({ isLoading: true, error: null });
      
      const result = await outfitService.getOutfitById(id, signal);
      
      if (signal.aborted) return;
      if (result.error) {
        set({ isLoading: false, error: result.error });
        return;
      }

      if (result.data) {
        set({ currentOutfit: result.data, isLoading: false });
      }
    },

  createOutfit: async (userId: string, data: CreateOutfitDTO) => {
    set({ isLoading: true, error: null });
    
    const result = await outfitService.createOutfit(userId, data);
    
    if (result.error) {
      set({ isLoading: false, error: result.error });
      return null;
    }

    if (result.data) {
      // Poblar prendas desde el store de garments (ya cargadas)
      const allGarments = useGarmentsStore.getState().garments;
      const outfitGarments = allGarments.filter(
        (g) => data.garmentIds?.includes(g.id)
      );
      
      set((state) => ({
        outfits: [{ ...result.data!, garments: outfitGarments }, ...state.outfits],
        isLoading: false,
      }));
      return result.data;
    }

    return null;
  },

  updateOutfit: async (id: string, updates: UpdateOutfitDTO) => {
    set({ isLoading: true, error: null });
    
    const result = await outfitService.updateOutfit(id, updates);
    
    if (result.error) {
      set({ isLoading: false, error: result.error });
      return false;
    }

    if (result.data) {
      set((state) => ({
        outfits: state.outfits.map((o) =>
          o.id === id ? result.data! : o
        ),
        currentOutfit: state.currentOutfit?.id === id ? result.data : state.currentOutfit,
        isLoading: false,
      }));
      return true;
    }

    return false;
  },

  deleteOutfit: async (id: string) => {
    // Optimistic update: eliminar inmediatamente
    const { outfits } = get();
    const deletedOutfit = outfits.find((o) => o.id === id);
    
    set((state) => ({
      outfits: state.outfits.filter((o) => o.id !== id),
      currentOutfit: state.currentOutfit?.id === id ? null : state.currentOutfit,
      isLoading: true,
      error: null,
    }));
    
    const result = await outfitService.deleteOutfit(id);
    
    if (result.error) {
      // Rollback: restaurar outfit eliminado
      if (deletedOutfit) {
        set((state) => ({
          outfits: [...state.outfits, deletedOutfit],
          isLoading: false,
          error: result.error,
        }));
      } else {
        set({ isLoading: false, error: result.error });
      }
      return false;
    }

    set({ isLoading: false });
    return true;
  },

  toggleFavorite: async (id: string, isFavorite: boolean) => {
    // Optimistic update: cambiar favorito inmediatamente
    const { outfits } = get();
    const previousFavorite = outfits.find((o) => o.id === id)?.is_favorite;
    
    set((state) => ({
      outfits: state.outfits.map((o) =>
        o.id === id ? { ...o, is_favorite: isFavorite } : o
      ),
    }));
    
    const result = await outfitService.toggleOutfitFavorite(id, isFavorite);
    
    if (result.error) {
      // Rollback: restaurar estado anterior
      set((state) => ({
        outfits: state.outfits.map((o) =>
          o.id === id ? { ...o, is_favorite: previousFavorite ?? false } : o
        ),
        error: result.error,
      }));
      return false;
    }

    return true;
  },

  clearError: () => set({ error: null }),
  
  resetStore: () => set(initialState),
  };
});
