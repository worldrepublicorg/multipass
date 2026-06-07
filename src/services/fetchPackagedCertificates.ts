import {Buffer} from 'buffer';
import pako from 'pako';
import {RegistryClient} from '@zkpassport/registry';
import type {RegistryClient as RegistryClientType} from '@zkpassport/registry';
import type {PackagedCertificatesFile} from '@zkpassport/utils';

import {normalizeCertRoot} from './registryChain';

export type {PackagedCertificatesFile};

/** IPFS blobs use `certificates_serialised`; CDN/registry SDK uses `serialised`. */
export function normalizePackagedCertificates(data: unknown): unknown {
  if (!data || typeof data !== 'object') {
    return data;
  }
  const raw = data as Record<string, unknown>;
  if (Array.isArray(raw.serialised)) {
    return data;
  }
  if (Array.isArray(raw.certificates_serialised)) {
    return {...raw, serialised: raw.certificates_serialised};
  }
  return data;
}

export function assertPackagedCertificatesFile(
  data: unknown,
  source: string,
): asserts data is PackagedCertificatesFile {
  if (!data || typeof data !== 'object') {
    throw new Error(
      `Invalid packaged certificates from ${source}: not an object`,
    );
  }
  const p = data as Record<string, unknown>;
  if (!Array.isArray(p.certificates) || p.certificates.length === 0) {
    throw new Error(
      `Invalid packaged certificates from ${source}: missing certificates`,
    );
  }
  const hasSerialisedTree =
    Array.isArray(p.serialised) ||
    Array.isArray(p.certificates_serialised);
  if (!hasSerialisedTree) {
    throw new Error(
      `Invalid packaged certificates from ${source}: missing serialised tree`,
    );
  }
}

/** CDN/IPFS may return gzip JSON; Node fetch does not always decompress. */
export function parseRegistryJsonBytes(bytes: Uint8Array): unknown {
  const isGzip = bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
  const jsonBytes = isGzip ? pako.ungzip(bytes) : bytes;
  const text = Buffer.from(jsonBytes).toString('utf8');
  return JSON.parse(text);
}

export function packagedCertificatesToGzipBytes(
  pack: PackagedCertificatesFile,
): Uint8Array {
  const json = JSON.stringify(pack);
  return pako.gzip(Buffer.from(json, 'utf8'));
}

export function parsePackagedCertificatesFromBytes(
  bytes: Uint8Array,
  source: string,
): PackagedCertificatesFile {
  const parsed = normalizePackagedCertificates(parseRegistryJsonBytes(bytes));
  assertPackagedCertificatesFile(parsed, source);
  return parsed as PackagedCertificatesFile;
}

/** Merkle/Poseidon2 check: packaged cert blob hashes to the on-chain root. */
export async function validatePackagedCertificatesAgainstRoot(
  pack: PackagedCertificatesFile,
  certRoot: string,
): Promise<void> {
  const root = normalizeCertRoot(certRoot);
  const valid = await RegistryClient.validateCertificates(pack, root);
  if (!valid) {
    throw new Error(
      `Packaged certificates do not match registry root ${root}`,
    );
  }
}

async function fetchPackagedCertificatesFromUrl(
  url: string,
): Promise<{bytes: Uint8Array; pack: PackagedCertificatesFile}> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch packaged certificates from ${url}: ${res.status} ${res.statusText}`,
    );
  }
  const bytes = new Uint8Array(await res.arrayBuffer());
  const pack = parsePackagedCertificatesFromBytes(bytes, url);
  return {bytes, pack};
}

/**
 * Fetch raw certificate bytes from CDN, then IPFS if needed.
 */
export async function fetchPackagedCertificateBytes(
  registry: RegistryClientType,
  certRoot: string,
): Promise<{bytes: Uint8Array; pack: PackagedCertificatesFile}> {
  try {
    const fromCdn = normalizePackagedCertificates(
      await registry.getCertificates(certRoot, {validate: true}),
    );
    assertPackagedCertificatesFile(fromCdn, 'CDN');
    const pack = fromCdn as PackagedCertificatesFile;
    return {bytes: packagedCertificatesToGzipBytes(pack), pack};
  } catch (cdnError) {
    const details = await registry.getCertificateRootDetails(certRoot);
    if (!details.cid) {
      throw cdnError;
    }
    const ipfsUrl = registry.getUrlForPackagedCertificates(
      certRoot,
      details.cid,
    );
    try {
      const {bytes, pack} = await fetchPackagedCertificatesFromUrl(ipfsUrl);
      await validatePackagedCertificatesAgainstRoot(pack, certRoot);
      return {bytes, pack};
    } catch (ipfsError) {
      const cdnMsg =
        cdnError instanceof Error ? cdnError.message : String(cdnError);
      const ipfsMsg =
        ipfsError instanceof Error ? ipfsError.message : String(ipfsError);
      throw new Error(
        `Failed to load certificates for root ${certRoot} (CDN: ${cdnMsg}; IPFS: ${ipfsMsg})`,
      );
    }
  }
}

/**
 * Load packaged certificates: registry CDN first, then IPFS via on-chain CID.
 */
export async function fetchPackagedCertificates(
  registry: RegistryClientType,
  certRoot: string,
): Promise<PackagedCertificatesFile> {
  const {pack} = await fetchPackagedCertificateBytes(registry, certRoot);
  return pack;
}
