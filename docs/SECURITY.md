# Security

Current posture, the reasoning behind it, and what to check before making this repository public.

---

## Publishing this repository

✅ **No Supabase credentials are committed.** They used to live in the `env` blocks of `eas.json`; they now live as **EAS environment variables** on Expo's servers, injected at build time. `eas.json` contains only build configuration.

Where each value lives now:

| Context | Source | In git? |
|---|---|---|
| Local dev (`expo start`) | `.env` | ❌ git-ignored |
| Cloud builds (EAS) | EAS environment variables | ❌ server-side |

To inspect or change them:

```bash
npx eas-cli@latest env:list --environment preview
```

```bash
npx eas-cli@latest env:set --name EXPO_PUBLIC_SUPABASE_URL --value "https://xxxx.supabase.co" --environment development --environment preview --environment production --visibility plaintext
```

`--visibility plaintext` is correct for `EXPO_PUBLIC_` variables: they end up inside the bundle regardless, and EAS must be able to inline them at build time. Marking them `secret` would give false assurance and break the build.

> ⚠️ Values in an `eas.json` `env` block **take precedence** over EAS environment variables. If you ever re-add one for debugging, remember it shadows the server-side value — and don't commit it.

Also worth doing before going public: confirm **anonymous sign-ins are disabled** in the Supabase dashboard, and consider captcha on auth endpoints if the repo attracts attention.

**Never commit:** the `service_role` key, the Android keystore (`*.jks`, `*.keystore` — already git-ignored), `.env`, or Apple credentials.

### If credentials are ever exposed

Rotate them in Supabase (Settings → API), then update all three places: `.env`, the EAS variables (`env:set`), and rebuild. The anon key alone can't read another user's data — RLS blocks that — but rotation stops quota abuse.

---

## 1. Secrets and environment

| Value | Sensitivity | Where it belongs |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Public | `.env` locally · EAS environment variable for builds |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Public | Same |
| `service_role` key | **Secret** | Never in this repo. Server-side only (Edge Functions) |
| SMTP / email provider API key | **Secret** | Supabase SMTP settings — **not** in a mobile project |
| Android keystore + passwords | **Secret** | Password manager. Managed by EAS; back it up |

**The `EXPO_PUBLIC_` rule:** anything with that prefix is inlined into the JavaScript bundle at build time and is trivially readable from a downloaded app. Treat it as published. Everything else in `.env` is *not* bundled — but a mobile repo is still the wrong home for server secrets.

`src/lib/supabase.ts` throws a named error at startup if either variable is missing, instead of failing confusingly on the first query.

---

## 2. Row-level security

**This is the security boundary.** Every table has RLS enabled with:

```sql
using (auth.uid() = user_id) with check (auth.uid() = user_id)
```

Both clauses matter: `USING` governs read/update/delete, `WITH CHECK` governs insert/update. With only the first, a user could insert rows attributed to someone else.

Client-side `.eq('user_id', …)` filters exist for **correctness and index usage**, never for isolation. Removing one would be a performance bug, not a security hole.

Write operations filter by `id` alone (e.g. `updateTopicStatus`) and rely entirely on RLS to reject rows you don't own — which is the correct layering.

### Storage

The `materials` bucket is **private**. Policies assert `(storage.foldername(name))[1] = auth.uid()::text`, so the `{uid}/…` path prefix *is* the authorization check. Reads go through **one-hour signed URLs**; there is no public URL path.

