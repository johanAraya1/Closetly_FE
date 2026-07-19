/**
 * Suggestions Store
 * Store global para sugerencias de outfits con clima
 */

import { create } from 'zustand';
import * as Location from 'expo-location';
import { Alert } from 'react-native';
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

  // User & merged suggestions (hybrid engine)
  userSuggestions: Suggestion[];
  mergedSuggestions: Suggestion[];

  // Pin & Regenerate state
  pinnedGarmentIds: Record<number, string[]>; // keyed by suggestion index 0-3
  isRegenerating: boolean;

  // Actions
  fetchSuggestions: (lat?: number, lon?: number) => Promise<void>;
  clearSuggestions: () => void;
  setUserSuggestions: (suggestions: Suggestion[]) => void;
  setMergedSuggestions: (suggestions: Suggestion[]) => void;
  togglePin: (suggestionIndex: number, garmentId: string, category: string) => boolean;
  clearPins: () => void;
  regenerateWithPinned: (suggestionIndex: number) => Promise<void>;
}

/**
 * Deduplica sugerencias y limita a 4 outfits diferentes.
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
    .slice(0, 4);
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

/**
 * Merges new AI suggestions with existing suggestions, preserving user-sourced
 * suggestions at their original positions. AI suggestions fill remaining slots.
 */
function mergeWithUserPreserved(
  newAiSuggestions: Suggestion[],
  existingSuggestions: Suggestion[],
  userSuggestions: Suggestion[],
): Suggestion[] {
  if (userSuggestions.length === 0 && existingSuggestions.length === 0) {
    return newAiSuggestions;
  }

  // Build a map of user suggestions by garmentIds key for quick lookup
  const userKeys = new Set(
    userSuggestions.map((s) => [...s.garmentIds].sort().join(',')),
  );

  // Start with a slot array (max 4)
  const result: (Suggestion | null)[] = [null, null, null, null];

  // First pass: place user suggestions at their original positions
  for (let i = 0; i < existingSuggestions.length && i < 4; i++) {
    const existing = existingSuggestions[i];
    if (existing?.source === 'user') {
      const key = [...existing.garmentIds].sort().join(',');
      if (userKeys.has(key)) {
        result[i] = existing;
      }
    }
  }

  // Second pass: fill empty slots with new AI suggestions
  let aiIdx = 0;
  for (let i = 0; i < 4; i++) {
    if (result[i] === null && aiIdx < newAiSuggestions.length) {
      result[i] = newAiSuggestions[aiIdx];
      aiIdx++;
    }
  }

  // Filter out nulls (shouldn't happen with proper ratio, but defensive)
  return result.filter((s): s is Suggestion => s !== null);
}

const initialState = {
  suggestions: [],
  garments: [],
  weather: null,
  isLoading: false,
  error: null,
  message: null,
  lastUpdated: null,
  userSuggestions: [],
  mergedSuggestions: [],
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

  setUserSuggestions: (suggestions: Suggestion[]) => {
    set({ userSuggestions: suggestions });
  },

  setMergedSuggestions: (suggestions: Suggestion[]) => {
    set({ mergedSuggestions: suggestions });
  },

  togglePin: (suggestionIndex: number, garmentId: string, category: string): boolean => {
    // Only indices 0-3 are valid (max 4 suggestions)
    if (suggestionIndex > 3) return false;

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
    // Use mergedSuggestions if available, fall back to AI suggestions
    const activeSuggestions = state.mergedSuggestions.length > 0
      ? state.mergedSuggestions
      : state.suggestions;

    const targetSuggestion = activeSuggestions[suggestionIndex];

    // User-sourced suggestions cannot be regenerated via API
    if (targetSuggestion?.source === 'user') {
      set({ isRegenerating: false });
      Alert.alert('', i18n.t('suggestionPin.noRegenUser'));
      return;
    }

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

        const newAiSuggestions = dedupeSuggestions(result.data.suggestions ?? []);
        const currentPins = get().pinnedGarmentIds[suggestionIndex] || [];

        // Build the new merged list: preserve user suggestions, replace AI slots
        if (newAiSuggestions.length > 0 && currentPins.length > 0) {
          const targetIndex = Math.min(suggestionIndex, newAiSuggestions.length - 1);
          const mergedIds = [
            ...currentPins,
            ...newAiSuggestions[targetIndex].garmentIds.filter(
              (id) => !currentPins.includes(id),
            ),
          ];

          newAiSuggestions[targetIndex] = {
            ...newAiSuggestions[targetIndex],
            garmentIds: mergedIds,
          };
        }

        // Merge with user suggestions preserved at their positions
        const userSuggestions = state.userSuggestions;
        const finalSuggestions = mergeWithUserPreserved(
          newAiSuggestions,
          activeSuggestions,
          userSuggestions,
        );

        set({
          suggestions: newAiSuggestions,
          mergedSuggestions: finalSuggestions,
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
