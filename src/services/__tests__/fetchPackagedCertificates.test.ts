import pako from 'pako';
import {RegistryClient} from '@zkpassport/registry';
import type {RegistryClient as RegistryClientType} from '@zkpassport/registry';
import {
  fetchPackagedCertificateBytes,
  normalizePackagedCertificates,
  parseRegistryJsonBytes,
  validatePackagedCertificatesAgainstRoot,
  type PackagedCertificatesFile,
} from '../fetchPackagedCertificates';

jest.mock('@zkpassport/registry', () => ({
  RegistryClient: {
    validateCertificates: jest.fn(),
  },
}));

const validateCertificates = RegistryClient.validateCertificates as jest.Mock;

const certRoot =
  '0x1a46d2abb5609cb22b62fa3275c85adefbf798cdb41407122f36801d50dd527f';
const mockPack = {
  version: 0,
  timestamp: 0,
  root: certRoot,
  certificates: [{country: 'HUN'}],
  serialised: [['0xabc']],
} as PackagedCertificatesFile;

describe('parseRegistryJsonBytes', () => {
  it('parses plain JSON', () => {
    const payload = {certificates: [{}], serialised: [1]};
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    expect(parseRegistryJsonBytes(bytes)).toEqual(payload);
  });

  it('parses gzip-wrapped JSON like zkPassport IPFS/CDN', () => {
    const payload = {certificates: [{}], serialised: [1]};
    const gz = pako.gzip(new TextEncoder().encode(JSON.stringify(payload)));
    expect(parseRegistryJsonBytes(gz)).toEqual(payload);
  });
});

describe('normalizePackagedCertificates', () => {
  it('maps IPFS certificates_serialised to serialised', () => {
    const raw = {
      certificates: [{country: 'HUN'}],
      certificates_serialised: [['0xabc']],
    };
    expect(normalizePackagedCertificates(raw)).toEqual({
      certificates: [{country: 'HUN'}],
      certificates_serialised: [['0xabc']],
      serialised: [['0xabc']],
    });
  });

  it('leaves CDN shape unchanged', () => {
    const raw = {certificates: [{}], serialised: [['0xdef']]};
    expect(normalizePackagedCertificates(raw)).toBe(raw);
  });
});

describe('validatePackagedCertificatesAgainstRoot', () => {
  beforeEach(() => {
    validateCertificates.mockReset();
  });

  it('resolves when SDK validation passes', async () => {
    validateCertificates.mockResolvedValueOnce(true);
    await expect(
      validatePackagedCertificatesAgainstRoot(mockPack, certRoot),
    ).resolves.toBeUndefined();
    expect(validateCertificates).toHaveBeenCalledWith(mockPack, certRoot);
  });

  it('throws when SDK validation fails', async () => {
    validateCertificates.mockResolvedValueOnce(false);
    await expect(
      validatePackagedCertificatesAgainstRoot(mockPack, certRoot),
    ).rejects.toThrow(/do not match registry root/);
  });
});

describe('fetchPackagedCertificateBytes', () => {
  beforeEach(() => {
    validateCertificates.mockReset();
  });

  it('requests CDN certs with validate: true', async () => {
    const registry = {
      getCertificates: jest.fn(async () => mockPack),
      getCertificateRootDetails: jest.fn(),
      getUrlForPackagedCertificates: jest.fn(),
    };

    const result = await fetchPackagedCertificateBytes(
      registry as unknown as RegistryClientType,
      certRoot,
    );

    expect(registry.getCertificates).toHaveBeenCalledWith(certRoot, {
      validate: true,
    });
    expect(result.pack).toEqual(mockPack);
    expect(result.bytes.length).toBeGreaterThan(0);
  });

  it('validates IPFS fallback against root', async () => {
    const gz = pako.gzip(new TextEncoder().encode(JSON.stringify(mockPack)));
    const registry = {
      getCertificates: jest.fn(async () => {
        throw new Error('CDN down');
      }),
      getCertificateRootDetails: jest.fn(async () => ({cid: 'QmTest'})),
      getUrlForPackagedCertificates: jest.fn(
        () => 'https://ipfs.example/cert.gz',
      ),
    };
    global.fetch = jest.fn(async () => ({
      ok: true,
      arrayBuffer: async () => gz.buffer,
    })) as jest.Mock;
    validateCertificates.mockResolvedValueOnce(true);

    const result = await fetchPackagedCertificateBytes(
      registry as unknown as RegistryClientType,
      certRoot,
    );

    expect(validateCertificates).toHaveBeenCalledWith(mockPack, certRoot);
    expect(result.pack).toEqual(mockPack);
  });
});
