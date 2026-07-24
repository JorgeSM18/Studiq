# Expo

How the Expo layer is configured and how to work with it day to day.

**SDK 54**, managed workflow — there are no `ios/` or `android/` folders in the repo (they're git-ignored and generated on demand).

---

## 1. Running the dev server

```bash
npx expo start
```

Then press:

| Key | Action |
|---|---|
| `a` | Open on a connected Android device/emulator |
| `i` | Open on an iOS simulator (macOS only) |
| `r` | Reload the app |
| `j` | Open the debugger |
| `m` | Toggle the dev menu |

Scan the QR code with **Expo Go** to run on a physical phone.

### Useful variants

```bash
npx expo start --tunnel
```
Routes through Expo's servers — use it when your phone and computer aren't on the same network, or when a corporate/guest Wi-Fi blocks local connections.

```bash
npx expo start --clear
```
Clears the Metro cache. **Required after editing `.env`** — env values are inlined at bundle time and otherwise stay stale.

---

## 2. Expo Go compatibility

**The entire app runs in Expo Go.** Every dependency is either an Expo SDK module (bundled into Expo Go) or pure JavaScript:

| Dependency | Type |
|---|---|
| `expo-secure-store`, `expo-local-authentication`, `expo-document-picker`, `expo-file-system`, `expo-localization`, `expo-status-bar`, `expo-updates` | Expo SDK — in Expo Go |
| `react-native-svg`, `react-native-screens`, `react-native-safe-area-context`, `react-native-gesture-handler` | Bundled in Expo Go |
| `@supabase/supabase-js`, `zustand`, `i18next`, `react-i18next`, `react-native-calendars`, `lucide-react-native`, `react-native-url-polyfill` | Pure JS |

This is worth protecting: **adding any library with custom native code ends Expo Go support** and forces every tester onto a development build. Check before adding a dependency.

One caveat: **EAS Update does not serve Expo Go.** OTA updates only reach development or standalone builds. In Expo Go, testers always need your dev server running.

---

## 3. `app.json` walkthrough

```jsonc
{
  "expo": {
    "name": "Studiq",              // Display name on the home screen
    "slug": "studiq",              // Expo project identifier
    "version": "1.0.0",            // User-facing version; also drives runtimeVersion
    "orientation": "portrait",     // Locked — layouts are portrait-only
    "userInterfaceStyle": "light", // No dark mode yet; keeps rendering predictable
    "icon": "./assets/icon.png",
    "splash": { "image": "./assets/splash.png", "resizeMode": "contain", "backgroundColor": "#ffffff" },
    "ios":     { "bundleIdentifier": "com.studiq.app", "buildNumber": "1", "supportsTablet": true },
    "android": { "package": "com.studiq.app", "versionCode": 1,
                 "adaptiveIcon": { "foregroundImage": "./assets/adaptive-icon.png", "backgroundColor": "#ffffff" },
                 "permissions": ["android.permission.USE_BIOMETRIC", "android.permission.USE_FINGERPRINT"] },
    "plugins": [["expo-local-authentication", { "faceIDPermission": "…" }]],
    "runtimeVersion": { "policy": "appVersion" },
    "updates": { "url": "https://u.expo.dev/<projectId>" },
    "extra": { "eas": { "projectId": "…" } },
    "owner": "…"
  }
}
```

Things not to change casually:

- **`bundleIdentifier` / `package`** are the app's permanent identity. Once published to a store they can never change. `com.anonymous.*` (Expo's placeholder) is rejected by Google Play — that's why this is set explicitly.
- **`runtimeVersion: appVersion`** ties OTA compatibility to `version`. Bumping `version` cuts existing installs off from new updates until they install a new binary.
- **`orientation: portrait`** — no landscape layouts exist. Unlocking it would need design work.
- **`userInterfaceStyle: light`** — the theme has no dark palette. `StatusBar` is pinned to `dark` icons in `App.tsx` to match.

### The `expo-local-authentication` plugin

Supplies the iOS `NSFaceIDUsageDescription` string. iOS **rejects apps that use Face ID without one**. In Expo Go the host app's own permission string is used, which is why biometrics work there without a rebuild.

---

## 4. Assets

| File | Purpose | Rules |
|---|---|---|
| `icon.png` | iOS icon | 1024×1024, **no alpha channel**, square corners (iOS masks it) |
| `adaptive-icon.png` | Android foreground | 1024×1024, transparent, artwork inside the central **66%** safe zone |
| `splash.png` | Launch screen | Transparent logo; `backgroundColor` fills the rest |
| `studiq_logo.png` | In-app logo | Source for the three above |

Regenerate rather than hand-editing:

```bash
npm i --no-save sharp && node scripts/generate-icons.mjs
```

Android launchers mask the adaptive icon to a circle, squircle or rounded square — anything outside the safe zone is cropped. The script enforces this and prints a pass/fail check.

---

## 5. Environment variables

Only `EXPO_PUBLIC_`-prefixed variables reach the app; they are **inlined into the bundle** at build time.

```ts
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
```

- **Local dev** — read from `.env` (git-ignored)
- **EAS builds** — read from **EAS environment variables** stored server-side. `.env` is not uploaded, and `eas.json` holds no credentials

Adding a variable means adding it in **both** places:

```bash
npx eas-cli@latest env:set --name EXPO_PUBLIC_MY_VAR --value "…" --environment development --environment preview --environment production --visibility plaintext
```

---

## 6. Upgrading the SDK

```bash
npx expo install --fix
```

Aligns dependencies with the installed SDK. For a major upgrade:

```bash
npx expo upgrade
```

Then: run `npx tsc --noEmit`, run the self-checks, test in Expo Go, and rebuild — an SDK bump always requires a new binary, never OTA.

---

## 7. Native folders

There are none, and there shouldn't be. The managed workflow generates them during builds. Running `npx expo prebuild` creates `ios/` and `android/` locally and moves you toward the bare workflow, at which point `app.json` stops being the source of truth for native config. Don't do it unless you deliberately need custom native code.
