/**
 * Random Outfit Generator
 * Pure algorithm that generates a random outfit from the user's garment collection,
 * filtered by occasion and optional weather data.
 *
 * Color harmony: maps colors to families (warm, cool, neutral, bright) and ensures
 * compatible combinations. Style consistency: prevents mixing formal with sporty.
 *
 * Design: dress-first strategy (replaces top+bottom when available),
 * then required top/bottom, shoes, then optional outerwear/accessories.
 * Each pick respects color and style compatibility with the primary garment.
 */

import { OCCASION_STYLE_MAP } from '@/lib/constants';
import type { Garment, GarmentSeason, GarmentStyle, WeatherData } from '@/types';

// ==================== Types ====================

export type Occasion = 'casual' | 'formal' | 'work' | 'sport' | 'date_night' | 'travel';

export interface RandomOutfitResult {
  outfit: Garment[];
  error?: string;
}

// ==================== Color System ====================

type ColorFamily = 'warm' | 'cool' | 'neutral' | 'bright';

/** Normalize a color string (lowercase, trimmed, accents stripped for matching) */
function normalizeColor(color: string): string {
  return color
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // strip accents
}

/**
 * Maps color names to families. Covers English + Spanish (Rioplatense) common colors.
 * Unknown colors default to 'neutral' so they don't block outfit generation.
 */
const COLOR_FAMILY_MAP: Record<string, ColorFamily> = {
  // --- Warm ---
  red: 'warm', rojo: 'warm',
  orange: 'warm', naranja: 'warm', naranjo: 'warm',
  yellow: 'warm', amarillo: 'warm',
  pink: 'warm', rosa: 'warm',
  coral: 'warm',
  terracotta: 'warm', terracota: 'warm',
  burgundy: 'warm', bordó: 'warm', borgoña: 'warm', vino: 'warm',
  maroon: 'warm', granate: 'warm',
  crimson: 'warm', carmesí: 'warm', carmin: 'warm',
  gold: 'warm', dorado: 'warm', oro: 'warm',
  peach: 'warm', durazno: 'warm',
  salmon: 'warm', salmón: 'warm',
  rust: 'warm', óxido: 'warm',
  mustard: 'warm', mostaza: 'warm',
  camel: 'warm',

  // --- Cool ---
  blue: 'cool', azul: 'cool',
  green: 'cool', verde: 'cool',
  purple: 'cool', purpura: 'cool', púrpura: 'cool', morado: 'cool', violeta: 'cool', violet: 'cool',
  teal: 'cool', turquesa: 'cool', turquoise: 'cool',
  navy: 'cool', marino: 'cool',
  cyan: 'cool', cian: 'cool',
  indigo: 'cool', añil: 'cool', anil: 'cool',
  lavender: 'cool', lavanda: 'cool',
  lilac: 'cool', lila: 'cool',
  mint: 'cool', menta: 'cool',
  olive: 'cool', oliva: 'cool',
  emerald: 'cool', esmeralda: 'cool',
  celeste: 'cool', 'sky blue': 'cool',
  sage: 'cool', salvia: 'cool',
  forest: 'cool', bosque: 'cool',
  jade: 'cool',

  // --- Neutral ---
  black: 'neutral', negro: 'neutral',
  white: 'neutral', blanco: 'neutral',
  gray: 'neutral', grey: 'neutral', gris: 'neutral',
  beige: 'neutral',
  brown: 'neutral', marrón: 'neutral', marron: 'neutral', cafe: 'neutral', café: 'neutral',
  khaki: 'neutral', caqui: 'neutral',
  cream: 'neutral', crema: 'neutral',
  ivory: 'neutral', marfil: 'neutral',
  taupe: 'neutral', topo: 'neutral',
  charcoal: 'neutral', carbon: 'neutral', carbón: 'neutral',
  silver: 'neutral', plata: 'neutral',
  nude: 'neutral',
  bone: 'neutral', hueso: 'neutral',
  denim: 'neutral', jean: 'neutral',
  'navy blue': 'cool',
  'light blue': 'cool',
  'dark blue': 'cool',
  'dark green': 'cool',

  // --- Bright ---
  fuchsia: 'bright', fucsia: 'bright',
  magenta: 'bright',
  lime: 'bright', lima: 'bright',
  neon: 'bright', neón: 'bright',
  fluorescent: 'bright', fluorescente: 'bright',
  electric: 'bright', electrico: 'bright', eléctrico: 'bright',
  chartreuse: 'bright',
};

/** Compatibility rules: which families can be combined */
const COLOR_COMPATIBILITY: Record<ColorFamily, readonly ColorFamily[]> = {
  warm: ['warm', 'neutral'],
  cool: ['cool', 'neutral'],
  neutral: ['warm', 'cool', 'neutral', 'bright'],
  bright: ['neutral'],
};

