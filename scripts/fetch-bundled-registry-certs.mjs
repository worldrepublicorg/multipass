/**
 * Fetches latest mainnet zkPassport packaged certs for the app bundle.
 * Usage: node scripts/fetch-bundled-registry-certs.mjs
 */
import {writeFileSync, mkdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {RegistryClient} from '@zkpassport/registry';
import pako from 'pako';

const CHAIN_ID = 1;
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(rootDir, 'assets', 'registry');
const androidAssetsDir = path.join(
  rootDir,
  'android',
  'app',
  'src',
  'main',
  'assets',
  'registry',
);

function normalizePackagedCertificates(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }
  if (Array.isArray(data.serialised)) {
    return data;
  }
  if (Array.isArray(data.certificates_serialised)) {
    return {...data, serialised: data.certificates_serialised};
  }
  return data;
}

function assertPack(data, source) {
  if (!data?.certificates?.length || !Array.isArray(data.serialised)) {
    throw new Error(`Invalid packaged certificates from ${source}`);
  }
}

function parseRegistryJsonBytes(bytes) {
  const isGzip = bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
  const jsonBytes = isGzip ? pako.ungzip(bytes) : bytes;
  return JSON.parse(new TextDecoder().decode(jsonBytes));
}

async function fetchFromUrl(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`${url}: ${res.status} ${res.statusText}`);
  }
  return new Uint8Array(await res.arrayBuffer());
}

async function validatePackAgainstRoot(pack, certRoot) {
  const valid = await RegistryClient.validateCertificates(pack, certRoot);
  if (!valid) {
    throw new Error(
      `Packaged certificates do not match registry root ${certRoot}`,
    );
  }
}

async function fetchPackagedCertificateBytes(registry, certRoot) {
  try {
    const fromCdn = normalizePackagedCertificates(
      await registry.getCertificates(certRoot, {validate: true}),
    );
    assertPack(fromCdn, 'CDN');
    const json = JSON.stringify(fromCdn);
    return {
      bytes: pako.gzip(new TextEncoder().encode(json)),
      pack: fromCdn,
      wireBytes: new TextEncoder().encode(json).length,
    };
  } catch (cdnError) {
    const details = await registry.getCertificateRootDetails(certRoot);
    if (!details.cid) {
      throw cdnError;
    }
    const ipfsUrl = registry.getUrlForPackagedCertificates(
      certRoot,
      details.cid,
    );
    const bytes = await fetchFromUrl(ipfsUrl);
    const pack = normalizePackagedCertificates(parseRegistryJsonBytes(bytes));
    assertPack(pack, ipfsUrl);
    await validatePackAgainstRoot(pack, certRoot);
    const isGzip = bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
    const wireBytes = isGzip
      ? pako.ungzip(bytes).length
      : bytes.length;
    const gzipBytes = isGzip
      ? bytes
      : pako.gzip(new TextEncoder().encode(JSON.stringify(pack)));
    return {bytes: gzipBytes, pack, wireBytes};
  }
}

async function main() {
  console.log(`Fetching zkPassport certs (chainId=${CHAIN_ID})...`);
  const registry = new RegistryClient({chainId: CHAIN_ID});
  const certRoot = await registry.getLatestCertificateRoot();
  const {bytes, pack, wireBytes} = await fetchPackagedCertificateBytes(
    registry,
    certRoot,
  );

  mkdirSync(outDir, {recursive: true});
  mkdirSync(androidAssetsDir, {recursive: true});
  const gzipPath = path.join(outDir, 'mainnet-certs.json.gz');
  const androidPackPath = path.join(androidAssetsDir, 'mainnet-certs.pack');
  const manifestPath = path.join(outDir, 'manifest.json');

  const gzipBuffer = Buffer.from(bytes);
  writeFileSync(gzipPath, gzipBuffer);
  writeFileSync(androidPackPath, gzipBuffer);
  const manifest = {
    chainId: CHAIN_ID,
    certRoot,
    fetchedAt: new Date().toISOString(),
    certificateCount: pack.certificates.length,
    wireBytes,
    gzipBytes: bytes.length,
  };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  console.log(`certRoot: ${certRoot}`);
  console.log(`certificates: ${manifest.certificateCount}`);
  console.log(`gzip: ${manifest.gzipBytes} bytes → ${gzipPath}`);
  console.log(`android asset → ${androidPackPath}`);
  console.log(`manifest → ${manifestPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
