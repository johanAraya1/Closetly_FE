/**
 * Token Service
 * Servicio para manejo seguro de tokens de autenticación
 * Usa SecureStore (cifrado por hardware) en móvil y AsyncStorage en web
 */

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/lib/constants';

// Keys para almacenamiento (sin @ porque SecureStore solo acepta alfanuméricos, ".", "-", "_")
const ACCESS_TOKEN_KEY = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
const TOKEN_EXPIRY_KEY = 'auth_token_expiry';
const USER_KEY = 'auth_user';
const PROFILE_KEY = 'auth_profile';
const BIOMETRIC_KEY = 'auth_biometric_enabled';
const BIOMETRIC_EMAIL_KEY = 'auth_biometric_email';
const BIOMETRIC_PASSWORD_KEY = 'auth_biometric_password';

// Configuración de tokens
const ACCESS_TOKEN_DURATION = 15 * 60 * 1000; // 15 minutos
const REFRESH_TOKEN_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 días

interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface SessionData {
  user: any;
  profile: any;
}

/**
 * Storage wrapper que usa SecureStore en móvil y AsyncStorage en web
 */
const storage = {
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED,
      });
    }
  },

  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return await AsyncStorage.getItem(key);
    } else {
      return await SecureStore.getItemAsync(key);
    }
  },

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};

