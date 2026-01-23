/**
 * Outfits Store
 * Store global para gestionar outfits del usuario
 */

import { create } from 'zustand';
import type { Outfit, CreateOutfitDTO, UpdateOutfitDTO } from '@/types';
import * as outfitService from '@/services/outfitService';

interface OutfitsState {
  outfits: Outfit[];
  currentOutfit: Outfit | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadOutfits: (userId: string) => Promise<void>;
  loadOutfitById: (id: string) => Promise<void>;
  createOutfit: (userId: string, data: CreateOutfitDTO) => Promise<Outfit | null>;
  updateOutfit: (id: string, updates: UpdateOutfitDTO) => Promise<boolean>;
  deleteOutfit: (id: string) => Promise<boolean>;
  toggleFavorite: (id: string, isFavorite: boolean) => Promise<boolean>;
  clearError: () => void;
  resetStore: () => void;
}

const initialState = {
  outfits: [],
  currentOutfit: null,
  isLoading: false,
  error: null,
};

export const useOutfitsStore = create<OutfitsState>((set, get) => ({
  ...initialState,

  loadOutfits: async (userId: string) => {
    set({ isLoading: true, error: null });
    
    const result = await outfitService.getOutfits(userId);
    
    if (result.error) {
      set({ isLoading: false, error: result.error });
      return;
    }

    if (result.data) {
      set({ outfits: result.data, isLoading: false });
    }
  },

  loadOutfitById: async (id: string) => {
    set({ isLoading: true, error: null });
    
    const result = await outfitService.getOutfitById(id);
    
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
      set((state) => ({
        outfits: [result.data!, ...state.outfits],
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
}));
