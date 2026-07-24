# Studiq

A calm, minimalist study planner for certification and competitive exams, built with React Native + Expo and Supabase.

Studiq answers one question every morning: **what should I study today?** It derives a daily plan from your syllabus and your exam date — no manual scheduling — mixes new topics with spaced reviews, and tracks your streak and progress toward the exam.

> **Status:** private beta. Feature-complete for daily personal use. See [TODO.md](TODO.md) for what's next and [CHANGELOG.md](CHANGELOG.md) for history.

---

## Screenshots

<!-- TODO: replace placeholders with real captures -->
| Today | Topics | Topic detail |
|:---:|:---:|:---:|
| _screenshot pending_ | _screenshot pending_ | _screenshot pending_ |

| Library | Progress | Profile |
|:---:|:---:|:---:|
| _screenshot pending_ | _screenshot pending_ | _screenshot pending_ |

---

## Features

- **Derived daily plan.** New topics per day = `ceil(remaining unstarted / days until exam)`. Fall behind and the quota rises on its own; there is no stored schedule to drift out of sync.
- **Spaced reviews.** After studying a topic it returns in 2 days, then 4, 8, 16… (capped at 21 days), and never later than the exam date.
- **Exam management.** Multiple exams with dates; switch between them and the plan re-paces to the active one.
- **Topic management.** Add topics one by one or paste a whole syllabus (auto-splits into editable rows). Status: not started / in progress / mastered.
- **Study materials.** Upload PDF/PPT/Word files to a private library and assign them to topics (one file → one topic; a topic → many files). Opened in the OS viewer through time-limited signed URLs.
- **Notes** per topic.
- **Progress & streak.** Percentage mastered, a real study streak, and days until the exam.
- **Auth.** Email/password, encrypted session persistence, password reset, in-app password change, in-app account deletion.
- **Biometric app lock.** Optional fingerprint / Face ID gate. Never stores passwords — it gates an existing session.
- **Bilingual.** Full Spanish and English via i18next, with no hardcoded UI strings.

**Deliberately out of scope:** AI features, flashcards, quizzes, notifications, dark mode, web build. See [docs/FAQ.md](docs/FAQ.md).

---

## Tech stack

| Layer | Choice |
|---|---|
| Runtime | React Native `0.81.5`, Expo SDK `54` |
| Language | TypeScript (`strict`) |
| Backend | Supabase (PostgreSQL + Auth + Storage) |
| State | Zustand `4` |
| Navigation | React Navigation `6` (native-stack + bottom-tabs) |
| i18n | i18next + react-i18next, `expo-localization` |
| Secure storage | `expo-secure-store` |
| Biometrics | `expo-local-authentication` |
| Icons | `lucide-react-native` |
| OTA updates | `expo-updates` (EAS Update) |

---

## Architecture at a glance

```
Screens ──▶ Zustand store ──▶ supabaseService ──▶ Supabase (Postgres + Storage)
                 │
                 └──▶ pure logic (utils/plan.ts, utils/streak.ts) ← self-checked
```

Three rules the codebase follows:

1. **Screens never call Supabase directly.** They call store actions.
2. **All scheduling logic is pure and tested.** `buildDailyPlan`, `scheduleReview` and `computeStreak` take data in and return data out — no I/O, no React.
3. **RLS is the security boundary.** The client filters by `user_id` for correctness, but isolation is enforced by PostgreSQL row-level security.

Full detail: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

---

## Project structure

```
src/
├── components/     Reusable UI (Button, Card, ListItem, modals, ErrorBoundary)
├── constants/      theme.ts — the single design-system source
├── lib/            supabase, i18n, secureStorage, biometrics, prefs
├── locales/        es/ and en/ JSON namespaces
├── navigation/     AppNavigator — auth gate, tabs, biometric lock overlay
├── screens/        One file per screen (auth/ subfolder for the auth flow)
├── services/       supabaseService.ts — the only place that calls Supabase
├── store/          useStore.ts — Zustand store
├── types/          Domain types mirroring the DB schema
└── utils/          plan.ts, streak.ts (+ their .test.ts self-checks)

supabase/migrations/  Numbered SQL migrations (0001 → 0005)
docs/                 Full documentation
scripts/              generate-icons.mjs — derives app icons from the logo
```

Detailed walkthrough: **[docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md)**.

---

## Requirements

- **Node.js 20+** (LTS recommended)
- **npm 10+**
- A **Supabase** project (free tier is enough)
- For device builds: an **Expo account** and `eas-cli`
- Android Studio / Xcode are **not** required for cloud builds

---

## Quick start

```bash
git clone <your-repo-url> studiq
```

```bash
cd studiq && npm install
```

```bash
cp .env.example .env
```

Fill `.env` with your Supabase credentials (below), apply the SQL in `supabase/migrations/`, then:

```bash
npx expo start
```

Scan the QR with **Expo Go** (Android/iOS). The whole app runs in Expo Go — every dependency is either an Expo SDK module or pure JS.

Step-by-step from zero, including Supabase setup: **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)**.

---

## Environment variables

Only two, both public by design (they ship inside the app bundle):

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | The `anon` public key |