export const tokenService = {
  /**
   * Guarda tokens de forma segura con cifrado de hardware (móvil) o AsyncStorage (web)
   */
  async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    if (!accessToken) {
      console.error('Attempting to save null/undefined accessToken');
      throw new Error('Access token is required');
    }
    
    const expiryTime = Date.now() + ACCESS_TOKEN_DURATION;
    
    try {
      await Promise.all([
        storage.setItem(ACCESS_TOKEN_KEY, accessToken),
        storage.setItem(REFRESH_TOKEN_KEY, refreshToken || accessToken),
        storage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString()),
      ]);
    } catch (error) {
      console.error('Error saving tokens:', error);
      throw new Error('Failed to save authentication tokens');
    }
  },

  /**
   * Guarda datos de sesión (user y profile)
   */
  async saveSessionData(user: any, profile: any): Promise<void> {
    if (!user) {
      console.error('Attempting to save null/undefined user');
      throw new Error('User data is required');
    }
    
    try {
      await Promise.all([
        storage.setItem(USER_KEY, JSON.stringify(user)),
        storage.setItem(PROFILE_KEY, JSON.stringify(profile || {})),
      ]);
    } catch (error) {
      console.error('Error saving session data:', error);
      throw new Error('Failed to save session data');
    }
  },

  /**
   * Obtiene el access token actual
   * Si está expirado, intenta renovarlo automáticamente con el refresh token
   */
  async getAccessToken(): Promise<string | null> {
    try {
      const token = await storage.getItem(ACCESS_TOKEN_KEY);
      const expiryStr = await storage.getItem(TOKEN_EXPIRY_KEY);
      
      if (!token || !expiryStr) {
        // Token no existe (ej: post-logout con biometría) — intentar
        // con refresh token directamente
        const refreshToken = await storage.getItem(REFRESH_TOKEN_KEY);
        if (refreshToken) {
          return await this.refreshAccessToken();
        }
        return null;
      }
      
      const expiry = parseInt(expiryStr, 10);
      
      // Si el token aún es válido, retornarlo
      if (Date.now() < expiry) {
        return token;
      }
      
      // Token expirado, intentar renovar
      return await this.refreshAccessToken();
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  },

  /**
   * Renueva el access token usando el refresh token
   */
  async refreshAccessToken(): Promise<string | null> {
    try {
      const refreshToken = await storage.getItem(REFRESH_TOKEN_KEY);
      
      if (!refreshToken) {
        return null;
      }
      
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${refreshToken}`,
        },
      });
      
      if (!response.ok) {
        // Refresh token inválido o expirado, limpiar todo
        await this.clearAll();
        return null;
      }
      
      const data = await response.json();
      const { accessToken, refreshToken: newRefreshToken } = data;
      
      // Guardar nuevos tokens
      await this.saveTokens(accessToken, newRefreshToken || refreshToken);
      
      return accessToken;
    } catch (error) {
      console.error('Error refreshing token:', error);
      await this.clearAll();
      return null;
    }
  },

  /**
   * Obtiene el refresh token
   */
  async getRefreshToken(): Promise<string | null> {
    try {
      return await storage.getItem(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Error getting refresh token:', error);
      return null;
    }
  },

  /**
   * Obtiene los datos de sesión guardados
   */
  async getSessionData(): Promise<SessionData | null> {
    try {
      const userStr = await storage.getItem(USER_KEY);
      const profileStr = await storage.getItem(PROFILE_KEY);
      
      if (!userStr || !profileStr) {
        return null;
      }
      
      return {
        user: JSON.parse(userStr),
        profile: JSON.parse(profileStr),
      };
    } catch (error) {
      console.error('Error getting session data:', error);
      return null;
    }
  },

  /**
   * Verifica si hay una sesión válida
   */
  async hasValidSession(): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      return token !== null;
    } catch {
      return false;
    }
  },

  /**
   * Limpia todos los datos de autenticación
   */
  async clearAll(): Promise<void> {
    try {
      const biometricEnabled = await this.getBiometricEnabled();
      const items = [
        storage.removeItem(ACCESS_TOKEN_KEY),
        storage.removeItem(REFRESH_TOKEN_KEY),
        storage.removeItem(TOKEN_EXPIRY_KEY),
        storage.removeItem(USER_KEY),
        storage.removeItem(PROFILE_KEY),
      ];

      // Si la huella está activada y hay sesión guardada, sacar solo
      // access token (expirado) pero dejar refresh token + user para
      // que el login con huella pueda restaurar la sesión.
      if (biometricEnabled) {
        await storage.removeItem(ACCESS_TOKEN_KEY);
        await storage.removeItem(TOKEN_EXPIRY_KEY);
        return;
      }

      await Promise.all(items);
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  },

  /**
   * Verifica si el access token ha expirado
   */
  async isTokenExpired(): Promise<boolean> {
    try {
      const expiryStr = await storage.getItem(TOKEN_EXPIRY_KEY);
      
      if (!expiryStr) {
        return true;
      }
      
      const expiry = parseInt(expiryStr, 10);
      return Date.now() >= expiry;
    } catch {
      return true;
    }
  },

  /**
   * Obtiene información sobre el token (para debugging)
   */
  async getTokenInfo(): Promise<{ hasToken: boolean; isExpired: boolean; expiresIn?: number }> {
    try {
      const hasToken = (await storage.getItem(ACCESS_TOKEN_KEY)) !== null;
      const expiryStr = await storage.getItem(TOKEN_EXPIRY_KEY);
      
      if (!hasToken || !expiryStr) {
        return { hasToken: false, isExpired: true };
      }
      
      const expiry = parseInt(expiryStr, 10);
      const now = Date.now();
      const isExpired = now >= expiry;
      const expiresIn = Math.max(0, Math.floor((expiry - now) / 1000));
      
      return { hasToken, isExpired, expiresIn };
    } catch {
      return { hasToken: false, isExpired: true };
    }
  },

  /**
   * Intenta restaurar sesión vía refresh token (flujo biométrico).
   * No usa hasValidSession ni clearAll — va directo al grano.
   * Retorna el nuevo accessToken si funciona, null si no.
   */
  async biometricRefresh(): Promise<{ token: string; session: SessionData } | null> {
    try {
      const refreshToken = await storage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) return null;

      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${refreshToken}`,
        },
      });

      if (!res.ok) return null;

      const data = await res.json();
      const { accessToken, refreshToken: newRefreshToken } = data;

      if (!accessToken) return null;

      // Guardar nuevos tokens
      await this.saveTokens(accessToken, newRefreshToken || refreshToken);

      // Recuperar datos de sesión guardados
      const session = await this.getSessionData();
      if (!session) return null;

      return { token: accessToken, session };
    } catch {
      return null;
    }
  },

  /**
   * Guarda las credenciales del usuario en SecureStore para login biométrico.
   * SOLO se guardan si el usuario habilitó la huella digital.
   * SecureStore usa cifrado por hardware (Keychain/Keystore).
   */
  async saveBiometricCredentials(email: string, password: string): Promise<void> {
    try {
      await Promise.all([
        storage.setItem(BIOMETRIC_EMAIL_KEY, email),
        storage.setItem(BIOMETRIC_PASSWORD_KEY, password),
      ]);
    } catch (error) {
      console.error('Error saving biometric credentials:', error);
    }
  },

  /**
   * Recupera las credenciales guardadas para login biométrico.
   */
  async getBiometricCredentials(): Promise<{ email: string; password: string } | null> {
    try {
      const [email, password] = await Promise.all([
        storage.getItem(BIOMETRIC_EMAIL_KEY),
        storage.getItem(BIOMETRIC_PASSWORD_KEY),
      ]);
      if (!email || !password) return null;
      return { email, password };
    } catch (error) {
      console.error('Error getting biometric credentials:', error);
      return null;
    }
  },

  /**
   * Elimina las credenciales guardadas (al deshabilitar huella o cerrar sesión).
   */
  async clearBiometricCredentials(): Promise<void> {
    try {
      await Promise.all([
        storage.removeItem(BIOMETRIC_EMAIL_KEY),
        storage.removeItem(BIOMETRIC_PASSWORD_KEY),
      ]);
    } catch (error) {
      console.error('Error clearing biometric credentials:', error);
    }
  },

  /**
   * Guarda o remueve la preferencia de ingreso biométrico
   */
  async setBiometricEnabled(enabled: boolean): Promise<void> {
    try {
      if (enabled) {
        await storage.setItem(BIOMETRIC_KEY, 'true');
      } else {
        await storage.removeItem(BIOMETRIC_KEY);
      }
    } catch (error) {
      console.error('Error saving biometric preference:', error);
    }
  },

  /**
   * Obtiene si el ingreso biométrico está habilitado
   */
  async getBiometricEnabled(): Promise<boolean> {
    try {
      const value = await storage.getItem(BIOMETRIC_KEY);
      return value === 'true';
    } catch {
      return false;
    }
  },
};
