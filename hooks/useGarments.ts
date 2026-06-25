/**
 * useGarments Hook
 * Hook personalizado para manejar prendas
 * Cancela requests en vuelo al desmontar para evitar setState tras unmount
 */

import { useEffect } from 'react';
import { useGarmentsStore } from '@/store/garmentsStore';
import { useAuthStore } from '@/store/authStore';
import { useAuth } from './useAuth';

export const useGarments = (autoLoad: boolean = false, limit?: number) => {
  const { user } = useAuth();
  const token = useAuthStore((state) => state.token);
  const {
    garments,
    isLoading,
    isLoadingMore,
    hasMore,
    total,
    error,
    loadGarments,
    loadMoreGarments,
    getGarmentById,
    createGarment,
    updateGarment,
    deleteGarment,
    clearError,
    resetStore,
    cancelRequests,
  } = useGarmentsStore();

  useEffect(() => {
    if (autoLoad && user && token) {
      loadGarments(user.id, token, limit);
    }

    return () => {
      cancelRequests();
    };
  }, [user, token, autoLoad, limit]);

  return {
    garments,
    isLoading,
    isLoadingMore,
    hasMore,
    total,
    error,
    loadGarments,
    loadMoreGarments,
    getGarmentById,
    createGarment,
    updateGarment,
    deleteGarment,
    clearError,
    resetStore,
  };
};
