/**
 * useAdmin Hook
 * Hook para verificar permisos de administrador y helpers
 */

import { useAuthStore } from '@/store/authStore';

export const useAdmin = () => {
  const user = useAuthStore((state) => state.user);
  const isAdmin = useAuthStore((state) => state.isAdmin);

  return {
    isAdmin: isAdmin(),
    user,
    role: user?.role || 'user',
  };
};
