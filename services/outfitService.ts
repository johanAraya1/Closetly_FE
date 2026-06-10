/**
 * Outfit Service
 * Servicio para gestionar outfits (conjuntos de prendas)
 */

import { API_URL } from '@/lib/constants';
import { apiClient } from '@/utils/apiClient';
import { fetchWithTimeout } from '@/utils/fetchUtils';
import { tokenService } from '@/services/tokenService';
import { apiCache } from '@/utils/apiCache';
import { sanitizeName, sanitizeNotes, isInputSafe } from '@/utils/sanitize';
import type { 
  Outfit, 
  CreateOutfitDTO, 
  UpdateOutfitDTO, 
  ApiResponse,
  Garment 
} from '@/types';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutos
const OUTFITS_CACHE_PREFIX = 'outfits:';

/**
 * Normaliza un outfit de la API (camelCase de BE) al formato del frontend (snake_case donde aplica)
 * La BE serializa las entidades NestJS en camelCase, pero el FE usa is_favorite
 */
const normalizeOutfit = (outfit: any): any => ({
  ...outfit,
  is_favorite: outfit.isFavorite ?? outfit.is_favorite ?? false,
});

/**
 * Builds a cache key for outfit queries
 */
function outfitsCacheKey(userId: string, limit?: number, offset?: number): string {
  return `${OUTFITS_CACHE_PREFIX}${userId}:l${limit ?? 'all'}:o${offset ?? 0}`;
}

/**
 * Fetch raw outfits from the API (used internally, cached wrapper)
 */
