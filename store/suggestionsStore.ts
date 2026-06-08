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
  message: null,
  lastUpdated: null,
};

export const useSuggestionsStore = create<SuggestionsState>((set, get) => ({
  ...initialState,

  fetchSuggestions: async (lat?: number, lon?: number) => {
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
              accuracy: Location.Accuracy.Low, // Low = ~3km, fast, no GPS needed
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

      // Add locale for localized AI responses
      const locale = i18n.locale;
      endpoint += `${endpoint.includes('?') ? '&' : '?'}locale=${locale}`;

      const result = await apiClient.get<SuggestionsResponse>(endpoint);

      if (result.error) {
        // If failed with coordinates, try without them
        if (queryLat !== undefined && queryLon !== undefined) {
          console.warn('⚠️ Suggestions with coords failed, retrying without location');
          const fallbackResult = await apiClient.get<SuggestionsResponse>(`/outfits/suggestions?locale=${locale}`);
          if (fallbackResult.error) {
            set({ isLoading: false, error: fallbackResult.error, message: null });
            return;
          }
          if (fallbackResult.data) {
            set({
              suggestions: fallbackResult.data.suggestions ?? [],
              garments: fallbackResult.data.garments ?? [],
              weather: fallbackResult.data.weather ?? null,
              message: fallbackResult.data.message ?? null,
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
        set({
          suggestions: result.data.suggestions ?? [],
          garments: result.data.garments ?? [],
          weather: result.data.weather ?? null,
          message: result.data.message ?? null,
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
}));
