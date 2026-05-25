import { Buffer } from 'buffer';
import { sha256 } from '@noble/hashes/sha2.js';
import type { StoredID } from '../storage/idStorage';
import type { ProofRequestPayload } from './ServerClient';
import { computeSodHash } from './documentVerify';

export function isTrustedProofRequest(request: ProofRequestPayload): boolean {
  if (request.validityMode === 'trusted') {
    return true;
  }
  const scope = request.service?.scope?.trim();
  return Boolean(scope?.startsWith('verification:') || scope?.startsWith('election:'));
}

export function resolveTrustedScope(request: ProofRequestPayload): string {
  const scope = request.service?.scope?.trim();
  if (scope) {
    return scope;
  }
  if (request.petitionId) {
    return `verification:${request.petitionId}`;
  }
  throw new Error('Trusted submit requires service.scope or petitionId');
}

export function isDocumentExpired(expiryDate: string): boolean {
  const end = parseExpiryEndUtc(expiryDate);
  if (!end) {
    return true;
  }
  return end.getTime() < Date.now();
}

function parseExpiryEndUtc(expiryDate: string): Date | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) {
    const [y, m, d] = expiryDate.split('-').map((x) => parseInt(x, 10));
    return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
  }
  if (expiryDate.length === 6) {
    const yy = parseInt(expiryDate.slice(0, 2), 10);
    const mm = parseInt(expiryDate.slice(2, 4), 10);
    const dd = parseInt(expiryDate.slice(4, 6), 10);
    const century = yy > 50 ? 1900 : 2000;
    return new Date(Date.UTC(century + yy, mm - 1, dd, 23, 59, 59, 999));
  }
  return null;
}

export function assertSodIntegrity(id: StoredID): void {
  if (!id.sodHash) {
    throw new Error('Document integrity metadata is missing (sodHash)');
  }
  const current = computeSodHash(id.sod);
  if (current !== id.sodHash) {
    throw new Error('Document integrity check failed (SOD changed since scan)');
  }
}

export function assertTrustedSubmitReady(id: StoredID, request: ProofRequestPayload): void {
  if (!id.verifiedAt) {
    throw new Error('Document was not verified at scan time');
  }
  if (isDocumentExpired(id.expiryDate)) {
    throw new Error('Document is expired');
  }
  assertSodIntegrity(id);
  resolveTrustedScope(request);
}

/** Stable path-A nullifier: document seed + scoped label (no dg1/sod on wire). */
export function deriveTrustedNullifier(scope: string, sodBase64: string): string {
  const docSeed = sha256(Buffer.from(sodBase64, 'base64'));
  const prefix = new TextEncoder().encode(`wr-trusted-v1:${scope}:`);
  const scoped = sha256(new Uint8Array([...prefix, ...docSeed]));
  return `0x${Buffer.from(scoped).toString('hex')}`;
}
