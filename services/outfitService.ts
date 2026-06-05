/**
 * Outfit Service
 * Servicio para gestionar outfits (conjuntos de prendas)
 */

import { apiClient } from '@/utils/apiClient';
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
export const getOutfits = async (userId: string): Promise<ApiResponse<Outfit[]>> => {
  // Obtener los outfits básicos
  const outfitsResponse = await apiClient.get<any[]>(`/outfits?user_id=eq.${userId}&order=created_at.desc`);
  
  if (!outfitsResponse.data || outfitsResponse.error) {
    return outfitsResponse;
  }
  
  const outfits = outfitsResponse.data.map(normalizeOutfit);

  // Recolectar todos los garmentIds ÚNICOS de todos los outfits
  const allGarmentIds = [...new Set(
    outfits.flatMap((o: any) => o.garmentIds || [])
  )];

  // Si no hay prendas que buscar, devolver tal cual
  if (allGarmentIds.length === 0) {
    return { data: outfits.map((o: any) => ({ ...o, garments: [] })) };
  }

  // UNA SOLA request batch para TODAS las prendas
  const garmentsResponse = await apiClient.get<any[]>(
    `/garments?id=in.(${allGarmentIds.join(',')})`
  );

  if (!garmentsResponse.data || garmentsResponse.error) {
    // Si falla la batch, devolver outfits sin prendas en vez de error total
    console.warn('⚠️ No se pudieron cargar las prendas de los outfits:', garmentsResponse.error);
    return { data: outfits.map((o: any) => ({ ...o, garments: [] })) };
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
  
  return { data: outfitsWithGarments };
};

/**
 * Obtiene un outfit por ID con sus prendas
 */
export const getOutfitById = async (id: string): Promise<ApiResponse<Outfit>> => {
  // Obtener el outfit básico
  const outfitResponse = await apiClient.get<any[]>(`/outfits?id=eq.${id}`);
  
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
    `/garments?id=in.(${outfit.garmentIds.join(',')})`
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



