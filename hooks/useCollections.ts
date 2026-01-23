/**
 * useCollections Hook
 * Hook personalizado para manejar colecciones
 */

import { useEffect } from 'react';
import { useCollectionsStore } from '@/store/collectionsStore';
import { useAuth } from './useAuth';

export const useCollections = (autoLoad: boolean = true) => {
  const { user } = useAuth();
  const {
    collections,
    currentCollection,
    isLoading,
    error,
    loadCollections,
    loadCollectionById,
    createCollection,
    updateCollection,
    deleteCollection,
    addOutfitToCollection,
    removeOutfitFromCollection,
    clearError,
    resetStore,
  } = useCollectionsStore();

  useEffect(() => {
    if (autoLoad && user) {
      loadCollections(user.id);
    }
  }, [user, autoLoad]);

  return {
    collections,
    currentCollection,
    isLoading,
    error,
    loadCollections,
    loadCollectionById,
    createCollection,
    updateCollection,
    deleteCollection,
    addOutfitToCollection,
    removeOutfitFromCollection,
    clearError,
    resetStore,
  };
};
