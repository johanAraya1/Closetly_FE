/**
 * Collections Store
 * Store global para gestionar colecciones del usuario
 */

import { create } from 'zustand';
import type { Collection, CreateCollectionDTO, UpdateCollectionDTO } from '@/types';
import * as collectionService from '@/services/collectionService';
import { clearCache, CACHE_KEYS } from '@/services/cacheService';

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
    await clearCache(CACHE_KEYS.COLLECTIONS);
    
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
    await clearCache(CACHE_KEYS.COLLECTIONS);
    
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
    await clearCache(CACHE_KEYS.COLLECTIONS);
    
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
    await clearCache(CACHE_KEYS.COLLECTIONS);
    
    const result = await collectionService.addOutfitToCollection(collectionId, outfitId);
    
    if (result.error) {
      set({ error: result.error });
      return false;
    }

    // Refresh currentCollection if we're viewing this collection
    const { currentCollection, collections } = get();
    if (currentCollection?.id === collectionId) {
      // Re-fetch full data to get the updated outfit list
      await get().loadCollectionById(collectionId, currentCollection.userId);
    }
    // Also refresh collections list
    if (collections.some(c => c.id === collectionId)) {
      await get().loadCollections(currentCollection?.userId || collections.find(c => c.id === collectionId)?.userId || '');
    }

    return true;
  },

  removeOutfitFromCollection: async (collectionId: string, outfitId: string) => {
    set({ error: null });
    await clearCache(CACHE_KEYS.COLLECTIONS);

    // Optimistic: remove from local state immediately
    const { currentCollection } = get();
    if (currentCollection?.id === collectionId && currentCollection.outfits) {
      set({
        currentCollection: {
          ...currentCollection,
          outfits: currentCollection.outfits.filter(o => o.id !== outfitId),
        },
      });
    }
    
    const result = await collectionService.removeOutfitFromCollection(collectionId, outfitId);
    
    if (result.error) {
      set({ error: result.error });
      // Rollback: re-fetch to restore
      if (currentCollection?.id === collectionId) {
        await get().loadCollectionById(collectionId, currentCollection.userId);
      }
      return false;
    }

    // Re-fetch to ensure data consistency
    if (currentCollection?.id === collectionId) {
      await get().loadCollectionById(collectionId, currentCollection.userId);
    }

    return true;
  },

  clearError: () => set({ error: null }),
  
  resetStore: () => set(initialState),
}));
