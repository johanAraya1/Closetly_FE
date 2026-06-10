/**
 * Calendar Service
 * Servicio para gestionar el calendario de outfits
 */

import { apiClient } from '@/utils/apiClient';
import type { CalendarLogEntry, ApiResponse } from '@/types';

/**
 * Registra un outfit en una fecha del calendario
 */
export const logOutfit = async (
  outfitId: string,
  date: string
): Promise<ApiResponse<CalendarLogEntry>> => {
  try {
    const response = await apiClient.post<CalendarLogEntry>('/calendar/log', {
      outfitId,
      date,
    });

    return response;
  } catch (error) {
    console.error('❌ Error logging outfit to calendar:', error);
    return { error: 'Failed to log outfit to calendar' };
  }
};

/**
 * Obtiene las entradas del calendario para un mes y año específicos
 */
export const getCalendar = async (
  month: number,
  year: number
): Promise<ApiResponse<CalendarLogEntry[]>> => {
  try {
    const response = await apiClient.get<CalendarLogEntry[]>(
      `/calendar?month=${month}&year=${year}`
    );

    return response;
  } catch (error) {
    console.error('❌ Error fetching calendar:', error);
    return { error: 'Failed to load calendar' };
  }
};

/**
 * Elimina una entrada del calendario por su ID
 */
export const deleteLog = async (id: string): Promise<ApiResponse<void>> => {
  try {
    const response = await apiClient.delete<void>(`/calendar/${id}`);

    return response;
  } catch (error) {
    console.error('❌ Error deleting calendar entry:', error);
    return { error: 'Failed to delete calendar entry' };
  }
};
