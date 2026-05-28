# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Capacitor 6 wrapper around a Vite + vanilla-JS web app, packaged as an Android APK/AAB. The web UI is Japanese (お薬トラッカー / "medication tracker"). There is no framework, no TypeScript, no test runner, and no linter — keep changes in plain ES modules.

The web app is self-contained: state lives in `localStorage` (`store.js`), there is no backend, and views are imperative `render(root, ctx)` functions in `src/views/`.

## Environment setup

All gradle/capacitor commands need `JAVA_HOME` and `ANDROID_HOME` on `PATH`. Source the helper first:

```bash
source scripts/env.sh   # defaults to ~/.local/android-toolchain/{jdk-17.0.2,sdk}
```

If those paths don't exist on the current machine, edit `scripts/env.sh` rather than exporting ad-hoc vars — every other build step assumes the helper is authoritative.

## Common commands

```bash
npm install
npm run dev                      # Vite dev server (browser only — native APIs are no-ops here)
npm run build                    # vite build → dist/

npm run cap:sync                 # vite build + npx cap sync android (copies dist/ into android/app/src/main/assets/public)
npm run android:build:debug      # full pipeline → app-debug.apk
npm run android:build:release    # → app-release.apk (unsigned unless keystore.properties exists)
npm run android:bundle:release   # → app-release.aab
npm run assets:generate          # regenerate icon/splash from assets/*.svg via @capacitor/assets
```

There are no unit tests (the only test file is the Capacitor-generated `ExampleInstrumentedTest.java` stub). Don't add a test command claim that doesn't exist.

Build outputs:
- `android/app/build/outputs/apk/debug/app-debug.apk`
- `android/app/build/outputs/apk/release/app-release(-unsigned).apk`
- `android/app/build/outputs/bundle/release/app-release.aab`

## The web ↔ native sync step

**Any change under `src/`, `public/`, `index.html`, or `capacitor.config.json` must be followed by `npm run cap:sync` (or one of the `android:build:*` scripts that includes it) before a gradle build will see it.** Opening Android Studio without running this once leaves the WebView blank. The `android:build:*` scripts always run `vite build && cap sync android` first, so prefer them over invoking `./gradlew` directly.

## Architecture

- `src/main.js` — entry. Loads state, mounts the tabbed shell, dispatches to one of four view renderers (`today` / `meds` / `history` / `settings`). On native it calls `rescheduleAll()` at startup and hides the splash screen after first paint.
- `src/store.js` — single mutable `state` object (theme, `notificationsEnabled`, `medications[]`, `logs[]`) persisted to `localStorage` under key `medication-tracker-state-v1`. Mutation helpers (`addMedication`, `markTaken`, etc.) call `save()` internally. Views read `state` directly and call `rerender()` after mutating.
- `src/notifications.js` — wraps `@capacitor/local-notifications`. `rescheduleAll()` cancels all pending notifications and re-creates one daily-repeating notification per `(medication, time)` pair. **Notification IDs are deterministic** — derived from `hash(medId|time)` via `idFor()` — so re-scheduling overwrites the same slot. Any code path that adds, edits, or deletes a medication or toggles `notificationsEnabled` should call `rescheduleAll().catch(...)` afterwards (see `views/medications.js` and `views/settings.js` for the pattern).
- `src/views/*.js` — each exports a `render(root, { navigate, rerender })` function. They build DOM imperatively (no virtual DOM, no templating engine) and call `rerender()` after state changes. Always HTML-escape user-controlled strings — the views include a local `escape()` helper; copy it rather than interpolating raw `state` values.

## Capacitor / Android specifics

- `appId` is `com.toukanno.medicationtracker`; the app label (`お薬トラッカー`) is in `capacitor.config.json` and `android/app/src/main/res/values/strings.xml`.
- `Capacitor.isNativePlatform()` is the gate for any native-only behavior — keep `src/` runnable in a plain browser so `npm run dev` works.
- `webDir` is `dist`; `vite.config.js` sets `base: './'` so the bundled assets resolve under the `https://` androidScheme.
- SDK versions are pinned in `android/variables.gradle` (`minSdk=22`, `compileSdk=targetSdk=34`). The Java toolchain is **JDK 17** — newer JDKs break AGP.
- Release signing reads `android/keystore.properties` (gitignored). If the file is absent the release build silently produces an unsigned artifact — this is intentional, don't "fix" it by failing the build. See `android/keystore.properties.example` and the `signingConfigs.release` block in `android/app/build.gradle`.
- The `android/` directory is a Capacitor-generated project. Edits there (manifest tweaks, gradle settings, native resources) are committed and survive `cap sync`, but regenerating the project from scratch would clobber them — prefer surgical edits over `cap add android`.

## Adding a Capacitor plugin

1. `npm install @capacitor/<plugin>`
2. `npm run cap:sync` (registers the plugin in `android/app/capacitor.build.gradle` and copies native code)
3. Import and use it inside an `if (Capacitor.isNativePlatform())` guard so browser dev still works.
