/**
 * Cache Service
 * Servicio para persistir datos localmente con AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEYS = {
  GARMENTS: 'cache_garments',
  OUTFITS: 'cache_outfits',
  COLLECTIONS: 'cache_collections',
  PROFILE: 'cache_profile',
  TIMESTAMP_PREFIX: 'cache_timestamp_',
} as const;

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

interface CacheOptions {
  ttl?: number; // Time to live en milisegundos
}

/**
 * Guardar datos en caché
 */
export const setCache = async <T>(
  key: string,
  data: T,
  options: CacheOptions = {}
): Promise<void> => {
  try {
    const ttl = options.ttl ?? CACHE_DURATION;
    const cacheData = {
      data,
      timestamp: Date.now(),
      ttl,
    };
    await AsyncStorage.setItem(key, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Error saving to cache:', error);
  }
};

/**
 * Obtener datos del caché
 */
export const getCache = async <T>(key: string): Promise<T | null> => {
  try {
    const cached = await AsyncStorage.getItem(key);
    if (!cached) return null;

    const cacheData = JSON.parse(cached);
    const { data, timestamp, ttl } = cacheData;

    // Verificar si el caché expiró
    if (Date.now() - timestamp > ttl) {
      await AsyncStorage.removeItem(key);
      return null;
    }

    return data as T;
  } catch (error) {
    console.error('Error reading from cache:', error);
    return null;
  }
};

/**
 * Limpiar caché específico
 */
export const clearCache = async (key: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
};

/**
 * Limpiar todo el caché
 */
export const clearAllCache = async (): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((key) => key.startsWith('cache_'));
    await AsyncStorage.multiRemove(cacheKeys);
  } catch (error) {
    console.error('Error clearing all cache:', error);
  }
};

/**
 * Verificar si el caché es válido
 */
export const isCacheValid = async (key: string): Promise<boolean> => {
  try {
    const cached = await AsyncStorage.getItem(key);
    if (!cached) return false;

    const cacheData = JSON.parse(cached);
    const { timestamp, ttl } = cacheData;

    return Date.now() - timestamp <= ttl;
  } catch (error) {
    return false;
  }
};

// Exports de keys para facilitar uso
export { CACHE_KEYS };
