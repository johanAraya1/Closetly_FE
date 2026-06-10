/**
 * Outfits Store
 * Store global para gestionar outfits del usuario
 */

import { create } from 'zustand';
import type { Outfit, Garment, CreateOutfitDTO, UpdateOutfitDTO } from '@/types';
import * as outfitService from '@/services/outfitService';
import { useGarmentsStore } from '@/store/garmentsStore';
import { useAuthStore } from '@/store/authStore';

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
  loadOutfits: (userId: string, limit?: number) => Promise<void>;
  loadMoreOutfits: (userId: string) => Promise<void>;
  loadOutfitById: (id: string) => Promise<void>;
  createOutfit: (userId: string, data: CreateOutfitDTO, garments?: Garment[]) => Promise<Outfit | null>;
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
  isLoading: true,
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

    loadOutfits: async (userId: string, limit?: number) => {
      const signal = abortPrevious();
      set({ isLoading: true, error: null, page: 0, hasMore: false });

      const pageLimit = limit ?? DEFAULT_PAGE_LIMIT;
      const result = await outfitService.getOutfits(userId, pageLimit, 0, signal);

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
      set({ isLoading: true, error: null, currentOutfit: null });

      // Primero buscar en los outfits ya cargados (el listado ya trae prendas)
      const state = get();
      const existing = state.outfits.find((o) => o.id === id);
      if (existing) {
        console.log('🔍 [Store] loadOutfitById found in cache for id:', id, '- name:', existing.name);
        set({ currentOutfit: existing, isLoading: false });
        return;
      }

      console.log('🔍 [Store] loadOutfitById NOT in cache, fetching for id:', id);
      
      // Si no está en el store local, obtenerlo del listado general
      // (el BE no tiene GET /outfits/:id, usamos el mismo endpoint de lista)
      const userId = useAuthStore.getState().user?.id;
      if (!userId) {
        console.log('🔍 [Store] loadOutfitById ERROR: no userId available');
        set({ isLoading: false, error: 'User not authenticated' });
        return;
      }
      const result = await outfitService.getOutfits(userId, undefined, undefined, signal);
      
      if (signal.aborted) return;
      if (result.error) {
        console.log('🔍 [Store] loadOutfitById ERROR for id:', id, '-', result.error);
        set({ isLoading: false, error: result.error });
        return;
      }

      const outfit = (result.data || []).find((o) => o.id === id);
      if (outfit) {
        console.log('🔍 [Store] loadOutfitById found from list for id:', id, '- name:', outfit.name);
        set({ currentOutfit: outfit, isLoading: false });
      } else {
        console.log('🔍 [Store] loadOutfitById NOT FOUND for id:', id);
        set({ isLoading: false, error: 'Outfit not found' });
      }
    },

  createOutfit: async (userId: string, data: CreateOutfitDTO, garments?: Garment[]) => {
    set({ isLoading: true, error: null });
    
    const result = await outfitService.createOutfit(userId, data);
    
    if (result.error) {
      set({ isLoading: false, error: result.error });
      return null;
    }

    if (result.data) {
      // Usar las prendas pasadas desde la pantalla si están disponibles
      // (evita race condition con el store de garments)
      const outfitGarments = garments
        ? garments
        : useGarmentsStore.getState().garments.filter(
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
