/** Local calendar date as YYYY-MM-DD. A study streak must break at the user's
 *  midnight, not UTC's, so this deliberately uses local time, not toISOString. */
export function todayISO(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Adds (or subtracts) whole days to a YYYY-MM-DD date, staying in local time. */
export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return todayISO(new Date(y, m - 1, d + days));
}

const shift = addDaysISO;

/**
 * Consecutive days with study activity, counting back from today.
 *
 * Today not yet studied does not break the streak: if yesterday is present the
 * run still counts, giving the user the day to keep it alive. The streak only
 * includes today once today actually has an entry.
 */
export function computeStreak(studiedDates: Iterable<string>, today = todayISO()): number {
  const set = studiedDates instanceof Set ? studiedDates : new Set(studiedDates);

  let cursor: string;
  if (set.has(today)) cursor = today;
  else if (set.has(shift(today, -1))) cursor = shift(today, -1);
  else return 0;

  let streak = 0;
  while (set.has(cursor)) {
    streak++;
    cursor = shift(cursor, -1);
  }
  return streak;
}
