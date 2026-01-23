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
 * Obtiene todos los outfits del usuario con sus prendas
 */
export const getOutfits = async (userId: string): Promise<ApiResponse<Outfit[]>> => {
  // Obtener los outfits básicos
  const outfitsResponse = await apiClient.get<any[]>(`/outfits?user_id=eq.${userId}&order=created_at.desc`);
  
  if (!outfitsResponse.data || outfitsResponse.error) {
    return outfitsResponse;
  }
  
  // Para cada outfit, obtener sus prendas usando garmentIds
  const outfitsWithGarments = await Promise.all(
    outfitsResponse.data.map(async (outfit: any) => {
      if (!outfit.garmentIds || outfit.garmentIds.length === 0) {
        return { ...outfit, garments: [] };
      }
      
      // Obtener cada prenda usando query params (sintaxis del backend)
      const garmentPromises = outfit.garmentIds.map((garmentId: string) => 
        apiClient.get<any[]>(`/garments?id=eq.${garmentId}`)
      );
      
      const garmentResults = await Promise.all(garmentPromises);
      const garments = garmentResults
        .filter(result => result.data && !result.error && result.data.length > 0)
        .map(result => result.data[0]); // Tomar el primer elemento del array
      
      return {
        ...outfit,
        garments,
      };
    })
  );
  
  console.log('✅ Outfits con prendas completos');
  
  return { data: outfitsWithGarments };
};

/*/
export const getOutfitById = async (id: string): Promise<ApiResponse<Outfit>> => {
  // Obtener el outfit básico
  const outfitResponse = await apiClient.get<any[]>(`/outfits?id=eq.${id}`);
  
  if (!outfitResponse.data || !outfitResponse.data[0] || outfitResponse.error) {
    return outfitResponse as ApiResponse<Outfit>;
  }
  
  const outfit = outfitResponse.data[0];
  
  // Si no tiene prendas, retornar tal cual
  if (!outfit.garmentIds || outfit.garmentIds.length === 0) {
    return { data: { ...outfit, garments: [] } };
  }
  
  // Obtener cada prenda usando query params (sintaxis del backend)
  const garmentPromises = outfit.garmentIds.map((garmentId: string) => 
    apiClient.get<any[]>(`/garments?id=eq.${garmentId}`)
  );
  
  const garmentResults = await Promise.all(garmentPromises);
  const garments = garmentResults
    .filter(result => result.data && !result.error && result.data.length > 0)
    .map(result => result.data[0]); // Tomar el primer elemento del array
  
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

  // Convertir season: all-season → all_season para el backend
  const seasonValue = outfitInfo.season === 'all-season' ? 'all_season' : outfitInfo.season;

  const payload = {
    name: sanitizedName,
    description: sanitizedNotes,
    season: seasonValue,
    occasion: outfitInfo.occasion,
    garmentIds,
  };

  return apiClient.post<Outfit>('/outfits', payload);
};

/**
 * Actualiza un outfit existente
 */
export const updateOutfit = async (
  id: string,
  updates: UpdateOutfitDTO
): Promise<ApiResponse<Outfit>> => {
  return apiClient.put<Outfit>(`/outfits/${id}`, updates);
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
  return apiClient.put<Outfit>(`/outfits/${id}/favorite`, { is_favorite: isFavorite }, { timeout: 10000 });
};



