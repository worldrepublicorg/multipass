import type {StoredID} from '../../storage/idStorage';
import type {SessionRequestPayload} from '../serverClient';
import {
  MULTIPASS_ACCOUNT_SCOPE,
  assertSodIntegrity,
  assertSubmitReady,
  deriveNullifier,
  duplicateSubmitMessage,
  humanizeScope,
  isDocumentExpired,
  isExpiredDocumentError,
  isSupportedSessionRequest,
  multipassElectionScope,
  resolveScope,
} from '../validity';
import {computeSodHash} from '../documentVerify';

function baseId(overrides: Partial<StoredID> = {}): StoredID {
  const sod = Buffer.from('sod-bytes').toString('base64');
  return {
    id: 'id_test',
    createdAt: Date.now(),
    dg1: Buffer.from('dg1').toString('base64'),
    sod,
    sodHash: computeSodHash(sod),
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

describe('isSupportedSessionRequest', () => {
  it('detects account scope', () => {
    const req = {service: {scope: 'account'}} as SessionRequestPayload;
    expect(isSupportedSessionRequest(req)).toBe(true);
  });

  it('detects election scope', () => {
    const req = {
      service: {scope: 'election:11111111-1111-4111-a111-111111111101'},
    } as SessionRequestPayload;
    expect(isSupportedSessionRequest(req)).toBe(true);
  });

  it('rejects legacy verification:session scope', () => {
    const req = {
      service: {scope: 'verification:session-1'},
    } as SessionRequestPayload;
    expect(isSupportedSessionRequest(req)).toBe(false);
  });
});

describe('resolveScope', () => {
  it('returns account scope', () => {
    const req = {
      service: {scope: MULTIPASS_ACCOUNT_SCOPE},
    } as SessionRequestPayload;
    expect(resolveScope(req)).toBe('account');
  });

  it('returns election scope', () => {
    const scope = multipassElectionScope(
      '11111111-1111-4111-a111-111111111101',
    );
    const req = {service: {scope}} as SessionRequestPayload;
    expect(resolveScope(req)).toBe(scope);
  });
});

describe('deriveNullifier', () => {
  it('same doc + account scope is stable', () => {
    const sod = Buffer.from('same-sod').toString('base64');
    const a = deriveNullifier('account', sod);
    const b = deriveNullifier('account', sod);
    expect(a).toBe(b);
  });

  it('same doc + different elections produce different nullifiers', () => {
    const sod = Buffer.from('same-sod').toString('base64');
    const a = deriveNullifier('election:election-a', sod);
    const b = deriveNullifier('election:election-b', sod);
    expect(a).not.toBe(b);
  });
});

describe('assertSubmitReady', () => {
  it('throws when sod integrity metadata is missing', () => {
    const id = baseId({sodHash: undefined});
    const req = {service: {scope: 'account'}} as SessionRequestPayload;
    expect(() => assertSubmitReady(id, req)).toThrow(
      /integrity metadata is missing/i,
    );
  });

  it('throws when sod integrity fails', () => {
    const id = baseId({sodHash: 'deadbeef'});
    const req = {service: {scope: 'account'}} as SessionRequestPayload;
    expect(() => assertSubmitReady(id, req)).toThrow(/integrity/i);
  });

  it('throws when document is expired', () => {
    const id = baseId({expiryDate: '2000-01-01'});
    const req = {service: {scope: 'account'}} as SessionRequestPayload;
    expect(() => assertSubmitReady(id, req)).toThrow(/expired/i);
  });
});

describe('humanizeScope', () => {
  it('labels account scope', () => {
    expect(humanizeScope('account')).toBe('Account verification');
  });

  it('labels election scope', () => {
    expect(
      humanizeScope('election:11111111-1111-4111-a111-111111111101'),
    ).toBe('Election vote');
  });

  it('falls back for unknown scope', () => {
    expect(humanizeScope('other')).toBe('Verification');
  });
});

describe('duplicateSubmitMessage', () => {
  it('returns account-specific copy', () => {
    const copy = duplicateSubmitMessage('account');
    expect(copy.title).toBe('Document already linked');
    expect(copy.detail).toContain('another account');
  });

  it('returns election-specific copy', () => {
    const copy = duplicateSubmitMessage(
      'election:11111111-1111-4111-a111-111111111101',
    );
    expect(copy.title).toBe('Already voted');
    expect(copy.detail).toContain('this election');
  });
});

describe('isDocumentExpired', () => {
  it('marks past expiry as expired', () => {
    expect(isDocumentExpired('2000-01-01')).toBe(true);
    expect(isDocumentExpired('2099-12-31')).toBe(false);
  });
});

describe('isExpiredDocumentError', () => {
  it('detects expired document errors', () => {
    expect(isExpiredDocumentError(new Error('Document is expired'))).toBe(true);
    expect(isExpiredDocumentError(new Error('Network error'))).toBe(false);
  });
});

describe('assertSodIntegrity', () => {
  it('passes when sodHash matches current sod', () => {
    expect(() => assertSodIntegrity(baseId())).not.toThrow();
  });
});
