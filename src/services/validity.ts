import {Buffer} from 'buffer';
import {sha256} from '@noble/hashes/sha2.js';
import type {StoredID} from '../storage/idStorage';
import type {SessionRequestPayload} from './serverClient';
import {computeSodHash} from './documentVerify';

export const MULTIPASS_ACCOUNT_SCOPE = 'account';

export function multipassElectionScope(electionId: string): string {
  return `election:${electionId}`;
}

export function isMultipassAccountScope(scope: string): boolean {
  return scope.trim() === MULTIPASS_ACCOUNT_SCOPE;
}

export function isMultipassElectionScope(scope: string): boolean {
  return scope.trim().startsWith('election:');
}

/** Account verification or election vote session (scoped nullifier submit). */
export function isSupportedSessionRequest(
  request: SessionRequestPayload,
): boolean {
  const scope = request.service?.scope?.trim();
  if (!scope) {
    return false;
  }
  return isMultipassAccountScope(scope) || isMultipassElectionScope(scope);
}

export function resolveScope(request: SessionRequestPayload): string {
  const scope = request.service?.scope?.trim();
  if (!scope) {
    throw new Error('Submit requires service.scope');
  }
  if (isMultipassAccountScope(scope) || isMultipassElectionScope(scope)) {
    return scope;
  }
  throw new Error(`Unsupported scope: ${scope}`);
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
    const [y, m, d] = expiryDate.split('-').map(x => parseInt(x, 10));
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

export function assertSubmitReady(
  id: StoredID,
  request: SessionRequestPayload,
): void {
  if (isDocumentExpired(id.expiryDate)) {
    throw new Error('Document is expired');
  }
  assertSodIntegrity(id);
  resolveScope(request);
}

export const NULLIFIER_PREFIX = 'wr-validity-v1:';

/** Stable scoped nullifier: document seed + scope label (no dg1/sod on wire). */
export function deriveNullifier(scope: string, sodBase64: string): string {
  const docSeed = sha256(Buffer.from(sodBase64, 'base64'));
  const prefix = new TextEncoder().encode(`${NULLIFIER_PREFIX}${scope}:`);
  const scoped = sha256(new Uint8Array([...prefix, ...docSeed]));
  return `0x${Buffer.from(scoped).toString('hex')}`;
}

export function expiredDocumentMessage(): {title: string; detail: string} {
  return {
    title: 'Document expired',
    detail:
      'This ID has passed its expiry date and cannot be used for verification',
  };
}

export function isExpiredDocumentError(err: unknown): boolean {
  const message = (
    err instanceof Error ? err.message : String(err ?? '')
  ).toLowerCase();
  return (
    message.includes('document is expired') ||
    message.includes('has expired') ||
    message.includes('cannot be used for verification') ||
    message.includes('cannot be used for signing')
  );
}

/** User-facing label for a wire scope (account / election:{id}). */
export function humanizeScope(scope: string): string {
  if (isMultipassAccountScope(scope)) {
    return 'Account verification';
  }
  if (isMultipassElectionScope(scope)) {
    return 'Election vote';
  }
  return 'Verification';
}

export function unsupportedSessionMessage(): {title: string; detail: string} {
  return {
    title: "This verification isn't supported",
    detail:
      'Update the app or open the link again from the World Republic web app',
  };
}

export function duplicateSubmitMessage(scope: string): {
  title: string;
  detail: string;
} {
  if (isMultipassAccountScope(scope)) {
    return {
      title: 'Document already linked',
      detail:
        'This document was already used to verify another account',
    };
  }
  if (isMultipassElectionScope(scope)) {
    return {
      title: 'Already voted',
      detail:
        'This document was already used to vote in this election',
    };
  }
  return {
    title: 'Already used',
    detail: 'This document was already used for this action',
  };
}
