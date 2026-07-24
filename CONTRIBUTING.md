# Contributing

Thanks for looking. Studiq is a personal project kept to a professional standard — contributions are welcome as long as they respect the constraints below.

Start with [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) to get running, then [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) to understand the shape of the code.

---

## Before you start

**Open an issue first** for anything beyond a bug fix. The scope of this app is deliberately narrow (see [docs/FAQ.md](docs/FAQ.md)) — several obvious-looking features were considered and consciously rejected. A quick conversation saves you building something that won't be merged.

Good contributions: bug fixes, accessibility improvements, tests, documentation, performance work, the items in [TODO.md](TODO.md).

---

## The three rules

Everything else is detail. These are non-negotiable because breaking them creates the bugs that are hardest to find later.

### 1. Screens never call Supabase

```
Screen → store action → supabaseService → Supabase
```

A screen importing `supabase` directly is a bug. Data access lives in `src/services/supabaseService.ts` and nowhere else.

### 2. Logic worth testing goes in `src/utils/`

If it can be a pure function — no React, no I/O — it belongs there with a case added to the matching `.test.ts` **in the same commit**. That's how the scheduling and streak bugs were caught before shipping.

### 3. No hardcoded UI strings

Every user-visible string goes through i18next, in **both** `es` and `en`, with keys aligned. Run the parity check in [docs/TESTING.md](docs/TESTING.md#4-translation-parity).

---

## Workflow

```bash
git checkout -b fix/topic-list-ordering
```

Before every commit:

```bash
npx tsc --noEmit
```

```bash
npx tsx src/utils/plan.test.ts && npx tsx src/utils/streak.test.ts && npx tsx src/lib/secureStorage.test.ts
```

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(topics): add bulk paste to the topic editor
fix(auth): normalise email before sign-in
docs(database): document the notes upsert constraint
chore(deps): upgrade lucide-react-native for React 19
```

Types in use: `feat`, `fix`, `docs`, `chore`, `refactor`, `perf`, `style`.

---

## Recipes

### Adding a screen

1. Create `src/screens/MyThingScreen.tsx` — named export, `<Name>Screen` convention.
2. Register it in `src/navigation/AppNavigator.tsx` (unregistered = unreachable).
3. Add its strings to `src/locales/{es,en}/<namespace>.json`.
4. Use `SafeAreaView` (or rely on the stack header) so content clears the notch.
5. Read state with per-field selectors.

```tsx
export const MyThingScreen = () => {
  const { t } = useTranslation(['topics', 'common']);
  const topics = useStore(state => state.topics);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Text style={styles.title}>{t('topics:topicsTitle')}</Text>
    </SafeAreaView>
  );
};
```

### Adding a component

Only once there are **two** call sites. Until then it stays in the screen that uses it — a premature abstraction is harder to undo than a later move.

Props via a local `interface`, styles at the bottom, values from `theme`.

### Adding a hook

There are currently **no custom hooks** — Zustand covers shared state and screens own their local state. If you add one, put it in `src/hooks/` (create the folder), prefix with `use`, and keep it free of data access.

### Adding a service method

1. Add it to `supabaseService.ts` in the right domain group.
2. Throw on error; don't return error objects.
3. Read the user id via the internal `currentUserId()` helper (local session read), not `getUser()`.
4. Add a store action that calls it and updates state.
5. Document it in [docs/API.md](docs/API.md).

### Changing the database

1. Add a **new numbered file** in `supabase/migrations/`. Never edit an applied one.
2. Enable RLS and add policies for any new table.
3. Update `src/types/index.ts` in the same commit.
4. Update [docs/DATABASE.md](docs/DATABASE.md).
5. Say so in the PR — migrations are applied manually.

### Changing planning rules

`src/utils/plan.ts` is the heart of the product. Add cases to `plan.test.ts` covering the new behaviour **and** the behaviour you're preserving.

---

## Style

Full details in [docs/CODE_STYLE.md](docs/CODE_STYLE.md). The short version:

- `PascalCase.tsx` for components, `camelCase.ts` for everything else
- `strict` TypeScript; no `any` in logic
- Nullable DB columns are `T | null`, not `T?`
- Per-field store selectors
- Comments explain **why**, never what
- Values from `theme`, never raw hex

Prettier and ESLint are installed but not configured — match the surrounding style (2 spaces, single quotes, semicolons).

---

## Pull requests

Include:

- **What** changed and **why**
- How you tested it (device/simulator, which flows)
- Screenshots for UI changes
- A note if it needs a migration or an env var

Checklist:

```
[ ] npx tsc --noEmit passes
[ ] Self-checks pass
[ ] Translation parity holds (if text changed)
[ ] Tested on a real device (if UI/native)
[ ] Docs updated (if behaviour changed)
[ ] No secrets committed
```

---

## What won't be merged

- Features that widen the scope without discussion (see [docs/FAQ.md](docs/FAQ.md))
- Supabase calls from screens or components
- Hardcoded UI strings
- New dependencies with **custom native code** — that would end Expo Go support for every tester
- `--legacy-peer-deps` or `.npmrc` workarounds instead of fixing a real incompatibility
- Reformatting unrelated files (it buries the actual change)

---

## Reporting bugs

Include: what you did, what you expected, what happened, device + OS, whether it's Expo Go or a build, and any error text. If it's data-related, whether the relevant migration was applied.

Security issues: open a **private** GitHub security advisory, not a public issue.
