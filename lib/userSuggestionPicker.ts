/**
 * User Suggestion Picker
 * Selects the user's least-recently-worn outfits ("most ancient") for hybrid suggestions.
 */

import type { Outfit, CalendarLogEntry, Suggestion } from '@/types';

/**
 * Picks `count` outfits from the user's collection, prioritizing the
 * least-recently-worn ones based on calendar log entries.
 *
 * - Sorts worn outfits by oldest `lastUsed` date first
 * - Never-worn outfits (no calendar entry) are candidates after worn ones
 * - Returns Suggestion[] with `source: 'user'` and metadata about last usage
 *
 * Edge cases:
 * - 0 count → empty array
 * - Empty outfits → empty array
 * - More count than outfits → returns all outfits
 * - All unworn → random selection among them
 */
export function pickUserSuggestions(
  outfits: Outfit[],
  calendarEntries: CalendarLogEntry[],
  count: number,
): Suggestion[] {
  if (count <= 0 || outfits.length === 0) return [];

  // Build a map: outfitId → most recent calendar date
  const lastUsedMap = buildLastUsedMap(calendarEntries);

  // Separate worn vs unworn
  const worn: { outfit: Outfit; lastUsed: Date }[] = [];
  const unworn: Outfit[] = [];

  for (const outfit of outfits) {
    const lastDate = lastUsedMap.get(outfit.id);
    if (lastDate) {
      worn.push({ outfit, lastUsed: lastDate });
    } else {
      unworn.push(outfit);
    }
  }

  // Sort worn by oldest lastUsed first
  worn.sort((a, b) => a.lastUsed.getTime() - b.lastUsed.getTime());

  // Shuffle unworn for random selection
  shuffle(unworn);

  // Pick from worn first, then unworn
  const selected: { outfit: Outfit; lastUsed: Date | undefined }[] = [];
  for (const { outfit, lastUsed } of worn) {
    if (selected.length >= count) break;
    selected.push({ outfit, lastUsed });
  }
  for (const outfit of unworn) {
    if (selected.length >= count) break;
    selected.push({ outfit, lastUsed: undefined });
  }

  // Convert to Suggestion[]
  return selected.map(({ outfit, lastUsed }) => toSuggestion(outfit, lastUsed));
}

// ==================== INTERNAL HELPERS ====================

/**
 * Builds a map from outfitId to its most recent calendar log date.
 */
function buildLastUsedMap(
  entries: CalendarLogEntry[],
): Map<string, Date> {
  const map = new Map<string, Date>();

  for (const entry of entries) {
    const outfitId = entry.outfit?.id;
    if (!outfitId) continue;

    const entryDate = new Date(entry.date);
    const existing = map.get(outfitId);
    if (!existing || entryDate > existing) {
      map.set(outfitId, entryDate);
    }
  }

  return map;
}

/**
 * Converts an Outfit to a Suggestion with user-source metadata.
 */
function toSuggestion(outfit: Outfit, lastUsed: Date | undefined): Suggestion {
  const garmentIds = outfit.garments
    ? outfit.garments.map((g) => g.id)
    : [];

  const lastUsedIso = lastUsed ? lastUsed.toISOString() : undefined;
  const hasBeenUsed = lastUsed !== undefined;

  return {
    name: outfit.name,
    occasion: outfit.occasion || 'casual',
    description: hasBeenUsed
      ? `Tu outfit - último uso: ${formatDate(lastUsed)}`
      : 'Tu outfit - nunca usado',
    garmentIds,
    reasoning: hasBeenUsed
      ? 'Es el outfit que hace más tiempo no usás'
      : 'Nunca usaste este outfit',
    source: 'user' as const,
    lastUsed: lastUsedIso,
  };
}

/**
 * Formats a Date to a human-readable string in Spanish.
 */
function formatDate(date: Date): string {
  const day = date.getDate();
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];
  const month = months[date.getMonth()];
  return `${day} ${month} ${date.getFullYear()}`;
}

/**
 * Fisher-Yates shuffle (in-place).
 */
function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
