/**
 * useOutfits Hook
 * Hook personalizado para manejar outfits
 * Cancela requests en vuelo al desmontar para evitar setState tras unmount
 */

import { useEffect, useRef } from 'react';
import { useOutfitsStore } from '@/store/outfitsStore';
import { useAuth } from './useAuth';

export const useOutfits = (autoLoad: boolean = false, limit?: number) => {
  const { user } = useAuth();
  const hasLoadedRef = useRef(false);
  const {
    outfits,
    currentOutfit,
    isLoading,
    isLoadingMore,
    hasMore,
    total,
    error,
    loadOutfits,
    loadMoreOutfits,
    loadOutfitById,
    createOutfit,
    updateOutfit,
    deleteOutfit,
    toggleFavorite,
    clearError,
    resetStore,
    cancelRequests,
  } = useOutfitsStore();

  useEffect(() => {
    if (autoLoad && user?.id && !hasLoadedRef.current) {
      loadOutfits(user.id, limit);
      hasLoadedRef.current = true;
    }

    return () => {
      cancelRequests();
    };
  }, [user?.id, autoLoad, limit]);

  return {
    outfits,
    currentOutfit,
    isLoading,
    isLoadingMore,
    hasMore,
    total,
    error,
    loadOutfits,
    loadMoreOutfits,
    loadOutfitById,
    createOutfit,
    updateOutfit,
    deleteOutfit,
    toggleFavorite,
    clearError,
    resetStore,
  };
};
