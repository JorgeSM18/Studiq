// Run: npx tsx src/utils/streak.test.ts
import assert from 'node:assert/strict';
import { computeStreak, todayISO } from './streak';

const T = '2026-07-19';
const days = (...offsets: number[]) =>
  offsets.map(o => {
    const [y, m, d] = T.split('-').map(Number);
    return todayISO(new Date(y, m - 1, d + o));
  });

assert.equal(computeStreak([], T), 0, 'no activity');
assert.equal(computeStreak(days(0), T), 1, 'only today');
assert.equal(computeStreak(days(-1), T), 1, 'only yesterday keeps streak alive');
assert.equal(computeStreak(days(-2), T), 0, 'gap of two days is broken');
assert.equal(computeStreak(days(0, -1, -2), T), 3, 'today + two before');
assert.equal(computeStreak(days(-1, -2, -3), T), 3, 'yesterday-anchored run');
assert.equal(computeStreak(days(0, -1, -3), T), 2, 'hole at -2 stops the count');
assert.equal(computeStreak(days(0, 0, -1), T), 2, 'duplicate dates do not inflate');
assert.equal(computeStreak(days(5), T), 0, 'a future date is not today');

// Month boundary: 1 March counts back into February.
assert.equal(computeStreak(['2026-03-01', '2026-02-28', '2026-02-27'], '2026-03-01'), 3, 'crosses month end');

console.log('streak: all checks passed');
