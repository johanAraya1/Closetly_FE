/**
 * Suggestions Store
 * Store global para sugerencias de outfits con clima
 */

import { create } from 'zustand';
import type { Suggestion, Garment, WeatherData, SuggestionsResponse } from '@/types';
import { apiClient } from '@/utils/apiClient';

interface SuggestionsState {
  suggestions: Suggestion[];
  garments: Garment[];
  weather: WeatherData | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;

  // Actions
  fetchSuggestions: (lat?: number, lon?: number) => Promise<void>;
  clearSuggestions: () => void;
}

const initialState = {
  suggestions: [],
  garments: [],
  weather: null,
  isLoading: false,
  error: null,
  lastUpdated: null,
};

export const useSuggestionsStore = create<SuggestionsState>((set, get) => ({
  ...initialState,

  fetchSuggestions: async (lat?: number, lon?: number) => {
    set({ isLoading: true, error: null });

    try {
      // If coordinates not provided, try to get them via geolocation
      let queryLat = lat;
      let queryLon = lon;

      if (queryLat === undefined || queryLon === undefined) {
        try {
          const position = await new Promise<GeolocationPosition>(
            (resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                timeout: 5000,
                enableHighAccuracy: false,
              });
            },
          );
          queryLat = position.coords.latitude;
          queryLon = position.coords.longitude;
        } catch {
          // Geolocation failed — call without coordinates
          console.warn('⚠️ Geolocation unavailable, fetching suggestions without location');
        }
      }

      let endpoint = '/outfits/suggestions';
      if (queryLat !== undefined && queryLon !== undefined) {
        endpoint += `?lat=${queryLat}&lon=${queryLon}`;
      }

      const result = await apiClient.get<SuggestionsResponse>(endpoint);

      if (result.error) {
        // If failed with coordinates, try without them
        if (queryLat !== undefined && queryLon !== undefined) {
          console.warn('⚠️ Suggestions with coords failed, retrying without location');
          const fallbackResult = await apiClient.get<SuggestionsResponse>('/outfits/suggestions');
          if (fallbackResult.error) {
            set({ isLoading: false, error: fallbackResult.error });
            return;
          }
          if (fallbackResult.data) {
            set({
              suggestions: fallbackResult.data.suggestions ?? [],
              garments: fallbackResult.data.garments ?? [],
              weather: fallbackResult.data.weather ?? null,
              isLoading: false,
              lastUpdated: new Date(),
            });
            return;
          }
        }
        set({ isLoading: false, error: result.error });
        return;
      }

      if (result.data) {
        set({
          suggestions: result.data.suggestions ?? [],
          garments: result.data.garments ?? [],
          weather: result.data.weather ?? null,
          isLoading: false,
          lastUpdated: new Date(),
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ isLoading: false, error: message });
    }
  },

  clearSuggestions: () => set(initialState),
}));
