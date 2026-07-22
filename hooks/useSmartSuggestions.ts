/**
 * useSmartSuggestions Hook
 * Orchestrates hybrid suggestion engine: AI-generated + user's least-worn outfits.
 * Computes ratio from outfit count, loads KB patterns, picks user suggestions,
 * fetches AI suggestions (with optional occasion hint), and merges + dedupes.
 */

import { useState, useEffect, useRef } from 'react';
import type { Suggestion, CalendarLogEntry, Garment, SuggestionsResponse } from '@/types';
import { useOutfitsStore } from '@/store/outfitsStore';
import { useSuggestionsStore } from '@/store/suggestionsStore';
import { getKnowledgeBase } from '@/lib/knowledgeBase';
import { pickUserSuggestions } from '@/lib/userSuggestionPicker';
import { apiClient } from '@/utils/apiClient';
import i18n from '@/lib/i18n';

// ==================== RATIO COMPUTATION ====================

interface RatioResult {
  aiCount: number;
  userCount: number;
}

function computeRatio(outfitCount: number): RatioResult {
  if (outfitCount <= 5) return { aiCount: 3, userCount: 1 };
  if (outfitCount <= 15) return { aiCount: 2, userCount: 2 };
  return { aiCount: 1, userCount: 3 };
}

// ==================== DEDUPE ====================

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

// ==================== CALENDAR ENTRIES LOADER ====================

/**
 * Loads calendar entries for the current month and 2 previous months via direct API call.
 * Does NOT mutate calendarStore state.
 */
async function loadLast3MonthsEntries(): Promise<CalendarLogEntry[]> {
  const now = new Date();
  const allEntries: CalendarLogEntry[] = [];

  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = d.getMonth() + 1;
    const year = d.getFullYear();

    try {
      const result = await apiClient.get<CalendarLogEntry[]>(
        `/calendar?month=${month}&year=${year}`,
      );
      if (result.data) {
        allEntries.push(...result.data);
      }
    } catch {
      // Skip failed month
    }
  }

  return allEntries;
}

// ==================== AI FETCH WITH OCCASION ====================

/**
 * Fetches AI suggestions from the API with optional occasion hint.
 * Handles location similarly to suggestionsStore.fetchSuggestions.
 */
async function fetchAISuggestions(
  preferredOccasion?: string,
): Promise<{ suggestions: Suggestion[]; garments: Garment[] }> {
  // Try to get location
  let lat: number | undefined;
  let lon: number | undefined;

  try {
    const Location = require('expo-location');
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      });
      lat = position.coords.latitude;
      lon = position.coords.longitude;
    }
  } catch {
    // Location unavailable — proceed without
  }

  let endpoint = '/outfits/suggestions';
  const params: string[] = [];

  if (lat !== undefined && lon !== undefined) {
    params.push(`lat=${lat}`, `lon=${lon}`);
  }

  const locale = i18n.locale;
  params.push(`locale=${locale}`);

  if (preferredOccasion) {
    params.push(`preferredOccasion=${encodeURIComponent(preferredOccasion)}`);
  }

  endpoint += `?${params.join('&')}`;

  const result = await apiClient.get<SuggestionsResponse>(endpoint);

  if (result.error) {
    // Retry without location if initial request failed
    if (lat !== undefined && lon !== undefined) {
      const fallbackParams = [`locale=${locale}`];
      if (preferredOccasion) {
        fallbackParams.push(`preferredOccasion=${encodeURIComponent(preferredOccasion)}`);
      }
      const fallbackResult = await apiClient.get<SuggestionsResponse>(
        `/outfits/suggestions?${fallbackParams.join('&')}`,
      );
      if (fallbackResult.data) {
        return {
          suggestions: fallbackResult.data.suggestions ?? [],
          garments: fallbackResult.data.garments ?? [],
        };
      }
    }
    throw new Error(result.error);
  }

  if (!result.data) {
    throw new Error('No data received');
  }

  return {
    suggestions: result.data.suggestions ?? [],
    garments: result.data.garments ?? [],
  };
}

// ==================== HOOK ====================

