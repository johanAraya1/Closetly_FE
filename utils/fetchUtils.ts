/**
 * Fetch Utils
 * Utilidades para requests con timeout y mejor manejo de errores
 */

interface FetchWithTimeoutOptions extends RequestInit {
  timeout?: number; // milisegundos
  signal?: AbortSignal; // señal externa para cancelación
}

/**
 * Fetch con timeout automático y soporte para cancelación externa
 * Previene requests que se cuelgan indefinidamente
 */
export const fetchWithTimeout = async (
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> => {
  const { timeout = 10000, signal: externalSignal, ...fetchOptions } = options; // Default 10 segundos

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // Si hay una señal externa, abortar el composite cuando ella se aborte
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      if (externalSignal?.aborted) {
        throw error; // cancelación externa, relanzar tal cual
      }
      throw new Error('Request timeout - el servidor no respondió a tiempo');
    }
    
    throw error;
  }
};

/**
 * Fetch con retry automático
 */
export const fetchWithRetry = async (
  url: string,
  options: FetchWithTimeoutOptions = {},
  maxRetries: number = 3
): Promise<Response> => {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetchWithTimeout(url, options);
    } catch (error) {
      lastError = error as Error;
      
      // Si es el último intento, lanzar error
      if (i === maxRetries - 1) {
        throw lastError;
      }

      // Esperar antes de reintentar (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, i), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};
