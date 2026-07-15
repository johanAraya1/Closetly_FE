/**
 * Garment Service
 * Servicio para gestionar prendas (garments)
 */

import { API_URL } from '@/lib/constants';
import { tokenService } from './tokenService';
import { fetchWithTimeout } from '@/utils/fetchUtils';
import { apiCache } from '@/utils/apiCache';
import { sanitizeName, sanitizeBrand, sanitizeColor, sanitizeNotes, isInputSafe } from '@/utils/sanitize';
import { Platform } from 'react-native';
import { removeBackground, ensureModelLoaded, isModelLoaded } from './backgroundRemoval';
import type { 
  Garment, 
  CreateGarmentDTO, 
  UpdateGarmentDTO, 
  ApiResponse 
} from '@/types';

const GARMENTS_CACHE_PREFIX = 'garments:';
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Normaliza los campos de imagen de una prenda para garantizar consistencia
 * entre API antigua (imageUrl) y nueva (imageUrls).
 */
function normalizeGarment(item: any): any {
  const imageUrls = item.imageUrls || item.image_urls || [];
  const imageUrl = item.imageUrl || item.image_url || item.image || (Array.isArray(imageUrls) && imageUrls.length > 0 ? imageUrls[0] : '');
  const normalized = {
    ...item,
    // Normalizar is_public ↔ isPublic (la API puede devolver cualquiera)
    isPublic: item.isPublic ?? item.is_public ?? false,
    is_public: item.is_public ?? item.isPublic ?? false,
    imageUrl,
    image_url: imageUrl,
    imageUrls: Array.isArray(imageUrls) && imageUrls.length > 0 ? imageUrls : (imageUrl ? [imageUrl] : []),
    image_urls: Array.isArray(imageUrls) && imageUrls.length > 0 ? imageUrls : (imageUrl ? [imageUrl] : []),
    // Normalizar color: asegurar string (puede venir null/undefined o como array)
    color: item.color ? String(item.color) : (Array.isArray(item.colors) ? item.colors.join(', ') : undefined),
  };
  
  return normalized;
}

function garmentsCacheKey(userId: string, limit?: number, offset?: number): string {
  return `${GARMENTS_CACHE_PREFIX}${userId}:l${limit ?? 'all'}:o${offset ?? 0}`;
}

/**
 * Convierte una URI de imagen a base64 string (web only).
 */
