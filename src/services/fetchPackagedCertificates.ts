import pako from 'pako';
import type { RegistryClient } from '@zkpassport/registry';

/** Packaged certificate blob from zkPassport registry CDN or IPFS. */
export type PackagedCertificatesFile = {
  certificates: unknown[];
  serialised: unknown[];
  version?: number;
};

function assertPackagedCertificatesFile(
  data: unknown,
  source: string,
): asserts data is PackagedCertificatesFile {
  if (!data || typeof data !== 'object') {
    throw new Error(`Invalid packaged certificates from ${source}: not an object`);
  }
  const p = data as PackagedCertificatesFile;
  if (!Array.isArray(p.certificates) || p.certificates.length === 0) {
    throw new Error(`Invalid packaged certificates from ${source}: missing certificates`);
  }
  if (!Array.isArray(p.serialised)) {
    throw new Error(`Invalid packaged certificates from ${source}: missing serialised tree`);
  }
}

/** CDN/IPFS may return gzip JSON; Node fetch does not always decompress. */
export function parseRegistryJsonBytes(bytes: Uint8Array): unknown {
  const isGzip = bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
  const jsonBytes = isGzip ? pako.ungzip(bytes) : bytes;
  const text = new TextDecoder().decode(jsonBytes);
  return JSON.parse(text);
}

async function fetchPackagedCertificatesFromUrl(url: string): Promise<PackagedCertificatesFile> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch packaged certificates from ${url}: ${res.status} ${res.statusText}`);
  }
  const bytes = new Uint8Array(await res.arrayBuffer());
  const parsed = parseRegistryJsonBytes(bytes);
  assertPackagedCertificatesFile(parsed, url);
  return parsed;
}

/**
 * Load packaged certificates: registry CDN first, then IPFS via on-chain CID.
 * Sepolia cert CDN often 404s; IPFS gateway remains available (see ROADMAP registry note).
 */
export async function fetchPackagedCertificates(
  registry: RegistryClient,
  certRoot: string,
): Promise<PackagedCertificatesFile> {
  try {
    const fromCdn = await registry.getCertificates(certRoot, { validate: false });
    assertPackagedCertificatesFile(fromCdn, 'CDN');
    return fromCdn;
  } catch (cdnError) {
    const details = await registry.getCertificateRootDetails(certRoot);
    if (!details.cid) {
      throw cdnError;
    }
    const ipfsUrl = registry.getUrlForPackagedCertificates(certRoot, details.cid);
    try {
      return await fetchPackagedCertificatesFromUrl(ipfsUrl);
    } catch (ipfsError) {
      const cdnMsg = cdnError instanceof Error ? cdnError.message : String(cdnError);
      const ipfsMsg = ipfsError instanceof Error ? ipfsError.message : String(ipfsError);
      throw new Error(
        `Failed to load certificates for root ${certRoot} (CDN: ${cdnMsg}; IPFS: ${ipfsMsg})`,
      );
    }
  }
}
