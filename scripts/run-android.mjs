#!/usr/bin/env node
/**
 * Runs the Android app on a connected device.
 *
 * Usage:
 *   node scripts/run-android.mjs
 *   node scripts/run-android.mjs <adb-serial>
 *   ANDROID_DEVICE=<serial> node scripts/run-android.mjs
 *
 * Pass `--no-packager` to skip Metro startup checks.
 */

import {execSync, spawn, spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const METRO_PORT = Number(process.env.RCT_METRO_PORT || 8081);
const APP_ID = 'org.worldrepublic.multipass';
const MAIN_ACTIVITY = `${APP_ID}/.MainActivity`;

function killProcessOnPort(port) {
  try {
    if (process.platform === 'win32') {
      const output = execSync(`netstat -ano | findstr :${port}`, {
        encoding: 'utf8',
        shell: true,
      });
      const pids = new Set();
      for (const line of output.split(/\r?\n/)) {
        if (!/LISTENING/i.test(line)) {
          continue;
        }
        const match = line.trim().match(/\s+(\d+)\s*$/);
        if (match) {
          pids.add(match[1]);
        }
      }
      for (const pid of pids) {
        try {
          execSync(`taskkill /PID ${pid} /F`, {stdio: 'ignore', shell: true});
        } catch {
          // Process may have already exited.
        }
      }
      return;
    }

    execSync(`lsof -ti :${port} | xargs kill -9`, {
      stdio: 'ignore',
      shell: true,
    });
  } catch {
    // Port already free or nothing to kill.
  }
}

function isMetroRunning() {
  try {
    const curl = process.platform === 'win32' ? 'curl.exe' : 'curl';
    const out = execSync(
      `${curl} -s --max-time 2 http://127.0.0.1:${METRO_PORT}/status`,
      {encoding: 'utf8', shell: true},
    );
    return /packager-status|running/i.test(out);
  } catch {
    return false;
  }
}

function ensureMetro(extraArgs) {
  if (extraArgs.includes('--no-packager')) {
    return;
  }

  if (isMetroRunning()) {
    console.log(`Metro already running on port ${METRO_PORT}.`);
    return;
  }

  console.log(`Starting Metro on port ${METRO_PORT}...`);
  killProcessOnPort(METRO_PORT);
  const metro = spawn('npx', ['react-native', 'start'], {
    cwd: rootDir,
    stdio: 'ignore',
    detached: true,
    shell: true,
  });
  metro.unref();

  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (isMetroRunning()) {
      console.log('Metro is ready.');
      return;
    }
    execSync('node -e "setTimeout(()=>{}, 1000)"', {stdio: 'ignore'});
  }

  console.warn(
    `Metro did not respond on port ${METRO_PORT} yet. Start it manually with "npm start" if the app shows a redbox.`,
  );
}

function listConnectedDevices() {
  const output = execSync('adb devices', {encoding: 'utf8'});
  return output
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map(line => {
      const trimmed = line.trim();
      if (!trimmed) {
        return null;
      }
      // Serial may contain spaces (wireless mDNS); status is after tab or last token.
      const tabParts = trimmed.split('\t').filter(Boolean);
      if (tabParts.length >= 2) {
        return [tabParts[0].trim(), tabParts[tabParts.length - 1].trim()];
      }
      const spaceParts = trimmed.split(/\s+/);
      const status = spaceParts[spaceParts.length - 1];
      const serial = spaceParts.slice(0, -1).join(' ');
      return [serial, status];
    })
    .filter(entry => Boolean(entry))
    .filter(([, status]) => status === 'device')
    .map(([serial]) => serial);
}

/** Same phone can appear twice over wireless ADB (e.g. serial with " (2)."). */
function normalizeDeviceKey(serial) {
  return serial.replace(/ \(\d+\)\./, '.');
}

function dedupeDevices(devices) {
  const byKey = new Map();
  for (const serial of devices) {
    const key = normalizeDeviceKey(serial);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, serial);
      continue;
    }
    // Prefer the serial without a duplicate " (N)" suffix.
    const existingDup = /\(\d+\)/.test(existing);
    const serialDup = /\(\d+\)/.test(serial);
    if (existingDup && !serialDup) {
      byKey.set(key, serial);
    }
  }
  return [...byKey.values()];
}

function resolveRequestedDevice(devices, requested) {
  if (!requested) {
    return null;
  }
  if (devices.includes(requested)) {
    return requested;
  }
  const key = normalizeDeviceKey(requested);
  const match = devices.find(serial => normalizeDeviceKey(serial) === key);
  return match ?? requested;
}

function pickDevice(devices, requested) {
  const resolved = resolveRequestedDevice(devices, requested);
  if (resolved) {
    if (!devices.includes(resolved)) {
      console.error(
        `Device "${requested}" is not connected (status must be "device").\n` +
          `Connected: ${devices.length ? devices.join(', ') : '(none)'}`,
      );
      process.exit(1);
    }
    return resolved;
  }

  if (devices.length === 0) {
    console.error(
      'No Android device connected. Connect via USB or wireless debugging, then run `adb devices`.',
    );
    process.exit(1);
  }

  if (devices.length > 1) {
    const chosen = devices[0];
    console.warn(
      `Multiple devices connected; using "${chosen}".\n` +
        `Pass a serial explicitly: npm run android -- <serial>\n` +
        `Available: ${devices.join(', ')}`,
    );
    return chosen;
  }

  return devices[0];
}

function adb(deviceId, args) {
  return spawnSync('adb', ['-s', deviceId, ...args], {
    stdio: 'inherit',
    shell: false,
    env: {...process.env, ANDROID_SERIAL: deviceId},
  });
}

function setupMetroPortForwarding(deviceIds) {
  for (const deviceId of deviceIds) {
    console.log(`Port forward ${METRO_PORT} on ${deviceId}`);
    adb(deviceId, ['reverse', `tcp:${METRO_PORT}`, `tcp:${METRO_PORT}`]);
  }
}

function installAndLaunch(deviceId, allDeviceIds) {
  const gradle =
    process.platform === 'win32'
      ? path.join(rootDir, 'android', 'gradlew.bat')
      : path.join(rootDir, 'android', 'gradlew');

  console.log(`Installing on: ${deviceId}`);
  const install = spawnSync(gradle, ['installDebug'], {
    cwd: path.join(rootDir, 'android'),
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {...process.env, ANDROID_SERIAL: deviceId},
  });
  if (install.status !== 0) {
    process.exit(install.status ?? 1);
  }

  setupMetroPortForwarding(allDeviceIds);
  adb(deviceId, ['shell', 'am', 'start', '-n', MAIN_ACTIVITY]);
}

const rawDevices = listConnectedDevices();
const devices = dedupeDevices(rawDevices);
if (rawDevices.length !== devices.length) {
  console.warn(
    `Collapsed ${rawDevices.length} ADB entries to ${devices.length} device(s): ${devices.join(', ')}`,
  );
}

const requested = process.env.ANDROID_DEVICE || process.argv[2];
const deviceId = pickDevice(devices, requested);
const extraArgs = process.argv.slice(requested ? 3 : 2);

ensureMetro(extraArgs);
installAndLaunch(deviceId, devices);