async function uriToBase64(uri: string): Promise<string> {
  if (uri.startsWith('data:')) {
    const base64Match = uri.match(/^data:image\/\w+;base64,(.+)$/);
    if (base64Match) return base64Match[1];
    return uri;
  }
  const blobResp = await fetch(uri);
  const blob = await blobResp.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64Match = result.match(/^data:image\/\w+;base64,(.+)$/);
      resolve(base64Match ? base64Match[1] : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export const invalidateGarmentsCache = (userId?: string): void => {
  if (userId) {
    apiCache.invalidate(`${GARMENTS_CACHE_PREFIX}${userId}`);
  } else {
    apiCache.invalidate(GARMENTS_CACHE_PREFIX);
  }
};

/**
 * Obtiene todas las prendas del usuario (con caché)
 */
export const getGarments = async (
  userId: string,
  token?: string,
  limit?: number,
  offset?: number,
  signal?: AbortSignal,
): Promise<ApiResponse<Garment[]> & { total?: number; hasMore?: boolean }> => {
  const cacheKey = garmentsCacheKey(userId, limit, offset);

  const cached = apiCache.get<ApiResponse<Garment[]> & { total?: number; hasMore?: boolean }>(cacheKey);
  if (cached && !signal?.aborted) {
    return cached;
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let url = `${API_URL}/garments?userId=eq.${userId}`;
    if (limit !== undefined) url += `&limit=${limit}`;
    if (offset !== undefined) url += `&offset=${offset}`;

    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers,
      timeout: 15000,
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { error: `Error al cargar prendas (${response.status})` };
    }

    const result = await response.json();
    
    let garments: any[];
    let total: number;
    let hasMore: boolean;

    if (result.data !== undefined && Array.isArray(result.data)) {
      garments = result.data.map((item: any) => normalizeGarment(item));
      total = result.total ?? garments.length;
      hasMore = result.hasMore ?? false;
    } else {
      garments = (result || []).map((item: any) => normalizeGarment(item));
      total = garments.length;
      hasMore = false;
    }

    const responseData = { data: garments, total, hasMore };
    if (!signal?.aborted) {
      apiCache.set(cacheKey, responseData, CACHE_TTL);
    }
    return responseData;
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Crea una nueva prenda
 */
export const createGarment = async (
  userId: string,
  garmentData: CreateGarmentDTO,
  token?: string
): Promise<ApiResponse<Garment>> => {
  try {
    // Importar utilidades de sanitización    
    // Sanitizar todos los inputs del usuario
    const sanitizedName = sanitizeName(garmentData.name, 30);
    const sanitizedBrand = garmentData.brand ? sanitizeBrand(garmentData.brand) : undefined;
    const sanitizedColor = garmentData.color ? sanitizeColor(garmentData.color) : undefined;
    const sanitizedNotes = garmentData.notes ? sanitizeNotes(garmentData.notes) : undefined;
    
    // Validar que no haya intentos de ataque
    const nameCheck = isInputSafe(sanitizedName);
    if (!nameCheck.safe) {
      return { error: 'Invalid name: potential security issue detected' };
    }
    
    // Build common body fields
    const bodyFields: Record<string, any> = {
      name: sanitizedName,
      category: garmentData.category,
      season: garmentData.season,
    };
    
    if (sanitizedColor) bodyFields.color = sanitizedColor;
    if (sanitizedBrand) bodyFields.brand = sanitizedBrand;
    if (garmentData.style && garmentData.style.length > 0) bodyFields.style = garmentData.style;
    if (garmentData.size) bodyFields.size = garmentData.size;
    if (sanitizedNotes) bodyFields.notes = sanitizedNotes;
    // Mandar ambos formatos por si el backend espera camelCase o snake_case
    bodyFields.isPublic = garmentData.isPublic ?? false;
    bodyFields.is_public = garmentData.isPublic ?? false;
    if (garmentData.isPublic && garmentData.listingType) {
      bodyFields.listingType = garmentData.listingType;
      bodyFields.listing_type = garmentData.listingType;
    }
    
    // On web, send JSON with base64 image to avoid Multer issues on Vercel serverless
    if (Platform.OS === 'web') {
      const firstImage = garmentData.imageUrl || (garmentData as any).image_url || '';
      if (firstImage) {
        let base64 = await uriToBase64(firstImage);

        // Background removal client-side (si el modelo ya está cargado)
        if (isModelLoaded()) {
          const result = await removeBackground(base64, 'image/jpeg');
          if (result.bgRemoved) {
            console.log('[GarmentService] Background removal applied client-side');
            bodyFields._bgRemovedClient = true;
            base64 = result.base64;
          } else {
            console.warn('[GarmentService] Client-side bg removal failed, sending original:', result.error);
          }
        } else {
          // Si no está cargado, intentamos cargarlo rápido sin esperar mucho
          console.log('[GarmentService] Background removal model not ready, sending original image');
        }

        bodyFields.imageBase64 = base64;
      }
      if (garmentData.imageBackUrl) {
        bodyFields.imageBase64Back = await uriToBase64(garmentData.imageBackUrl);
      }
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetchWithTimeout(`${API_URL}/garments`, {
        method: 'POST',
        headers,
        body: JSON.stringify(bodyFields),
        timeout: 30000,
      });
      
      if (!response.ok) {
        let errorText = '';
        try { errorText = await response.text(); } catch {}
        let detail = '';
        try {
          const errJson = JSON.parse(errorText);
          detail = errJson.message || errJson.error || '';
        } catch {}
        return { error: `Error al crear prenda (${response.status}): ${detail || errorText}` };
      }
      
      const result = await response.json();
      const garment = normalizeGarment(result.data || result);

      invalidateGarmentsCache(userId);
      if (garment?.id) apiCache.invalidate(`garment:${garment.id}`);
       
      return { data: garment };
    }
    
    // On mobile, use FormData (React Native handles native file URIs)
    const formData = new FormData();
    formData.append('name', sanitizedName);
    formData.append('category', garmentData.category);
    formData.append('season', garmentData.season as string);
    
    if (sanitizedColor) formData.append('color', sanitizedColor);
    if (sanitizedBrand) formData.append('brand', sanitizedBrand);
    if (garmentData.style && garmentData.style.length > 0) {
      formData.append('style', JSON.stringify(garmentData.style));
    }
    if (garmentData.size) formData.append('size', garmentData.size);
    if (sanitizedNotes) formData.append('notes', sanitizedNotes);
    
    // Append images on mobile
    const mobileFirstImage = garmentData.imageUrl || (garmentData as any).image_url || '';
    if (mobileFirstImage) {
      formData.append('image', {
        uri: mobileFirstImage,
        type: 'image/jpeg',
        name: 'garment.jpg',
      } as any);
    }
    if (garmentData.imageBackUrl) {
      formData.append('fileBack', {
        uri: garmentData.imageBackUrl,
        type: 'image/jpeg',
        name: 'garment-back.jpg',
      } as any);
    }
    
    // Mandar ambos formatos por si el backend espera camelCase o snake_case
    formData.append('isPublic', String(garmentData.isPublic ?? false));
    formData.append('is_public', String(garmentData.isPublic ?? false));
    if (garmentData.isPublic && garmentData.listingType) {
      formData.append('listingType', garmentData.listingType);
      formData.append('listing_type', garmentData.listingType);
    }
    
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetchWithTimeout(`${API_URL}/garments`, {
      method: 'POST',
      headers,
      body: formData,
      timeout: 30000,
    });

    if (!response.ok) {
      let errorText = '';
      try { errorText = await response.text(); } catch {}
      let detail = '';
      try {
        const errJson = JSON.parse(errorText);
        detail = errJson.message || errJson.error || '';
      } catch {}
      return { error: `Error al crear prenda (${response.status}): ${detail || errorText}` };
    }

    const result = await response.json();
    
    const garment = normalizeGarment(result.data || result);

    invalidateGarmentsCache(userId);
    if (garment?.id) apiCache.invalidate(`garment:${garment.id}`);
    
    return { data: garment };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Error desconocido' };
  }
};

/**
 * Verifica si una prenda ya existe (duplicado) mediante similitud de imagen + datos
 * POST /api/garments/check-duplicate
 */
export const checkDuplicate = async (
  userId: string,
  imageUri: string,
  data: {
    name: string;
    category: string;
    brand?: string;
    color?: string;
    season?: string;
    style?: string[];
  },
  token: string,
): Promise<{ isDuplicate: boolean; matchedGarment?: Garment }> => {
  try {
    // On web, send JSON with base64 image
    if (Platform.OS === 'web') {
      const base64Image = await uriToBase64(imageUri);

      const bodyFields: Record<string, any> = {
        imageBase64: base64Image,
        name: data.name,
        category: data.category,
      };

      if (data.brand) bodyFields.brand = data.brand;
      if (data.color) bodyFields.color = data.color;
      if (data.season) bodyFields.season = data.season;
      if (data.style && data.style.length > 0) bodyFields.style = data.style;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetchWithTimeout(`${API_URL}/garments/check-duplicate`, {
        method: 'POST',
        headers,
        body: JSON.stringify(bodyFields),
        timeout: 15000,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`checkDuplicate error (${response.status}):`, errorText);
        return { isDuplicate: false };
      }

      const result = await response.json();
      if (result.isDuplicate && result.matchedGarment) {
        return {
          isDuplicate: true,
          matchedGarment: normalizeGarment(result.matchedGarment),
        };
      }
      return { isDuplicate: false };
    }

    // On mobile, use FormData
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'garment.jpg',
    } as any);
    formData.append('name', data.name);
    formData.append('category', data.category);

    if (data.brand) formData.append('brand', data.brand);
    if (data.color) formData.append('color', data.color);
    if (data.season) formData.append('season', data.season);
    if (data.style && data.style.length > 0) {
      formData.append('style', JSON.stringify(data.style));
    }

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetchWithTimeout(`${API_URL}/garments/check-duplicate`, {
      method: 'POST',
      headers,
      body: formData,
      timeout: 15000,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`checkDuplicate error (${response.status}):`, errorText);
      return { isDuplicate: false };
    }

    const result = await response.json();
    if (result.isDuplicate && result.matchedGarment) {
      return {
        isDuplicate: true,
        matchedGarment: normalizeGarment(result.matchedGarment),
      };
    }
    return { isDuplicate: false };
  } catch (error) {
    console.error('checkDuplicate unexpected error:', error);
    // Si falla la verificación, no bloqueamos la creación
    return { isDuplicate: false };
  }
};

/**
 * Actualiza una prenda existente
 */
export const updateGarment = async (
  id: string,
  updates: UpdateGarmentDTO,
  token?: string
): Promise<ApiResponse<Garment>> => {
  try {
    // Importar utilidades de sanitización    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Preparar el body con los campos a actualizar (sanitizados)
    const body: any = {};
    
    if (updates.name !== undefined) {
      const sanitizedName = sanitizeName(updates.name, 30);
      const nameCheck = isInputSafe(sanitizedName);
      if (!nameCheck.safe) {
        return { error: 'Invalid name: potential security issue detected' };
      }
      body.name = sanitizedName;
    }
    if (updates.category !== undefined) body.category = updates.category;
    if (updates.brand !== undefined) body.brand = sanitizeBrand(updates.brand);
    if (updates.color !== undefined) {
      const sanitizedColor = sanitizeColor(updates.color);
      if (sanitizedColor) body.color = sanitizedColor;
    }
    if (updates.size !== undefined) body.size = updates.size;
    if (updates.notes !== undefined) body.notes = sanitizeNotes(updates.notes);
    
    if (updates.style !== undefined) {
      body.style = updates.style;
    }
    
    if (updates.season !== undefined) {
      body.season = updates.season;
    }
    
    if (updates.isPublic !== undefined) {
      // Mandar ambos formatos por si el backend espera camelCase o snake_case
      body.isPublic = updates.isPublic;
      body.is_public = updates.isPublic;
      if (updates.isPublic && updates.listingType) {
        body.listingType = updates.listingType;
        body.listing_type = updates.listingType;
      }
    }
    
    // NO enviar imageUrl - el backend no permite actualizar la imagen
    
    const response = await fetchWithTimeout(`${API_URL}/garments/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
      timeout: 10000,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { error: `Error al actualizar prenda (${response.status})` };
    }

    const result = await response.json();
    
    const garment = normalizeGarment(result.data || result);

    invalidateGarmentsCache();
    apiCache.invalidate(`garment:${id}`);

    return { data: garment };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Error desconocido' };
  }
};

/**
 * Obtiene una prenda por su ID (con caché)
 */
export const getGarmentById = async (id: string, token?: string, signal?: AbortSignal): Promise<ApiResponse<Garment>> => {
  const cacheKey = `garment:${id}`;

  const cached = apiCache.get<ApiResponse<Garment>>(cacheKey);
  if (cached && !signal?.aborted) {
    return cached;
  }

  const authToken = token || await tokenService.getAccessToken();
  if (!authToken) {
    return { error: 'No authentication token' };
  }

  const response = await fetchWithTimeout(`${API_URL}/garments?id=eq.${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    timeout: 10000,
    signal,
  });

  if (!response.ok) {
    return { error: `Error al cargar prenda (${response.status})` };
  }

  const result = await response.json();
  const data = result.data || result;
  if (!signal?.aborted) {
    apiCache.set(cacheKey, { data }, CACHE_TTL);
  }
  return { data };
};

/**
 * Elimina una prenda
 */
export const deleteGarment = async (id: string, token?: string): Promise<ApiResponse<void>> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetchWithTimeout(`${API_URL}/garments/${id}`, {
      method: 'DELETE',
      headers,
      timeout: 10000,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { error: `Error al eliminar prenda (${response.status})` };
    }

    invalidateGarmentsCache();
    apiCache.invalidate(`garment:${id}`);

    return { data: undefined };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Sube una imagen de prenda
 * NOTA: Esta función ya no se usa - las imágenes se suben directamente en createGarment
 * Mantenerla por compatibilidad
 */
export const uploadGarmentImage = async (
  userId: string,
  imageUri: string
): Promise<ApiResponse<string>> => {
  try {
    const token = await tokenService.getAccessToken();
    if (!token) {
      return { error: 'No authentication token' };
    }

    // Validar imagen antes de subir
    const validation = await validateImage(imageUri);
    if (!validation.valid) {
      return { error: validation.error || 'Invalid image' };
    }

    // Crear FormData para subir la imagen
    const formData = new FormData();
    const fileName = `garment-${userId}-${Date.now()}.jpg`;
    
    formData.append('image', {
      uri: imageUri,
      name: fileName,
      type: 'image/jpeg',
    } as any);

    const response = await fetchWithTimeout(`${API_URL}/garments/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
      timeout: 30000,
    });

    if (!response.ok) {
      return { error: `Error al subir imagen (${response.status})` };
    }

    const result = await response.json();
    return { data: result.data?.url || result.url };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
};



