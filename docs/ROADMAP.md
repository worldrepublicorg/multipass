# Product roadmap

Multipass (mobile) + World Republic API + web session flow.

**Current focus:** Phase 1 — iOS parity.

| Phase | Summary                                                                                  | Status       |
| ----- | ---------------------------------------------------------------------------------------- | ------------ |
| 1     | iOS parity (Universal Links, MRZ + NFC + same submit flow)                               | in progress  |
| 2     | Security, privacy, app stores — **attestation + hardening**; optional SOD-only server verify | before prod  |
| 3     | Member web (replace [@Self](../self) after 1 + 2)                                        | later        |
| 4     | More national IDs ([anon-citizen-map](https://github.com/anon-aadhaar/anon-citizen-map)) | aspirational |

---

## Product goal

World Republic uses [@Self](../self) today for **account verification** and **voting**. Multipass matches that product with one flow and **scoped nullifiers**:

| Scope    | Example                 | Server stores                                           |
| -------- | ----------------------- | ------------------------------------------------------- |
| Account  | `account`               | One document → one account (`UNIQUE(scope, nullifier)`) |
| Election | `election:{electionId}` | One document → one ballot per election                  |

**Replace Self** only after **Phase 1 (iOS passport parity) + Phase 2 (apps in stores, security, attestation)**. Until then, Self stays production; Android can pilot first, but iOS must not lag on passport validity.

### Production trust model

Prod security is **attestation + sensible hardening**, not ZK. Dev/pilot (`/api/dev/multipass`) may omit attestation; prod submit must not.

| Layer | What | When |
| ----- | ---- | ---- |
| **On device** | Plain registry verify at scan; expiry + `sodHash` at submit | Now |
| **Platform attestation** | Play Integrity (Android) + App Attest (iOS); dev/sideload bypass off in prod | Phase 2 |
| **Attestation hardening** | Server-issued challenge nonce bound into verify; strict integrity verdicts (not “basic” only on Android) | Phase 2 |
| **Defense in depth (optional)** | Root/jailbreak / debugger / hook signals (RASP)—raises bar on hooked genuine app; bypassable | Phase 2+ |
| **Optional server SOD-only** | Transient SOD verify (DSC + CMS); client-sent `expiryDate` trusted for expiry; derive nullifier server-side; no SOD/DG1 store or logs | Phase 2 or 3 if enabled |

### Optional server SOD-only verify

If enabled on production submit (alternative or supplement to client-derived nullifier):

1. App POSTs **SOD** (base64), **expiryDate** (from MRZ, client-asserted), **attestation**, and session binding—not DG1.
2. API loads registry certs; verifies **DSC → CSCA** and **SOD CMS signature** only (reuse [`documentVerify.ts`](../src/services/documentVerify.ts) SOD path; no DG1 integrity check).
3. API rejects if client `expiryDate` is past (policy gate on **trusted client field**—not cryptographically bound to SOD).
4. API derives nullifier from SOD, enforces `UNIQUE(scope, nullifier)`, discards SOD; **no store, no logs**.
5. Reject submit without valid attestation (same as default prod path).

Does **not** replace attestation for anti-script; does **not** prove non-expiry against a hooked client (expired chip + real SOD still verifies). Does block forged chips and nullifier-only `curl` attacks.

---

## Phase 1 — iOS

| Step | Work                                                                                       | Verify                              |
| ---- | ------------------------------------------------------------------------------------------ | ----------------------------------- |
| 1.0  | `pod install`, NFC entitlements, device run                                                | App boots                           |
| 1.1  | Deploy/fix `apple-app-site-association` in `world-republic` (`/.well-known/`)              | Universal Link opens app on iPhone  |
| 1.2  | MRZ native module (same contract as Android `MrzScanner`)                                  | Scan → NFC step                     |
| 1.3  | NFC read `dg1`/`sod`                                                                       | Add ID on iPhone                    |
| 1.4  | Same plain verify + validity submit as Android                                             | Dev session E2E                     |
| 1.5  | TestFlight when ready                                                                      | External testers                    |

**Done when:** iPhone matches Android for add-ID + scoped submit.

---

## Phase 2 — Security, privacy & app stores

**When:** After Phase 1 (parity on both platforms).

### Required

- TLS, rate limits, **no `dg1`/`sod`/MRZ in logs** (including APM/proxy body capture)
- Release signing, AGPL source offer
- **Play Integrity + App Attest** on prod submit (dev/sideload bypass off in prod)
- **Attestation hardening:** server challenge nonce; strict Android integrity tier; verify attestation before accepting submit
- **Privacy policy** (`world-republic`): pseudonymous nullifiers, on-device chip processing, retention, account↔nullifier linkage; **DPIA** for voter/eID flow
- Ship on **Google Play** and **App Store** (TestFlight / internal testing in Phase 1 is not enough for member-web launch)

### Optional (same phase or early Phase 3)

- **RASP** signals (root/jailbreak/debugger/hook)—defense in depth only
- **Server SOD-only verify** on prod submit—transient SOD, client `expiryDate`, server-derived nullifier; feature-flagged

| Step | Work | Verify |
| ---- | ---- | ------ |
| 2.1 | Attestation verify on prod submit API | Reject without valid token |
| 2.2 | Challenge nonce + strict integrity policy | Replay / weak verdict rejected |
| 2.3 | Privacy policy + DPIA draft | Legal review of nullifier wording |
| 2.4 | Store listing both platforms | Production APK/IPA — Android: [play-store.md](play-store.md) |
| 2.5 | (Optional) SOD-only server verify | Forged SOD fails; expired doc + hook still a known limit |

**Done when:** Store-listed apps on both platforms; attestation enforced on production submit; privacy policy published; optional items tracked if deferred.

---

## Phase 3 — Member web

**When:** After Phase 2. Replace Self on world-republic with Multipass sessions (production API, App Links, poll/status).

Prod dedup: `user_self_verifications` / `votes` tables (replacing dev-only session table).

---

## Phase 4 — Global e-IDs

Long-term catalog from [anon-citizen-map](https://github.com/anon-aadhaar/anon-citizen-map): prioritize by population and spec clarity. Integration types: **ICAO NFC (zkPassport)**, **QR-based IDs (web)**, **new circuit**, **blocked / unknown spec**. Ship incrementally in Multipass or world-republic web as appropriate.

---

## Key files

| Concern             | Location                                                                                                                                                             |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plain verify        | [`documentVerify.ts`](../src/services/documentVerify.ts)                                                                                                             |
| Validity submit      | [`validity.ts`](../src/services/validity.ts), [`serverClient.ts`](../src/services/serverClient.ts)                                                     |
| Add ID              | [`useID.ts`](../src/hooks/useID.ts), [`idStorage.ts`](../src/storage/idStorage.ts)                                                                                   |
| MRZ / NFC (Android) | [`mrzscanner/`](../android/app/src/main/java/org/worldrepublic/multipass/mrzscanner/), [`emrtdreader/`](../android/app/src/main/java/org/worldrepublic/multipass/emrtdreader/) |
| TurboModule specs   | [`specs/`](../specs/)                                                                                                                                                |
| iOS                 | [`ios/`](../ios/) — Phase 1                                                                                                                                          |
| APK build           | [README Android Build](../README.md#android-build), [`scripts/build-release-android.mjs`](../scripts/build-release-android.mjs)                                      |

---

## Next actions

1. **Phase 1.0** — `pod install`, NFC entitlements, device run on iPhone.
2. **Phase 1.1** — Apple Developer app + deploy `apple-app-site-association` in `world-republic` (`MULTIPASS_IOS_TEAM_ID`).
3. **Phase 1.2–1.4** — MRZ + NFC native modules, add-ID + dev session E2E on iPhone.
