/**
 * useAuth Hook
 * Hook personalizado para manejar autenticación
 */

import { useAuthStore } from '@/store/authStore';

export const useAuth = () => {
  const {
    user,
    profile,
    isAuthenticated,
    isLoading,
    error,
    isInitialized,
    isAdmin,
    login,
    register,
    logout,
    loadSession,
    updateProfile,
    clearError,
    refreshToken,
  } = useAuthStore();

  return {
    user,
    profile,
    isAuthenticated,
    isLoading,
    error,
    isInitialized,
    isAdmin: isAdmin(),
    login,
    register,
    logout,
    loadSession,
    updateProfile,
    clearError,
    refreshToken,
  };
};
