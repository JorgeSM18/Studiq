# Backlog

Working backlog for Studiq. Items are grouped by state, then roughly ordered by priority.

Legend: 🔴 blocker · 🟠 high · 🟡 medium · 🟢 low

---

## In progress

- 🟠 **Private beta testing** — daily use on Android (APK) and iOS (Expo Go). Collecting real-world issues before any wider release.

---

## Pending

### Blocking a public store release

- 🔴 **Privacy policy.** A public URL is mandatory for both stores (the app collects email + study content), and must be declared in Apple's *App Privacy* and Google's *Data Safety* forms. Nothing to code — it's a document plus two questionnaires.
- 🟠 **Verify account deletion on a real device.** Implemented and requires migration `0005`; not yet exercised end-to-end on hardware. Apple rejects on this constantly.
- 🟠 **Crash/error reporting (Sentry).** There is currently *no* production visibility — the `console.error` calls only reach device logs. This also retires the "why do we keep console.error?" question in [docs/FAQ.md](docs/FAQ.md).

### Robustness

- 🟠 **Complete the password reset flow.** The email is sent, but finishing it in-app needs a deep link (`scheme` in `app.json`) plus a screen handling the `PASSWORD_RECOVERY` event. Today the link lands on whatever Supabase's *Site URL* points at.
- 🟡 **Network timeouts.** supabase-js uses `fetch` with no timeout, so actions hang on a bad connection. Deliberately deferred: a naive `AbortController` risks breaking token refresh.
- 🟡 **Storage cleanup after account deletion.** The FK cascade removes rows; files stay in the `materials` bucket. Needs a scheduled job or a storage trigger.
- 🟡 **Streamed uploads.** `uploadMaterial` reads the whole file into memory via `arrayBuffer()`. Fine for documents, risky for very large files.

### Product

- 🟡 **Dark mode.** Needs a second palette in `theme.ts`, removing `userInterfaceStyle: light`, and a pass over every screen.
- 🟡 **Study reminders (notifications).** A daily nudge is the most obvious missing habit loop. Requires `expo-notifications` — check Expo Go compatibility before committing.
- 🟢 **Reorder topics by drag.** `order_index` already supports it; only the UI is missing.
- 🟢 **Bulk-delete existing topics.** The Library has multi-select; Topics doesn't.
- 🟢 **Edit a topic's title.** Currently you delete and re-add.
- 🟢 **Calendar view** of study history from `study_log`.

### Quality

- 🟡 **Accessibility pass.** Some icon-only buttons still lack `accessibilityLabel`; a few touch targets remain under 44 px (Library, exam manager). Screen-reader flow untested.
- 🟡 **Tablet layouts.** `supportsTablet: true` but the UI is phone-first — stretched columns on iPad.
- 🟢 **Configure Prettier + ESLint.** Both are installed but have no config, no scripts and no hooks. Isolated, welcome contribution.
- 🟢 **Rename Spanish route names** (`Hoy`, `Temas`…) to English identifiers. Cosmetic; they're never user-visible.
- 🟢 **CI.** `tsc --noEmit`, the three self-checks and the translation parity check already run headless — a GitHub Action is ~20 lines.
- 🟢 **Remove `topics.pdf_url`.** Superseded by `materials` and backfilled; the column lingers.

### Scale ceilings

Not urgent at current volume — documented so the shape of the wall is known:

- 🟢 **Pagination.** All topics/materials load at once.
- 🟢 **Split the Zustand store** into slices as it grows.
- 🟢 **Offline support.** No local cache or sync queue.

---

## Completed

### 1.0.0 — private beta

- ✅ Derived daily plan paced by exam date
- ✅ Spaced reviews with exam-day clamping
- ✅ Exam (subject) management with switching
- ✅ Bulk topic editor with paste-to-split
- ✅ Materials library: multi-upload, multi-select, assign to topics
- ✅ Study streak and progress tracking
- ✅ Email/password auth adapting to the email-confirmation setting
- ✅ Sessions encrypted in the keychain (chunked SecureStore adapter)
- ✅ Session-expiry handling and AppState-tied token refresh
- ✅ In-app password change + logged-out reset
- ✅ In-app account deletion (RPC + cascade)
- ✅ Biometric app lock with grace window and file-open suppression
- ✅ Spanish/English i18n with persisted language choice
- ✅ `ErrorBoundary`
- ✅ Per-platform app icons generated from the logo
- ✅ EAS build profiles + EAS Update
- ✅ Full documentation set

### Notable fixes

- ✅ Topics query used a non-existent `order` column — list was always empty
- ✅ Notes could only be saved once (missing `onConflict`)
- ✅ `react-native-svg` removed while `lucide` needed it as a peer
- ✅ `lucide-react-native` upgraded for React 19 (EAS `npm ci` failure)
- ✅ Nested `Modal` on iOS
- ✅ Missing indexes on RLS predicate columns
- ✅ `handle_new_user` `search_path` hardening
- ✅ Removed biometric login that stored plaintext passwords

---

## Explicitly not planned

Rejected on purpose — see [docs/FAQ.md](docs/FAQ.md) before proposing them:

- ❌ Quizzes / tests / flashcards — a different product
- ❌ AI features
- ❌ Many-to-many file ↔ topic
- ❌ Web build
- ❌ Social features, sharing, leaderboards
