/**
 * Planner Store
 * Store global para el planificador semanal de outfits
 */

import { create } from 'zustand';
import type { WeeklyPlanDay, UpsertPlanEntry } from '@/types';
import * as plannerService from '@/services/plannerService';
import * as calendarService from '@/services/calendarService';
import { addDays, parseLocalDate, getMondayOfWeek } from '@/utils/date';

interface PlannerState {
  plan: WeeklyPlanDay[];
  weekStart: string;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  loadPlan: (weekStart?: string) => Promise<void>;
  assignOutfit: (dayOfWeek: number, outfitId: string) => Promise<void>;
  removeOutfit: (dayOfWeek: number) => Promise<void>;
  goToNextWeek: () => void;
  goToPrevWeek: () => void;
  goToCurrentWeek: () => void;
}

const initialState = {
  plan: [],
  weekStart: getMondayOfWeek(),
  isLoading: false,
  isSaving: false,
  error: null,
};

export const usePlannerStore = create<PlannerState>((set, get) => ({
  ...initialState,

  loadPlan: async (weekStart?: string) => {
    const ws = weekStart || get().weekStart;
    set({ isLoading: true, error: null, weekStart: ws });

    try {
      const result = await plannerService.getWeeklyPlan(ws);

      if (result.error) {
        set({ isLoading: false, error: result.error });
        return;
      }

      if (result.data) {
        set({
          plan: Array.isArray(result.data.plan) ? result.data.plan : [],
          weekStart: result.data.weekStart || ws,
          isLoading: false,
        });
      } else {
        set({ isLoading: false, plan: [] });
      }
    } catch (err) {
      set({
        isLoading: false,
        error: (err as Error)?.message || 'Failed to load plan',
        plan: [],
      });
    }
  },

  assignOutfit: async (dayOfWeek: number, outfitId: string) => {
    const { plan, weekStart } = get();

    // Optimistic update: find or create the day entry
    const existingIndex = plan.findIndex((d) => d.dayOfWeek === dayOfWeek);
    const tempId = `temp-${Date.now()}`;

    set((state) => {
      const updated = [...state.plan];
      if (existingIndex >= 0) {
        updated[existingIndex] = {
          ...updated[existingIndex],
          outfit: { id: outfitId, name: '...', garments: [] },
        };
      } else {
        updated.push({
          id: tempId,
          dayOfWeek,
          outfit: { id: outfitId, name: '...', garments: [] },
        });
      }
      return { plan: updated, isSaving: true, error: null };
    });

    const entries: UpsertPlanEntry[] = [{ dayOfWeek, outfitId }];
    const result = await plannerService.upsertPlan(weekStart, entries);

    if (result.error) {
      // Rollback: reload the plan
      set({ isSaving: false, error: result.error });
      get().loadPlan(weekStart);
      return;
    }

    if (result.data) {
      set({ plan: result.data.plan, isSaving: false });

      // Sync to calendar silently (fire-and-forget)
      const dateStr = addDays(weekStart, dayOfWeek);
      calendarService.logOutfit(outfitId, dateStr).catch(() => {});
    } else {
      set({ isSaving: false });
    }
  },

  removeOutfit: async (dayOfWeek: number) => {
    const { plan, weekStart } = get();

    // Optimistic update: remove the outfit from the day
    const previousPlan = [...plan];
    set((state) => ({
      plan: state.plan.map((d) =>
        d.dayOfWeek === dayOfWeek ? { ...d, outfit: null } : d
      ),
      isSaving: true,
      error: null,
    }));

    const result = await plannerService.clearPlanDay(weekStart, dayOfWeek);

    if (result.error) {
      // Rollback
      set({ plan: previousPlan, isSaving: false, error: result.error });
      return;
    }

    // Reload to get fresh server state
    set({ isSaving: false });
    get().loadPlan(weekStart);

    // Sync: remove from calendar silently (fire-and-forget)
    const dateStr = addDays(weekStart, dayOfWeek);
    const d = parseLocalDate(dateStr);
    calendarService.getCalendar(d.getMonth() + 1, d.getFullYear()).then((res) => {
      const entry = res.data?.find((e) => e.date === dateStr);
      if (entry) {
        calendarService.deleteLog(entry.id).catch(() => {});
      }
    }).catch(() => {});
  },

  goToNextWeek: () => {
    const { weekStart } = get();
    const nextMonday = addDays(weekStart, 7);
    set({ weekStart: nextMonday });
    get().loadPlan(nextMonday);
  },

  goToPrevWeek: () => {
    const { weekStart } = get();
    const prevMonday = addDays(weekStart, -7);
    set({ weekStart: prevMonday });
    get().loadPlan(prevMonday);
  },

  goToCurrentWeek: () => {
    const currentMonday = getMondayOfWeek();
    set({ weekStart: currentMonday });
    get().loadPlan(currentMonday);
  },
}));