Anything prefixed `EXPO_PUBLIC_` is embedded in the app and readable by anyone who downloads it. **Never put a service-role key or any real secret behind that prefix.** `src/lib/supabase.ts` validates both at startup and throws a named error if either is missing.

`.env` is git-ignored and used for local development only. **Cloud builds read EAS environment variables** stored on Expo's servers — no credentials are committed to this repository. See [docs/SECURITY.md](docs/SECURITY.md).

---

## Running the app

| Command | What it does |
|---|---|
| `npm start` | Expo dev server (QR for Expo Go) |
| `npx expo start --tunnel` | Same, reachable outside your LAN |
| `npx expo start --clear` | Clears the Metro cache (needed after `.env` changes) |
| `npm run android` | Native Android run (requires Android Studio) |
| `npm run ios` | Native iOS run (requires macOS + Xcode) |
| `npm run web` | Experimental — **not a supported target** |

Device testing and the Expo Go workflow: **[docs/EXPO.md](docs/EXPO.md)**.

---

## Builds and releases

Cloud builds via EAS — no local Android/iOS toolchain needed:

```bash
npx eas-cli@latest build -p android --profile preview
```

Three profiles in `eas.json`: `development` (dev client), `preview` (internal APK) and `production` (AAB / store). JavaScript changes ship over the air with `eas update`, without rebuilding.

- EAS, profiles, credentials and OTA: **[docs/EAS.md](docs/EAS.md)**
- Store submission: **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**

---

## Scripts

| Script | Command | Purpose |
|---|---|---|
| `start` | `expo start` | Dev server |
| `android` | `expo run:android` | Native Android build + run |
| `ios` | `expo run:ios` | Native iOS build + run |
| `web` | `expo start --web` | Web (unsupported) |

There is no `test` script — the project uses standalone self-checks run with `npx tsx`. See **[docs/TESTING.md](docs/TESTING.md)**.

---

## Authentication

Email/password via Supabase Auth. The session is persisted **encrypted in the device keychain** (`expo-secure-store`), chunked to work around its 2048-byte limit. Token refresh is tied to `AppState`, and `onAuthStateChange` routes the user back to login the moment a session expires or is revoked.

Biometrics are an **app lock**, not a login method: they gate an already-valid session and never store credentials.

Full flows with diagrams: **[docs/AUTHENTICATION.md](docs/AUTHENTICATION.md)**.

---

## Database

Six tables — `profiles`, `subjects`, `topics`, `notes`, `study_log`, `materials` — all with row-level security (`auth.uid() = user_id`), plus a private `materials` storage bucket.

Migrations live in `supabase/migrations/` and are applied **manually via the Supabase SQL editor** (this repo has no Supabase CLI setup).

Schema, policies, indexes and triggers: **[docs/DATABASE.md](docs/DATABASE.md)**.

---

## Internationalization

Spanish and English across six namespaces (`common`, `auth`, `home`, `profile`, `progress`, `topics`). The device locale sets the initial language; the user's choice is persisted to the keychain. **No hardcoded UI strings** — both locale trees are kept key-for-key aligned.

---

## Security

Highlights: RLS on every table, sessions in the keychain, no secrets in the bundle, signed URLs for private files, in-app account deletion, and a biometric lock that never stores passwords.

**Read [docs/SECURITY.md](docs/SECURITY.md) before publishing this repository** — it covers what is and isn't safe to commit.

---

## Roadmap

Near term (see [TODO.md](TODO.md)):

- Crash/error reporting (Sentry)
- Dark mode
- Study reminders (notifications)
- Deep link to complete password reset from the email
- Tablet-optimised layouts

Longer term: richer spaced repetition (the `ease_factor` column is reserved for it), flashcards, calendar view, desktop/web.

---

## Contributing

Conventions, how to add a screen/component/service, and TypeScript rules: **[CONTRIBUTING.md](CONTRIBUTING.md)** and **[docs/CODE_STYLE.md](docs/CODE_STYLE.md)**.

---

## Documentation index

| Document | Contents |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Layers, data flow, navigation, state, scaling |
| [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) | Every folder and file, and where to add things |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Zero-to-running setup, including Supabase |
| [docs/DATABASE.md](docs/DATABASE.md) | Tables, RLS, indexes, triggers, migrations |
| [docs/AUTHENTICATION.md](docs/AUTHENTICATION.md) | Auth flows, session, biometrics |
| [docs/API.md](docs/API.md) | The `supabaseService` surface |
| [docs/SECURITY.md](docs/SECURITY.md) | Secrets, RLS, storage, hardening |
| [docs/EXPO.md](docs/EXPO.md) | Expo Go, dev server, app config |
| [docs/EAS.md](docs/EAS.md) | Build profiles, credentials, OTA updates |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Google Play and App Store |
| [docs/TESTING.md](docs/TESTING.md) | Self-checks and manual test plan |
| [docs/CODE_STYLE.md](docs/CODE_STYLE.md) | Naming, typing, patterns |
| [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Common errors and fixes |
| [docs/FAQ.md](docs/FAQ.md) | Design decisions and scope questions |

---

## License

[MIT](LICENSE) © 2026 Jorge Sánchez
