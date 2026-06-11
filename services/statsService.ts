/**
 * Stats Service
 * Servicio para estadísticas de prendas, outfits y closet
 */

import { API_URL } from '@/lib/constants';
import { tokenService } from './tokenService';
import { fetchWithTimeout } from '@/utils/fetchUtils';

export interface GarmentStats {
  totalOutfits: number;
  totalTimesUsed: number;
  timesUsedLast7Days: number;
  timesUsedLast15Days: number;
  timesUsedLast30Days: number;
}

export interface OutfitMonthlyHistory {
  month: number;
  year: number;
  timesUsed: number;
}

export interface OutfitStats {
  timesUsed: number;
  lastUsed: string | null;
  timesUsedLast7Days: number;
  timesUsedLast15Days: number;
  timesUsedLast30Days: number;
  monthlyHistory: OutfitMonthlyHistory[];
}

export interface UsageSummaryEntry {
  outfitId: string;
  timesUsed: number;
  lastUsed: string | null;
}

/**
 * Obtiene estadísticas de una prenda específica
 */
export async function getGarmentStats(garmentId: string): Promise<GarmentStats> {
  const token = await tokenService.getAccessToken();
  if (!token) throw new Error('Not authenticated');

  const response = await fetchWithTimeout(`${API_URL}/stats/garments/${garmentId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch garment stats');
  }

  return response.json();
}

/**
 * Obtiene estadísticas de un outfit específico
 */
export async function getOutfitStats(outfitId: string): Promise<OutfitStats> {
  const token = await tokenService.getAccessToken();
  if (!token) throw new Error('Not authenticated');

  const response = await fetchWithTimeout(`${API_URL}/stats/outfits/${outfitId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch outfit stats');
  }

  return response.json();
}

/**
 * Obtiene resumen de uso de todos los outfits (outfitId -> timesUsed)
 */
export async function getOutfitsUsageSummary(): Promise<Record<string, UsageSummaryEntry>> {
  const token = await tokenService.getAccessToken();
  if (!token) throw new Error('Not authenticated');

  const response = await fetchWithTimeout(`${API_URL}/stats/outfits/usage-summary`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch usage summary');
  }

  return response.json();
}
