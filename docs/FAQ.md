# FAQ

Design decisions, scope questions, and things that look odd until you know why.

---

## Product

### What problem does Studiq actually solve?

Answering *"what should I study today?"* without maintaining a plan by hand. You enter your syllabus and exam date once; the app paces new topics and interleaves reviews. Everything else exists to serve that loop.

### Why no quizzes, flashcards or AI?

They're a different product. Studiq organises *when* you study; it doesn't test you. Every feature was measured against "does this help me open the app tomorrow and know what to do?" — flashcards and AI don't, so they were cut before being built rather than half-built and abandoned.

### Why does today's plan change if I fall behind?

By design. The daily quota is `ceil(remaining unstarted / days until exam)`, recomputed every time. Miss three days and tomorrow's quota rises to cover it. A *stored* schedule would go stale and quietly demoralise you; a derived one self-heals.

### Why do mastered topics come back?

For a light final review. They keep their spaced schedule (capped at 21 days), so they resurface occasionally rather than disappearing the moment you feel confident.

### Why is a review 2 days, then 4, 8, 16?

Simple expanding spacing. Real SM-2 needs a *recall grade* after each review — and Studiq has no tests to grade from. Time-based spacing is the honest version of spaced repetition given that constraint. The `ease_factor` column is reserved for when grading exists.

### Why can't a file belong to several topics?

That was an explicit decision: one file → one topic (or none). Many-to-many needs a join table and a more complex UI for marginal benefit. A topic can hold many files, which covers the real use case.

### Dark mode?

Not implemented. `theme.ts` has no dark palette and `app.json` pins `userInterfaceStyle: light`, so light-only is at least *consistent*. Adding it means a second palette and auditing every screen. On the roadmap.

---

## Technical

### Why Zustand and not Redux / Context?

The app has one store and ~15 fields. Redux is ceremony at this size; Context re-renders everything without selectors. Zustand gives per-field subscriptions in a few lines. If the store grows unwieldy, split it into slices before reaching for a bigger library.

### Why no test framework?

See [TESTING.md](TESTING.md). The short version: all logic worth testing is pure and lives in `src/utils/`, covered by `assert`-based self-checks. Mocking Supabase + navigation + SecureStore to assert that a button renders costs more than it returns for a solo project. Each self-check caught a real bug.

### Why aren't there `ios/` and `android/` folders?

Managed workflow — they're generated at build time. `app.json` is the source of truth for native config. Running `expo prebuild` would create them and move the project toward the bare workflow; don't unless you need custom native code.

### Why is the session in SecureStore rather than AsyncStorage?

AsyncStorage is **unencrypted**. The Supabase session (access + refresh tokens) sat there in plaintext originally — readable on a rooted device or from a device backup. SecureStore uses the platform keychain/keystore.

The chunking adapter exists because SecureStore caps values at 2048 bytes and a session can exceed that.

### Why does `secureStorage` assume 4 bytes per character?

The cap is on **bytes**; JavaScript slices by **characters**. Session JSON keeps non-ASCII literal (an accented name), so 1500 accented characters = 3000 bytes and the write fails. Assuming the worst case (4 bytes/char) is cheaper than measuring every slice, and the extra keys cost nothing. This was a real bug, caught by the self-check.

### Why is biometrics a lock instead of a login?

"Biometric login" implies replaying a credential, which means storing one. The original implementation stored the **plaintext password** — and never actually saved it, so the button failed 100% of the time.

The session already persists encrypted, so the useful thing is *gating access* to it. No credential is stored.

### Why does the client filter by `user_id` if RLS already does?

For correctness and index usage, not security. RLS is the boundary. Removing a client filter would be a performance bug, not a vulnerability.

### Why `getSession()` instead of `getUser()`?

`getUser()` makes a **network round-trip** to re-validate the token; `getSession()` reads locally. There were six `getUser()` calls on app start. Since RLS enforces access server-side, the local id is enough to scope queries and populate `user_id` on inserts.

### Why is there no `study_plan` table?

There was; migration `0003` drops it. Today's plan is derived from `topics` + the exam date on every render — nothing to generate, nothing to drift. `study_log` (what you actually studied) remains, because that's real history.

### Why is the column `order_index` and not `order`?

`order` is a reserved SQL keyword that would need quoting forever. It was renamed while the table was empty.

### Why are route names in Spanish?

Historical (`Hoy`, `Temas`, `Biblioteca`…). They're identifiers, never shown to users — visible labels come from i18n. Renaming them is a safe cleanup task nobody has prioritised.

### Why does `console.error` survive in production?

There's no crash reporter yet, so device logs are the only production diagnostic. Gating them behind `__DEV__` would make production *quieter*, not safer. There are zero `console.log` calls. Adding Sentry is on the roadmap; that's when these become redundant.

### Why does the store not use `persist` middleware?

Only three values need to survive a restart — language, active exam, biometric flag — and they belong in the **encrypted** keychain. `src/lib/prefs.ts` handles them explicitly. A blanket `persist` risks writing a session token to unencrypted storage by accident.

---

## Operations

### Why are migrations applied by hand?

There's no Supabase CLI setup — the schema was originally built in the dashboard, then captured into `supabase/migrations/`. For a single environment, pasting SQL into the editor is fine. Multiple environments would justify the CLI and proper migration tracking.

### Can this run in Expo Go?

Yes — every dependency is an Expo SDK module or pure JS, biometrics included. **Adding any library with custom native code would end that**, forcing every tester onto a development build. Check before adding a dependency.

### Why can't my iOS testers use it without my computer running?

Apple. There's no free path to install a standalone iOS build on someone else's device — it needs the Apple Developer Program ($99/yr) for TestFlight or ad-hoc distribution. Expo Go works but needs your dev server. Android has no such restriction: the APK is standalone and free.

EAS Update does **not** serve Expo Go — the old `expo publish` flow that allowed that was discontinued.

### Where are the Supabase credentials, and is the anon key a secret?

They are **not in this repository**. Local development reads `.env` (git-ignored); cloud builds read **EAS environment variables** stored on Expo's servers.

The anon key isn't a secret in the strict sense — it ships inside every APK, so anyone can extract it, and RLS is what actually protects data. It was still moved out of `eas.json` because publishing it on GitHub makes abuse trivially easy: not reading other people's data (RLS blocks that), but burning your free-tier quota with sign-up spam and bandwidth. See [SECURITY.md](SECURITY.md#publishing-this-repository).

### Why does the app enter directly after registering instead of asking me to verify?

Email confirmation is currently **off** in the Supabase project. `RegisterScreen` adapts to either setting with no code change: if `signUp` returns a session it goes straight in, otherwise it routes to the verify screen.

### Why does deleting my account leave files in storage?

The FK cascade removes database rows; storage objects aren't covered by it. A known gap — see [SECURITY.md](SECURITY.md#8-known-gaps).
