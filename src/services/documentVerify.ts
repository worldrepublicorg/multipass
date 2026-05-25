import { Buffer } from 'buffer';
import { sha1 } from '@noble/hashes/legacy.js';
import { sha224, sha256, sha384, sha512 } from '@noble/hashes/sha2.js';
import { RegistryClient } from '@zkpassport/registry';
import {
  type ECPublicKey,
  type HashAlgorithm,
  type PackagedCertificate,
  type RSAPublicKey,
  extractTBS,
  getCscaForPassportAsync,
  getECDSAInfo,
  getRSAInfo,
  getSodSignatureAlgorithmType,
  isIDSupported,
  verifyDscSignature,
  verifyECDSASignature,
  verifyRSASignature,
} from '@zkpassport/utils';
import { fetchPackagedCertificates } from './fetchPackagedCertificates';
import { buildPassportViewModel } from './passportModel';

const CHAIN_ID = 11155111;

export type PlainVerifyResult = {
  verifiedAt: number;
  certRoot: string;
  sodHash: string;
};

export class DocumentVerifyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DocumentVerifyError';
  }
}

const HASH_FN: Record<string, (data: Uint8Array) => Uint8Array> = {
  'SHA-1': sha1,
  'SHA-224': sha224,
  'SHA-256': sha256,
  'SHA-384': sha384,
  'SHA-512': sha512,
};

function normalizeHashAlgorithm(value: string): HashAlgorithm {
  const upper = value.toUpperCase().replace('SHA', 'SHA-');
  if (upper in HASH_FN) {
    return upper as HashAlgorithm;
  }
  throw new DocumentVerifyError(`Unsupported hash algorithm: ${value}`);
}

function bytesEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

export function computeSodHash(sodBase64: string): string {
  const bytes = Buffer.from(sodBase64, 'base64');
  return Buffer.from(sha256(bytes)).toString('hex');
}

function verifyDg1Integrity(passport: any): void {
  const dg1Group = passport.dataGroups?.find((dg: any) => dg.groupNumber === 1);
  if (!dg1Group) {
    throw new DocumentVerifyError('DG1 missing from passport data');
  }
  const dg1HashFromSod = passport.sod.encapContentInfo.eContent.dataGroupHashValues.values[1];
  if (!dg1HashFromSod) {
    throw new DocumentVerifyError('DG1 hash missing from SOD eContent');
  }
  const expected = dg1HashFromSod.toNumberArray();
  if (!bytesEqual(expected, dg1Group.hash)) {
    throw new DocumentVerifyError('DG1 hash does not match SOD eContent');
  }
}

async function verifySodSignature(passport: any): Promise<void> {
  if (!isIDSupported(passport)) {
    throw new DocumentVerifyError('SOD signature algorithm is not supported on this device');
  }

  const tbs = extractTBS(passport);
  if (!tbs) {
    throw new DocumentVerifyError('Could not extract DSC certificate from passport');
  }

  const signedAttrsBytes = passport.sod.signerInfo.signedAttrs.bytes.toUInt8Array();
  const signatureBytes = passport.sod.signerInfo.signature.toUInt8Array();
  const hashAlg = normalizeHashAlgorithm(passport.sod.signerInfo.digestAlgorithm);
  const digest = HASH_FN[hashAlg](signedAttrsBytes);

  const sodSigType = getSodSignatureAlgorithmType(passport);
  const sigName = String(passport.sod.signerInfo.signatureAlgorithm.name || '').toLowerCase();
  const isPss = sigName.includes('pss');

  if (sodSigType === 'ECDSA') {
    const ecdsaInfo = getECDSAInfo(tbs.subjectPublicKeyInfo);
    const spki = tbs.subjectPublicKeyInfo;
    const raw = new Uint8Array(spki.subjectPublicKey);
    const half = Math.floor(raw.length / 2);
    const publicKey = {
      type: 'EC' as const,
      curve: ecdsaInfo.curve,
      public_key_x: `0x${Buffer.from(raw.slice(1, half + 1)).toString('hex')}`,
      public_key_y: `0x${Buffer.from(raw.slice(half + 1)).toString('hex')}`,
      key_size: ecdsaInfo.keySize,
    } as ECPublicKey;
    if (!verifyECDSASignature(digest, signatureBytes, publicKey)) {
      throw new DocumentVerifyError('SOD signature verification failed (ECDSA)');
    }
    return;
  }

  if (sodSigType === 'RSA') {
    const rsaInfo = getRSAInfo(tbs.subjectPublicKeyInfo);
    const publicKey = {
      type: 'RSA' as const,
      modulus: `0x${BigInt(rsaInfo.modulus).toString(16)}`,
      exponent: Number(rsaInfo.exponent),
      key_size: BigInt(rsaInfo.modulus).toString(2).length,
    } as RSAPublicKey;
    const ok = await verifyRSASignature(
      signedAttrsBytes,
      digest,
      signatureBytes,
      publicKey,
      hashAlg,
      isPss,
    );
    if (!ok) {
      throw new DocumentVerifyError('SOD signature verification failed (RSA)');
    }
    return;
  }

  throw new DocumentVerifyError('Unsupported SOD signature type');
}

/**
 * Plain registry verify at NFC scan (path A, Block E1).
 * Loads CSCA/DSC chain from zkPassport registry and checks DSC + SOD + DG1 integrity.
 */
export async function plainVerifyPassport(dg1Base64: string, sodBase64: string): Promise<PlainVerifyResult> {
  if (!dg1Base64?.trim() || !sodBase64?.trim()) {
    throw new DocumentVerifyError('Missing DG1 or SOD data');
  }

  let passport: any;
  try {
    passport = buildPassportViewModel({ dg1: dg1Base64, sod: sodBase64 });
  } catch (err: any) {
    throw new DocumentVerifyError(err?.message || 'Could not parse passport chip data');
  }

  const registry = new RegistryClient({ chainId: CHAIN_ID });
  const certRoot = await registry.getLatestCertificateRoot();
  const packagedCerts = await fetchPackagedCertificates(registry, certRoot);

  const csca = await getCscaForPassportAsync(
    passport.sod.certificate,
    packagedCerts.certificates as PackagedCertificate[],
  );
  if (!csca) {
    throw new DocumentVerifyError('Could not match CSCA from certificate registry');
  }

  const dscOk = await verifyDscSignature(passport.sod.certificate, csca);
  if (!dscOk) {
    throw new DocumentVerifyError('DSC signature verification failed against registry CSCA');
  }

  await verifySodSignature(passport);
  verifyDg1Integrity(passport);

  return {
    verifiedAt: Date.now(),
    certRoot,
    sodHash: computeSodHash(sodBase64),
  };
}
