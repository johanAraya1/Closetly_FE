/**
 * Auth Store
 * Store global para gestionar autenticación y sesión del usuario
 * Usando Zustand para state management
 * Con persistencia segura mediante SecureStore (cifrado por hardware)
 */

import { create } from 'zustand';
import type { User, Profile } from '@/types';
import * as authService from '@/services/authService';
import * as profileService from '@/services/profileService';
import { tokenService } from '@/services/tokenService';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  biometricEnabled: boolean;
  
  // Computed helpers
  isAdmin: () => boolean;
  
  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, username: string, fullName?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  loadSession: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<boolean>;
  clearError: () => void;
  refreshToken: () => Promise<boolean>;
  enableBiometric: () => Promise<void>;
  disableBiometric: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  isInitialized: false,
  biometricEnabled: false,

  // Computed helper
  isAdmin: () => {
    const state = get();
    return state.user?.role === 'admin';
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const result = await authService.login({ email, password });
      
      if (result.error) {
        set({ isLoading: false, error: result.error });
        return false;
      }

      if (result.data) {
        // Extraer tokens - el backend puede devolver diferentes formatos
        const accessToken = result.data.accessToken || result.data.token || (result.data as any).access_token;
        const refreshToken = result.data.refreshToken || (result.data as any).refresh_token || accessToken;
        
        if (!accessToken) {
          set({ 
            isLoading: false, 
            error: 'Error de autenticación: respuesta inválida del servidor' 
          });
          return false;
        }
        
        // Guardar tokens de forma segura (cifrado por hardware)
        await tokenService.saveTokens(accessToken, refreshToken);
        
        // Guardar datos de sesión
        await tokenService.saveSessionData(result.data.user, result.data.profile);
        
        // Si la biometría está habilitada, guardar credenciales en SecureStore
        const biometricEnabled = await tokenService.getBiometricEnabled();
        if (biometricEnabled) {
          await tokenService.saveBiometricCredentials(email, password);
        }
        
        set({
          user: result.data.user,
          profile: result.data.profile,
          token: accessToken,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        return true;
      }

      set({ isLoading: false, error: 'Respuesta inválida del servidor' });
      return false;
    } catch (error) {
      set({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Error inesperado al iniciar sesión' 
      });
      return false;
    }
  },

  register: async (email: string, password: string, username: string, fullName?: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const result = await authService.register({ 
        email, 
        password, 
        username, 
        fullName 
      });
      
      if (result.error) {
        set({ isLoading: false, error: result.error });
        return false;
      }

      if (result.data) {
        // Extraer tokens - el backend puede devolver diferentes formatos
        const accessToken = result.data.accessToken || result.data.token || (result.data as any).access_token;
        const refreshToken = result.data.refreshToken || (result.data as any).refresh_token || accessToken;
        
        if (!accessToken) {
          set({ 
            isLoading: false, 
            error: 'Error de autenticación: respuesta inválida del servidor' 
          });
          return false;
        }
        
        // Guardar tokens de forma segura (cifrado por hardware)
        await tokenService.saveTokens(accessToken, refreshToken);
        
        // Guardar datos de sesión
        await tokenService.saveSessionData(result.data.user, result.data.profile);
        
        // Si la biometría está habilitada, guardar credenciales en SecureStore
        const biometricEnabled = await tokenService.getBiometricEnabled();
        if (biometricEnabled) {
          await tokenService.saveBiometricCredentials(email, password);
        }
        
        set({
          user: result.data.user,
          profile: result.data.profile,
          token: accessToken,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        return true;
      }

      set({ isLoading: false, error: 'Respuesta inválida del servidor' });
      return false;
    } catch (error) {
      set({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Error inesperado al registrar' 
      });
      return false;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    
    // Limpiar tokens seguros y datos de sesión
    await tokenService.clearAll();
    
    // Llamar al backend para invalidar tokens
    await authService.logout();
    
    set({
      user: null,
      profile: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  },

  loadSession: async () => {
    set({ isLoading: true });
    
    try {
      // Verificar si hay una sesión guardada
      const hasSession = await tokenService.hasValidSession();
      
      if (!hasSession) {
        set({ 
          user: null, 
          profile: null,
          token: null,
          isAuthenticated: false, 
          isLoading: false,
          isInitialized: true,
        });
        return;
      }

      // Obtener token (se renueva automáticamente si expiró)
      const token = await tokenService.getAccessToken();
      
      if (!token) {
        // Token inválido o expirado sin posibilidad de refresh
        await tokenService.clearAll();
        set({ 
          user: null, 
          profile: null,
          token: null,
          isAuthenticated: false, 
          isLoading: false,
          isInitialized: true,
        });
        return;
      }

      // Obtener datos de sesión guardados
      const sessionData = await tokenService.getSessionData();
      
      if (!sessionData) {
        // No hay datos de sesión, limpiar todo
        await tokenService.clearAll();
        set({ 
          user: null, 
          profile: null,
          token: null,
          isAuthenticated: false, 
          isLoading: false,
          isInitialized: true,
        });
        return;
      }

      // Cargar preferencia biométrica
      const biometricEnabled = await tokenService.getBiometricEnabled();

      // Restaurar sesión
      set({
        user: sessionData.user,
        profile: sessionData.profile,
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        isInitialized: true,
        biometricEnabled,
      });

      // Si el perfil está vacío, intentar refrescarlo del backend
      if (!sessionData.profile?.username && sessionData.user?.id) {
        const { apiClient } = await import('@/utils/apiClient');
        const profileResult = await apiClient.get('/users/me', { timeout: 10000 });
        if (profileResult.data) {
          // Mapear camelCase del BE a snake_case que espera la FE
          const beProfile: any = profileResult.data;
          const mappedProfile = {
            id: beProfile.id || beProfile.userId,
            user_id: beProfile.userId || beProfile.id,
            username: beProfile.username || null,
            full_name: beProfile.fullName || beProfile.full_name || null,
            bio: beProfile.bio || null,
            avatar_url: beProfile.avatarUrl || beProfile.avatar_url || null,
            is_public: beProfile.isPublic ?? beProfile.is_public ?? false,
            created_at: beProfile.createdAt || beProfile.created_at || null,
            updated_at: beProfile.updatedAt || beProfile.updated_at || null,
          };
          set({ profile: mappedProfile });
          await tokenService.saveSessionData(sessionData.user, mappedProfile);
        }
      }
    } catch (error) {
      // Error al cargar sesión, limpiar todo
      await tokenService.clearAll();
      set({ 
        user: null, 
        profile: null,
        token: null,
        isAuthenticated: false, 
        isLoading: false,
        isInitialized: true,
        error: 'Error loading session',
      });
    }
  },

  refreshToken: async () => {
    try {
      const newToken = await tokenService.refreshAccessToken();
      
      if (newToken) {
        set({ token: newToken });
        return true;
      }
      
      // No se pudo renovar, cerrar sesión
      await get().logout();
      return false;
    } catch {
      await get().logout();
      return false;
    }
  },

  updateProfile: async (updates: Partial<Profile>) => {
    const { user, profile } = get();
    
    if (!user || !profile) {
      return false;
    }

    set({ isLoading: true, error: null });
    
    const result = await profileService.updateProfile(user.id, updates);
    
    if (result.error) {
      set({ isLoading: false, error: result.error });
      return false;
    }

    if (result.data) {
      // Mapear camelCase del BE a snake_case que espera la FE
      const beProfile: any = result.data;
      const mappedProfile = {
        id: beProfile.id || beProfile.userId,
        user_id: beProfile.userId || beProfile.id,
        username: beProfile.username || null,
        full_name: beProfile.fullName || beProfile.full_name || null,
        bio: beProfile.bio || null,
        avatar_url: beProfile.avatarUrl || beProfile.avatar_url || null,
        is_public: beProfile.isPublic ?? beProfile.is_public ?? false,
        created_at: beProfile.createdAt || beProfile.created_at || null,
        updated_at: beProfile.updatedAt || beProfile.updated_at || null,
      };

      set({ profile: mappedProfile, isLoading: false });

      // Persistir perfil actualizado en la sesión guardada
      const sessionData = await tokenService.getSessionData();
      if (sessionData?.user) {
        await tokenService.saveSessionData(sessionData.user, mappedProfile);
      }

      return true;
    }

    return false;
  },

  clearError: () => set({ error: null }),

  enableBiometric: async () => {
    await tokenService.setBiometricEnabled(true);
    set({ biometricEnabled: true });
  },

  disableBiometric: async () => {
    await tokenService.setBiometricEnabled(false);
    await tokenService.clearBiometricCredentials();
    set({ biometricEnabled: false });
  },
}));
