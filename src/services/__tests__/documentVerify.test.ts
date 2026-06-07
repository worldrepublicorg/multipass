import {
  DocumentVerifyError,
  computeSodHash,
  plainVerifyDocument,
} from '../documentVerify';
import {deriveNullifier} from '../validity';

describe('computeSodHash', () => {
  it('returns stable sha256 hex for the same SOD bytes', () => {
    const sod = Buffer.from('test-sod-bytes').toString('base64');
    expect(computeSodHash(sod)).toBe(computeSodHash(sod));
    expect(computeSodHash(sod)).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('plainVerifyDocument', () => {
  it('rejects missing dg1/sod', async () => {
    await expect(plainVerifyDocument('', '')).rejects.toThrow(
      DocumentVerifyError,
    );
  });

  it('rejects invalid base64 SOD', async () => {
    const dg1 = Buffer.from('not-a-document').toString('base64');
    await expect(plainVerifyDocument(dg1, '!!!')).rejects.toThrow(
      DocumentVerifyError,
    );
  });
});

describe('deriveNullifier', () => {
  it('is stable per scope and document', () => {
    const sod = Buffer.from('chip-sod').toString('base64');
    const a = deriveNullifier('account', sod);
    const b = deriveNullifier('account', sod);
    const c = deriveNullifier('election:election-b', sod);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a.startsWith('0x')).toBe(true);
  });
});
