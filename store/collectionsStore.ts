/**
 * Collections Store
 * Store global para gestionar colecciones del usuario
 */

import { create } from 'zustand';
import type { Collection, CreateCollectionDTO, UpdateCollectionDTO } from '@/types';
import * as collectionService from '@/services/collectionService';

interface CollectionsState {
  collections: Collection[];
  currentCollection: Collection | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadCollections: (userId: string) => Promise<void>;
  loadCollectionById: (id: string, userId: string) => Promise<void>;
  createCollection: (userId: string, data: CreateCollectionDTO) => Promise<Collection | null>;
  updateCollection: (id: string, updates: UpdateCollectionDTO) => Promise<boolean>;
  deleteCollection: (id: string) => Promise<boolean>;
  addOutfitToCollection: (collectionId: string, outfitId: string) => Promise<boolean>;
  removeOutfitFromCollection: (collectionId: string, outfitId: string) => Promise<boolean>;
  clearError: () => void;
  resetStore: () => void;
}

const initialState = {
  collections: [],
  currentCollection: null,
  isLoading: false,
  error: null,
};

export const useCollectionsStore = create<CollectionsState>((set, get) => ({
  ...initialState,

  loadCollections: async (userId: string) => {
    set({ isLoading: true, error: null });
    
    const result = await collectionService.getCollections(userId);
    
    if (result.error) {
      set({ isLoading: false, error: result.error });
      return;
    }

    if (result.data) {
      set({ collections: result.data, isLoading: false });
    }
  },

  loadCollectionById: async (id: string, userId: string) => {
    set({ isLoading: true, error: null });
    
    const result = await collectionService.getCollectionById(id, userId);
    
    if (result.error) {
      set({ isLoading: false, error: result.error });
      return null;
    }

    if (result.data) {
      set({ currentCollection: result.data, isLoading: false });
      return result.data;
    }
    
    return null;
  },

  createCollection: async (userId: string, data: CreateCollectionDTO) => {
    set({ isLoading: true, error: null });
    
    const result = await collectionService.createCollection(userId, data);
    
    if (result.error) {
      set({ isLoading: false, error: result.error });
      return null;
    }

    if (result.data) {
      // Recargar colecciones para obtener los outfits correctamente poblados
      await get().loadCollections(userId);
      return result.data;
    }

    return null;
  },

  updateCollection: async (id: string, updates: UpdateCollectionDTO) => {
    set({ isLoading: true, error: null });
    
    const result = await collectionService.updateCollection(id, updates);
    
    if (result.error) {
      set({ isLoading: false, error: result.error });
      return false;
    }

    if (result.data) {
      set((state) => ({
        collections: state.collections.map((c) =>
          c.id === id ? result.data! : c
        ),
        currentCollection: state.currentCollection?.id === id ? result.data : state.currentCollection,
        isLoading: false,
      }));
      return true;
    }

    return false;
  },

  deleteCollection: async (id: string) => {
    // Optimistic update: eliminar inmediatamente
    const { collections } = get();
    const deletedCollection = collections.find((c) => c.id === id);
    
    set((state) => ({
      collections: state.collections.filter((c) => c.id !== id),
      currentCollection: state.currentCollection?.id === id ? null : state.currentCollection,
      isLoading: true,
      error: null,
    }));
    
    const result = await collectionService.deleteCollection(id);
    
    if (result.error) {
      // Rollback: restaurar colección eliminada
      if (deletedCollection) {
        set((state) => ({
          collections: [...state.collections, deletedCollection],
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

  addOutfitToCollection: async (collectionId: string, outfitId: string) => {
    set({ error: null });
    
    const result = await collectionService.addOutfitToCollection(collectionId, outfitId);
    
    if (result.error) {
      set({ error: result.error });
      return false;
    }

    return true;
  },

  removeOutfitFromCollection: async (collectionId: string, outfitId: string) => {
    set({ error: null });
    
    const result = await collectionService.removeOutfitFromCollection(collectionId, outfitId);
    
    if (result.error) {
      set({ error: result.error });
      return false;
    }

    return true;
  },

  clearError: () => set({ error: null }),
  
  resetStore: () => set(initialState),
}));
