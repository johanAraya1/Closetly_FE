/**
 * Marketplace Service
 * Servicio para el marketplace público de prendas
 * Endpoint público — no requiere autenticación
 */

import { API_URL } from '@/lib/constants';
import { fetchWithTimeout } from '@/utils/fetchUtils';
import type { Garment, PaginatedApiResponse } from '@/types';

const DEFAULT_PAGE_LIMIT = 20;

/**
 * Obtiene prendas públicas con paginación
 * @param page - Número de página (0-indexed)
 * @param limit - Cantidad de items por página
 */
export const getPublicGarments = async (
  page: number = 0,
  limit: number = DEFAULT_PAGE_LIMIT
): Promise<PaginatedApiResponse<Garment>> => {
  try {
    const offset = page * limit;
    const response = await fetchWithTimeout(
      `${API_URL}/garments/public?limit=${limit}&offset=${offset}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000,
      }
    );

    if (!response.ok) {
      return {
        data: [],
        total: 0,
        hasMore: false,
        error: `Error al cargar prendas públicas (${response.status})`,
      };
    }

    const result = await response.json();

    // Handle paginated response from backend: { data: [...], total, hasMore }
    if (result.data !== undefined && Array.isArray(result.data)) {
      const garments = result.data.map((item: any) => ({
        ...item,
        image_url: item.imageUrl || item.image_url || item.image || '',
        imageUrls: item.imageUrls || item.image_urls || (item.image_url ? [item.image_url] : []),
      }));

      return {
        data: garments,
        total: result.total ?? result.data.length,
        hasMore: result.hasMore ?? false,
      };
    }

    // Fallback: plain array response
    const items = (result || []).map((item: any) => ({
      ...item,
      image_url: item.imageUrl || item.image_url || item.image || '',
      imageUrls: item.imageUrls || item.image_urls || (item.image_url ? [item.image_url] : []),
    }));

    return { data: items, total: items.length, hasMore: false };
  } catch (error) {
    return {
      data: [],
      total: 0,
      hasMore: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
};
