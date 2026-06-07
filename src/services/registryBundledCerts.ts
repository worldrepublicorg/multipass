import {Image, Platform} from 'react-native';
import {Buffer} from 'buffer';
import RNFS from 'react-native-fs';

import {
  readBundledRegistryGzipBase64,
  isRegistryBundledCertsNativeAvailable,
} from '../native/registryBundledCertsNative';
import {
  assertPackagedCertificatesFile,
  parsePackagedCertificatesFromBytes,
  type PackagedCertificatesFile,
} from './fetchPackagedCertificates';
import {normalizeCertRoot} from './registryChain';

export type BundledRegistryManifest = {
  chainId: number;
  certRoot: string;
  fetchedAt: string;
  certificateCount: number;
  wireBytes: number;
  gzipBytes: number;
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const bundledManifest = require('../../assets/registry/manifest.json') as BundledRegistryManifest;

// Metro asset (iOS / fallback when native reader unavailable)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bundledCertsGz = require('../../assets/registry/mainnet-certs.json.gz');

let cachedPack: PackagedCertificatesFile | null = null;

export function getBundledRegistryMeta(): BundledRegistryManifest {
  return bundledManifest;
}

export function getBundledCertRoot(): string {
  return normalizeCertRoot(bundledManifest.certRoot);
}

function base64ToBytes(b64: string): Uint8Array {
  return Uint8Array.from(Buffer.from(b64, 'base64'));
}

/** APK asset paths (see RegistryBundledCertsModule.java). */
const ANDROID_BUNDLED_ASSET_PATHS = [
  'registry/mainnet-certs.pack',
  'registry/mainnet-certs.json.gz',
  'registry/mainnet-certs.json',
] as const;

async function loadBundledGzipBytesFromNative(): Promise<Uint8Array> {
  const b64 = await readBundledRegistryGzipBase64();
  return base64ToBytes(b64);
}

/** Android APK assets via react-native-fs (works without TurboModule lookup). */
async function loadBundledGzipBytesFromRnfsAssets(): Promise<Uint8Array> {
  let lastError: unknown;
  for (const assetPath of ANDROID_BUNDLED_ASSET_PATHS) {
    try {
      const exists = await RNFS.existsAssets(assetPath);
      if (!exists) {
        continue;
      }
      const b64 = await RNFS.readFileAssets(assetPath, 'base64');
      return base64ToBytes(b64);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError ?? new Error('Bundled registry certificates not found in APK assets');
}

async function loadBundledGzipBytesFromAssetUri(): Promise<Uint8Array> {
  const source = Image.resolveAssetSource(bundledCertsGz);
  const uri = source?.uri;
  if (!uri) {
    throw new Error('Bundled registry certificates asset is missing');
  }
  if (/^https?:\/\//i.test(uri)) {
    throw new Error(
      'Bundled registry certificates are not available offline in this build. ' +
        'Use a release APK or rebuild after running npm run registry:fetch-bundled.',
    );
  }
  const res = await fetch(uri);
  if (!res.ok) {
    throw new Error(
      `Failed to load bundled registry certificates: ${res.status}`,
    );
  }
  return new Uint8Array(await res.arrayBuffer());
}

async function loadBundledGzipBytes(): Promise<Uint8Array> {
  if (Platform.OS === 'android') {
    if (isRegistryBundledCertsNativeAvailable()) {
      try {
        return await loadBundledGzipBytesFromNative();
      } catch (nativeError) {
        if (__DEV__) {
          console.warn(
            '[registry] TurboModule bundled cert read failed, trying RNFS assets',
            nativeError,
          );
        }
      }
    }

    try {
      return await loadBundledGzipBytesFromRnfsAssets();
    } catch (rnfsError) {
      if (__DEV__) {
        console.warn(
          '[registry] RNFS assets bundled cert read failed, trying asset URI',
          rnfsError,
        );
      }
    }
  }

  return loadBundledGzipBytesFromAssetUri();
}

export async function loadBundledPackagedCertificates(): Promise<PackagedCertificatesFile> {
  if (cachedPack) {
    return cachedPack;
  }
  const bytes = await loadBundledGzipBytes();
  const pack = parsePackagedCertificatesFromBytes(bytes, 'bundled');
  assertPackagedCertificatesFile(pack, 'bundled');
  cachedPack = pack;
  return pack;
}

/** Test-only: reset in-memory memo. */
export function clearBundledPackagedCertificatesCache(): void {
  cachedPack = null;
}

/** Test-only: inject parsed pack without loading assets. */
export function setBundledPackagedCertificatesForTests(
  pack: PackagedCertificatesFile | null,
): void {
  cachedPack = pack;
}