/** Derive the color family from a garment's color string. */
function getColorFamily(color: string | undefined | null): ColorFamily {
  if (!color) return 'neutral';
  const normalized = normalizeColor(color);

  // Try exact match first
  if (COLOR_FAMILY_MAP[normalized]) return COLOR_FAMILY_MAP[normalized];

  // Try word-level: if any word in the color string matches a known color
  const words = normalized.split(/[\s-]+/);
  for (const word of words) {
    if (COLOR_FAMILY_MAP[word]) return COLOR_FAMILY_MAP[word];
  }

  return 'neutral'; // unknown → safe default
}

/** Check if two colors are compatible for wearing together. */
function areColorsCompatible(
  colorA: string | undefined | null,
  colorB: string | undefined | null,
): boolean {
  const familyA = getColorFamily(colorA);
  const familyB = getColorFamily(colorB);
  return COLOR_COMPATIBILITY[familyA].includes(familyB);
}

// ==================== Style System ====================

/**
 * Style compatibility: which styles can be worn together.
 * Key insight: 'deportivo' and 'formal' should NEVER mix.
 * Everything else has broader compatibility.
 */
const STYLE_COMPATIBILITY: Record<GarmentStyle, readonly GarmentStyle[]> = {
  deportivo: ['deportivo', 'casual', 'urbano'],
  formal: ['formal', 'elegante'],
  elegante: ['elegante', 'formal', 'urbano', 'casual'],
  bohemio: ['bohemio', 'casual', 'urbano'],
  urbano: ['urbano', 'casual', 'deportivo', 'bohemio', 'elegante'],
  casual: ['casual', 'urbano', 'deportivo', 'bohemio', 'elegante'],
};

/** Check if two styles are compatible for an outfit. */
function areStylesCompatible(
  stylesA: GarmentStyle[] | undefined | null,
  stylesB: GarmentStyle[] | undefined | null,
): boolean {
  if (!stylesA || stylesA.length === 0 || !stylesB || stylesB.length === 0) return true;

  // At least one style from A must be compatible with at least one style from B
  for (const styleA of stylesA) {
    const allowed = STYLE_COMPATIBILITY[styleA] ?? [styleA];
    if (stylesB.some((s) => allowed.includes(s))) return true;
  }
  return false;
}

/**
 * Score how well a garment's styles match a primary set of styles.
 * Returns 0 (no match) to N (all matched), higher is better.
 */
function styleMatchScore(
  primaryStyles: GarmentStyle[],
  candidateStyles: GarmentStyle[] | undefined | null,
): number {
  if (!candidateStyles || candidateStyles.length === 0) return 1;
  let score = 0;
  for (const ps of primaryStyles) {
    const allowed = STYLE_COMPATIBILITY[ps] ?? [];
    for (const cs of candidateStyles) {
      if (allowed.includes(cs)) score++;
    }
  }
  return score;
}

// ==================== Weather Helpers ====================

function deriveSeasonsFromTemp(temp: number): GarmentSeason[] {
  if (temp < 10) return ['winter'];
  if (temp <= 20) return ['spring', 'fall'];
  return ['summer'];
}

function isSeasonCompatible(
  garmentSeason: GarmentSeason | GarmentSeason[] | undefined,
  compatibleSeasons: GarmentSeason[],
): boolean {
  if (!garmentSeason) return true;
  const seasons = Array.isArray(garmentSeason) ? garmentSeason : [garmentSeason];
  if (seasons.includes('all_season')) return true;
  return seasons.some((s) => compatibleSeasons.includes(s));
}

// ==================== Filter Helpers ====================

