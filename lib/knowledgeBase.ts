/**
 * Knowledge Base
 * Detects day-of-week usage patterns from calendar log entries.
 * Caches results in AsyncStorage with 24h TTL.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CalendarLogEntry, Outfit, GarmentStyle } from '@/types';
import { apiClient } from '@/utils/apiClient';

// ==================== TYPES ====================

export interface DayPattern {
  dayOfWeek: number; // 0=Mon…6=Sun
  topOccasion: string | null;
  topStyles: string[];
  entryCount: number;
}

export interface KnowledgePatterns {
  hasEnoughData: boolean;
  patterns: DayPattern[] | null;
}

interface CachedPatterns {
  data: KnowledgePatterns;
  timestamp: number;
}

const CACHE_KEY = '@closetly/kb_patterns';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000;

// ==================== PURE FUNCTIONS ====================

/**
 * Groups calendar entries by day-of-week (0=Mon…6=Sun) and computes
 * the most common occasion and garment styles per day.
 *
 * Recency weighting: last 30 days → 1.0x, older → 0.5x
 * Only entries from the last 3 months are considered.
 * Returns { hasEnoughData: false } if total entries < 5.
 */
export function computePatterns(
  entries: CalendarLogEntry[],
  _outfits: Outfit[],
): KnowledgePatterns {
  const now = new Date();
  const threeMonthsAgo = new Date(now.getTime() - THREE_MONTHS_MS);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Filter to last 3 months only
  const recentEntries = entries.filter((e) => {
    const entryDate = new Date(e.date);
    return entryDate >= threeMonthsAgo;
  });

  if (recentEntries.length < 5) {
    return { hasEnoughData: false, patterns: null };
  }

  // Group by day of week (ISO: 0=Mon…6=Sun)
  const byDay: Record<number, CalendarLogEntry[]> = {};
  for (let i = 0; i < 7; i++) byDay[i] = [];

  for (const entry of recentEntries) {
    const dayOfWeek = getDayOfWeek(entry.date);
    byDay[dayOfWeek].push(entry);
  }

  const patterns: DayPattern[] = [];

  for (let day = 0; day < 7; day++) {
    const dayEntries = byDay[day];
    if (dayEntries.length === 0) {
      patterns.push({
        dayOfWeek: day,
        topOccasion: null,
        topStyles: [],
        entryCount: 0,
      });
      continue;
    }

    // Weighted occasion scoring
    const occasionScores: Record<string, number> = {};
    const styleScores: Record<string, number> = {};

    for (const entry of dayEntries) {
      const entryDate = new Date(entry.date);
      const weight = entryDate >= thirtyDaysAgo ? 1.0 : 0.5;

      const occasion = entry.outfit?.occasion;
      if (occasion) {
        occasionScores[occasion] = (occasionScores[occasion] || 0) + weight;
      }

      // Gather styles from outfit garments
      const styles = extractStyles(entry);
      for (const style of styles) {
        styleScores[style] = (styleScores[style] || 0) + weight;
      }
    }

    const topOccasion = getTopKey(occasionScores);
    const topStyles = getTopKeys(styleScores, 3);

    patterns.push({
      dayOfWeek: day,
      topOccasion,
      topStyles,
      entryCount: dayEntries.length,
    });
  }

  return { hasEnoughData: true, patterns };
}

// ==================== CACHED ACCESS ====================

/**
 * Returns cached KnowledgePatterns, recomputing if cache is expired or missing.
 * Loads calendar entries for the last 3 months from the API.
 */
export async function getKnowledgeBase(): Promise<KnowledgePatterns> {
  // Try cache first
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) {
      const cached: CachedPatterns = JSON.parse(raw);
      if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.data;
      }
    }
  } catch {
    // Cache read failed — continue to recompute
  }

  // Recompute
  try {
    const entries = await loadLast3MonthsEntries();
    // We don't need outfits for computePatterns currently, but pass empty array
    // as the function signature requires it for future extensibility
    const patterns = computePatterns(entries, []);

    // Cache result
    try {
      const payload: CachedPatterns = { data: patterns, timestamp: Date.now() };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    } catch {
      // Cache write failed — not critical
    }

    return patterns;
  } catch {
    return { hasEnoughData: false, patterns: null };
  }
}

/**
 * Clears the cached knowledge base patterns.
 * Call after a new calendar entry is logged.
 */
export async function clearKBCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch {
    // Best effort
  }
}

// ==================== INTERNAL HELPERS ====================

/**
 * Converts a date string (YYYY-MM-DD or ISO) to day of week (0=Mon…6=Sun).
 */
function getDayOfWeek(dateStr: string): number {
  const date = new Date(dateStr);
  // getDay() returns 0=Sun…6=Sat; convert to 0=Mon…6=Sun
  return (date.getDay() + 6) % 7;
}

/**
 * Extracts garment styles from a calendar entry's outfit.
 * Uses the outfit's garments if available, otherwise empty.
 */
function extractStyles(entry: CalendarLogEntry): GarmentStyle[] {
  const outfit = entry.outfit;
  if (!outfit?.garments) return [];
  const styles: GarmentStyle[] = [];
  for (const garment of outfit.garments) {
    if (garment.style) {
      const s = Array.isArray(garment.style) ? garment.style : [garment.style];
      styles.push(...s);
    }
  }
  return styles;
}

/**
 * Returns the key with the highest score, or null if empty.
 */
function getTopKey(scores: Record<string, number>): string | null {
  let topKey: string | null = null;
  let topScore = 0;
  for (const [key, score] of Object.entries(scores)) {
    if (score > topScore) {
      topScore = score;
      topKey = key;
    }
  }
  return topKey;
}

/**
 * Returns up to `limit` keys with the highest scores.
 */
function getTopKeys(scores: Record<string, number>, limit: number): string[] {
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key]) => key);
}

/**
 * Loads calendar entries for the current month and the 2 previous months.
 */
async function loadLast3MonthsEntries(): Promise<CalendarLogEntry[]> {
  const now = new Date();
  const allEntries: CalendarLogEntry[] = [];

  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = d.getMonth() + 1; // 1-based
    const year = d.getFullYear();

    try {
      const result = await apiClient.get<CalendarLogEntry[]>(
        `/calendar?month=${month}&year=${year}`
      );
      if (result.data) {
        allEntries.push(...result.data);
      }
    } catch {
      // Skip failed month — don't block entire KB computation
    }
  }

  return allEntries;
}
