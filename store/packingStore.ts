/**
 * Packing Store
 * Store global para generación de listas de empaque inteligentes
 */

import { create } from 'zustand';
import type { PackingSuggestion, PackingFormData } from '@/types';
import { apiClient } from '@/utils/apiClient';

interface PackingState {
  packingList: PackingSuggestion | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;

  generatePackingList: (data: PackingFormData) => Promise<void>;
  clearPackingList: () => void;
}

const initialState = {
  packingList: null,
  isLoading: false,
  error: null,
  lastUpdated: null,
};

export const usePackingStore = create<PackingState>((set) => ({
  ...initialState,

  generatePackingList: async (data: PackingFormData) => {
    set({ isLoading: true, error: null });

    try {
      // Try geolocation for weather automatically
      let payload = { ...data };

      if (!payload.lat || !payload.lon) {
        try {
          const position = await new Promise<GeolocationPosition>(
            (resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                timeout: 5000,
                enableHighAccuracy: false,
              });
            },
          );
          payload.lat = position.coords.latitude;
          payload.lon = position.coords.longitude;
        } catch {
          // Geolocation failed — proceed without coordinates
          console.warn('⚠️ Geolocation unavailable, generating packing list without location');
        }
      }

      const result = await apiClient.post<PackingSuggestion>('/outfits/packing-suggestions', payload);

      if (result.error) {
        set({ isLoading: false, error: result.error });
        return;
      }

      if (result.data) {
        set({
          packingList: result.data,
          isLoading: false,
          lastUpdated: new Date(),
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ isLoading: false, error: message });
    }
  },

  clearPackingList: () => set(initialState),
}));
