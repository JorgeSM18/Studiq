# Development setup

From an empty machine to a running app. Budget **15 minutes**, most of it waiting on `npm install` and creating the Supabase project.

---

## 1. Prerequisites

| Tool | Version | Notes |
|---|---|---|
| **Node.js** | 20 LTS or newer | `node -v` |
| **npm** | 10+ | Ships with Node 20 |
| **Git** | any recent | |
| **Expo Go** | latest | On the phone you'll test with (App Store / Play Store) |

You do **not** need Android Studio or Xcode. The whole app runs in Expo Go, and release builds happen in the cloud via EAS.

Optional, for native local runs: Android Studio (Android) or macOS + Xcode (iOS).

---

## 2. Clone and install

```bash
git clone <your-repo-url> studiq
```

```bash
cd studiq && npm install
```

> If `npm install` reports peer-dependency conflicts, do **not** reach for `--legacy-peer-deps`. It usually means a package genuinely doesn't support the installed React version — fix the package instead. See [TROUBLESHOOTING.md](TROUBLESHOOTING.md#eas-build-fails-at-npm-ci).

---

## 3. Environment variables

```bash
cp .env.example .env
```

| Variable | Where to find it | Secret? |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL | No |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Same page → `anon` `public` key | No — public by design |

Both are embedded in the app bundle and readable by anyone who downloads it. That is expected: RLS is what protects the data. **Never** put the `service_role` key here or behind any `EXPO_PUBLIC_` name.

Metro caches env values — after editing `.env`, restart with `npx expo start --clear`.

---

## 4. Supabase setup

### 4.1 Create the project
[supabase.com](https://supabase.com) → New project. Free tier is enough. Save the database password somewhere safe.

### 4.2 Apply the migrations

Supabase → **SQL Editor** → paste and run **in order**. The editor only shows the result of the last statement, so run one file at a time.

| Order | File | Why |
|---|---|---|
| 1 | `supabase/migrations/0001_baseline.sql` | Tables, RLS, triggers |
| 2 | `supabase/migrations/0002_indexes_search_path_study_log.sql` | Indexes, `study_log`, search_path hardening |
| 3 | `supabase/migrations/0004_materials.sql` | `materials` table |
| 4 | `supabase/migrations/0005_delete_account.sql` | Account-deletion RPC |

`0003_drop_unused_optional.sql` is optional and destructive — it only removes legacy tables. Skip it on a fresh project (there's nothing to drop).

### 4.3 Create the storage bucket

Supabase → **Storage** → New bucket:
- Name: `materials`
- **Private** (public off)

Then add three policies on `storage.objects` (SELECT, INSERT, DELETE), each with:

```sql
bucket_id = 'materials' AND (storage.foldername(name))[1] = auth.uid()::text
```

That first-path-segment check is the authorization boundary for files.

### 4.4 Configure Auth

Supabase → **Authentication**:

| Setting | Where | Value |
|---|---|---|
| **Confirm email** | Providers → Email | Your call — the app supports both (see [AUTHENTICATION.md](AUTHENTICATION.md#2-registration)). **Off** is easier for local development. |
| **Allow anonymous sign-ins** | Providers | **Off.** The app doesn't use them and they're an abuse vector. |
| **Secure password change** | Providers → Email | **Off** — the in-app password change relies on this |
| **Require current password when updating** | Providers → Email | **Off** — the app doesn't collect it |
| **Minimum password length** | Providers → Email | `6` (matches client-side validation) |
| **Site URL** | URL Configuration | Any valid URL; only used by email links |

### 4.5 Email delivery (optional)

Supabase's built-in email is rate-limited (a few per hour) and marked for testing only. Fine for development and a private beta. For real multi-user delivery, configure custom SMTP (Resend, Postmark…) — that requires a verified domain.

### 4.6 Verify

Run `supabase/introspect.sql` in the SQL editor. It returns a single JSON cell with every table, constraint, index, RLS policy, trigger, function and bucket. Confirm all six tables show `rls_enabled: true`.

---

## 5. Run it

```bash
npx expo start
```

Scan the QR with Expo Go. If your phone and computer aren't on the same network:

```bash
npx expo start --tunnel
```

### Native local runs (optional)

```bash
npm run android
```

```bash
npm run ios
```

These compile natively and need Android Studio / Xcode. You don't need them for normal development.

### Web

`npm run web` exists but **web is not a supported target** — layouts are phone-first and native modules (SecureStore, biometrics, document picker) behave differently or not at all.

---

## 6. Verify your setup

```bash
npx tsc --noEmit
```

```bash
npx tsx src/utils/plan.test.ts && npx tsx src/utils/streak.test.ts && npx tsx src/lib/secureStorage.test.ts
```

All three should print `all checks passed`. See [TESTING.md](TESTING.md).

Then exercise the app end-to-end: register → an exam is created from your signup data → Topics → add a few topics → Home shows today's plan sized by your exam date → tick one → Progress shows the streak.

---

## 7. Daily workflow

```bash
npx expo start          # dev server, hot reload
npx tsc --noEmit        # before committing
```

**Commit before every EAS build.** EAS builds from the git repository, not your working directory — uncommitted changes are silently excluded and you'll build the previous version.

Common tasks and where they live:

| Task | Start here |
|---|---|
| New screen | `src/screens/`, register in `src/navigation/AppNavigator.tsx` |
| New reusable component | `src/components/` |
| New data operation | `src/services/supabaseService.ts`, then a store action |
| Change the planning rules | `src/utils/plan.ts` + update `plan.test.ts` |
| New text | `src/locales/es/*.json` **and** `en/*.json` (keep keys aligned) |
| Schema change | New numbered file in `supabase/migrations/`, update `src/types/index.ts` |

Conventions: [CODE_STYLE.md](CODE_STYLE.md) and [../CONTRIBUTING.md](../CONTRIBUTING.md).

---

## 8. Regenerating app icons

`assets/icon.png`, `adaptive-icon.png` and `splash.png` are **derived** from `assets/studiq_logo.png`:

```bash
npm i --no-save sharp && node scripts/generate-icons.mjs
```

`sharp` is installed with `--no-save` deliberately — it's a one-off build tool, not a project dependency. The script explains the per-platform sizing rules (notably Android's 66% safe zone and iOS's no-alpha requirement).
