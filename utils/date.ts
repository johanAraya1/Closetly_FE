/**
 * Date Utilities
 * Helper functions for date manipulation using LOCAL timezone.
 *
 * CRITICAL: Avoid `new Date().toISOString().split('T')[0]` — that returns UTC,
 * which can be a different day than local for timezones behind UTC (e.g. UTC-3).
 */

/**
 * Returns the current date (or a given date) as YYYY-MM-DD in local timezone.
 */
export function getLocalDateString(date?: Date): string {
  const d = date || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a YYYY-MM-DD string into a local Date at midnight local time.
 */
export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Adds/subtracts days from a YYYY-MM-DD string and returns the new local date string.
 */
export function addDays(dateString: string, days: number): string {
  const d = parseLocalDate(dateString);
  d.setDate(d.getDate() + days);
  return getLocalDateString(d);
}

/**
 * Returns the Monday of the week containing the given date, as YYYY-MM-DD.
 * Monday is day 0, Sunday is day 6.
 */
export function getMondayOfWeek(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon...
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return getLocalDateString(d);
}
