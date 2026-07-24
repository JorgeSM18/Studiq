# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Full project documentation (`README`, `CONTRIBUTING`, `docs/`, `LICENSE`).

### Security
- Supabase credentials moved out of the committed `eas.json` into **EAS environment variables**, so no credentials are stored in the repository. Local development still uses the git-ignored `.env`.

### Fixed
- Removed duplicated Android biometric permissions in `app.json`.

### Notes
- Not yet published to any app store. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for outstanding compliance work (privacy policy).

---

## [1.0.0] — 2026-07-24

First feature-complete build, distributed as a private beta (Android APK + Expo Go).

### Added

**Study planning**
- Derived daily plan: new-topic quota is `ceil(remaining unstarted / days until exam)`, recomputed on every render — no stored schedule to drift.
- Spaced reviews with expanding intervals (2 → 4 → 8 → 16 days, capped at 21), clamped so a final review always lands on or before the exam date.
- Mastered topics resurface for a light final review.
- Study streak computed from real activity, using the device's local date.
- Days-until-exam countdown.

**Exams and topics**
- Exam (subject) management: create, edit, delete and switch, from Home and Profile.
- Bulk topic editor: numbered rows with add/delete, and multi-line paste that auto-splits into rows.
- Topic status: not started / in progress / mastered.
- Per-topic notes.

**Study materials**
- `materials` table replacing the single `topics.pdf_url` column: one file belongs to one topic (or none), a topic holds many.
- Library with multi-file upload and progress, multi-select, bulk assign-to-topic and bulk delete.
- Upload directly from a topic (auto-assigned).
- Private storage bucket with one-hour signed URLs; files open in the OS viewer.

**Authentication and security**
- Email/password auth with adaptive registration (works with email confirmation on or off).
- Sessions persisted encrypted in the device keychain via a chunked SecureStore adapter.
- Session-expiry handling via `onAuthStateChange` and `AppState`-tied token refresh.
- In-app password change (no email round-trip) and logged-out password reset.
- In-app account deletion via a `SECURITY DEFINER` RPC (App Store guideline 5.1.1(v)).
- Optional biometric app lock (fingerprint / Face ID) with a 20-second grace window, which never stores credentials.

**Platform**
- Spanish and English via i18next across six namespaces; language choice persisted.
- `ErrorBoundary` so a render failure shows a message instead of a blank screen.
- Per-platform app icons generated from the source logo (`scripts/generate-icons.mjs`).
- EAS build profiles (`development`, `preview`, `production`) and EAS Update.

### Changed
- Session storage moved from **AsyncStorage to SecureStore** — tokens were previously stored unencrypted.
- Today's plan derived from `topics` instead of a `study_plan` table.
- Supabase user id read from `getSession()` (local) instead of `getUser()` (network), removing ~6 round-trips at startup.
- Zustand consumers converted to per-field selectors to stop global re-renders.
- Streak recomputed locally on toggle, removing a network read per tap.
- Android package and iOS bundle identifier set to `com.studiq.app` (was Expo's `com.anonymous.*` placeholder, which Google Play rejects).

### Fixed
- **Topics query used a non-existent column** (`order` instead of `order_index`), so the topic list was always empty.
- **Notes could only be saved once** — `upsert` needs `onConflict: 'topic_id'`, since the UNIQUE is on `topic_id` and not the primary key.
- **Adding topics failed silently** when the user had no exam; it now self-heals by creating one.
- **`react-native-svg` was removed** although `lucide-react-native` needs it as a peer — every icon would have broken on a clean install.
- **`lucide-react-native` upgraded to 1.26.0** for React 19 support; the old version broke EAS builds at `npm ci` (strict peer resolution) while working locally.
- **Nested `Modal` on iOS** — the date picker inside the exam sheet could fail to present.
- Keyboard covering the save button in the exam form.
- Long titles overlapping the right-hand element in list rows.
- `handle_new_user` hardened with a pinned `search_path` (`SECURITY DEFINER` hijack risk).
- Missing indexes on RLS predicate columns — every policy check was a sequential scan.
- Duplicated Android biometric permissions in `app.json`.

### Removed
- **Broken biometric login** that stored the user's plaintext password and never actually saved it, so it failed 100% of the time. Rebuilt as an app lock.
- AsyncStorage dependency.
- Dead `study_plan` / `study_sessions` code paths (tables dropped by optional migration `0003`).
- Unused dependencies (`lodash`, `expo-sharing`, `expo-font`, `expo-system-ui`, `@react-native-community/datetimepicker`, others).
- Dead `onboarding` translation namespace and orphaned keys.

### Security
- RLS verified on all six tables (`USING` **and** `WITH CHECK`).
- Storage policies scoped by `{uid}/` path prefix.
- Anonymous sign-ins disabled.
- `RESEND_STUDIQ_API_KEY` removed from `.env` — a server-side secret has no place in a mobile project.

---

## [0.1.0] — 2026-05-17

Initial prototype.

### Added
- Expo + TypeScript scaffold, React Navigation, Supabase client.
- Design system (`theme.ts`) and splash screen.
- i18n architecture with device-locale detection.
- Email verification flow and profile screen.

---

[Unreleased]: https://github.com/jorgesm18/studiq/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/jorgesm18/studiq/releases/tag/v1.0.0
[0.1.0]: https://github.com/jorgesm18/studiq/releases/tag/v0.1.0
