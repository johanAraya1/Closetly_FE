/**
 * useRecentCalendarEntries Hook
 * Carga los últimos N días del calendario y devuelve si hay outfit registrado o no.
 * Ideal para mostrar en el home los outfits usados recientemente.
 *
 * Expone refresh() para recargar cuando la pantalla recupera el foco.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { getLocalDateString } from '@/utils/date';
import type { CalendarLogEntry } from '@/types';
import * as calendarService from '@/services/calendarService';

export interface RecentDayInfo {
  date: string;
  entry: CalendarLogEntry | null;
}

function getDateNDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return getLocalDateString(d);
}

type MonthKey = string; // "2026-7"

function monthKeyFromDate(dateStr: string): MonthKey {
  const [year, month] = dateStr.split('-').map(Number);
  return `${year}-${month}`;
}

function uniqueMonths(dates: string[]): { month: number; year: number }[] {
  const seen = new Set<MonthKey>();
  const months: { month: number; year: number }[] = [];
  for (const dateStr of dates) {
    const key = monthKeyFromDate(dateStr);
    if (!seen.has(key)) {
      seen.add(key);
      const [year, month] = dateStr.split('-').map(Number);
      months.push({ month, year });
    }
  }
  return months;
}

/**
 * Devuelve los últimos `days` días con su outfit registrado (si existe).
 * Carga los meses necesarios desde la API sin tocar el store global.
 */
export function useRecentCalendarEntries(days: number = 5) {
  const [allEntries, setAllEntries] = useState<CalendarLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [version, setVersion] = useState(0);

  // Últimos N días
  const dates = useMemo(
    () => Array.from({ length: days }, (_, i) => getDateNDaysAgo(i)),
    [days],
  );

  // Meses únicos necesarios
  const monthsToLoad = useMemo(() => uniqueMonths(dates), [dates]);
  const monthsKey = useMemo(
    () => monthsToLoad.map((m) => `${m.year}-${m.month}`).join(','),
    [monthsToLoad],
  );

  // Cargar meses (se re-ejecuta si cambia monthsKey o version)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const results = await Promise.all(
          monthsToLoad.map(({ month, year }) =>
            calendarService.getCalendar(month, year),
          ),
        );
        if (cancelled) return;
        const merged = results.flatMap((r) => r.data || []);
        setAllEntries(merged);
      } catch {
        if (!cancelled) setAllEntries([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [monthsKey, version]);

  // Exponer refresh para recargar desde el componente
  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  // Matchear entries por fecha
  const dayEntries = useMemo<RecentDayInfo[]>(
    () =>
      dates.map((date) => ({
        date,
        entry: allEntries.find((e) => e.date === date) || null,
      })),
    [dates, allEntries],
  );

  return { dayEntries, isLoading, refresh };
}
