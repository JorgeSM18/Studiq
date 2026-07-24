# Code style

Conventions actually used in this codebase. When in doubt, match the file you're editing.

---

## 1. Language

- **Code is English.** Identifiers, comments, commit messages, docs.
- **UI text is never in code.** Every user-visible string comes from i18next (`es` + `en`).
- Some older comments are in Spanish. Leave them unless you're already editing that block; new comments go in English.

---

## 2. Naming

| Thing | Convention | Example |
|---|---|---|
| Component / screen file | `PascalCase.tsx` | `TopicDetailScreen.tsx` |
| Non-component module | `camelCase.ts` | `supabaseService.ts`, `secureStorage.ts` |
| Self-check | `<module>.test.ts` | `plan.test.ts` |
| Component | `PascalCase`, named export | `export const ListItem = …` |
| Hook | `useX` | `useStore` |
| Boolean | `is` / `has` / `was` prefix | `isLocked`, `hasError`, `wasStudied` |
| Store action | verb first | `toggleStudiedToday`, `addTopics` |
| DB column | `snake_case` | `order_index`, `next_review_date` |
| Type/interface | `PascalCase`, no `I` prefix | `Topic`, `Material` |

Database fields keep `snake_case` in TypeScript types (`t.order_index`) — they mirror the schema exactly, so there's no mapping layer to drift.

---

## 3. TypeScript

`strict` is on. Rules that matter here:

**No `any` in logic.** `useNavigation<any>()` and route params are the tolerated exceptions (typing React Navigation fully is a bigger change than it's worth right now).

**Nullable means nullable.** The DB has nullable columns; the types say so, and callers handle it:

```ts
exam_date: string | null;   // ✅ mirrors the DB, forces a decision
exam_date?: string;         // ❌ hides that null is a real value
```

**Literal unions mirror SQL `CHECK` constraints:**

```ts
export type TopicStatus = 'not_started' | 'in_progress' | 'mastered';
```

Changing this means changing the constraint in a migration, in the same commit.

**`as const` when assigning into a union field**, or TypeScript widens to `string`:

```ts
{ ...t, status: 'in_progress' as const }
```

**Type inference over annotation.** Annotate function *parameters* and public return types; let locals infer.

---

## 4. Components

Function components with named exports. Props typed by a local `interface`:

```ts
interface ListItemProps {
  title: string;
  subtitle?: string;
  onPress: () => void;
  onLongPress?: () => void;
  rightElement?: React.ReactNode;
  icon?: React.ReactNode;
}

export const ListItem = ({ title, subtitle, onPress, ... }: ListItemProps) => { … };
```

- Styles at the bottom via `StyleSheet.create`
- Values from `theme`, never raw hex or magic numbers
- One component per file
- Extract to `src/components/` only at the **second** call site

---

## 5. State

**Per-field selectors, always:**

```ts
const topics = useStore(state => state.topics);        // ✅
const { topics, profile } = useStore();                 // ❌ re-renders on any change
```

**Local state stays local.** Form drafts, modal visibility and upload progress belong to the screen; the store is for data shared across screens.

**Optimistic updates for high-frequency actions** — update state, persist, and reload on failure:

```ts
set({ studiedTodayIds, topics, progress });   // instant feedback
try {
  await supabaseService.markStudied(topicId, today);
} catch (error) {
  console.error('Error toggling studied:', error);
  get().fetchInitialData();                   // resync from the server
}
```

---

## 6. Error handling

Deliberate split:

| Case | Convention |
|---|---|
| The user must know it failed | Action **rethrows**; the screen catches and shows an `Alert` |
| Silent recovery is acceptable | Action logs with `console.error` and resyncs |

`addTopics`, `uploadMaterial`, `createSubject` and `deleteAccount` rethrow — the user would otherwise assume their data saved. `toggleStudiedToday` and `deleteTopic` recover internally.

`console.error` is kept in production **on purpose**: there's no crash reporter yet, so device logs are the only diagnostic. There are zero `console.log` calls — don't add any.

---

## 7. Comments

Comment **why**, never what. The bar: would the next person delete this line thinking it's redundant?

```ts
// ✅ explains a non-obvious constraint
// onConflict must name topic_id: notes has a UNIQUE on it, but upsert defaults to
// resolving against the primary key, so a second save for the same topic inserts
// a fresh id and trips the unique constraint.

// ❌ restates the code
// Update the topic status
```

Comments earn their place when they record a constraint, a platform quirk or a decision that looks wrong without context.

---

## 8. Async

`async/await` only — no `.then()` chains except for fire-and-forget:

```ts
prefs.setLanguage(lang).catch(() => {});   // best-effort, failure is harmless
```

Parallelise independent reads:

```ts
const [topics, materials, studiedTodayIds, studyDates] = await Promise.all([...]);
```

---

## 9. Imports

Order: React → React Native → third-party → local. Relative paths (`../store/useStore`) are the norm; the `@/*` alias exists in `tsconfig.json` but is unused — don't mix styles in a file.

---

## 10. Formatting

Prettier and ESLint are dev dependencies but **not configured or enforced** (no config files, no scripts, no hooks). Match surrounding style: 2-space indent, single quotes, semicolons, trailing commas in multiline literals.

Adding a real Prettier config + `npm run lint` is a welcome, isolated contribution — see [../TODO.md](../TODO.md).

---

## 11. Anti-patterns

| Don't | Why | Instead |
|---|---|---|
| `import { supabase }` in a screen | Breaks the one data path | Store action → service |
| Raw hex in a screen | Fragments the design system | `theme.colors.*` |
| Hardcoded UI strings | Breaks i18n silently | `t('namespace:key')` in both locales |
| `useStore()` without a selector | Re-renders on every change | `useStore(s => s.field)` |
| Editing an applied migration | Environments drift apart | Add the next numbered file |
| `--legacy-peer-deps` | Hides genuine incompatibility | Upgrade the package |
| `React.memo` with inline props | No effect; props change identity anyway | Fix the props, or leave it |
