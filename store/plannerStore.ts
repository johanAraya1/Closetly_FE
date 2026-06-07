/**
 * Planner Store
 * Store global para el planificador semanal de outfits
 */

import { create } from 'zustand';
import type { WeeklyPlanDay, UpsertPlanEntry } from '@/types';
import * as plannerService from '@/services/plannerService';

/**
 * Calcula el lunes de la semana para una fecha dada
 */
function getMondayOfWeek(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon...
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust to Monday
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

/**
 * Suma/resta días a una fecha ISO string
 */
function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

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

    const result = await plannerService.getWeeklyPlan(ws);

    if (result.error) {
      set({ isLoading: false, error: result.error });
      return;
    }

    if (result.data) {
      set({
        plan: result.data.plan,
        weekStart: result.data.weekStart,
        isLoading: false,
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