export function useSmartSuggestions(): {
  suggestions: Suggestion[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const outfits = useOutfitsStore((s) => s.outfits);
  const setUserSuggestions = useSuggestionsStore((s) => s.setUserSuggestions);
  const setMergedSuggestions = useSuggestionsStore((s) => s.setMergedSuggestions);

  // Ref to track if we've already loaded for this outfit count
  const loadedCountRef = useRef<number>(-1);
  // Ref to track if component is still mounted
  const mountedRef = useRef(true);

  // Expose a refresh() to force re-fetch from the UI
  const refresh = () => {
    loadedCountRef.current = -1;
    setRefreshKey((k) => k + 1);
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const outfitCount = outfits.length;

    // 0 outfits → empty, no calls
    if (outfitCount === 0) {
      setSuggestions([]);
      setIsLoading(false);
      setError(null);
      setUserSuggestions([]);
      setMergedSuggestions([]);
      loadedCountRef.current = 0;
      return;
    }

    // Skip if we already loaded for this exact count (avoid redundant fetches)
    if (loadedCountRef.current === outfitCount) {
      return;
    }

    loadedCountRef.current = outfitCount;

    let cancelled = false;

    async function load() {
      if (!mountedRef.current) return;

      setIsLoading(true);
      setError(null);

      try {
        // 1. Compute ratio
        const { aiCount, userCount } = computeRatio(outfitCount);
        const actualUserCount = Math.min(userCount, outfits.length);
        const actualAiCount = 4 - actualUserCount;

        // 2. Load calendar entries (for user picker + KB)
        const entries = await loadLast3MonthsEntries();

        if (cancelled) return;

        // 3. Get KB patterns
        const kb = await getKnowledgeBase();

        if (cancelled) return;

        // 4. Pick user suggestions
        const userSugs = pickUserSuggestions(outfits, entries, actualUserCount);
        setUserSuggestions(userSugs);

        // 5. Determine occasion hint (70% chance if KB has data)
        let occasionHint: string | undefined;
        if (kb.hasEnoughData && kb.patterns) {
          const dayOfWeek = (new Date().getDay() + 6) % 7; // Convert JS 0=Sun to 0=Mon
          const todayPattern = kb.patterns[dayOfWeek];
          if (todayPattern?.topOccasion && Math.random() < 0.7) {
            occasionHint = todayPattern.topOccasion;
          }
        }

        if (cancelled) return;

        // 6. Fetch AI suggestions
        let aiSugs: Suggestion[] = [];
        let aiGarments: Garment[] = [];

        if (actualAiCount > 0) {
          try {
            const aiResult = await fetchAISuggestions(occasionHint);
            aiSugs = aiResult.suggestions;
            aiGarments = aiResult.garments;
          } catch (err) {
            // AI fetch failed — return empty suggestions (spec REQ-SS-6)
            if (!cancelled) {
              setError(err instanceof Error ? err.message : 'AI fetch failed');
              setSuggestions([]);
              setUserSuggestions([]);
              setMergedSuggestions([]);
              setIsLoading(false);
            }
            return; // Don't merge user suggestions on API failure
          }
        }

        if (cancelled) return;

        // 7. Merge garments: AI garments + garments from user suggestion outfits
        // Ensure garments are resolved: use outfit.garments objects, or fetch by garmentIds
        const userGarments: Garment[] = [];
        const missingGarmentIds = new Set<string>();

        for (const s of userSugs) {
          for (const outfit of outfits) {
            const outfitGarmentIds = outfit.garmentIds?.length
              ? outfit.garmentIds
              : outfit.garments?.map((g) => g.id) ?? [];

            for (const gid of outfitGarmentIds) {
              if (s.garmentIds.includes(gid) && !userGarments.some((ug) => ug.id === gid)) {
                const fullGarment = outfit.garments?.find((g) => g.id === gid);
                if (fullGarment) {
                  userGarments.push(fullGarment);
                } else {
                  missingGarmentIds.add(gid);
                }
              }
            }
          }
        }

        // Fetch any missing garments from the API
        if (missingGarmentIds.size > 0) {
          try {
            const ids = Array.from(missingGarmentIds);
            const garmentsRes = await apiClient.get<Garment[]>(
              `/garments?id=in.(${ids.join(',')})`,
            );
            if (garmentsRes.data) {
              userGarments.push(...garmentsRes.data);
            }
          } catch {
            // Non-critical: suggestions will show without images for missing garments
          }
        }

        // Dedupe garments by id
        const allGarmentMap = new Map<string, Garment>();
        for (const g of [...aiGarments, ...userGarments]) {
          if (!allGarmentMap.has(g.id)) {
            allGarmentMap.set(g.id, g);
          }
        }

        // Update store garments so suggestionGarments.find() works for user suggestions
        useSuggestionsStore.setState({
          garments: Array.from(allGarmentMap.values()),
        });

        if (cancelled) return;

        // 8. Merge suggestions: AI first, then user, dedupe, limit to 4
        const allSugs = [...aiSugs, ...userSugs];
        const merged = dedupeSuggestions(allSugs);

        // 9. Write to store
        setMergedSuggestions(merged);
        setSuggestions(merged);

        if (!cancelled) {
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setSuggestions([]);
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [outfits.length, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return { suggestions, isLoading, error, refresh };
}
