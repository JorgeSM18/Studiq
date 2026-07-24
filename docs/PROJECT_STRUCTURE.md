# Project structure

Every folder and file, what it holds, and **where to put new code**.

---

## Root

```
studiq/
├── App.tsx                  Root component: SafeAreaProvider + ErrorBoundary + navigator
├── index.js                 Entry point (registerRootComponent, gesture-handler import)
├── app.json                 Expo config: identity, icons, plugins, updates
├── eas.json                 EAS build profiles and channels
├── babel.config.js          babel-preset-expo
├── tsconfig.json            strict mode, @/* → src/*
├── .env                     Local secrets (git-ignored)
├── .env.example             Template
├── assets/                  Icons, splash, logo
├── docs/                    This documentation
├── scripts/                 One-off tooling
├── src/                     Application code
└── supabase/                SQL migrations + introspection
```

> `index.js` imports `react-native-gesture-handler` **first**, before anything else. React Navigation requires that; moving it breaks gestures in non-obvious ways.

---

## `src/components/` — reusable UI

| File | Purpose |
|---|---|
| `Button.tsx` | Primary / secondary / outline variants |
| `Card.tsx` | Surface container with shadow |
| `ListItem.tsx` | Row with icon, title, subtitle, right element. Truncates text so it never collides with the right slot |
| `DatePickerModal.tsx` | Calendar with year/month pickers, locale-aware |
| `ExamManagerModal.tsx` | Exam list + create/edit form. Shared by Home and Profile |
| `ErrorBoundary.tsx` | Class component; catches render errors app-wide |

**Add here when** a component has **two or more** call sites. Until then it stays in the screen that uses it — premature extraction is harder to undo than a later move.

---

## `src/constants/`

`theme.ts` — the single design-system source: colours, typography, spacing, border radii, shadows. Import it; don't hardcode hex values or magic numbers in screens.

---

## `src/lib/` — platform adapters

| File | Purpose |
|---|---|
| `supabase.ts` | Client setup, env validation, `AppState` auto-refresh wiring |
| `secureStorage.ts` | Chunked SecureStore adapter used as Supabase's auth storage |
| `secureStorage.test.ts` | Self-check for the chunking edge cases |
| `biometrics.ts` | Availability check, prompt, lock-flag persistence |
| `prefs.ts` | Device-local prefs: language, active exam |
| `i18n.ts` | i18next init, both locale trees, device-locale detection |

**Add here when** you're wrapping a platform capability or third-party client — not business logic.

---

## `src/locales/`

```
locales/
├── en/  common · auth · home · profile · progress · topics
└── es/  (same six namespaces)
```

Both trees must stay **key-for-key aligned**. A missing key silently falls back to English, which is easy to ship by accident — see the parity check in [TESTING.md](TESTING.md).

---

## `src/navigation/`

`AppNavigator.tsx` does four things:

1. Bootstraps auth, prefs and the biometric lock on mount
2. Subscribes to `onAuthStateChange` and the `AppState` lock logic
3. Renders the auth stack **or** the main stack based on `session`
4. Overlays `LockScreen` when the biometric lock is active

**Add a screen here** — a screen not registered in this file is unreachable.

---

## `src/screens/`

| Screen | Route | Notes |
|---|---|---|
| `HomeScreen` | `Hoy` tab | Today's derived plan, exam pill, check-off |
| `TopicsScreen` | `Temas` tab | Syllabus list, add button, long-press delete |
| `LibraryScreen` | `Biblioteca` tab | All materials, multi-select, assign to topic |
| `ProgressScreen` | `Progreso` tab | Percentage, streak, mastered count |
| `ProfileScreen` | `Perfil` tab | Name, language, exams, security, delete account |
| `TopicDetailScreen` | stack | Materials, notes, mark mastered |
| `BulkAddTopicsScreen` | modal | Row editor with paste-to-split |
| `SplashScreen` | — | Shown while auth resolves |
| `LockScreen` | — | Overlay, not a route |
| `auth/WelcomeScreen` | auth stack | Login + forgot password |
| `auth/RegisterScreen` | auth stack | Signup form |
| `auth/VerifyEmailScreen` | auth stack | Only when email confirmation is on |

**Convention:** one screen per file, named `<Name>Screen.tsx`, exported as a named const.

---

## `src/services/`

`supabaseService.ts` — the **only** module that queries Supabase. Grouped by domain: auth, profile, topics, subjects, study log, notes, materials.

Full method reference: [API.md](API.md).

**Add here when** you need a new data operation. Never call Supabase from a screen or component.

---

## `src/store/`

`useStore.ts` — one Zustand store. Actions orchestrate optimistic updates, service calls and reconciliation. Also holds `topicProgress()`, the single place progress arithmetic happens.

**Add here when** state must be shared across screens or survive navigation. Form drafts and modal flags stay local to the screen.

---

## `src/types/`

`index.ts` — `TopicStatus`, `Topic`, `Material`, `Note`, `Subject`, `Profile`, `UserProgress`.

These **mirror the database**. Change a column, change the type in the same commit — the `status` union and the SQL `CHECK` constraint in particular must agree.

---

## `src/utils/` — pure logic

| File | Exports |
|---|---|
| `plan.ts` | `buildDailyPlan`, `scheduleReview`, `nextReviewInterval`, `daysUntil`, `isReview` |
| `streak.ts` | `computeStreak`, `todayISO`, `addDaysISO` |
| `plan.test.ts`, `streak.test.ts` | Self-checks |

**The rule:** no React, no I/O, no Supabase. Data in, data out. This is where the product's actual rules live, and it's the only code that can be fully verified without a device.

**Add here when** logic can be expressed as a pure function — and add cases to the matching `.test.ts` in the same commit.

---

## `supabase/`

```
supabase/
├── introspect.sql           Single-query schema dump (read-only)
└── migrations/
    ├── 0001_baseline.sql
    ├── 0002_indexes_search_path_study_log.sql
    ├── 0003_drop_unused_optional.sql   (optional, destructive)
    ├── 0004_materials.sql
    └── 0005_delete_account.sql
```

Applied manually in the Supabase SQL editor. **Never edit an applied migration** — add the next number. See [DATABASE.md](DATABASE.md).

---

## `scripts/`

`generate-icons.mjs` — derives `icon.png`, `adaptive-icon.png` and `splash.png` from `assets/studiq_logo.png` with the correct per-platform rules. Needs `sharp`, installed on demand with `--no-save` so it never becomes a project dependency.

---

## `assets/`

| File | Used by |
|---|---|
| `icon.png` | iOS app icon — **opaque**, no alpha channel |
| `adaptive-icon.png` | Android foreground — transparent, logo inside the 66% safe zone |
| `splash.png` | Launch screen — transparent logo |
| `studiq_logo.png` | **In-app** (Welcome, Splash, Lock screens). The source for the three above |

Don't hand-edit the first three — regenerate them from the logo.

---

## Where do I put…?

| I want to… | Put it in |
|---|---|
| Add a screen | `src/screens/` + register in `AppNavigator.tsx` |
| Add a shared component | `src/components/` (only once there are 2+ users) |
| Query or mutate data | `src/services/supabaseService.ts` |
| Share state between screens | `src/store/useStore.ts` |
| Change scheduling rules | `src/utils/plan.ts` + its test |
| Add UI text | `src/locales/{es,en}/<namespace>.json` |
| Change colours/spacing | `src/constants/theme.ts` |
| Change the schema | New file in `supabase/migrations/` + `src/types/index.ts` |
| Wrap a device capability | `src/lib/` |
