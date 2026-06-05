/**
 * Auth Service
 * Servicio para manejar autenticación y autorización
 * Hace llamadas HTTP al backend
 */

import { API_URL } from '@/lib/constants';
import type { 
  LoginCredentials, 
  RegisterCredentials, 
  AuthResponse,
  ApiResponse,
  User,
  Profile 
} from '@/types';

/**
 * Inicia sesión con email y password
 */
export const login = async (credentials: LoginCredentials): Promise<ApiResponse<AuthResponse>> => {
  try {
    // Rate limiting: 5 intentos por 15 minutos
    const { rateLimiter } = await import('@/utils/rateLimit');
    const rateCheck = rateLimiter.check(`login:${credentials.email}`, {
      maxAttempts: 5,
      windowMs: 15 * 60 * 1000,
      blockDurationMs: 30 * 60 * 1000,
    });

    if (!rateCheck.allowed) {
      const errorMsg = rateCheck.blockedUntil
        ? `Demasiados intentos fallidos. Intenta de nuevo después de ${rateCheck.blockedUntil.toLocaleTimeString()}`
        : `Demasiados intentos. ${rateCheck.remainingAttempts} restantes.`;
      return { error: errorMsg };
    }

    const { fetchWithTimeout } = await import('@/utils/fetchUtils');
    const response = await fetchWithTimeout(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
      timeout: 10000,
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || 'Login failed' };
    }

    return { data };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
};

/**
 * Registra un nuevo usuario
 */
export const register = async (credentials: RegisterCredentials): Promise<ApiResponse<AuthResponse>> => {
  try {
    // Rate limiting: 3 intentos por hora
    const { rateLimiter } = await import('@/utils/rateLimit');
    const rateCheck = rateLimiter.check(`register:${credentials.email}`, {
      maxAttempts: 3,
      windowMs: 60 * 60 * 1000,
      blockDurationMs: 60 * 60 * 1000,
    });

    if (!rateCheck.allowed) {
      return { error: 'Demasiados intentos de registro. Intenta más tarde.' };
    }

    const normalizedFullName =
      credentials.fullName?.trim() ||
      credentials.username?.trim() ||
      credentials.email.split('@')[0];

    const payload = {
      ...credentials,
      fullName: normalizedFullName,
    };

    const { fetchWithTimeout } = await import('@/utils/fetchUtils');

    const response = await fetchWithTimeout(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      timeout: 10000,
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || data.message || 'Registration failed' };
    }

    return { data };
  } catch (error) {
    console.error('Register error:', error);
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
};

/**
 * Cierra la sesión del usuario
 */
export const logout = async (): Promise<ApiResponse<void>> => {
  // Logout solo limpia el estado local, sin llamadas al backend
  return { data: undefined };
};

/**
 * Obtiene el usuario actual
 */
export const getCurrentUser = async (): Promise<ApiResponse<User>> => {
  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || 'Failed to get user' };
    }

    return { data: data.user };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
};

/**
 * Resetea la contraseña del usuario
 */
export const resetPassword = async (email: string): Promise<ApiResponse<void>> => {
  try {
    const response = await fetch(`${API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const data = await response.json();
      return { error: data.error || 'Password reset failed' };
    }

    return { data: undefined };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
};