Filenames are sanitised (`/` and `\` replaced) purely for key hygiene — it is not a security control, since the uid prefix already constrains the path.

### Database functions

`handle_new_user()` and `delete_current_user()` are `SECURITY DEFINER` (they run with the owner's privileges) and both pin `search_path = ''`. Without that pin, an unqualified object reference could be resolved from a schema an attacker controls — the "Function Search Path Mutable" warning in Supabase's linter.

`delete_current_user()` can only ever delete `auth.uid()` — a caller cannot pass someone else's id. Execute is granted to `authenticated` only, revoked from `public` and `anon`.

---

## 3. Local storage

| Data | Storage | Encrypted |
|---|---|---|
| Supabase session (access + refresh token) | `expo-secure-store` | ✅ Keychain / Keystore |
| Biometric-lock flag | `expo-secure-store` | ✅ |
| Language, active exam | `expo-secure-store` | ✅ |
| Anything else | — | Nothing else is persisted |

**AsyncStorage is not used at all.** It was removed: the Supabase session used to live there in plaintext, readable on a rooted device or via a device backup.

The chunked adapter in `src/lib/secureStorage.ts` exists because SecureStore caps values at 2048 **bytes** while a session can exceed that. Its self-check covers the multi-byte edge case that made this subtly wrong for users with accented names.

---

## 4. Passwords

**The app never stores a password anywhere.** Not in SecureStore, not in memory beyond the form.

An early implementation stored the plaintext password to replay it for "biometric login". It was deleted entirely. If biometric login is ever revisited, gate the **session token**, never a password.

- Client validates a 6-character minimum, matching Supabase's setting
- In-app change uses `updateUser({ password })` with a live session — no email round-trip
- Logged-out reset returns an identical confirmation whether or not the account exists, preventing account enumeration
- *Leaked password protection* (HaveIBeenPwned) is a **Pro-plan** Supabase feature and is not available on the free tier

---

## 5. Biometrics

An **app lock**, not an authentication method — see [AUTHENTICATION.md](AUTHENTICATION.md#8-biometrics--an-app-lock-not-a-login).

- Enabling requires passing the biometric check first
- Device passcode fallback stays enabled, so a wiped fingerprint can't lock you out
- The flag is device-local, never synced
- No credential is stored or derived

---

## 6. Session lifecycle

| Risk | Mitigation |
|---|---|
| Token expires while in use | `onAuthStateChange` → `SIGNED_OUT` → auth stack |
| Refresh unreliable in background | `AppState` starts/stops the refresh timer |
| Stale session after account deletion | State wiped and `signOut()` called |
| Session readable at rest | Encrypted keychain |

---

## 7. Dependencies

`npm audit` reports vulnerabilities, but at the time of writing **all of them are in build tooling** (Expo CLI, Metro, `ws`, babel) — code that runs on your machine or EAS's, never inside the shipped app. Runtime dependencies are clean.

Before each release: run `npm audit`, and check whether findings affect **runtime** or **build** dependencies before acting. Don't run `npm audit fix --force` casually — it happily introduces breaking major versions.

---

## 8. Known gaps

Honest list of what is *not* covered:

| Gap | Impact | Status |
|---|---|---|
| No crash/error reporting | Production failures are invisible | Sentry planned ([TODO.md](../TODO.md)) |
| No network timeouts | Requests can hang on a bad connection | Deliberate — an `AbortController` risks breaking supabase-js refresh |
| Storage orphans after account deletion | Files remain in the bucket | Needs a cleanup job |
| No certificate pinning | MITM with a trusted-CA device | Overkill at this scale |
| No rate limiting beyond Supabase defaults | Brute-force on auth endpoints | Supabase's built-in limits apply |
| Password reset can't be completed in-app | Deep link not implemented | Tracked |

---

## 9. Reporting a vulnerability

This is a personal project without a formal security process. If you find something, open a **private** security advisory on GitHub rather than a public issue.

---

## 10. Pre-release checklist

- [ ] `.env` not committed (`git ls-files | grep env` returns only `.env.example`)
- [ ] No credentials in `eas.json` — they belong in EAS environment variables
- [ ] No `service_role` key anywhere in the repo
- [ ] Supabase secrets (SMTP/API keys) live in Supabase, not here
- [ ] RLS enabled on **every** table — verify with `supabase/introspect.sql`
- [ ] `materials` bucket is private with the three uid-prefix policies
- [ ] Anonymous sign-ins disabled
- [ ] Android keystore backed up outside the repo
- [ ] `npm audit` reviewed, runtime findings triaged
- [ ] Account deletion tested on a real device
- [ ] Privacy policy published and declared (App Privacy / Data Safety) — required for public store releases
