#!/usr/bin/env node
/**
 * Windows release build when the repo path exceeds MAX_PATH for native (CMake) builds.
 *
 * 1. Bundle JS on the physical project path (Metro works on C:\...)
 * 2. Build/install release from SUBST M:\ (short paths for CMake/ninja)
 *
 * Usage:
 *   node scripts/build-release-android.mjs            # installRelease (default)
 *   node scripts/build-release-android.mjs assemble   # assembleRelease (APK only)
 */

import {execSync, spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const substDrive = process.env.REACT_NATIVE_SUBST_DRIVE || 'M:';
const gradleTask =
  process.argv[2] === 'assemble' ? 'assembleRelease' : 'installRelease';

function run(command, options = {}) {
  execSync(command, {
    stdio: 'inherit',
    cwd: rootDir,
    shell: true,
    ...options,
  });
}

function bundleReleaseJs() {
  console.log('Bundling release JS on physical project path...');
  run(
    'npx react-native bundle --platform android --dev false --entry-file index.js ' +
      '--bundle-output android/app/src/main/assets/index.android.bundle ' +
      '--assets-dest android/app/src/main/res',
  );
}

function ensureSubst() {
  const output = execSync('subst', {encoding: 'utf8', shell: true});
  if (output.includes(`${substDrive}\\`)) {
    console.log(`${substDrive} already mapped.`);
    return `${substDrive}\\`;
  }
  console.log(`Mapping ${substDrive} -> ${rootDir}`);
  run(`subst ${substDrive} "${rootDir}"`);
  return `${substDrive}\\`;
}

function gradleRelease(substRoot) {
  const gradlew = path.join(substRoot, 'android', 'gradlew.bat');
  console.log(`Running ${gradleTask} from ${substRoot}android ...`);
  const result = spawnSync(
    gradlew,
    [gradleTask, '-PreactNativeArchitectures=arm64-v8a'],
    {
      cwd: path.join(substRoot, 'android'),
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        REACT_NATIVE_SUBST_BUILD: '1',
      },
    },
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (process.platform !== 'win32') {
  console.error('This script is for Windows SUBST release builds only.');
  console.error('On other platforms run: cd android && ./gradlew installRelease');
  process.exit(1);
}

console.log('Refreshing bundled zkPassport registry certificates...');
run('npm run registry:fetch-bundled');

bundleReleaseJs();
const substRoot = ensureSubst();
gradleRelease(substRoot);
console.log(`Release build finished (${gradleTask}).`);
