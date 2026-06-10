/**
 * Random Outfit Generator
 * Pure algorithm that generates a random outfit from the user's garment collection,
 * filtered by occasion and optional weather data.
 *
 * Design: picks dress-first when available (replaces top+bottom),
 * then required top/bottom (if no dress), shoes, then optional outerwear/accessories.
 */

import { OCCASION_STYLE_MAP } from '@/lib/constants';
import type { Garment, GarmentSeason, GarmentStyle, WeatherData } from '@/types';

// ==================== Types ====================

export type Occasion = 'casual' | 'formal' | 'work' | 'sport' | 'date_night' | 'travel';

export interface RandomOutfitResult {
  outfit: Garment[];
  error?: string;
}

// ==================== Helpers ====================

/**
 * Derives compatible GarmentSeason values from a temperature in Celsius.
 * Follows the design spec: <10°C → winter, 10-20°C → spring/fall, >20°C → summer.
 */
function deriveSeasonsFromTemp(temp: number): GarmentSeason[] {
  if (temp < 10) return ['winter'];
  if (temp <= 20) return ['spring', 'fall'];
  return ['summer'];
}

/**
 * Checks whether a garment's season is compatible with a set of allowed seasons.
 * - No season set → always compatible
 * - 'all_season' → always compatible
 * - Array or single season → must overlap with compatibleSeasons
 */
function isSeasonCompatible(
  garmentSeason: GarmentSeason | GarmentSeason[] | undefined,
  compatibleSeasons: GarmentSeason[],
): boolean {
  if (!garmentSeason) return true;
  const seasons = Array.isArray(garmentSeason) ? garmentSeason : [garmentSeason];
  if (seasons.includes('all_season')) return true;
  return seasons.some((s) => compatibleSeasons.includes(s));
}

/**
 * Filters garments by occasion → style mapping and optional weather → season compatibility.
 * Returns the filtered pool for category-based random selection.
 */
function filterPool(
  garments: Garment[],
  occasion: Occasion,
  weather?: WeatherData | null,
): { pool: Garment[]; error?: string } {
  // Step 1: Occasion filter — match garment style against occasion's allowed styles
  const allowedStyles = OCCASION_STYLE_MAP[occasion];
  if (!allowedStyles) {
    return { pool: [], error: `Ocasión "${occasion}" no válida.` };
  }

  let pool = garments.filter((g) => {
    if (!g.style || g.style.length === 0) return true;
    return g.style.some((s) => (allowedStyles as GarmentStyle[]).includes(s));
  });

  if (pool.length === 0) {
    return {
      pool: [],
      error: 'No hay prendas que coincidan con esta ocasión. Prueba con otra ocasión o agrega nuevas prendas.',
    };
  }

  // Step 2: Weather filter — skip if no weather data
  if (weather != null) {
    const compatibleSeasons = deriveSeasonsFromTemp(weather.temp);
    pool = pool.filter((g) => isSeasonCompatible(g.season, compatibleSeasons));

    if (pool.length === 0) {
      return {
        pool: [],
        error: 'Ninguna de tus prendas es adecuada para el clima actual. Prueba cambiar la ocasión o agregar más prendas.',
      };
    }
  }

  return { pool };
}

/**
 * Picks a random element from an array. Returns undefined for empty arrays.
 */
function pickRandom<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Groups garments by their category field.
 */
function groupByCategory(garments: Garment[]): Record<string, Garment[]> {
  const groups: Record<string, Garment[]> = {};
  for (const g of garments) {
    if (!groups[g.category]) groups[g.category] = [];
    groups[g.category].push(g);
  }
  return groups;
}

// ==================== Main ====================

/**
 * Generates a random outfit from the given garments.
 *
 * @param garments - Full list of user's garments
 * @param occasion - Selected occasion (casual, formal, work, sport, date_night, travel)
 * @param weather - Current weather data (optional, null skips weather filtering)
 * @returns RandomOutfitResult with the selected garments or an error message
 */
export function generateRandomOutfit(
  garments: Garment[],
  occasion: Occasion,
  weather?: WeatherData | null,
): RandomOutfitResult {
  // Phase 1: Filter pool
  const { pool, error: filterError } = filterPool(garments, occasion, weather);
  if (filterError) return { outfit: [], error: filterError };

  // Phase 2: Group by category
  const byCategory = groupByCategory(pool);

  // Phase 3: Build outfit
  const result: Garment[] = [];
  const usedIds = new Set<string>();

  const addGarment = (g: Garment | undefined): boolean => {
    if (!g || usedIds.has(g.id)) return false;
    usedIds.add(g.id);
    result.push(g);
    return true;
  };

  // --- Dress-first strategy ---
  const dresses = byCategory['dresses'] || [];
  const hasDresses = dresses.length > 0;
  let usedDress = false;

  if (hasDresses) {
    const hasTops = (byCategory['tops'] || []).length > 0;
    const hasBottoms = (byCategory['bottoms'] || []).length > 0;

    // Must use dress if no separate top or bottom available
    const mustUseDress = !hasTops || !hasBottoms;
    // Otherwise 50% chance to prefer a dress over separate pieces
    const shouldUseDress = mustUseDress || Math.random() < 0.5;

    if (shouldUseDress) {
      const dress = pickRandom(dresses);
      if (dress) {
        addGarment(dress);
        usedDress = true;
      }
    }
  }

  // --- Required categories ---
  if (!usedDress) {
    const tops = byCategory['tops'] || [];
    const bottoms = byCategory['bottoms'] || [];

    const top = pickRandom(tops);
    const bottom = pickRandom(bottoms);

    if (!top || !bottom) {
      const missing: string[] = [];
      if (!top) missing.push('parte superior (tops)');
      if (!bottom) missing.push('parte inferior (bottoms)');
      return {
        outfit: [],
        error: `No tienes suficientes prendas para esta ocasión. Faltan categorías requeridas: ${missing.join(', ')}.`,
      };
    }

    addGarment(top);
    addGarment(bottom);
  }

  // Shoes are always required
  const shoes = byCategory['shoes'] || [];
  const shoe = pickRandom(shoes);
  if (!shoe) {
    return {
      outfit: [],
      error: 'No tienes zapatos en tu clóset que coincidan con los filtros. Agrega zapatos para generar un outfit.',
    };
  }
  addGarment(shoe);

  // --- Optional categories (70% chance if available) ---
  const outerwear = (byCategory['outerwear'] || []).filter((g) => !usedIds.has(g.id));
  const accessories = (byCategory['accessories'] || []).filter((g) => !usedIds.has(g.id));

  if (outerwear.length > 0 && Math.random() < 0.7) {
    addGarment(pickRandom(outerwear));
  }

  if (accessories.length > 0 && Math.random() < 0.7) {
    addGarment(pickRandom(accessories));
  }

  return { outfit: result };
}
