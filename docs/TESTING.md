# Testing

Studiq has **no test framework** — no Jest, no React Native Testing Library, no `npm test`. That is a deliberate choice, and this document explains it, what exists instead, and when the trade-off stops being worth it.

---

## 1. The strategy

Testing a React Native app well is expensive: mocking the Supabase client, the navigation container, SecureStore and the biometric prompt to assert that a button renders. For a single-developer project that cost buys little.

So the codebase is arranged so the parts **worth** testing are trivially testable:

> **All non-obvious logic lives in pure functions in `src/utils/`, with zero React and zero I/O.**

Scheduling, pacing and streak maths — the rules a user would actually notice being wrong — are plain functions. They're covered by `assert`-based self-checks that run in a second with no framework.

Everything else (screens, navigation, Supabase wiring) is verified by **typechecking** and a **manual smoke test**.

---

## 2. Self-checks

Three files, run directly with `tsx`:

| File | Covers |
|---|---|
| `src/utils/plan.test.ts` | Daily-plan construction, review scheduling, exam clamping |
| `src/utils/streak.test.ts` | Streak counting across gaps, month boundaries, duplicates |
| `src/lib/secureStorage.test.ts` | Chunked keychain storage, multi-byte and emoji boundaries |

### Running them

```bash
npx tsx src/utils/plan.test.ts
```

```bash
npx tsx src/utils/streak.test.ts
```

```bash
npx tsx src/lib/secureStorage.test.ts
```

Each prints `… all checks passed` or throws with the failing assertion. Non-zero exit on failure, so they work in CI as-is.

### What they actually caught

These aren't decorative — each found a real bug before it shipped:

- **`secureStorage`** — chunking split by *characters* while SecureStore's limit is on *bytes*. `Sánchez` (2 bytes per accent) overflowed the 2048-byte cap, which would have shipped as an intermittent "my session doesn't persist" bug for exactly the users with accented names.
- **`plan`** — checking off a new topic used to pull another one in, quietly defeating the daily pacing.
- **`streak`** — a gap of two days must break the streak while "today not yet studied" must not.

### Writing a new one

No framework. Node's `assert`, a clear message per assertion:

```ts
import assert from 'node:assert/strict';
import { computeStreak } from './streak';

assert.equal(computeStreak([], '2026-07-19'), 0, 'no activity');
assert.equal(computeStreak(['2026-07-18'], '2026-07-19'), 1, 'yesterday keeps the streak alive');

console.log('streak: all checks passed');
```

**Rule:** touching `plan.ts` or `streak.ts` means adding cases to the matching test in the same commit.

---

## 3. Typechecking

```bash
npx tsc --noEmit
```

With `strict` on, this is the main safety net for everything not covered by self-checks. It has caught renamed database columns, nullable fields treated as non-null, and icon exports that disappeared across a major dependency upgrade.

**Run it before every commit.**

---

## 4. Translation parity

A missing key falls back to English silently — easy to ship without noticing. This check compares both locale trees:

```bash
node -e 'const fs=require("fs");let bad=0;for(const ns of ["common","auth","home","profile","progress","topics"]){const es=JSON.parse(fs.readFileSync(`src/locales/es/${ns}.json`)),en=JSON.parse(fs.readFileSync(`src/locales/en/${ns}.json`));const a=Object.keys(es).filter(k=>!(k in en)),b=Object.keys(en).filter(k=>!(k in es));if(a.length||b.length){bad++;console.log(ns,"es-only",a,"en-only",b)}}console.log(bad?"MISALIGNED":"parity ok")'
```

Run it whenever you add UI text.

---

## 5. Dependency install check

```bash
npm ci --include=dev
```

This is the exact first step EAS Build runs. It's stricter than `npm install` and is the most common cause of a failed cloud build. Run it **before queueing a build** — failed builds consume free-tier quota.

---

## 6. Manual smoke test

No automation covers the device. Run this on a real phone before any release.

### Auth
1. Register with a new email → lands in the app (or on Verify, if confirmation is on)
2. Kill the app, reopen → still signed in (session restored from the keychain)
3. Profile → change password → sign out → sign in with the new one
4. "Forgot password?" with an email typed → confirmation appears

### Exams & topics
5. Home → tap the exam pill → create a second exam with a date → switch between them
6. Topics → **+** → type one topic, press "next" → a new row appears
7. Paste a multi-line syllabus into a row → it splits into numbered rows
8. Delete a row with ✕ → save → topics appear in Topics

### Daily plan
9. Home shows a plan sized by days-to-exam, tagged "New topic" / "Review"
10. Tick a topic → instant checkmark; Topics shows "In progress"
11. Progress → streak is 1, percentage updated
12. Reopen the app → today's checkmarks persist

### Materials
13. Library → **+** → select **several** files → progress banner counts up
14. Long-press a file → select two → assign to a topic → subtitle updates
15. Topic detail → **+** → "Upload new" → assigned to that topic automatically
16. Tap a file → opens in the OS viewer → return

### Biometrics *(development or standalone build)*
17. Profile → enable the biometric lock → confirm with fingerprint/Face ID
18. Background the app >20s → return → prompts
19. Open a file → return → **does not** prompt
20. Background <20s → return → doesn't prompt

### Edge cases
21. Airplane mode → actions show an error rather than hanging silently
22. Switch language in Profile → whole UI changes → restart → **choice persists**
23. Very long topic titles → truncate with "…", never overlap the right-hand element
24. Delete account → confirm → returns to login and the account is gone

---

## 7. When to add a real framework

The current approach stops being enough when:

- **More than one person** is committing — a shared safety net matters more than setup cost
- **A regression ships twice** in the same area — that's the signal it needs automation
- **Component logic grows** — conditional rendering complex enough that typecheck + eyeballs miss cases
- **CI is set up** — self-checks and `tsc` already work in CI today; component tests would need Jest + `jest-expo` + mocks for Supabase/SecureStore/navigation

Recommended starting point at that time: `jest-expo` + React Native Testing Library, tested first on `LibraryScreen` (the most stateful screen: selection mode, upload progress, assignment).

Until then, the honest position is: **the logic that can silently be wrong is tested; the rest is typechecked and exercised by hand.**
