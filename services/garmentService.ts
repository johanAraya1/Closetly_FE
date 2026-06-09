/**
 * Garment Service
 * Servicio para gestionar prendas (garments)
 */

import { API_URL } from '@/lib/constants';
import { tokenService } from './tokenService';
import { fetchWithTimeout } from '@/utils/fetchUtils';
import { sanitizeName, sanitizeBrand, sanitizeColor, sanitizeNotes, isInputSafe } from '@/utils/sanitize';
import { Platform } from 'react-native';
import type { 
  Garment, 
  CreateGarmentDTO, 
  UpdateGarmentDTO, 
  ApiResponse 
} from '@/types';

/**
 * Obtiene todas las prendas del usuario
 */
export const getGarments = async (
  userId: string,
  token?: string,
  limit?: number,
  offset?: number,
  signal?: AbortSignal,
): Promise<ApiResponse<Garment[]> & { total?: number; hasMore?: boolean }> => {
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
    
    // Handle both paginated and non-paginated responses
    if (result.data !== undefined && Array.isArray(result.data)) {
      // Paginated response from backend: { data: [...], total, hasMore }
      const garments = result.data.map((item: any) => ({
        ...item,
        image_url: item.imageUrl || item.image_url || item.image || '',
      }));
      return { data: garments, total: result.total, hasMore: result.hasMore };
    }

    // Fallback: plain array response
    const garments = (result || []).map((item: any) => ({
      ...item,
      image_url: item.imageUrl || item.image_url || item.image || '',
    }));
    
    return { data: garments, total: garments.length, hasMore: false };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Obtiene una prenda por su ID
 */
export const getGarmentById = async (id: string, token?: string, signal?: AbortSignal): Promise<ApiResponse<Garment>> => {
  try {
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
    return { data: result.data || result };
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
    bodyFields.isPublic = garmentData.isPublic ?? false;
    if (garmentData.isPublic && garmentData.listingType) {
      bodyFields.listingType = garmentData.listingType;
    }
    
    // On web, send JSON with base64 image to avoid Multer issues on Vercel serverless
    if (Platform.OS === 'web') {
      if (garmentData.image_url) {
        const imageUri = garmentData.image_url;
        // Convert image URI to base64 string
        if (imageUri.startsWith('data:')) {
          // Already a data URI — extract base64 part
          const base64Match = imageUri.match(/^data:image\/\w+;base64,(.+)$/);
          if (base64Match) {
            bodyFields.imageBase64 = base64Match[1];
          }
        } else {
          // Blob URI — fetch and convert to base64
          const blobResp = await fetch(imageUri);
          const blob = await blobResp.blob();
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result as string;
              const base64Match = result.match(/^data:image\/\w+;base64,(.+)$/);
              resolve(base64Match ? base64Match[1] : result);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          bodyFields.imageBase64 = base64;
        }
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
      const garment = result.data || result;
      if (garment) {
        garment.image_url = garment.imageUrl || garment.image_url || garment.image || '';
      }
      
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
    
    // Append image on mobile
    if (garmentData.image_url) {
      formData.append('image', {
        uri: garmentData.image_url,
        type: 'image/jpeg',
        name: 'garment.jpg',
      } as any);
    }
    
    formData.append('is_public', String(garmentData.isPublic ?? false));
    if (garmentData.isPublic && garmentData.listingType) {
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
    
    // Mapear la respuesta del backend al formato del frontend
    const garment = result.data || result;
    if (garment) {
      garment.image_url = garment.imageUrl || garment.image_url || garment.image || '';
    }
    
    return { data: garment };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Error desconocido' };
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
      body.is_public = updates.isPublic;
      // Solo enviar listing_type cuando is_public es true y listingType tiene valor
      if (updates.isPublic && updates.listingType) {
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
    
    // Mapear la respuesta del backend al formato del frontend
    const garment = result.data || result;
    if (garment) {
      garment.image_url = garment.imageUrl || garment.image_url || garment.image || '';
    }
    
    return { data: garment };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Error desconocido' };
  }
};

/**
 * Elimina una prenda
 */
export const deleteGarment = async (id: string, token?: string): Promise<ApiResponse<void>> => {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }    const response = await fetchWithTimeout(`${API_URL}/garments/${id}`, {
      method: 'DELETE',
      headers,
      timeout: 10000,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { error: `Error al eliminar prenda (${response.status})` };
    }

    const result = await response.json();
    
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



