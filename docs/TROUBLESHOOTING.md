# Troubleshooting

Real failures hit while building this project, and how they were fixed.

---

## Environment & startup

### `Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY`

Deliberate — `src/lib/supabase.ts` fails fast at startup rather than throwing something confusing on the first query.

1. Does `.env` exist? `cp .env.example .env`
2. Are both variables filled in?
3. **Restart with cache cleared** — env values are inlined at bundle time:

```bash
npx expo start --clear
```

For **EAS builds**, `.env` is not uploaded — the values come from EAS environment variables. Check they exist:

```bash
npx eas-cli@latest env:list --environment preview
```

If one is missing, create it with `eas env:set` (see [EAS.md](EAS.md)).

### Expo won't start / Metro errors

```bash
npx expo start --clear
```

Still broken:

```bash
rm -rf node_modules && npm install
```

If it's a version mismatch after an SDK change:

```bash
npx expo install --fix
```

### The app opens on a blank/white screen

The `ErrorBoundary` should catch render errors and show a message. A truly blank screen usually means a failure *before* React mounts — check the Metro terminal output. Common causes: a syntax error in `i18n.ts`, or a missing locale JSON.

---

## Build & dependencies

### EAS build fails at `npm ci`

**The most common build failure.** Example:

```
npm error ERESOLVE could not resolve
npm error peer react@"^16.5.1 || ^17.0.0 || ^18.0.0" from lucide-react-native@0.363.0
npm error Conflicting peer dependency: react@18.3.1
```

**Cause:** `npm install` (local) tolerates peer-dependency conflicts with a warning; **`npm ci` (what EAS runs) is strict and aborts**. So it works on your machine and fails in the cloud.

**Fix:** upgrade the offending package to a version that supports your React version.

```bash
npm view <package> peerDependencies
```

```bash
npm install <package>@latest
```

Then verify with the exact command EAS runs:

```bash
npm ci --include=dev
```

**Avoid `--legacy-peer-deps` / `.npmrc`.** It silences the symptom and leaves a library that officially doesn't support your React version.

> Always run `npm ci` locally before queueing a build — failed builds consume your free-tier quota.

### EAS built an old version of my app

**EAS builds from git, not your working directory.** Uncommitted changes are silently excluded.

```bash
git status --short
```

Commit, then rebuild.

### `npm audit` reports vulnerabilities

Check whether they're in **runtime** or **build** dependencies. At the time of writing all findings are in Expo CLI / Metro / babel — tooling that never ships inside the app. Don't run `npm audit fix --force`; it introduces breaking majors.

---

## Supabase

### Queries return empty arrays but data exists in the dashboard

Almost always **RLS**. Verify:

1. Is there a session? RLS predicates use `auth.uid()`, which is `NULL` when logged out.
2. Does the row's `user_id` match the signed-in user? Rows inserted manually in the dashboard often have no/other `user_id`.
3. Is the policy present *and* is RLS enabled? Run `supabase/introspect.sql` and check `rls_enabled` plus `rls_policies`.

### `column topics.order does not exist`

Historical: the column is `order_index`, because `order` is a reserved SQL keyword. If you see this, some code is using the old name.

### Saving a note fails the second time

`notes` has a UNIQUE on `topic_id`, but upsert defaults to resolving against the **primary key**. Without `onConflict`, the second save generates a fresh `id` and trips the constraint:

```ts
.upsert({ topic_id, user_id, content }, { onConflict: 'topic_id' })
```

### "Add topics" does nothing, no error

The user has no subject (exam), so `activeSubjectId` is `null`. `addTopics` now self-heals by creating a subject from signup metadata. If it still fails, check that `createInitialSubjectIfNeeded` ran — it needs an active session, so it happens on the first authenticated fetch, not during signup.

### Files won't open / signed URL 400

The `materials` bucket is **private** — `getPublicUrl` returns a URL that 400s. Use `createSignedUrl` (`getFileUrl` does). Also confirm the storage policies use the `{uid}/…` first-segment check.

### `delete_current_user` RPC not found

Migration `0005` hasn't been applied. Run it in the SQL editor.

---

## Authentication

### Login fails with correct credentials

- Whitespace/case: the service normalises with `trim().toLowerCase()` — if you bypassed it, that's the cause.
- **Email confirmation is on** and the address is unconfirmed. Check Authentication → Providers → Email.
- Password below the minimum length configured in Supabase.

### Registration succeeds but the app stays on "Verify email"

Expected when **Confirm email** is on. The screen polls every 4s; tap the link in the email and return. To skip verification during development, turn the setting off — `RegisterScreen` adapts automatically (it enters directly when `signUp` returns a session).

### Verification emails never arrive

Supabase's built-in email is rate-limited (a few per hour) and often lands in spam. Check the spam folder. For reliable delivery, configure custom SMTP — which needs a verified domain.

### Session lost on every restart

The session lives in SecureStore. If it vanishes:

1. Did you switch storage adapters? It must be `secureStorage` in `src/lib/supabase.ts`.
2. Values over 2048 bytes need the chunking adapter. Run its self-check:

```bash
npx tsx src/lib/secureStorage.test.ts
```

### Password change fails

Two Supabase settings must be **off**: *Secure password change* (requires a login in the last 24h) and *Require current password when updating* (the app doesn't collect it).

---

## Biometrics

### The toggle won't turn on

- No fingerprint/face enrolled on the device → the app alerts and refuses. Enrol one in system settings.
- Enabling deliberately requires passing a biometric check first; cancelling leaves it off.

### It asks for biometrics every time I open a PDF

Should not happen — the app sets `lockSuppressed` before opening a file so the resulting background trip doesn't lock. If it does, that flag isn't being set in the open path.

### Biometrics don't work in Expo Go

They should — `expo-local-authentication` is bundled in Expo Go, which supplies its own Face ID permission string. If it genuinely fails, use a development build:

```bash
npx eas-cli@latest build --profile development
```

---

## Devices & connection

### Expo Go can't reach the dev server

Different networks, or the Wi-Fi blocks local connections:

```bash
npx expo start --tunnel
```

### Android: "App not installed" when sideloading the APK

- A previous build with a **higher** `versionCode` is installed → uninstall it first
- A previous build signed with a **different** key → uninstall first
- "Install from unknown sources" not allowed for the browser/file manager

### iOS testers can't install the app

There is no free way to install a standalone iOS build on someone else's device. Either Expo Go (needs your dev server running) or TestFlight ($99/yr). See [EAS.md](EAS.md#7-distribution).

---

## Updates (OTA)

### `eas update` published but nothing changes on the device

1. **The installed build predates `update:configure`** — it has no update client. Rebuild once.
2. **Branch ≠ channel.** `--branch preview` only reaches builds from the `preview` profile.
3. **Updates apply on the *next* launch.** Open, close, open again.
4. **`runtimeVersion` mismatch** — bumping `version` in `app.json` cuts existing installs off from new updates.

### A native change didn't ship over the air

Correct — OTA only carries JS and assets. New native modules, permissions, icons or SDK upgrades need a rebuild. See [EAS.md](EAS.md#what-ota-can-and-cannot-ship).

---

## Diagnostics

```bash
npx tsc --noEmit
```

```bash
npx tsx src/utils/plan.test.ts && npx tsx src/utils/streak.test.ts && npx tsx src/lib/secureStorage.test.ts
```

```bash
npm ci --include=dev
```

Plus `supabase/introspect.sql` in the SQL editor for the full server-side picture. If all four are clean, the problem is almost certainly configuration (Supabase dashboard settings, env vars) rather than code.
