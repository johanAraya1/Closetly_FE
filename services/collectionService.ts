/**
 * Collection Service
 * Servicio para gestionar colecciones de outfits
 */

import { apiClient } from '@/utils/apiClient';
import { sanitizeName, sanitizeNotes, isInputSafe } from '@/utils/sanitize';
import { getCache, setCache, clearCache, CACHE_KEYS } from '@/services/cacheService';
import type { 
  Collection, 
  CreateCollectionDTO, 
  UpdateCollectionDTO, 
  ApiResponse,
  Outfit 
} from '@/types';

/**
 * Obtiene todas las colecciones del usuario con sus outfits
 */
export const getCollections = async (userId: string): Promise<ApiResponse<Collection[]>> => {
  try {
    // Check cache first
    const cached = await getCache<Collection[]>(CACHE_KEYS.COLLECTIONS);
    if (cached) {
      return { data: cached };
    }

    // Obtener las colecciones básicas
    const collectionsResponse = await apiClient.get<any[]>(
      `/collections?userId=${userId}`
    );
    
    
    if (!collectionsResponse.data || collectionsResponse.error) {
      return { data: [], error: collectionsResponse.error };
    }
    
    // Fetch outfits for all collections in parallel
    const collectionsWithOutfits = await Promise.all(
      collectionsResponse.data.map(async (collection) => {
        try {
          const outfitsResponse = await apiClient.get<any[]>(
            `/collections/${collection.id}/outfits`
          );
          
          
          const outfits = outfitsResponse.data || [];
          
          return {
            id: collection.id,
            userId: collection.userId,
            name: collection.name,
            description: collection.description,
            coverImageUrl: collection.coverImageUrl,
            isPublic: collection.isPublic,
            createdAt: collection.createdAt,
            updatedAt: collection.updatedAt,
            outfits,
          };
        } catch (error: any) {
          console.warn(`Error fetching outfits for collection ${collection.id}:`, error?.message);
          
          return {
            id: collection.id,
            userId: collection.userId,
            name: collection.name,
            description: collection.description,
            coverImageUrl: collection.coverImageUrl,
            isPublic: collection.isPublic,
            createdAt: collection.createdAt,
            updatedAt: collection.updatedAt,
            outfits: [],
          };
        }
      })
    );
    
    // Cache the result
    await setCache(CACHE_KEYS.COLLECTIONS, collectionsWithOutfits);
    
    return { data: collectionsWithOutfits };
  } catch (error) {
    console.error('❌ Error al obtener colecciones:', error);
    return { data: [], error: 'Failed to fetch collections' };
  }
};

/**
 * Obtiene una colección por su ID con sus outfits
 */
export const getCollectionById = async (id: string, userId: string): Promise<ApiResponse<Collection>> => {
  try {
    // Check cache first
    const cacheKey = CACHE_KEYS.COLLECTION + id;
    const cached = await getCache<Collection>(cacheKey);
    if (cached) {
      return { data: cached };
    }

    // Fetch the specific collection directly
    const collectionResponse = await apiClient.get<any>(`/collections/${id}`);
    
    
    if (collectionResponse.error || !collectionResponse.data) {
      return { error: collectionResponse.error || 'Failed to fetch collection' };
    }
    
    const collection = collectionResponse.data;
    
    
    // Obtener los outfits de esta colección
    const outfitsResponse = await apiClient.get<any[]>(`/collections/${id}/outfits`);
    
    
    const outfitsData = outfitsResponse.data || [];
    
    // Para cada outfit, obtener sus garments completos
    const outfitsWithGarments = await Promise.all(
      outfitsData.map(async (outfit: any) => {
        if (!outfit.garmentIds || outfit.garmentIds.length === 0) {
          return {
            ...outfit,
            garments: [],
          };
        }
        
        // Obtener cada garment por su ID
        const garments = await Promise.all(
          outfit.garmentIds.map(async (garmentId: string) => {
            try {
              const garmentResponse = await apiClient.get<any>(`/garments/${garmentId}`);
              return Array.isArray(garmentResponse.data) ? garmentResponse.data[0] : garmentResponse.data;
            } catch (error) {
              console.warn(`Failed to fetch garment ${garmentId}:`, error);
              return null;
            }
          })
        );
        
        const validGarments = garments.filter(g => g !== null);
        
        return {
          ...outfit,
          garments: validGarments,
        };
      })
    );
    
    
    const outfits = outfitsWithGarments;
    
    const result: Collection = {
      id: collection.id,
      userId: collection.userId,
      name: collection.name,
      description: collection.description,
      coverImageUrl: collection.coverImageUrl,
      isPublic: collection.isPublic,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
      outfits,
    };

    // Cache the result
    await setCache(cacheKey, result);
    
    return { data: result };
  } catch (error) {
    console.error('❌ Error fetching collection by ID:', error);
    return { error: 'Failed to fetch collection' };
  }
};

/**
 * Crea una nueva colección
 */
export const createCollection = async (
  userId: string,
  collectionData: CreateCollectionDTO
): Promise<ApiResponse<Collection>> => {
  // Sanitizar inputs
  const sanitizedName = sanitizeName(collectionData.name, 100);
  const nameCheck = isInputSafe(sanitizedName);
  if (!nameCheck.safe) {
    return { error: 'Invalid name: potential security issue detected' };
  }
  
  const sanitizedDescription = collectionData.description 
    ? sanitizeNotes(collectionData.description) 
    : undefined;
  
  const payload = {
    name: sanitizedName,
    description: sanitizedDescription,
    isPublic: collectionData.isPublic ?? false,
    outfitIds: collectionData.outfitIds || [],
  };


  const response = await apiClient.post<Collection>('/collections', payload);
  

  return response;
};

/**
 * Actualiza una colección existente
 */
export const updateCollection = async (
  id: string,
  updates: UpdateCollectionDTO
): Promise<ApiResponse<Collection>> => {
  // Sanitizar inputs
  const sanitizedUpdates: any = {};
  
  if (updates.name !== undefined) {
    const sanitizedName = sanitizeName(updates.name, 100);
    const nameCheck = isInputSafe(sanitizedName);
    if (!nameCheck.safe) {
      return { error: 'Invalid name: potential security issue detected' };
    }
    sanitizedUpdates.name = sanitizedName;
  }
  
  if (updates.description !== undefined) {
    sanitizedUpdates.description = sanitizeNotes(updates.description);
  }
  
  if (updates.is_public !== undefined) {
    sanitizedUpdates.is_public = updates.is_public;
  }

  return apiClient.put<Collection>(`/collections/${id}`, sanitizedUpdates);
};

/**
 * Elimina una colección
 */
export const deleteCollection = async (id: string): Promise<ApiResponse<void>> => {
  return apiClient.delete<void>(`/collections/${id}`, { timeout: 10000 });
};

/**
 * Agrega un outfit a una colección
 */
export const addOutfitToCollection = async (
  collectionId: string,
  outfitId: string
): Promise<ApiResponse<void>> => {
  return apiClient.post<void>(`/collections/${collectionId}/outfits`, { outfitId }, { timeout: 10000 });
};

/**
 * Elimina un outfit de una colección
 */
export const removeOutfitFromCollection = async (
  collectionId: string,
  outfitId: string
): Promise<ApiResponse<void>> => {
  return apiClient.delete<void>(`/collections/${collectionId}/outfits/${outfitId}`, { timeout: 10000 });
};



