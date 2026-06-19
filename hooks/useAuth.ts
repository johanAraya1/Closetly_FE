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
    biometricEnabled,
    isAdmin,
    login,
    register,
    logout,
    loadSession,
    updateProfile,
    clearError,
    refreshToken,
    enableBiometric,
    disableBiometric,
  } = useAuthStore();

  return {
    user,
    profile,
    isAuthenticated,
    isLoading,
    error,
    isInitialized,
    biometricEnabled,
    isAdmin: isAdmin(),
    login,
    register,
    logout,
    loadSession,
    updateProfile,
    clearError,
    refreshToken,
    enableBiometric,
    disableBiometric,
  };
};
