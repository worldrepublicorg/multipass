# Multipass

World Republic’s mobile ID wallet for proving you’re eligible to participate—using the NFC chip on a government-issued ID, verified on your phone via the [zkPassport](https://zkpassport.id) registry. Multipass is built for privacy: the document stays on the device; World Republic only learns that it’s genuine and not expired.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![iOS Build](https://github.com/worldrepublicorg/multipass/actions/workflows/ios-build.yml/badge.svg)](https://github.com/worldrepublicorg/multipass/actions/workflows/ios-build.yml)

**Status:** Android pilot available via [Releases](https://github.com/worldrepublicorg/multipass/releases). iOS in progress ([roadmap](docs/ROADMAP.md) Phase 1).

## Install (Android)

Download the latest APK from [GitHub Releases](https://github.com/worldrepublicorg/multipass/releases). Enable install from unknown sources, then open the APK.

Release assets may also include an AAB (Play Console) and native debug symbols zip.

## Development

**Prerequisites:** Node.js 18+, Android Studio for Android, macOS + Xcode 16+ for iOS.

```bash
npm install --legacy-peer-deps
npm start          # Metro
npm run android    # device or emulator
npm run typecheck
npm test
```

iOS: `cd ios && pod install && cd ..` then `npm run ios`, or see `make ios-info`.

## Build release APK

**Debug** builds use Metro (`npm run android`). **Release** builds embed JS and Hermes bytecode.

### Windows

Long repo paths can break native (CMake) builds. Use the SUBST release script:

```powershell
npm run android:release                              # build + install on device
node scripts/build-release-android.mjs assemble      # APK only
```

APK output: `android/app/build/outputs/apk/release/app-release.apk`

### Linux / macOS

When the checkout path is short enough:

```bash
cd android
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
```

Signing, versioning, AAB, and publishing to GitHub Releases: [docs/releasing.md](docs/releasing.md). Google Play listing plan: [docs/play-store.md](docs/play-store.md).

## Releases

Android releases are built locally and uploaded to GitHub by hand. iOS builds use the **iOS Build** GitHub Actions workflow (Simulator, signed IPA, optional TestFlight)—see [docs/releasing.md](docs/releasing.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Roadmap: [docs/ROADMAP.md](docs/ROADMAP.md).

## Security

Report vulnerabilities to [info@worldrepublic.org](mailto:info@worldrepublic.org)—do not open public issues.

## License

[GNU Affero General Public License v3.0](LICENSE) (AGPL-3.0-or-later).

## Links

- [World Republic](https://www.worldrepublic.org)
- [zkPassport](https://zkpassport.id)
- [Wiki](https://wiki.worldrepublic.org)
- [Telegram](https://t.me/worldrepubliccommunity)
- [Issues](https://github.com/worldrepublicorg/multipass/issues)
