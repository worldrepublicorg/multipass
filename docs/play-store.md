# Google Play Store plan

Plan for listing Multipass on Google Play, from the current **GitHub Releases** sideload path (v0.1.0) through internal testing to production.

**Related docs:**

- [releasing.md](releasing.md) — upload keystore, signed AAB build, versioning, native debug symbols
- [ROADMAP.md](ROADMAP.md) Phase 2 — attestation, privacy policy, production readiness

---

## Current state

| Item | Status |
| ---- | ------ |
| Public repo + GitHub Release APK | Done (v0.1.0, debug-signed) |
| Play Console app | Not started |
| Upload keystore | Not generated |
| Signed AAB for Play | Not built |
| Store listing assets | Not prepared |
| Privacy policy URL | Not published (Phase 2) |
| Play Integrity on prod submit | Not implemented (Phase 2) |
| `assetlinks.json` for release cert | Needs release keystore fingerprint |

GitHub APKs are for direct install. Play requires a **signed AAB** built with your **upload keystore** (`org.worldrepublic.multipass`).

---

## Phases

### Phase A — Account and signing (prerequisite)

**Goal:** Play Console app exists; upload keystore generated and backed up.

| Step | Action | Verify |
| ---- | ------ | ------ |
| A.1 | Register [Google Play Console](https://play.google.com/console) developer account ($25 one-time) | Account active |
| A.2 | Create app with package `org.worldrepublic.multipass` | Matches `applicationId` in `android/app/build.gradle` |
| A.3 | Generate upload keystore via `scripts/generate-android-upload-keystore.sh` | `.jks` stored outside repo; passwords in password manager |
| A.4 | Back up keystore + passwords in two secure places | Recovery documented for solo dev |
| A.5 | Extract SHA-256 cert fingerprint for App Links | `keytool -list -v -keystore … -alias upload` |

**Notes:**

- Losing the upload keystore blocks updates to the same listing until Google approves a reset.
- Play App Signing: Google re-signs with an app signing key; you only upload with the upload key.

---

### Phase B — First Play upload (internal testing)

**Goal:** Install Multipass from Play on a test device (internal track). Policy polish can follow.

| Step | Action | Verify |
| ---- | ------ | ------ |
| B.1 | Set `ANDROID_VERSION_NAME` and `ANDROID_VERSION_CODE` (must increase every upload) | e.g. `0.1.0` / `2` if v0.1.0 GitHub used `1` |
| B.2 | Export signing env vars (see [releasing.md](releasing.md#signed-release-build)) | `hasAndroidReleaseSigning` true in Gradle |
| B.3 | `npm run registry:fetch-bundled` then `bundleRelease` | `app-release.aab` + `native-debug-symbols.zip` |
| B.4 | Play Console → **Testing → Internal testing** → create release, upload AAB | Upload succeeds |
| B.5 | Upload native debug symbols if Console prompts | Crash reports symbolicated |
| B.6 | Add internal testers (email list) | Tester receives Play install link |
| B.7 | Install from Play on NFC-capable device | App opens, add-ID flow works |

**Windows:** use SUBST release path or shorter checkout; see [releasing.md](releasing.md#windows).

---

### Phase C — Store listing and policy (required before production)

**Goal:** Satisfy Play listing and policy requirements for a public production release.

#### C.1 Listing assets

| Asset | Spec |
| ----- | ---- |
| App name | Multipass |
| Short description | ≤ 80 characters |
| Full description | What it does, NFC requirement, privacy summary |
| Hi-res icon | 512 × 512 PNG |
| Feature graphic | 1024 × 500 PNG |
| Phone screenshots | ≥ 2 (add-ID, verify flow, wallet screen) |
| Contact email | e.g. `info@worldrepublic.org` |
| Category | TBD (e.g. Tools / Productivity) |

#### C.2 Privacy policy (required)

Publish on `worldrepublic.org` before production. Cover at minimum:

- NFC chip data processed **on device**; what leaves the device (validity signals, nullifiers)
- Camera use for MRZ scanning
- Network use (registry, session API)
- Retention, account linkage, pseudonymous identifiers
- No sale of personal data
- Contact / data rights

Tracked in [ROADMAP.md](ROADMAP.md) Phase 2 (2.3); legal review of nullifier wording recommended.

#### C.3 Data safety form

Declare in Play Console (align with privacy policy):

| Data type | Typical declaration |
| --------- | ------------------- |
| Government ID / identity | Collected or processed on device; clarify what is transmitted |
| Photos (MRZ) | Camera, on-device, not stored on server |
| App activity / diagnostics | If any analytics added later |
| Encryption in transit | Yes (HTTPS) |
| Data deletion | Per account / policy |

Sensitive-permission apps (identity, NFC) may get extra review time.

#### C.4 Other policy items

| Item | Action |
| ---- | ------ |
| AGPL source | Link to public GitHub repo in listing or in-app |
| NFC required | `android.hardware.nfc` required — app hidden on non-NFC devices (intentional) |
| Cleartext HTTP | `usesCleartextTraffic="true"` in manifest — remove or restrict before production if possible |
| Target API level | Keep `targetSdkVersion` current per Play requirements |
| 16 KB page size | Already configured (`useLegacyPackaging = false` in `build.gradle`) |

---

### Phase D — App Links (release signing)

**Goal:** `https://www.worldrepublic.org/...` links open the Play-installed app.

| Step | Action | Verify |
| ---- | ------ | ------ |
| D.1 | Set `MULTIPASS_ANDROID_SHA256_FINGERPRINTS` in `world-republic` to **upload keystore** SHA-256 | Not debug cert |
| D.2 | Run `world-republic/scripts/write-multipass-well-known.mjs`; deploy `/.well-known/assetlinks.json` | [Statement List Generator](https://developers.google.com/digital-asset-links/tools/generator) passes |
| D.3 | Tap verify link from browser on device with Play build | Opens Multipass, not browser |

Paths today: `/api/dev/multipass/sessions/*` (see `lib/multipass/app-links.ts`). Production member URLs will need the same treatment when Phase 3 ships.

---

### Phase E — Widen distribution

| Track | Use when |
| ----- | -------- |
| **Internal** | Solo dev + ≤100 testers; fastest iteration |
| **Closed** | Invite-only pilot (e.g. World Republic members) |
| **Open** | Public beta without full production commitment |
| **Production** | General availability |

Promotion path: Internal → Closed → Open (optional) → Production.

Each new upload needs a higher `versionCode` and a new AAB (see [releasing.md](releasing.md#versioning)).

---

### Phase F — Production readiness (ROADMAP Phase 2)

Do **not** treat Play production as “done” until Phase 2 requirements are met for real member verification:

| Requirement | Why |
| ----------- | --- |
| Play Integrity on prod submit | Block scripted / repackaged clients |
| Attestation hardening (challenge nonce, strict verdicts) | Replay and weak-integrity rejection |
| Privacy policy + DPIA | Legal / voter-ID compliance |
| No `dg1`/`sod`/MRZ in logs | Server and APM hygiene |
| Prod API + App Links (Phase 3) | Replace dev `/api/dev/multipass` paths for members |

Internal/closed Play testing can run **in parallel** with Phase 2 engineering; production listing should wait on policy + attestation.

---

## Versioning for Play

| Field | Rule |
| ----- | ---- |
| `versionName` | User-visible semver; match Git tag when possible (`0.1.0`, `0.2.0`, …) |
| `versionCode` | Integer; **strictly increasing** on every Play upload |
| Pre-1.0 | Stay on `0.x.y` per [ROADMAP.md](ROADMAP.md); `1.0.0` when member-web production ships |

Example: GitHub v0.1.0 may have used `versionCode=1`. First Play upload should use `versionCode=2` or higher.

---

## Checklist summary

**Minimum to install from Play (internal testing):**

- [ ] Play Console account + app created
- [ ] Upload keystore generated and backed up
- [ ] Signed AAB built with upload key
- [ ] AAB uploaded to internal testing track
- [ ] At least one tester installed via Play

**Minimum for production listing:**

- [ ] All internal-testing items
- [ ] Store listing complete (text, graphics, screenshots)
- [ ] Privacy policy URL live
- [ ] Data safety form submitted
- [ ] `assetlinks.json` uses release cert fingerprint
- [ ] Phase 2 attestation enforced on prod submit
- [ ] Cleartext traffic reviewed/fixed if needed

---

## Ongoing releases

After the first Play upload, each release:

1. Bump `versionName` and `versionCode`
2. Build signed AAB (+ symbols) per [releasing.md](releasing.md)
3. Upload to Play Console (same track or promote)
4. Optionally attach APK/AAB to GitHub Release for sideload users
5. Update dev page / docs if version links are pinned

---

## Open decisions

| Decision | Options | Notes |
| -------- | ------- | ----- |
| First Play version | `0.1.0` vs `0.1.1` | Same features; bump if you want Play `versionCode` cleanly separated from GitHub-only builds |
| Production timing | After Phase 2 vs open beta earlier | Open/closed OK before attestation; production should wait |
| Store category | Tools vs other | Identity apps face stricter review |
| Play-only vs dual distribution | Keep GitHub APK | Reasonable to keep both: Play for ease, GitHub for transparency / AGPL |
