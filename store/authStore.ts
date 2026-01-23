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
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  isInitialized: false,

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
          console.error('Backend response missing token:', result.data);
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
      console.error('Error in login:', error);
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
          console.error('Backend response missing token:', result.data);
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
      console.error('Error in register:', error);
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

      // Restaurar sesión
      set({
        user: sessionData.user,
        profile: sessionData.profile,
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        isInitialized: true,
      });
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
      set({ profile: result.data, isLoading: false });
      return true;
    }

    return false;
  },

  clearError: () => set({ error: null }),
}));
