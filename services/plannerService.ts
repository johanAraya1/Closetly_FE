/**
 * Planner Service
 * Servicio para gestionar el planificador semanal de outfits
 */

import { apiClient } from '@/utils/apiClient';
import type { WeeklyPlanDay, UpsertPlanEntry, ApiResponse } from '@/types';

/**
 * Obtiene el plan semanal para una semana específica
 */
export const getWeeklyPlan = async (
  weekStart: string
): Promise<ApiResponse<{ plan: WeeklyPlanDay[]; weekStart: string }>> => {
  return apiClient.get<{ plan: WeeklyPlanDay[]; weekStart: string }>(
    `/plans?weekStart=${weekStart}`
  );
};

/**
 * Asigna/actualiza outfits en el plan semanal
 */
export const upsertPlan = async (
  weekStart: string,
  entries: UpsertPlanEntry[]
): Promise<ApiResponse<{ plan: WeeklyPlanDay[]; weekStart: string }>> => {
  return apiClient.put<{ plan: WeeklyPlanDay[]; weekStart: string }>('/plans', {
    weekStart,
    entries,
  });
};

/**
 * Elimina un outfit asignado a un día específico
 * DELETE con body — el apiClient soporta body vía ApiRequestOptions (extends RequestInit)
 */
export const clearPlanDay = async (
  weekStart: string,
  dayOfWeek: number
): Promise<ApiResponse<void>> => {
  return apiClient.delete('/plans', {
    body: JSON.stringify({ weekStart, dayOfWeek }),
  });
};
