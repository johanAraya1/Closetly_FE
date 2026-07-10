/**
 * Mix Outfit Store
 * Store para el flujo de Outfit Mixto IA
 * Independiente de suggestionsStore para no acoplar flujos
 */

import { create } from 'zustand';
import type { Suggestion, Garment, SuggestionsResponse } from '@/types';
import { apiClient } from '@/utils/apiClient';
import i18n from '@/lib/i18n';

interface MixOutfitState {
  mixSuggestion: Suggestion | null;
  mixGarments: Garment[];
  mixLoading: boolean;
  mixError: string | null;

  /** Llama al endpoint con los IDs de las prendas base */
  mixOutfit: (baseGarmentIds: string[]) => Promise<void>;
  /** Resetea todo el estado del store */
  clearMix: () => void;
}

const initialState = {
  mixSuggestion: null,
  mixGarments: [],
  mixLoading: false,
  mixError: null,
};

export const useMixOutfitStore = create<MixOutfitState>((set) => ({
  ...initialState,

  clearMix: () => set(initialState),

  mixOutfit: async (baseGarmentIds: string[]) => {
    if (!baseGarmentIds || baseGarmentIds.length === 0) return;

    set({ mixLoading: true, mixError: null, mixSuggestion: null, mixGarments: [] });

    try {
      const locale = i18n.locale;
      const endpoint = `/outfits/suggestions?preferredGarmentIds=${baseGarmentIds.join(',')}&locale=${locale}`;

      const result = await apiClient.get<SuggestionsResponse>(endpoint);

      if (result.error) {
        set({ mixLoading: false, mixError: result.error });
        return;
      }

      if (result.data) {
        const suggestions = result.data.suggestions ?? [];
        const first = suggestions.length > 0 ? suggestions[0] : null;

        set({
          mixSuggestion: first,
          mixGarments: result.data.garments ?? [],
          mixLoading: false,
        });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      set({ mixLoading: false, mixError: errorMsg });
    }
  },
}));