function filterPool(
  garments: Garment[],
  occasion: Occasion,
  weather?: WeatherData | null,
  styles?: GarmentStyle[],
): { pool: Garment[]; error?: string } {
  const allowedStyles: GarmentStyle[] = styles ?? OCCASION_STYLE_MAP[occasion];
  if (!allowedStyles || allowedStyles.length === 0) {
    return { pool: [], error: `Ocasión "${occasion}" no válida.` };
  }

  let pool = garments.filter((g) => {
    if (!g.style || g.style.length === 0) return true;
    return g.style.some((s) => allowedStyles.includes(s));
  });

  if (pool.length === 0) {
    return {
      pool: [],
      error: 'No hay prendas que coincidan con esta ocasión. Prueba con otra ocasión o agrega nuevas prendas.',
    };
  }

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

function pickRandom<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Pick a random item from the array, preferring items whose styles match the primary.
 * Falls back to any item if no style-compatible item exists.
 */
function pickCompatible<T extends Garment>(
  items: T[],
  primaryStyles: GarmentStyle[],
  primaryColor: string | undefined | null,
): T | undefined {
  if (items.length === 0) return undefined;

  // Score each item: style match (0-3) + color compatibility (0/1)
  const scored = items.map((item) => {
    const styleScore = styleMatchScore(primaryStyles, item.style);
    const colorOk = areColorsCompatible(primaryColor, item.color) ? 1 : 0;
    // Style match is more important than color
    return { item, totalScore: styleScore * 2 + colorOk };
  });

  // Best scoring items
  const maxScore = Math.max(...scored.map((s) => s.totalScore));
  const best = scored.filter((s) => s.totalScore === maxScore);

  return pickRandom(best.map((s) => s.item));
}

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
 * @param styles - Explicit garment styles to filter by (optional, overrides occasion map)
 * @returns RandomOutfitResult with the selected garments or an error message
 */
export function generateRandomOutfit(
  garments: Garment[],
  occasion: Occasion,
  weather?: WeatherData | null,
  styles?: GarmentStyle[],
): RandomOutfitResult {
  // Phase 1: Filter pool by occasion + weather
  const { pool, error: filterError } = filterPool(garments, occasion, weather, styles);
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
  let primaryStyles: GarmentStyle[] = [];
  let primaryColor: string | undefined;

  if (hasDresses) {
    const hasTops = (byCategory['tops'] || []).length > 0;
    const hasBottoms = (byCategory['bottoms'] || []).length > 0;
    const mustUseDress = !hasTops || !hasBottoms;
    const shouldUseDress = mustUseDress || Math.random() < 0.5;

    if (shouldUseDress) {
      const dress = pickRandom(dresses);
      if (dress) {
        addGarment(dress);
        usedDress = true;
        primaryStyles = dress.style || [];
        primaryColor = dress.color;
      }
    }
  }

  // --- Required categories ---
  if (!usedDress) {
    const tops = byCategory['tops'] || [];
    const bottoms = byCategory['bottoms'] || [];
    // Pick top first — it defines the style/color direction
    let top: Garment | undefined;
    // Try to pick a top that is compatible with available bottoms' colors
    if (tops.length > 0 && bottoms.length > 0) {
      // Prefer tops whose color works with most bottoms
      const scoredTops = tops.map((t) => {
        const compatibleCount = bottoms.filter((b) => areColorsCompatible(t.color, b.color)).length;
        return { item: t, score: compatibleCount };
      });
      const maxScore = Math.max(...scoredTops.map((s) => s.score));
      const bestTops = scoredTops.filter((s) => s.score === maxScore);
      top = pickRandom(bestTops.map((s) => s.item));
    } else {
      top = pickRandom(tops);
    }

    if (!top) {
      return {
        outfit: [],
        error: 'No tienes tops para esta ocasión. Agrega más prendas.',
      };
    }
    addGarment(top);
    primaryStyles = top.style || [];
    primaryColor = top.color;

    // Pick bottom — color + style compatible with top
    const bottom = pickCompatible(bottoms, primaryStyles, primaryColor);
    if (!bottom) {
      // Fallback: pick any bottom
      const fallback = pickRandom(bottoms);
      if (!fallback) {
        return {
          outfit: [],
          error: 'No tienes pantalones o faldas para esta ocasión. Agrega más prendas.',
        };
      }
      addGarment(fallback);
    } else {
      addGarment(bottom);
    }
  }

  // Update primary styles/color from dress (if used) or from first item
  if (!primaryStyles.length || !primaryColor) {
    const first = result[0];
    if (first) {
      primaryStyles = first.style || [];
      primaryColor = first.color;
    }
  }

  // --- Shoes (always required) — color + style compatible ---
  const shoes = byCategory['shoes'] || [];
  const shoe = pickCompatible(shoes, primaryStyles, primaryColor) ?? pickRandom(shoes);
  if (!shoe) {
    return {
      outfit: [],
      error: 'No tienes zapatos en tu clóset que coincidan con los filtros. Agrega zapatos para generar un outfit.',
    };
  }
  addGarment(shoe);

  // --- Optional categories (70% chance if available, respecting style/color) ---
  const outerwear = (byCategory['outerwear'] || []).filter((g) => !usedIds.has(g.id));
  const accessories = (byCategory['accessories'] || []).filter((g) => !usedIds.has(g.id));

  if (outerwear.length > 0 && Math.random() < 0.7) {
    const ow = pickCompatible(outerwear, primaryStyles, primaryColor) ?? pickRandom(outerwear);
    addGarment(ow);
  }

  if (accessories.length > 0 && Math.random() < 0.7) {
    const acc = pickCompatible(accessories, primaryStyles, primaryColor) ?? pickRandom(accessories);
    addGarment(acc);
  }

  return { outfit: result };
}
