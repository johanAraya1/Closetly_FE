/**
 * Garments Store
 * Store global para gestionar prendas del usuario
 */

import { create } from 'zustand';
import type { Garment, CreateGarmentDTO, UpdateGarmentDTO } from '@/types';
import * as garmentService from '@/services/garmentService';

const DEFAULT_PAGE_LIMIT = 20;

interface GarmentsState {
  garments: Garment[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  page: number;
  total: number;
  error: string | null;
  
  // Actions
  loadGarments: (userId: string, token?: string) => Promise<void>;
  loadMoreGarments: (userId: string, token?: string) => Promise<void>;
  getGarmentById: (id: string) => Garment | undefined;
  createGarment: (userId: string, data: CreateGarmentDTO, token?: string) => Promise<Garment | null>;
  updateGarment: (id: string, updates: UpdateGarmentDTO, token?: string) => Promise<boolean>;
  deleteGarment: (id: string, token?: string) => Promise<boolean>;
  clearError: () => void;
  resetStore: () => void;
  cancelRequests: () => void;
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

export const useGarmentsStore = create<GarmentsState>((set, get) => {
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

    loadGarments: async (userId: string, token?: string) => {
      const signal = abortPrevious();
      set({ isLoading: true, error: null, page: 0, hasMore: false });
      
      const result = await garmentService.getGarments(userId, token, DEFAULT_PAGE_LIMIT, 0, signal);
      
      if (signal.aborted) return;
      if (result.error) {
        set({ isLoading: false, error: result.error });
        return;
      }

      if (result.data) {
        set({
          garments: result.data,
          isLoading: false,
          total: result.total ?? result.data.length,
          hasMore: result.hasMore ?? false,
          page: 1,
        });
      }
    },

    loadMoreGarments: async (userId: string, token?: string) => {
      const { isLoadingMore, hasMore, page } = get();
      if (isLoadingMore || !hasMore) return;

      const signal = abortPrevious();
      set({ isLoadingMore: true });

      const offset = page * DEFAULT_PAGE_LIMIT;
      const result = await garmentService.getGarments(userId, token, DEFAULT_PAGE_LIMIT, offset, signal);

      if (signal.aborted) return;
      if (result.error) {
        set({ isLoadingMore: false, error: result.error });
        return;
      }

      if (result.data) {
        set((state) => ({
          garments: [...state.garments, ...result.data!],
          isLoadingMore: false,
          total: result.total ?? state.total,
          hasMore: result.hasMore ?? false,
          page: state.page + 1,
        }));
      }
    },

  getGarmentById: (id: string) => {
    const { garments } = get();
    return garments.find((g) => g.id === id);
  },

  createGarment: async (userId: string, data: CreateGarmentDTO, token?: string) => {
    // Optimistic update: agregar prenda temporal
    const tempId = `temp-${Date.now()}`;
    const optimisticGarment: Garment = {
      id: tempId,
      userId: userId,
      name: data.name,
      category: data.category,
      brand: data.brand,
      color: data.color,
      season: data.season,
      imageUrl: data.imageUrl || '',
      notes: data.notes,
      isPublic: data.isPublic ?? false,
      listingType: data.isPublic && data.listingType ? data.listingType : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set((state) => ({
      garments: [optimisticGarment, ...state.garments],
      isLoading: true,
      error: null,
    }));
    
    const result = await garmentService.createGarment(userId, data, token);
    
    if (result.error) {
      // Rollback: eliminar prenda temporal
      set((state) => ({
        garments: state.garments.filter((g) => g.id !== tempId),
        isLoading: false,
        error: result.error,
      }));
      return null;
    }

    if (result.data) {
      // Reemplazar prenda temporal con la real
      set((state) => ({
        garments: state.garments.map((g) =>
          g.id === tempId ? result.data! : g
        ),
        isLoading: false,
      }));
      return result.data;
    }

    return null;
  },

  updateGarment: async (id: string, updates: UpdateGarmentDTO, token?: string) => {
    set({ isLoading: true, error: null });
    
    const result = await garmentService.updateGarment(id, updates, token);
    
    if (result.error) {
      set({ isLoading: false, error: result.error });
      return false;
    }

    if (result.data) {
      set((state) => ({
        garments: state.garments.map((g) =>
          g.id === id ? result.data! : g
        ),
        isLoading: false,
      }));
      return true;
    }

    return false;
  },

  deleteGarment: async (id: string, token?: string) => {
    // Optimistic update: eliminar inmediatamente
    const { garments } = get();
    const deletedGarment = garments.find((g) => g.id === id);
    
    set((state) => ({
      garments: state.garments.filter((g) => g.id !== id),
      isLoading: true,
      error: null,
    }));
    
    const result = await garmentService.deleteGarment(id, token);
    
    if (result.error) {
      // Rollback: restaurar prenda eliminada
      if (deletedGarment) {
        set((state) => ({
          garments: [...state.garments, deletedGarment],
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

  clearError: () => set({ error: null }),
  
  resetStore: () => set(initialState),
  };
});
