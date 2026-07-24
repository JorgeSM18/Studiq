# EAS — builds and over-the-air updates

**EAS (Expo Application Services)** compiles the app in Expo's cloud and ships JavaScript updates over the air. You don't need Android Studio or Xcode.

Two products are used here:
- **EAS Build** — produces installable binaries (APK / AAB / IPA)
- **EAS Update** — pushes JS + asset changes to installed apps without a rebuild

---

## 1. Setup

```bash
npx eas-cli@latest login
```

```bash
npx eas-cli@latest whoami
```

The project is already linked — `app.json` carries `extra.eas.projectId` and `owner`. On a fresh fork, run:

```bash
npx eas-cli@latest init
```

and commit the resulting `app.json` change.

---

## 2. Build profiles (`eas.json`)

| Profile | Distribution | Android output | Channel | Use |
|---|---|---|---|---|
| `development` | internal | dev client | `development` | Debugging with a custom dev client |
| `preview` | internal | **APK** | `preview` | Private beta — sideloadable |
| `production` | store | **AAB** | `production` | Play Store / App Store |

Notes on the configuration:

- **`preview` builds an APK, not an AAB.** APKs install directly from a link; AABs only go through Play.
- **`autoIncrement: true`** on `preview` and `production` bumps the build number each time, so reinstalling over a previous build never fails.
- **`cli.appVersionSource: "remote"`** — EAS tracks version numbers server-side instead of in `app.json`.
- **No `env` blocks.** The Supabase variables are **EAS environment variables** stored server-side and injected at build time, so no credentials are committed. Manage them with `eas env:list` / `eas env:set` — see [SECURITY.md](SECURITY.md#publishing-this-repository).

---

## 3. Building

```bash
npx eas-cli@latest build -p android --profile preview
```

```bash
npx eas-cli@latest build -p ios --profile production
```

### What happens

1. The CLI uploads the project and queues the build.
2. Free tier: expect **10–30 minutes** including queue.
3. You get a download URL and a QR code.
4. Android: open the URL on the phone, allow "install from unknown sources", install.

### Two things that will bite you

**EAS builds from git, not your working directory.** Uncommitted changes are excluded — you'll build the previous version without an obvious error. Always:

```bash
git status --short
```

**Failed builds consume quota.** The free tier has a monthly build limit; a build that fails during install still burned compute. Before queueing, reproduce EAS's first step locally:

```bash
npm ci --include=dev
```

If that fails locally, it will fail in the cloud — and it's the single most common build failure (see [TROUBLESHOOTING.md](TROUBLESHOOTING.md#eas-build-fails-at-npm-ci)).

Check your remaining quota at **expo.dev → account → Usage**.

---

## 4. Credentials

EAS generates and stores an Android keystore on first build. **Back it up.**

```bash
npx eas-cli@latest credentials
```

Android → your profile → **Download credentials**. You get a `.jks` plus three values: keystore password, key alias, key password. **All four together or none are useful.**

Store them in a password manager. Losing the keystore means you can never publish an update to the same Play listing again. `.gitignore` already blocks `*.jks` and `*.keystore` — keep it that way.

iOS certificates and provisioning profiles are managed automatically once you sign in with an Apple ID (requires the $99/yr Apple Developer Program).

---

## 5. EAS Update (OTA)

Ship JavaScript changes without rebuilding.

### One-time setup

```bash
npx eas-cli@latest update:configure
```

This installs `expo-updates`, adds `updates.url` + `runtimeVersion` to `app.json`, and `channel` to each build profile. Commit the changes.

> **A build made *before* this setup cannot receive updates** — it has no update client. You must rebuild once after configuring; that binary is the last one you distribute by hand.

### Publishing an update

```bash
npx eas-cli@latest update --branch preview --message "fix: topic list ordering"
```

Takes about a minute — no build queue. The branch must match the profile's `channel`.

### How users receive it

The app downloads the update in the background on launch and **applies it on the next launch**. So a tester opens the app (nothing looks different), closes it, opens again — now it's updated. Worth telling testers so they don't think it failed.

### What OTA can and cannot ship

| ✅ Over the air | ❌ Needs a rebuild |
|---|---|
| Screens, components, business logic | Adding a native module (e.g. `expo-local-authentication`) |
| Translations, styles, bug fixes | Icons, splash, app name, permissions |
| Anything in `src/` | `app.json` plugins, Expo SDK upgrades |

Roughly 90% of beta changes go over the air.

### Runtime version

`app.json` sets `runtimeVersion: { policy: "appVersion" }` — updates only reach builds whose `expo.version` matches. Since `autoIncrement` bumps the *build number* and not `version`, updates keep working across `preview` rebuilds as long as `version` stays `1.0.0`.

**Bumping `version` in `app.json` cuts off existing installs from new updates** until users install a new binary. That's the mechanism working as intended — just be deliberate about it.

---

## 6. Command reference

| Command | Purpose |
|---|---|
| `eas login` / `whoami` | Authentication |
| `eas init` | Link the project |
| `eas build -p android --profile preview` | Android APK |
| `eas build -p ios --profile production` | iOS build |
| `eas build:list` | Recent builds |
| `eas credentials` | Manage / download signing credentials |
| `eas update --branch <b> --message "<m>"` | Publish OTA |
| `eas update:configure` | One-time OTA setup |
| `eas submit -p ios --latest` | Upload to App Store Connect |
| `eas env:list --environment <env>` | List server-side env variables |
| `eas env:set --name N --value V --environment <env>` | Create/update one (`env:create` is deprecated) |
| `eas device:create` | Register an iOS device for ad-hoc builds |

---

## 7. Distribution

**Android** — share the APK link. Anyone can install it (after allowing unknown sources). Free.

**iOS** — there is **no free path** to run the app on someone else's iPhone as a standalone binary. Options:

| Option | Cost | Requires Expo Go? |
|---|---|---|
| Expo Go + `npx expo start --tunnel` | Free | Yes, and your dev server must be running |
| TestFlight | $99/yr Apple Developer | No |
| Ad-hoc internal distribution | $99/yr + each device's UDID | No |

> EAS Update does **not** serve Expo Go. It only reaches development builds and standalone builds that bundle `expo-updates`. The old `expo publish` flow that let anyone open a published project in Expo Go has been discontinued.

Store submission: [DEPLOYMENT.md](DEPLOYMENT.md).
