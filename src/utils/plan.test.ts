// Run: npx tsx src/utils/plan.test.ts
import assert from 'node:assert/strict';
import { Topic } from '../types';
import { buildDailyPlan, nextReviewInterval, daysUntil, scheduleReview } from './plan';

const TODAY = '2026-07-19';

let n = 0;
function topic(over: Partial<Topic>): Topic {
  n++;
  return {
    id: `t${n}`,
    user_id: 'u',
    subject_id: 's',
    title: `Topic ${n}`,
    description: null,
    order_index: n,
    status: 'not_started',
    pdf_url: null,
    last_review_date: null,
    next_review_date: null,
    review_interval: null,
    ease_factor: null,
    created_at: TODAY,
    ...over,
  };
}
const ids = (ts: Topic[]) => ts.map(t => t.id);

// --- nextReviewInterval: expanding, capped ---
assert.equal(nextReviewInterval(null), 2, 'first review at 2 days');
assert.equal(nextReviewInterval(1), 2, 'schema default 1 starts at 2');
assert.equal(nextReviewInterval(2), 4, 'doubles');
assert.equal(nextReviewInterval(8), 16, 'doubles');
assert.equal(nextReviewInterval(16), 21, 'capped at 21');

// --- scheduleReview: expands but never past the exam ---
assert.deepEqual(scheduleReview(TODAY, null, null), { interval: 2, nextReviewDate: '2026-07-21' }, 'no exam: today+2');
assert.deepEqual(scheduleReview(TODAY, 8, '2026-09-01'), { interval: 16, nextReviewDate: '2026-08-04' }, 'far exam: normal doubling');
assert.deepEqual(scheduleReview(TODAY, 8, '2026-07-22'), { interval: 16, nextReviewDate: '2026-07-22' }, 'near exam: clamped to exam day');
assert.deepEqual(scheduleReview(TODAY, 2, '2026-07-19'), { interval: 4, nextReviewDate: null }, 'exam today: no further review');
assert.deepEqual(scheduleReview(TODAY, 2, '2026-07-10'), { interval: 4, nextReviewDate: null }, 'exam passed: no review');

// --- daysUntil ---
assert.equal(daysUntil('2026-07-29', TODAY), 10, 'ten days out');
assert.equal(daysUntil('2026-07-19', TODAY), 0, 'exam today');
assert.equal(daysUntil('2026-07-18', TODAY), -1, 'exam passed');

// --- pacing: 40 new, 20 days -> 2 new/day ---
{
  const topics = Array.from({ length: 40 }, () => topic({}));
  const plan = buildDailyPlan(topics, [], '2026-08-08', TODAY); // 20 days
  assert.equal(plan.length, 2, 'quota is ceil(40/20)=2');
}

// --- no exam date -> default pace ---
{
  const topics = Array.from({ length: 40 }, () => topic({}));
  const plan = buildDailyPlan(topics, [], null, TODAY);
  assert.equal(plan.length, 3, 'default 3/day without an exam');
}

// --- behind schedule: quota rises ---
{
  const topics = Array.from({ length: 10 }, () => topic({}));
  const plan = buildDailyPlan(topics, [], '2026-07-21', TODAY); // 2 days for 10 -> 5/day
  assert.equal(plan.length, 5, 'ceil(10/2)=5');
}

// --- checking off a new topic doesn't grow the new section ---
{
  const a = topic({ status: 'in_progress', review_interval: 2, last_review_date: TODAY }); // introduced today
  const rest = Array.from({ length: 39 }, () => topic({}));
  const plan = buildDailyPlan([a, ...rest], [a.id], '2026-08-08', TODAY); // quota 2 (39 not_started/20 -> 2)
  // a counts as one of today's two new; only one more not_started fills in.
  assert.equal(plan.length, 2, 'done-new counts against quota');
  assert.ok(plan.some(t => t.id === a.id), 'the studied new topic stays pinned');
}

// --- due review shows; not-due review does not ---
{
  const due = topic({ status: 'in_progress', next_review_date: '2026-07-18' });
  const future = topic({ status: 'in_progress', next_review_date: '2026-07-25' });
  const plan = buildDailyPlan([due, future], [], '2026-09-01', TODAY);
  assert.deepEqual(ids(plan), [due.id], 'only the due review appears');
}

// --- mastered but due -> light final review ---
{
  const m = topic({ status: 'mastered', next_review_date: '2026-07-19', review_interval: 16 });
  const plan = buildDailyPlan([m], [], '2026-09-01', TODAY);
  assert.deepEqual(ids(plan), [m.id], 'mastered topic resurfaces when due');
}

// --- mastered with no schedule never resurfaces ---
{
  const m = topic({ status: 'mastered' });
  const plan = buildDailyPlan([m], [], '2026-09-01', TODAY);
  assert.equal(plan.length, 0, 'mastered without a review date stays out');
}

// --- a review studied today stays pinned even though its date moved out ---
{
  const r = topic({ status: 'in_progress', next_review_date: '2026-07-23', last_review_date: TODAY, review_interval: 4 });
  const plan = buildDailyPlan([r], [r.id], '2026-09-01', TODAY);
  assert.deepEqual(ids(plan), [r.id], 'studied-today review is pinned');
}

console.log('plan: all checks passed');
