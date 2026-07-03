/**
 * Suggestions Store
 * Store global para sugerencias de outfits con clima
 */

import { create } from 'zustand';
import * as Location from 'expo-location';
import type { Suggestion, Garment, WeatherData, SuggestionsResponse } from '@/types';
import { apiClient } from '@/utils/apiClient';
import i18n from '@/lib/i18n';

interface SuggestionsState {
  suggestions: Suggestion[];
  garments: Garment[];
  weather: WeatherData | null;
  isLoading: boolean;
  error: string | null;
  message: string | null;
  lastUpdated: Date | null;

  // Pin & Regenerate state
  pinnedGarmentIds: Record<number, string[]>; // keyed by suggestion index 0-2
  isRegenerating: boolean;

  // Actions
  fetchSuggestions: (lat?: number, lon?: number) => Promise<void>;
  clearSuggestions: () => void;
  togglePin: (suggestionIndex: number, garmentId: string, category: string) => boolean;
  clearPins: () => void;
  regenerateWithPinned: (suggestionIndex: number) => Promise<void>;
}

/**
 * Deduplica sugerencias y limita a 3 outfits diferentes.
 * Dos sugerencias son iguales si tienen los mismos garmentIds.
 */
function dedupeSuggestions(suggestions: Suggestion[]): Suggestion[] {
  const seen = new Set<string>();
  return suggestions
    .filter((s) => {
      const key = [...(s.garmentIds ?? [])].sort().join(',');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 3);
}

/**
 * Filtra mensajes técnicos para que no lleguen al usuario.
 * Si el mensaje parece un error interno (tokens, quota, etc.), devuelve null
 * para que la UI muestre el texto amigable por defecto.
 */
function sanitizeMessage(msg: string | null): string | null {
  if (!msg) return null;
  const technicalKeywords = /token|quota|limit|rate.?limit|429|500|timeout|exceeded|error|fail/i;
  if (technicalKeywords.test(msg) || msg.length > 200) {
    return null;
  }
  return msg;
}

const initialState = {
  suggestions: [],
  garments: [],
  weather: null,
  isLoading: false,
  error: null,
  message: null,
  lastUpdated: null,
  pinnedGarmentIds: {},
  isRegenerating: false,
};

export const useSuggestionsStore = create<SuggestionsState>((set, get) => ({
  ...initialState,

  fetchSuggestions: async (lat?: number, lon?: number) => {
    const state = get();

    // Cache diario en FE: si ya tenemos sugerencias de hoy, no llamar a la API
    if (state.lastUpdated && state.suggestions.length > 0) {
      const today = new Date().toDateString();
      const lastUpdateDay = new Date(state.lastUpdated).toDateString();
      if (today === lastUpdateDay && !state.error) {
        return;
      }
    }

    set({ isLoading: true, error: null, message: null });

    try {
      // If coordinates not provided, try to get them via expo-location
      let queryLat = lat;
      let queryLon = lon;

      if (queryLat === undefined || queryLon === undefined) {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            console.warn('⚠️ Location permission denied, fetching suggestions without location');
          } else {
            const position = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Low,
            });
            queryLat = position.coords.latitude;
            queryLon = position.coords.longitude;
          }
        } catch {
          console.warn('⚠️ Geolocation unavailable, fetching suggestions without location');
        }
      }

      let endpoint = `/outfits/suggestions`;
      if (queryLat !== undefined && queryLon !== undefined) {
        endpoint += `?lat=${queryLat}&lon=${queryLon}`;
      }

      const locale = i18n.locale;
      endpoint += `${endpoint.includes('?') ? '&' : '?'}locale=${locale}`;

      const result = await apiClient.get<SuggestionsResponse>(endpoint);

      if (result.error) {
        if (queryLat !== undefined && queryLon !== undefined) {
          console.warn('⚠️ Suggestions with coords failed, retrying without location');
          const fallbackResult = await apiClient.get<SuggestionsResponse>(`/outfits/suggestions?locale=${locale}`);
          if (fallbackResult.error) {
            set({ isLoading: false, error: fallbackResult.error, message: null });
            return;
          }
          if (fallbackResult.data) {
            const deduped = dedupeSuggestions(fallbackResult.data.suggestions ?? []);
            set({
              suggestions: deduped,
              garments: fallbackResult.data.garments ?? [],
              weather: fallbackResult.data.weather ?? null,
              message: sanitizeMessage(fallbackResult.data.message ?? null),
              isLoading: false,
              lastUpdated: new Date(),
            });
            return;
          }
        }
        set({ isLoading: false, error: result.error, message: null });
        return;
      }

      if (result.data) {
        const deduped = dedupeSuggestions(result.data.suggestions ?? []);
        set({
          suggestions: deduped,
          garments: result.data.garments ?? [],
          weather: result.data.weather ?? null,
          message: sanitizeMessage(result.data.message ?? null),
          isLoading: false,
          lastUpdated: new Date(),
        });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      set({ isLoading: false, error: errorMsg, message: null });
    }
  },

  clearSuggestions: () => set(initialState),

  togglePin: (suggestionIndex: number, garmentId: string, category: string): boolean => {
    const state = get();
    const currentPins = state.pinnedGarmentIds[suggestionIndex] || [];

    // If already pinned → unpin
    if (currentPins.includes(garmentId)) {
      set({
        pinnedGarmentIds: {
          ...state.pinnedGarmentIds,
          [suggestionIndex]: currentPins.filter((id) => id !== garmentId),
        },
      });
      return true;
    }

    // Check same-category constraint within this suggestion
    const hasSameCategory = currentPins.some((pinnedId) => {
      const g = state.garments.find((g) => g.id === pinnedId);
      return g && g.category === category;
    });

    if (hasSameCategory) {
      return false; // Rejected — same category already pinned
    }

    set({
      pinnedGarmentIds: {
        ...state.pinnedGarmentIds,
        [suggestionIndex]: [...currentPins, garmentId],
      },
    });
    return true;
  },

  clearPins: () => set({ pinnedGarmentIds: {} }),

  regenerateWithPinned: async (suggestionIndex: number) => {
    const state = get();
    const pinnedIds = state.pinnedGarmentIds[suggestionIndex];

    if (!pinnedIds || pinnedIds.length === 0) return;

    set({ isRegenerating: true, error: null });

    try {
      const locale = i18n.locale;
      const endpoint = `/outfits/suggestions?preferredGarmentIds=${pinnedIds.join(',')}&locale=${locale}`;

      const result = await apiClient.get<SuggestionsResponse>(endpoint);

      if (result.error) {
        set({ isRegenerating: false, error: result.error });
        return;
      }

      if (result.data) {
        // If all categories already pinned, don't change suggestions
        if (result.data.allPinned) {
          set({ isRegenerating: false, message: result.data.message ?? null });
          return;
        }

        const newSuggestions = dedupeSuggestions(result.data.suggestions ?? []);
        const currentPins = get().pinnedGarmentIds[suggestionIndex] || [];

        // Merge: keep pinned items, add regenerated items for unpinned slots
        if (newSuggestions.length > 0 && currentPins.length > 0) {
          const targetIndex = Math.min(suggestionIndex, newSuggestions.length - 1);
          const mergedIds = [
            ...currentPins,
            ...newSuggestions[targetIndex].garmentIds.filter(
              (id) => !currentPins.includes(id),
            ),
          ];

          newSuggestions[targetIndex] = {
            ...newSuggestions[targetIndex],
            garmentIds: mergedIds,
          };
        }

        set({
          suggestions: newSuggestions,
          garments: result.data.garments ?? [],
          weather: result.data.weather ?? state.weather,
          message: sanitizeMessage(result.data.message ?? null),
          isRegenerating: false,
          lastUpdated: new Date(),
        });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      set({ isRegenerating: false, error: errorMsg });
    }
  },
}));
