/**
 * API Cache Simple
 * Caché en memoria con TTL para reducir llamadas a la API.
 * Se invalida automáticamente cuando hay mutaciones (create/update/delete).
 */

interface CacheEntry {
  data: unknown;
  expiry: number;
}

const store = new Map<string, CacheEntry>();
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutos

export const apiCache = {
  /** Obtiene un valor del caché si no expiró */
  get<T>(key: string): T | null {
    const entry = store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      store.delete(key);
      return null;
    }
    return entry.data as T;
  },

  /** Guarda un valor en el caché con TTL opcional */
  set<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): void {
    store.set(key, { data, expiry: Date.now() + ttlMs });
  },

  /** Invalida entradas cuyo key contenga el pattern. Sin pattern, limpia todo. */
  invalidate(pattern?: string): void {
    if (!pattern) {
      store.clear();
      return;
    }
    for (const key of store.keys()) {
      if (key.includes(pattern)) {
        store.delete(key);
      }
    }
  },

  /** Cachea el resultado de una función async con key y TTL */
  async wrap<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs?: number,
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) return cached;

    const data = await fetcher();
    this.set(key, data, ttlMs);
    return data;
  },
};
