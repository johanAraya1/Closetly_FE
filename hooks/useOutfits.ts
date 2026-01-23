/**
 * useOutfits Hook
 * Hook personalizado para manejar outfits
 */

import { useEffect, useRef } from 'react';
import { useOutfitsStore } from '@/store/outfitsStore';
import { useAuth } from './useAuth';

export const useOutfits = (autoLoad: boolean = false) => {
  const { user } = useAuth();
  const hasLoadedRef = useRef(false);
  const {
    outfits,
    currentOutfit,
    isLoading,
    error,
    loadOutfits,
    loadOutfitById,
    createOutfit,
    updateOutfit,
    deleteOutfit,
    toggleFavorite,
    clearError,
    resetStore,
  } = useOutfitsStore();

  useEffect(() => {
    if (autoLoad && user?.id && !hasLoadedRef.current) {
      loadOutfits(user.id);
      hasLoadedRef.current = true;
    }
  }, [user?.id, autoLoad]);

  return {
    outfits,
    currentOutfit,
    isLoading,
    error,
    loadOutfits,
    loadOutfitById,
    createOutfit,
    updateOutfit,
    deleteOutfit,
    toggleFavorite,
    clearError,
    resetStore,
  };
};
