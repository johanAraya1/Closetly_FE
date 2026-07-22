/**
 * API Client
 * Cliente centralizado para todas las llamadas a la API
 * Evita duplicación de código en servicios
 */

import { API_URL } from '@/lib/constants';
import { tokenService } from '@/services/tokenService';
import { fetchWithTimeout } from './fetchUtils';
import type { ApiResponse } from '@/types';

interface ApiRequestOptions extends RequestInit {
  timeout?: number;
  requiresAuth?: boolean;
  token?: string; // Token opcional para casos especiales
  signal?: AbortSignal; // Señal externa para cancelación
  maxRetries?: number; // Número máximo de reintentos
  retryDelay?: number; // Delay inicial entre reintentos (ms)
}

/**
 * Espera con backoff exponencial
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fuerza logout cuando la sesión expiró completamente
 * (sin refresh token viable). Se importa lazy para evitar
 * circular dependencies con authStore → authService → apiClient.
 */
async function forceLogoutOnAuthFailure(): Promise<void> {
  try {
    const { useAuthStore } = await import('@/store/authStore');
    const store = useAuthStore.getState();
    if (store.isAuthenticated) {
      await store.logout();
    }
  } catch {
    // Si falla el import, no podemos hacer mucho — el próximo
    // request con 401/403 también lo intentará
  }
}

/**
 * Calcula el delay con backoff exponencial
 */
const getRetryDelay = (attempt: number, baseDelay: number): number => {
  return baseDelay * Math.pow(2, attempt);
};

/**
 * Cliente API centralizado con autenticación automática
 * Maneja tokens, headers y errores de forma consistente
 */
export const apiClient = {
  /**
   * Realiza una petición GET autenticada
   */
  async get<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  },

  /**
   * Realiza una petición POST autenticada
   */
  async post<T>(endpoint: string, data?: any, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  /**
   * Realiza una petición PUT autenticada
   */
  async put<T>(endpoint: string, data?: any, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  /**
   * Realiza una petición PATCH autenticada
   */
  async patch<T>(endpoint: string, data?: any, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  /**
   * Realiza una petición DELETE autenticada
   */
  async delete<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  },

  /**
   * Método base para todas las peticiones
   * Centraliza: autenticación, headers, timeout, manejo de errores
   * Incluye retry automático con backoff exponencial
   */
  async request<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    const {
      timeout = 15000,
      requiresAuth = true,
      token: providedToken,
      headers: customHeaders,
      body,
      maxRetries = 3,
      retryDelay = 1000,
      ...fetchOptions
    } = options;

    let lastError: Error | null = null;

    // Reintentar con backoff exponencial
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Obtener token si se requiere autenticación
        let token: string | undefined = providedToken;
        if (requiresAuth && !token) {
          const accessToken = await tokenService.getAccessToken();
          if (!accessToken) {
            // Sesión expirada sin posibilidad de refresh → logout forzado
            await forceLogoutOnAuthFailure();
            return { error: 'No authentication token' };
          }
          token = accessToken;
        }

        // Construir headers
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          ...(customHeaders as Record<string, string>),
        };

        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        // Realizar petición
        const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;
        const response = await fetchWithTimeout(url, {
          ...fetchOptions,
          headers,
          body,
          timeout,
        });

        // Manejar respuesta
        if (!response.ok) {
          // 401/403: Token inválido/expirado → logout inmediato
          if (response.status === 401 || response.status === 403) {
            await forceLogoutOnAuthFailure();
            return { error: 'Sesión expirada' };
          }
          // No reintentar errores 4xx (client errors)
          if (response.status >= 400 && response.status < 500) {
            try {
              const errorData = await response.json();
              // Intentar obtener el mensaje del error desde diferentes formatos
              const errorMessage = errorData.message || errorData.error || `Error ${response.status}`;
              return { error: errorMessage };
            } catch {
              // Si no se puede parsear como JSON, usar texto plano o statusText
              return { error: response.statusText || `Error ${response.status}` };
            }
          }

          // Reintentar errores 5xx (server errors)
          throw new Error(`Server error: ${response.status}`);
        }

        // Parsear respuesta JSON
        const result = await response.json();
        return { data: result.data || result };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        // Si es el último intento, retornar error
        if (attempt === maxRetries) {
          break;
        }

        // Esperar antes del siguiente intento (backoff exponencial)
        const delay = getRetryDelay(attempt, retryDelay);
        await sleep(delay);
      }
    }

    return {
      error: lastError?.message || 'Unknown error',
    };
  },

  /**
   * Sube un archivo (FormData)
   * Para avatares, imágenes de prendas, etc.
   */
  async upload<T>(
    endpoint: string,
    formData: FormData,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    try {
      const { timeout = 30000, token: providedToken } = options;

      // Obtener token
      const token = providedToken || await tokenService.getAccessToken();
      if (!token) {
        // Sesión expirada sin posibilidad de refresh → logout forzado
        await forceLogoutOnAuthFailure();
        return { error: 'No authentication token' };
      }

      // Headers (NO incluir Content-Type para FormData)
      const headers: HeadersInit = {
        'Authorization': `Bearer ${token}`,
      };

      // Realizar petición
      const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;
      const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers,
        body: formData,
        timeout,
      });

      if (!response.ok) {
        // 401/403: Token inválido/expirado → logout inmediato
        if (response.status === 401 || response.status === 403) {
          await forceLogoutOnAuthFailure();
          return { error: 'Sesión expirada' };
        }
        return { error: `Error al subir archivo (${response.status})` };
      }

      const result = await response.json();
      return { data: result.data || result };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
};
