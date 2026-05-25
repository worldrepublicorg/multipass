import type { StoredID } from '../../storage/idStorage';
import type { ProofRequestPayload } from '../ServerClient';
import {
  assertSodIntegrity,
  assertTrustedSubmitReady,
  isDocumentExpired,
  isTrustedProofRequest,
} from '../trustedValidity';
import { computeSodHash } from '../documentVerify';

function baseId(overrides: Partial<StoredID> = {}): StoredID {
  const sod = Buffer.from('sod-bytes').toString('base64');
  return {
    id: 'id_test',
    createdAt: Date.now(),
    dg1: Buffer.from('dg1').toString('base64'),
    sod,
    sodHash: computeSodHash(sod),
    verifiedAt: Date.now() - 1000,
    documentType: 'passport',
    documentNumber: 'X123',
    firstName: 'Test',
    lastName: 'User',
    nationality: 'HUN',
    issuingCountry: 'HUN',
    dateOfBirth: '1990-01-01',
    expiryDate: '2030-01-01',
    gender: 'M',
    ...overrides,
  };
}

describe('isTrustedProofRequest', () => {
  it('detects validityMode trusted', () => {
    const req = { validityMode: 'trusted' } as ProofRequestPayload;
    expect(isTrustedProofRequest(req)).toBe(true);
  });

  it('detects verification scope', () => {
    const req = { service: { scope: 'verification:session-1' } } as ProofRequestPayload;
    expect(isTrustedProofRequest(req)).toBe(true);
  });
});

describe('assertTrustedSubmitReady', () => {
  it('throws when document not verified at scan', () => {
    const id = baseId({ verifiedAt: undefined });
    const req = { validityMode: 'trusted', service: { scope: 'verification:x' } } as ProofRequestPayload;
    expect(() => assertTrustedSubmitReady(id, req)).toThrow(/not verified at scan/i);
  });

  it('throws when sod integrity fails', () => {
    const id = baseId({ sodHash: 'deadbeef' });
    const req = { validityMode: 'trusted', service: { scope: 'verification:x' } } as ProofRequestPayload;
    expect(() => assertTrustedSubmitReady(id, req)).toThrow(/integrity/i);
  });
});

describe('isDocumentExpired', () => {
  it('marks past expiry as expired', () => {
    expect(isDocumentExpired('2000-01-01')).toBe(true);
    expect(isDocumentExpired('2099-12-31')).toBe(false);
  });
});

describe('assertSodIntegrity', () => {
  it('passes when sodHash matches current sod', () => {
    expect(() => assertSodIntegrity(baseId())).not.toThrow();
  });
});
