import { Topic } from '../types';
import { todayISO, addDaysISO } from './streak';

// New topics per day when no exam date is set (nothing to pace against).
const DEFAULT_NEW_PER_DAY = 3;

// Reviews stop expanding past this many days when there is no exam to pace
// against, so topics still resurface occasionally.
const MAX_REVIEW_INTERVAL = 21;

/** Whole days from today to the target date (local). Negative once it has passed. */
export function daysUntil(dateISO: string, today = todayISO()): number {
  const [y, m, d] = dateISO.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  return Math.round((new Date(y, m - 1, d).getTime() - new Date(ty, tm - 1, td).getTime()) / 86_400_000);
}

/** Expanding review spacing: first review at 2 days, then doubling, capped. */
export function nextReviewInterval(current: number | null | undefined): number {
  const base = !current || current < 2 ? 2 : current * 2;
  return Math.min(base, MAX_REVIEW_INTERVAL);
}

/**
 * The schedule to write after a study event: the expanded interval, and the
 * next review date pulled no later than the exam so a final pass always lands
 * before (or on) exam day. Once the exam is today or past, no review is set.
 */
export function scheduleReview(
  today: string,
  currentInterval: number | null | undefined,
  examDate: string | null
): { interval: number; nextReviewDate: string | null } {
  const interval = nextReviewInterval(currentInterval);
  if (examDate && daysUntil(examDate, today) <= 0) {
    return { interval, nextReviewDate: null };
  }
  let date = addDaysISO(today, interval);
  if (examDate && date > examDate) date = examDate;
  return { interval, nextReviewDate: date };
}

// A topic first studied today: interval is still 2 and it was touched today.
// Used to count today's new picks against the day's quota so the "new" section
// doesn't grow as you check them off.
function isIntroducedToday(t: Topic, today: string): boolean {
  return t.status === 'in_progress' && t.review_interval === 2 && t.last_review_date === today;
}

/**
 * Today's plan: a paced batch of new topics plus every review that is due,
 * with anything already studied today pinned so checking it off doesn't hide it.
 *
 * New quota is ceil(remaining new / days left): fall behind and it rises on its
 * own; there is no stored schedule to drift.
 */
export function buildDailyPlan(
  topics: Topic[],
  studiedTodayIds: string[],
  examDate: string | null,
  today = todayISO()
): Topic[] {
  const studied = new Set(studiedTodayIds);
  const notStarted = topics.filter(t => t.status === 'not_started');

  const daysLeft = examDate ? Math.max(1, daysUntil(examDate, today)) : null;
  const quota = daysLeft ? Math.max(1, Math.ceil(notStarted.length / daysLeft)) : DEFAULT_NEW_PER_DAY;

  const newDoneToday = topics.filter(t => studied.has(t.id) && isIntroducedToday(t, today));
  const newFill = notStarted.slice(0, Math.max(0, quota - newDoneToday.length));

  // Due reviews: anything past its first pass whose review date has arrived.
  // Mastered topics are included so they get their light final review.
  const reviewDue = topics.filter(
    t => t.status !== 'not_started' && t.next_review_date != null && t.next_review_date <= today
  );

  const studiedToday = topics.filter(t => studied.has(t.id));

  const seen = new Set<string>();
  const plan: Topic[] = [];
  for (const t of [...newDoneToday, ...newFill, ...reviewDue, ...studiedToday]) {
    if (!seen.has(t.id)) {
      seen.add(t.id);
      plan.push(t);
    }
  }
  return plan;
}

/** Whether a plan row should read as a review rather than a new topic. */
export function isReview(t: Topic): boolean {
  return t.status !== 'not_started';
}

export { addDaysISO };
