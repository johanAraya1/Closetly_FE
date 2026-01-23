/**
 * useGarments Hook
 * Hook personalizado para manejar prendas
 */

import { useEffect } from 'react';
import { useGarmentsStore } from '@/store/garmentsStore';
import { useAuthStore } from '@/store/authStore';
import { useAuth } from './useAuth';

export const useGarments = (autoLoad: boolean = false) => {
  const { user } = useAuth();
  const token = useAuthStore((state) => state.token);
  const {
    garments,
    isLoading,
    error,
    loadGarments,
    getGarmentById,
    createGarment,
    updateGarment,
    deleteGarment,
    clearError,
    resetStore,
  } = useGarmentsStore();

  useEffect(() => {
    if (autoLoad && user && token) {
      loadGarments(user.id, token);
    }
  }, [user, token, autoLoad]);

  return {
    garments,
    isLoading,
    error,
    loadGarments,
    getGarmentById,
    createGarment,
    updateGarment,
    deleteGarment,
    clearError,
    resetStore,
  };
};
