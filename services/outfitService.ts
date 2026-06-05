/**
 * Outfit Service
 * Servicio para gestionar outfits (conjuntos de prendas)
 */

import { API_URL } from '@/lib/constants';
import { apiClient } from '@/utils/apiClient';
import { fetchWithTimeout } from '@/utils/fetchUtils';
import { tokenService } from '@/services/tokenService';
import { sanitizeName, sanitizeNotes, isInputSafe } from '@/utils/sanitize';
import type { 
  Outfit, 
  CreateOutfitDTO, 
  UpdateOutfitDTO, 
  ApiResponse,
  Garment 
} from '@/types';

/**
 * Normaliza un outfit de la API (camelCase de BE) al formato del frontend (snake_case donde aplica)
 * La BE serializa las entidades NestJS en camelCase, pero el FE usa is_favorite
 */
const normalizeOutfit = (outfit: any): any => ({
  ...outfit,
  is_favorite: outfit.isFavorite ?? outfit.is_favorite ?? false,
});

/**
 * Obtiene todos los outfits del usuario con sus prendas
 */
export const getOutfits = async (
  userId: string,
  limit?: number,
  offset?: number,
  signal?: AbortSignal,
): Promise<ApiResponse<Outfit[]> & { total?: number; hasMore?: boolean }> => {
  // Obtener los outfits básicos (con fetchWithTimeout para acceder a campos paginados)
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

  // Handle both paginated and non-paginated responses
  let outfits: any[];
  let total: number;
  let hasMore: boolean;

  if (result.data !== undefined && Array.isArray(result.data)) {
    // Paginated response: { data: [...], total, hasMore }
    outfits = result.data.map(normalizeOutfit);
    total = result.total ?? outfits.length;
    hasMore = result.hasMore ?? false;
  } else if (Array.isArray(result)) {
    // Plain array (backwards compatibility)
    outfits = result.map(normalizeOutfit);
    total = outfits.length;
    hasMore = false;
  } else {
    return { data: [], total: 0, hasMore: false, error: 'Unexpected response format' };
  }

  // Recolectar todos los garmentIds ÚNICOS de los outfits de esta página
  const allGarmentIds = [...new Set(
    outfits.flatMap((o: any) => o.garmentIds || [])
  )];

  // Si no hay prendas que buscar, devolver tal cual
  if (allGarmentIds.length === 0) {
    return { data: outfits.map((o: any) => ({ ...o, garments: [] })), total, hasMore };
  }

  // UNA SOLA request batch para TODAS las prendas
  const garmentsResponse = await apiClient.get<any[]>(
    `/garments?id=in.(${allGarmentIds.join(',')})`,
    { signal }
  );

  if (!garmentsResponse.data || garmentsResponse.error) {
    // Si falla la batch, devolver outfits sin prendas en vez de error total
    console.warn('⚠️ No se pudieron cargar las prendas de los outfits:', garmentsResponse.error);
    return { data: outfits.map((o: any) => ({ ...o, garments: [] })), total, hasMore };
  }

  // Indexar prendas por ID para lookup O(1)
  const garmentsMap = new Map<string, any>(
    garmentsResponse.data.map((g: any) => [g.id, g])
  );

  // Asignar prendas a cada outfit usando el mapa
  const outfitsWithGarments = outfits.map((outfit: any) => ({
    ...outfit,
    garments: (outfit.garmentIds || []).map((id: string) => garmentsMap.get(id)).filter(Boolean),
  }));
  
  return { data: outfitsWithGarments, total, hasMore };
};

/**
 * Obtiene un outfit por ID con sus prendas
 */
export const getOutfitById = async (id: string, signal?: AbortSignal): Promise<ApiResponse<Outfit>> => {
  // Obtener el outfit básico
  const outfitResponse = await apiClient.get<any[]>(`/outfits?id=eq.${id}`, { signal });
  
  if (!outfitResponse.data || !outfitResponse.data[0] || outfitResponse.error) {
    return outfitResponse as ApiResponse<Outfit>;
  }
  
  const outfit = normalizeOutfit(outfitResponse.data[0]);
  
  // Si no tiene prendas, retornar tal cual
  if (!outfit.garmentIds || outfit.garmentIds.length === 0) {
    return { data: { ...outfit, garments: [] } };
  }
  
  // UNA SOLA request batch para todas las prendas del outfit
  const garmentsResponse = await apiClient.get<any[]>(
    `/garments?id=in.(${outfit.garmentIds.join(',')})`,
    { signal }
  );

  if (!garmentsResponse.data || garmentsResponse.error) {
    console.warn('⚠️ No se pudieron cargar las prendas del outfit:', garmentsResponse.error);
    return { data: { ...outfit, garments: [] } };
  }

  // Indexar prendas por ID para lookup O(1)
  const garmentsMap = new Map<string, any>(
    garmentsResponse.data.map((g: any) => [g.id, g])
  );

  const garments = outfit.garmentIds
    .map((id: string) => garmentsMap.get(id))
    .filter(Boolean);
  
  return {
    data: {
      ...outfit,
      garments,
    },
  };
};

/**
 * Crea un nuevo outfit
 */
export const createOutfit = async (
  userId: string,
  outfitData: CreateOutfitDTO
): Promise<ApiResponse<Outfit>> => {
  const { garmentIds, ...outfitInfo } = outfitData;
  
  // Sanitizar inputs
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
  return { data: normalizeOutfit(result.data) as Outfit };
};

/**
 * Elimina un outfit
 */
export const deleteOutfit = async (id: string): Promise<ApiResponse<void>> => {
  return apiClient.delete<void>(`/outfits/${id}`, { timeout: 10000 });
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
  return { data: normalizeOutfit(result.data) as Outfit };
};



