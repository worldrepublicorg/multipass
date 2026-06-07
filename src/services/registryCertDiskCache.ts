import RNFS from 'react-native-fs';

import {
  parsePackagedCertificatesFromBytes,
  type PackagedCertificatesFile,
} from './fetchPackagedCertificates';
import {normalizeCertRoot, REGISTRY_CHAIN_ID} from './registryChain';

const CACHE_DIR = `${RNFS.DocumentDirectoryPath}/registry-certs`;
const META_FILE = `${CACHE_DIR}/meta.json`;

type DiskCacheMeta = {
  certRoot: string;
  savedAt: number;
  chainId: number;
};

function cacheFileForRoot(certRoot: string): string {
  const normalized = normalizeCertRoot(certRoot).replace(/^0x/, '');
  return `${CACHE_DIR}/${normalized}.json.gz`;
}

async function ensureCacheDir(): Promise<void> {
  const exists = await RNFS.exists(CACHE_DIR);
  if (!exists) {
    await RNFS.mkdir(CACHE_DIR);
  }
}

export async function readCachedPack(
  certRoot: string,
): Promise<PackagedCertificatesFile | null> {
  const path = cacheFileForRoot(certRoot);
  const exists = await RNFS.exists(path);
  if (!exists) {
    return null;
  }
  try {
    const b64 = await RNFS.readFile(path, 'base64');
    const bytes = Uint8Array.from(Buffer.from(b64, 'base64'));
    return parsePackagedCertificatesFromBytes(bytes, `disk:${certRoot}`);
  } catch {
    return null;
  }
}

export async function writeCachedPack(
  certRoot: string,
  gzipBytes: Uint8Array,
): Promise<void> {
  await ensureCacheDir();
  const path = cacheFileForRoot(certRoot);
  const b64 = Buffer.from(gzipBytes).toString('base64');
  await RNFS.writeFile(path, b64, 'base64');
  const meta: DiskCacheMeta = {
    certRoot: normalizeCertRoot(certRoot),
    savedAt: Date.now(),
    chainId: REGISTRY_CHAIN_ID,
  };
  await RNFS.writeFile(META_FILE, JSON.stringify(meta), 'utf8');
}

/**
 * Keep bundled root and the given latest root; delete other cached gzip files.
 */
export async function pruneDiskCache(
  keepRoots: string[],
): Promise<void> {
  const exists = await RNFS.exists(CACHE_DIR);
  if (!exists) {
    return;
  }
  const keepNormalized = new Set(
    keepRoots.map(r => normalizeCertRoot(r).replace(/^0x/, '')),
  );
  const entries = await RNFS.readDir(CACHE_DIR);
  for (const entry of entries) {
    if (!entry.name.endsWith('.json.gz')) {
      continue;
    }
    const rootFromFile = entry.name.replace(/\.json\.gz$/, '');
    if (!keepNormalized.has(rootFromFile)) {
      await RNFS.unlink(entry.path).catch(() => {});
    }
  }
}
