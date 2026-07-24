# API reference — `supabaseService`

Studiq has **no custom backend**. The app talks straight to Supabase, and `src/services/supabaseService.ts` is the single module allowed to do so. This is its full surface.

Conventions across every method:

- **Errors are thrown**, never returned. Callers (store actions or screens) decide whether to surface or swallow them.
- **The user id comes from `getSession()`** (local read), not `getUser()` (network round-trip). RLS enforces access server-side.
- **Return values are plain domain types** from `src/types/index.ts`.

```ts
// Internal helper — not exported
async function currentUserId(): Promise<string | null>
```

---

## Auth & session

### `signUp(email, password, fullName, studyType, examDate)`
Registers a user. `fullName`, `studyType` and `examDate` are stored as **user metadata**, not rows — the first subject can't be inserted yet because there's no active session and RLS would reject it. Email is normalised.

Returns Supabase's `{ user, session }`. `session` is `null` when email confirmation is enabled.

### `signIn(email, password)` · `signOut()`
Email is normalised (`trim().toLowerCase()`).

### `resetPassword(email)`
Sends a reset email (logged-out flow).

### `changePassword(newPassword)`
`updateUser({ password })` for the **signed-in** user — no email round-trip. Requires *Secure password change* and *Require current password* to be off in Supabase.

### `deleteAccount()`
Calls the `delete_current_user` RPC, then signs out. The FK cascade removes all user rows. **Storage objects are not removed** — known gap.

---

## Profile

### `getProfile(userId?)` → `Promise<Profile | null>`
Defaults to the current user.

### `updateProfile(fullName, userId?)`
Upsert on `profiles`.

---

## Subjects (exams)

### `getSubjects()` → `Promise<Subject[]>`
Newest first.

### `createSubject(name, examDate, userId?)` → `Promise<Subject>`
`examDate` is nullable — the planner falls back to 3 new topics/day.

### `updateSubject(id, patch)` · `deleteSubject(id)`
Deleting cascades topics (and their notes/study log). Materials survive: their `topic_id` becomes `NULL` and they return to the library.

### `createInitialSubjectIfNeeded()`
Creates the user's first subject from signup metadata. Idempotent — returns early if any subject exists. Called from `fetchInitialData`, i.e. once a session is active.

---

## Topics

### `getTopics(subjectId?)` → `Promise<Topic[]>`
Ordered by `order_index`.

### `createTopics(subjectId, titles)` → `Promise<Topic[]>`
Bulk insert, one topic per title. Reads the current maximum `order_index` and numbers from there, so appends never collide with or reorder existing topics. Returns the created rows so the store can merge without refetching.

### `updateTopicStatus(id, status)`
Filters by `id` only — RLS rejects rows you don't own.

### `updateTopicSchedule(id, patch)`
Writes the spaced-review fields (`last_review_date`, `next_review_date`, `review_interval`) and optionally `status`. Separate from the study-log write so the store can revert cleanly on undo.

### `deleteTopic(id)`
Row only. Its materials fall back to the library via `ON DELETE SET NULL`.

---

## Study log

Drives today's checkmarks and the streak.

### `getStudiedOn(date)` → `Promise<string[]>`
Topic ids studied on a given **local** date.

### `getStudyDates()` → `Promise<string[]>`
Distinct dates with activity, newest first, capped at 366 — more never changes a current streak.

### `markStudied(topicId, date)`
Upsert with `onConflict: 'topic_id,studied_on'` and `ignoreDuplicates: true`, matching the unique constraint: re-marking the same topic the same day is a no-op.

### `unmarkStudied(topicId, date)`

---

## Notes

### `getNoteByTopicId(topicId)` → `Promise<Note | null>`

### `saveNote(topicId, content)`
Upsert with **`onConflict: 'topic_id'`**. This is not optional: `notes` has a UNIQUE on `topic_id`, but upsert defaults to resolving against the primary key — without it the second save generates a fresh `id` and trips the constraint. `updated_at` is left to the database trigger.

---

## Materials

### `getMaterials()` → `Promise<Material[]>`
All of the user's files, newest first. The library and per-topic lists are both filtered client-side from this.

### `uploadMaterial(topicId, file)` → `Promise<Material>`
`topicId` may be `null` (unassigned → library). `file` is `{ uri, name, mimeType? }` from the document picker.

Sequence: insert the row to obtain an id → upload bytes to `{uid}/{materialId}/{filename}` → update the row with the path. **On any failure the placeholder row is deleted**, so the library never lists a material that can't be opened.

> Reads the whole file into memory (`arrayBuffer()`). Fine for normal documents; very large files could exhaust memory. Noted in [SECURITY.md](SECURITY.md#8-known-gaps).

### `setMaterialTopic(materialId, topicId)`
Assign to a topic, or pass `null` to move back to the library.

### `deleteMaterial(materialId, path)`
Removes the storage object **and** the row.

### `getFileUrl(path)` → `Promise<string>`
A **one-hour signed URL**. The bucket is private, so a public URL would 400. The URL is handed to the OS viewer via `Linking.openURL` — there is no in-app renderer.

---

## Store actions

Screens don't call the service directly; they call these (`src/store/useStore.ts`):

| Action | Wraps |
|---|---|
| `initializeAuth`, `setSession` | Session bootstrap |
| `loadPrefs`, `setLanguage` | Device prefs |
| `initBiometricLock`, `enableBiometric`, `disableBiometric`, `lockApp`, `unlockApp`, `forceUnlock`, `suppressLock` | Biometric lock |
| `fetchInitialData` | Subjects + topics + materials + study log + profile, in parallel |
| `setActiveSubject`, `createSubject`, `updateSubject`, `deleteSubject` | Exams |
| `addTopics`, `deleteTopic`, `updateTopicStatus` | Topics |
| `toggleStudiedToday` | Study log + schedule + streak, optimistically |
| `uploadMaterial`, `setMaterialTopic`, `deleteMaterial` | Files |
| `updateProfileName`, `deleteAccount` | Account |

**Error convention:** actions that a screen must react to (`addTopics`, `uploadMaterial`, `createSubject`, `deleteAccount`) **rethrow**. Actions where a silent retry-on-next-load is acceptable (`toggleStudiedToday`, `deleteTopic`) log and recover internally.

---

## Adding a new operation

1. Add the method to `supabaseService.ts`, in its domain group.
2. Add a store action that calls it and updates state.
3. Call the action from the screen.
4. If it changes the schema, add a numbered migration and update `src/types/index.ts` in the same commit.
