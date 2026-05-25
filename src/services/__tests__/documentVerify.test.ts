import { DocumentVerifyError, computeSodHash, plainVerifyPassport } from '../documentVerify';
import { deriveTrustedNullifier } from '../trustedValidity';

describe('computeSodHash', () => {
  it('returns stable sha256 hex for the same SOD bytes', () => {
    const sod = Buffer.from('test-sod-bytes').toString('base64');
    expect(computeSodHash(sod)).toBe(computeSodHash(sod));
    expect(computeSodHash(sod)).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('plainVerifyPassport', () => {
  it('rejects missing dg1/sod', async () => {
    await expect(plainVerifyPassport('', '')).rejects.toThrow(DocumentVerifyError);
  });

  it('rejects invalid base64 SOD', async () => {
    const dg1 = Buffer.from('not-a-passport').toString('base64');
    await expect(plainVerifyPassport(dg1, '!!!')).rejects.toThrow(DocumentVerifyError);
  });
});

describe('deriveTrustedNullifier', () => {
  it('is stable per scope and document', () => {
    const sod = Buffer.from('chip-sod').toString('base64');
    const a = deriveTrustedNullifier('verification:abc', sod);
    const b = deriveTrustedNullifier('verification:abc', sod);
    const c = deriveTrustedNullifier('verification:xyz', sod);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a.startsWith('0x')).toBe(true);
  });
});