async function fetchOutfits(
  userId: string,
  limit?: number,
  offset?: number,
  signal?: AbortSignal,
): Promise<ApiResponse<Outfit[]> & { total?: number; hasMore?: boolean }> {
  const token = await tokenService.getAccessToken();

  let url = `${API_URL}/outfits?user_id=eq.${userId}&order=created_at.desc`;
  if (limit !== undefined) url += `&limit=${limit}`;
  if (offset !== undefined) url += `&offset=${offset}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetchWithTimeout(url, {
    method: 'GET',
    headers,
    timeout: 15000,
    signal,
  });

  if (!response.ok) {
    return { data: [], total: 0, hasMore: false, error: `Error al cargar outfits (${response.status})` };
  }

  const result = await response.json();

  let outfits: any[];
  let total: number;
  let hasMore: boolean;

  if (result.data !== undefined && Array.isArray(result.data)) {
    outfits = result.data.map(normalizeOutfit);
    total = result.total ?? outfits.length;
    hasMore = result.hasMore ?? false;
  } else if (Array.isArray(result)) {
    outfits = result.map(normalizeOutfit);
    total = outfits.length;
    hasMore = false;
  } else {
    return { data: [], total: 0, hasMore: false, error: 'Unexpected response format' };
  }

  // Load garments batch
  const allGarmentIds = [...new Set(
    outfits.flatMap((o: any) => o.garmentIds || [])
  )];

  if (allGarmentIds.length === 0) {
    return { data: outfits.map((o: any) => ({ ...o, garments: [] })), total, hasMore };
  }

  const garmentsResponse = await apiClient.get<any[]>(
    `/garments?id=in.(${allGarmentIds.join(',')})`,
    { signal }
  );

  if (!garmentsResponse.data || garmentsResponse.error) {
    console.warn('⚠️ No se pudieron cargar las prendas de los outfits:', garmentsResponse.error);
    return { data: outfits.map((o: any) => ({ ...o, garments: [] })), total, hasMore };
  }

  const garmentsMap = new Map<string, any>(
    garmentsResponse.data.map((g: any) => [g.id, g])
  );

  const outfitsWithGarments = outfits.map((outfit: any) => ({
    ...outfit,
    garments: (outfit.garmentIds || []).map((id: string) => garmentsMap.get(id)).filter(Boolean),
  }));

  return { data: outfitsWithGarments, total, hasMore };
}

/**
 * Obtiene outfits del usuario con caché.
 * Home screen usa limit=3 para los recientes.
 */
export const getOutfits = async (
  userId: string,
  limit?: number,
  offset?: number,
  signal?: AbortSignal,
): Promise<ApiResponse<Outfit[]> & { total?: number; hasMore?: boolean }> => {
  const cacheKey = outfitsCacheKey(userId, limit, offset);

  // Skip cache if signal is already aborted
  if (signal?.aborted) {
    return { data: [], total: 0, hasMore: false };
  }

  // If we have a signal and no limit, still try cache first
  const cached = apiCache.get<ApiResponse<Outfit[]> & { total?: number; hasMore?: boolean }>(cacheKey);
  if (cached && !signal?.aborted) {
    return cached;
  }

  const result = await fetchOutfits(userId, limit, offset, signal);
  if (!result.error && !signal?.aborted) {
    apiCache.set(cacheKey, result, CACHE_TTL);
  }
  return result;
};

/** Invalida toda la caché de outfits para un usuario */
export const invalidateOutfitsCache = (userId?: string): void => {
  if (userId) {
    apiCache.invalidate(`${OUTFITS_CACHE_PREFIX}${userId}`);
  } else {
    apiCache.invalidate(OUTFITS_CACHE_PREFIX);
  }
};

/**
 * Obtiene un outfit por ID con sus prendas (con caché)
 */
export const getOutfitById = async (id: string, signal?: AbortSignal): Promise<ApiResponse<Outfit>> => {
  const cacheKey = `outfit:${id}`;

  const cached = apiCache.get<ApiResponse<Outfit>>(cacheKey);
  if (cached && !signal?.aborted) {
    return cached;
  }

  const outfitResponse = await apiClient.get<any[]>(`/outfits?id=eq.${id}`, { signal });
  
  if (!outfitResponse.data || !outfitResponse.data[0] || outfitResponse.error) {
    return outfitResponse as ApiResponse<Outfit>;
  }
  
  const outfit = normalizeOutfit(outfitResponse.data[0]);
  
  if (!outfit.garmentIds || outfit.garmentIds.length === 0) {
    const result = { data: { ...outfit, garments: [] } as Outfit };
    apiCache.set(cacheKey, result, CACHE_TTL);
    return result;
  }
  
  const garmentsResponse = await apiClient.get<any[]>(
    `/garments?id=in.(${outfit.garmentIds.join(',')})`,
    { signal }
  );

  if (!garmentsResponse.data || garmentsResponse.error) {
    console.warn('⚠️ No se pudieron cargar las prendas del outfit:', garmentsResponse.error);
    const result = { data: { ...outfit, garments: [] } as Outfit };
    if (!signal?.aborted) apiCache.set(cacheKey, result, CACHE_TTL);
    return result;
  }

  const garmentsMap = new Map<string, any>(
    garmentsResponse.data.map((g: any) => [g.id, g])
  );

  const garments = outfit.garmentIds
    .map((id: string) => garmentsMap.get(id))
    .filter(Boolean);
  
  const result = { data: { ...outfit, garments } as Outfit };
  if (!signal?.aborted) {
    apiCache.set(cacheKey, result, CACHE_TTL);
  }
  return result;
};

/**
 * Crea un nuevo outfit
 */
export const createOutfit = async (
  userId: string,
  outfitData: CreateOutfitDTO
): Promise<ApiResponse<Outfit>> => {
  const { garmentIds, ...outfitInfo } = outfitData;
  
  const sanitizedName = sanitizeName(outfitInfo.name, 100);
  const nameCheck = isInputSafe(sanitizedName);
  if (!nameCheck.safe) {
    return { error: 'Invalid name: potential security issue detected' };
  }
  
  const sanitizedNotes = outfitInfo.notes ? sanitizeNotes(outfitInfo.notes) : undefined;
  const seasonValue = outfitInfo.season;

  const payload = {
    name: sanitizedName,
    description: sanitizedNotes,
    season: seasonValue,
    occasion: outfitInfo.occasion,
    garmentIds,
  };

  const result = await apiClient.post<any>('/outfits', payload);
  
  if (result.error) return result as ApiResponse<Outfit>;

  // Invalidate outfit list cache so next load picks up the new outfit
  invalidateOutfitsCache(userId);
  apiCache.invalidate(`outfit:${result.data?.id}`);

  return { data: normalizeOutfit(result.data) as Outfit };
};

/**
 * Actualiza un outfit existente
 */
export const updateOutfit = async (
  id: string,
  updates: UpdateOutfitDTO
): Promise<ApiResponse<Outfit>> => {
  const result = await apiClient.put<any>(`/outfits/${id}`, updates);
  if (result.error) return result as ApiResponse<Outfit>;

  // Invalidate caches
  apiCache.invalidate(OUTFITS_CACHE_PREFIX);
  apiCache.invalidate(`outfit:${id}`);

  return { data: normalizeOutfit(result.data) as Outfit };
};

/**
 * Elimina un outfit
 */
export const deleteOutfit = async (id: string): Promise<ApiResponse<void>> => {
  const result = await apiClient.delete<void>(`/outfits/${id}`, { timeout: 10000 });
  if (!result.error) {
    apiCache.invalidate(OUTFITS_CACHE_PREFIX);
    apiCache.invalidate(`outfit:${id}`);
  }
  return result;
};

/**
 * Marca un outfit como favorito o no favorito
 */
export const toggleOutfitFavorite = async (
  id: string,
  isFavorite: boolean
): Promise<ApiResponse<Outfit>> => {
  const result = await apiClient.put<any>(`/outfits/${id}/favorite`, { is_favorite: isFavorite }, { timeout: 10000 });
  if (result.error) return result as ApiResponse<Outfit>;

  apiCache.invalidate(OUTFITS_CACHE_PREFIX);
  apiCache.invalidate(`outfit:${id}`);

  return { data: normalizeOutfit(result.data) as Outfit };
};



