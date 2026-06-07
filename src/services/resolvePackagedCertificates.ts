import type {RegistryClient} from '@zkpassport/registry';

import {fetchPackagedCertificateBytes} from './fetchPackagedCertificates';
import type {PackagedCertificatesFile} from './fetchPackagedCertificates';
import {
  getBundledCertRoot,
  loadBundledPackagedCertificates,
} from './registryBundledCerts';
import {
  pruneDiskCache,
  readCachedPack,
  writeCachedPack,
} from './registryCertDiskCache';
import {normalizeCertRoot} from './registryChain';

export type CertPackSource =
  | 'bundled'
  | 'bundled-offline'
  | 'bundled-fallback'
  | 'disk'
  | 'network';

export type ResolvedPackagedCertificates = {
  packaged: PackagedCertificatesFile;
  certRoot: string;
  source: CertPackSource;
};

async function loadBundledResolved(
  source: CertPackSource,
): Promise<ResolvedPackagedCertificates> {
  const bundledPack = await loadBundledPackagedCertificates();
  return {
    packaged: bundledPack,
    certRoot: getBundledCertRoot(),
    source,
  };
}

export async function resolvePackagedCertificates(
  registry: RegistryClient,
): Promise<ResolvedPackagedCertificates> {
  const bundledRoot = getBundledCertRoot();

  let latestRoot: string;
  try {
    latestRoot = normalizeCertRoot(await registry.getLatestCertificateRoot());
  } catch {
    if (__DEV__) {
      console.log('[registry] cert pack source: bundled-offline');
    }
    return loadBundledResolved('bundled-offline');
  }

  if (latestRoot === bundledRoot) {
    if (__DEV__) {
      console.log('[registry] cert pack source: bundled');
    }
    return loadBundledResolved('bundled');
  }

  const cached = await readCachedPack(latestRoot);
  if (cached) {
    if (__DEV__) {
      console.log('[registry] cert pack source: disk');
    }
    await pruneDiskCache([bundledRoot, latestRoot]);
    return {
      packaged: cached,
      certRoot: latestRoot,
      source: 'disk',
    };
  }

  try {
    const {bytes, pack} = await fetchPackagedCertificateBytes(
      registry,
      latestRoot,
    );
    await writeCachedPack(latestRoot, bytes);
    await pruneDiskCache([bundledRoot, latestRoot]);
    if (__DEV__) {
      console.log('[registry] cert pack source: network');
    }
    return {
      packaged: pack,
      certRoot: latestRoot,
      source: 'network',
    };
  } catch {
    if (__DEV__) {
      console.log('[registry] cert pack source: bundled-fallback');
    }
    return loadBundledResolved('bundled-fallback');
  }
}
