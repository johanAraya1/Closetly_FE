/**
 * Calendar Store
 * Store global para gestionar el calendario de outfits
 */

import { create } from 'zustand';
import type { CalendarLogEntry } from '@/types';
import * as calendarService from '@/services/calendarService';

interface CalendarState {
  entries: CalendarLogEntry[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  selectedMonth: number;
  selectedYear: number;

  loadMonth: (month: number, year: number) => Promise<void>;
  logOutfit: (outfitId: string, date: string) => Promise<boolean>;
  deleteLog: (id: string) => Promise<boolean>;
  navigateMonth: (delta: number) => void;
  setToday: () => void;
  clearError: () => void;
}

const now = new Date();

const initialState = {
  entries: [],
  isLoading: false,
  isSaving: false,
  error: null,
  selectedMonth: now.getMonth() + 1, // 1-based
  selectedYear: now.getFullYear(),
};

export const useCalendarStore = create<CalendarState>((set, get) => ({
  ...initialState,

  loadMonth: async (month: number, year: number) => {
    set({ isLoading: true, error: null, selectedMonth: month, selectedYear: year });

    const result = await calendarService.getCalendar(month, year);

    if (result.error) {
      set({ isLoading: false, error: result.error });
      return;
    }

    if (result.data) {
      set({ entries: result.data, isLoading: false });
    }
  },

  logOutfit: async (outfitId: string, date: string) => {
    set({ isSaving: true, error: null });

    const result = await calendarService.logOutfit(outfitId, date);

    if (result.error) {
      set({ isSaving: false, error: result.error });
      return false;
    }

    // Recargar el mes actual para reflejar cambios
    const { selectedMonth, selectedYear } = get();
    await get().loadMonth(selectedMonth, selectedYear);
    set({ isSaving: false });

    return true;
  },

  deleteLog: async (id: string) => {
    const result = await calendarService.deleteLog(id);

    if (result.error) {
      set({ error: result.error });
      return false;
    }

    // Remover del estado local
    set((state) => ({
      entries: state.entries.filter((entry) => entry.id !== id),
    }));

    return true;
  },

  navigateMonth: (delta: number) => {
    const { selectedMonth, selectedYear } = get();

    let newMonth = selectedMonth + delta;
    let newYear = selectedYear;

    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    } else if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }

    get().loadMonth(newMonth, newYear);
  },

  setToday: () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    get().loadMonth(month, year);
  },

  clearError: () => set({ error: null }),
}));
