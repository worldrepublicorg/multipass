# Releasing

Distribution paths:

- **Android:** build locally, upload release assets to GitHub Releases by hand
- **iOS:** Simulator builds, signed IPA, and optional TestFlight via the **iOS Build** GitHub Actions workflow (see below)

## Android upload key

Generate the Play Store upload key outside the repository so it never risks being committed.

Default location:

```text
${XDG_STATE_HOME:-$HOME/.local/state}/multipass/signing/android-upload-keystore.jks
```

Generate it with:

```bash
ANDROID_UPLOAD_KEYSTORE_PASSWORD='CHANGE_ME' \
ANDROID_UPLOAD_KEY_PASSWORD='CHANGE_ME' \
ANDROID_UPLOAD_KEY_ALIAS='upload' \
./scripts/generate-android-upload-keystore.sh
```

The script uses local `keytool` when available. If no JDK is installed, it falls back to Docker automatically.

To force Docker even when `keytool` exists:

```bash
ANDROID_UPLOAD_USE_DOCKER=always \
ANDROID_UPLOAD_KEYSTORE_PASSWORD='CHANGE_ME' \
ANDROID_UPLOAD_KEY_PASSWORD='CHANGE_ME' \
ANDROID_UPLOAD_KEY_ALIAS='upload' \
./scripts/generate-android-upload-keystore.sh
```

Keep the keystore and passwords in a secure location outside the repo. Gradle reads signing settings from environment variables at build time (see [Signed release build](#signed-release-build)).

## Versioning

Set Android version fields before building:

| Field | Example | How |
| ----- | ------- | --- |
| `versionName` | `1.2.3` | `ANDROID_VERSION_NAME=1.2.3` or `-PANDROID_VERSION_NAME=1.2.3` |
| `versionCode` | `42` | `ANDROID_VERSION_CODE=42` or `-PANDROID_VERSION_CODE=42` |

For tag `v1.2.3`, use `ANDROID_VERSION_NAME=1.2.3`. Pick a monotonically increasing `versionCode` for each Play Store upload.

## Signed release build

Export signing env vars (adjust paths and passwords):

```bash
export ANDROID_VERSION_NAME=1.2.3
export ANDROID_VERSION_CODE=42
export ANDROID_UPLOAD_STORE_FILE=/path/to/android-upload-keystore.jks
export ANDROID_UPLOAD_STORE_TYPE=JKS          # or PKCS12
export ANDROID_UPLOAD_STORE_PASSWORD='...'
export ANDROID_UPLOAD_KEY_ALIAS=upload
export ANDROID_UPLOAD_KEY_PASSWORD='...'
```

Then build (see platform sections below). Without these variables, release builds use the debug keystore (fine for local testing, not for Play Store).

## Build Android release artifacts

Refresh bundled registry certificates, then build:

```bash
npm run registry:fetch-bundled
```

### Windows

Long repo paths (e.g. `C:\dev\world-republic\multipass`) can hit the 260-character path limit for New Architecture native builds. Use the SUBST release script:

```powershell
# APK only
node scripts/build-release-android.mjs assemble

# APK + install on connected device
npm run android:release
```

For a Play Store bundle, run Gradle from the SUBST drive after bundling JS (see `scripts/build-release-android.mjs`), or use a shorter checkout path:

```powershell
cd android
.\gradlew.bat bundleRelease -PreactNativeArchitectures=arm64-v8a
```

### Linux / macOS

When the checkout path is short enough:

```bash
cd android
./gradlew assembleRelease bundleRelease -PreactNativeArchitectures=arm64-v8a
```

### Output paths

```text
android/app/build/outputs/apk/release/app-release.apk
android/app/build/outputs/bundle/release/app-release.aab
android/app/build/outputs/native-debug-symbols/release/native-debug-symbols.zip
```

Google Play may ask for the native debug symbols ZIP for crash symbolication of `.so` binaries.

## Create a GitHub release (manual)

1. Build signed APK, AAB, and native debug symbols (above).
2. Rename artifacts for clarity:

   ```text
   Multipass-v1.2.3.apk
   Multipass-v1.2.3.aab
   Multipass-v1.2.3-native-debug-symbols.zip
   ```

3. Tag and push:

   ```bash
   git tag v1.2.3
   git push origin v1.2.3
   ```

4. Create the release on GitHub (**Releases → Draft a new release**) or with the GitHub CLI:

   ```bash
   gh release create v1.2.3 \
     --title "Release v1.2.3" \
     --generate-notes \
     Multipass-v1.2.3.apk \
     Multipass-v1.2.3.aab \
     Multipass-v1.2.3-native-debug-symbols.zip
   ```

5. Add a short description with install notes, for example:

   ```markdown
   ## Downloads

   | Platform | File | Description |
   |----------|------|-------------|
   | Android | `Multipass-v1.2.3.apk` | Signed Android package for direct installation |
   | Android | `Multipass-v1.2.3.aab` | Signed Android App Bundle for Play Console upload |
   | Android | `Multipass-v1.2.3-native-debug-symbols.zip` | Native debug symbols for Play Console |

   ### Android Installation
   1. Download the APK file
   2. Enable "Install from unknown sources" in Settings
   3. Open the APK file to install

   ### Android Play Store
   1. Upload the AAB file to the Google Play Console
   2. Upload native debug symbols if Play Console requests them
   ```

   Full Play Console checklist (account, listing, policy, tracks): [play-store.md](play-store.md).

   Replace `v1.2.3` in filenames throughout.

Optional: attach an iOS Simulator `.zip` from the **iOS Build** workflow if you want it on the same GitHub Release page.

## iOS (GitHub Actions)

For Simulator builds, signed IPA, or TestFlight upload, use the **iOS Build** workflow (Actions tab → iOS Build → Run workflow).

Configure these repository secrets:

- `IOS_DISTRIBUTION_CERTIFICATE_BASE64`
- `IOS_DISTRIBUTION_CERTIFICATE_PASSWORD`
- `IOS_PROVISIONING_PROFILE_BASE64`
- `KEYCHAIN_PASSWORD`
- `APPLE_TEAM_ID`
- `APP_STORE_CONNECT_API_KEY_ID`
- `APP_STORE_CONNECT_API_ISSUER_ID`
- `APP_STORE_CONNECT_API_KEY_BASE64`

For real iPhone testing:

- `build_type=release`
- `upload_testflight=true` (when App Store Connect API secrets are configured)

See `make ios-info` and `.github/workflows/ios-build.yml` for details.
