import type {RegistryClient} from '@zkpassport/registry';

import type {PackagedCertificatesFile} from '../fetchPackagedCertificates';
import {resolvePackagedCertificates} from '../resolvePackagedCertificates';

const bundledRoot =
  '0x1a46d2abb5609cb22b62fa3275c85adefbf798cdb41407122f36801d50dd527f';
const newerRoot =
  '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

const mockPack = {
  version: 0,
  timestamp: 0,
  root: bundledRoot,
  certificates: [{country: 'HUN'}],
  serialised: [['0xabc']],
} as PackagedCertificatesFile;

jest.mock('../registryBundledCerts', () => ({
  getBundledCertRoot: jest.fn(() => bundledRoot),
  loadBundledPackagedCertificates: jest.fn(async () => mockPack),
}));

jest.mock('../registryCertDiskCache', () => ({
  readCachedPack: jest.fn(async () => null),
  writeCachedPack: jest.fn(async () => {}),
  pruneDiskCache: jest.fn(async () => {}),
}));

jest.mock('../fetchPackagedCertificates', () => {
  const actual = jest.requireActual('../fetchPackagedCertificates');
  return {
    ...actual,
    fetchPackagedCertificateBytes: jest.fn(),
  };
});

const {getBundledCertRoot, loadBundledPackagedCertificates} =
  jest.requireMock('../registryBundledCerts');
const {readCachedPack, writeCachedPack, pruneDiskCache} = jest.requireMock(
  '../registryCertDiskCache',
);
const {fetchPackagedCertificateBytes} = jest.requireMock(
  '../fetchPackagedCertificates',
);

function mockRegistry(latestRoot: string): RegistryClient {
  return {
    getLatestCertificateRoot: jest.fn(async () => latestRoot),
  } as unknown as RegistryClient;
}

describe('resolvePackagedCertificates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getBundledCertRoot.mockReturnValue(bundledRoot);
    loadBundledPackagedCertificates.mockResolvedValue(mockPack);
    readCachedPack.mockResolvedValue(null);
  });

  it('uses bundled pack when RPC fails', async () => {
    const registry = {
      getLatestCertificateRoot: jest.fn(async () => {
        throw new Error('offline');
      }),
    } as unknown as RegistryClient;

    const result = await resolvePackagedCertificates(registry);

    expect(result.source).toBe('bundled-offline');
    expect(result.certRoot).toBe(bundledRoot);
    expect(result.packaged).toBe(mockPack);
    expect(fetchPackagedCertificateBytes).not.toHaveBeenCalled();
  });

  it('uses bundled pack when latest root matches bundled root', async () => {
    const result = await resolvePackagedCertificates(mockRegistry(bundledRoot));

    expect(result.source).toBe('bundled');
    expect(result.certRoot).toBe(bundledRoot);
    expect(fetchPackagedCertificateBytes).not.toHaveBeenCalled();
    expect(readCachedPack).not.toHaveBeenCalled();
  });

  it('uses disk cache when latest root differs and cache hits', async () => {
    const cached = {
      version: 0,
      timestamp: 0,
      root: newerRoot,
      certificates: [{country: 'DEU'}],
      serialised: [['0xdef']],
    } as PackagedCertificatesFile;
    readCachedPack.mockResolvedValueOnce(cached);

    const result = await resolvePackagedCertificates(mockRegistry(newerRoot));

    expect(result.source).toBe('disk');
    expect(result.certRoot).toBe(newerRoot);
    expect(result.packaged).toBe(cached);
    expect(fetchPackagedCertificateBytes).not.toHaveBeenCalled();
    expect(pruneDiskCache).toHaveBeenCalledWith([bundledRoot, newerRoot]);
  });

  it('fetches network pack when root differs and no disk cache', async () => {
    const networkPack = {
      version: 0,
      timestamp: 0,
      root: newerRoot,
      certificates: [{country: 'USA'}],
      serialised: [['0x999']],
    } as PackagedCertificatesFile;
    fetchPackagedCertificateBytes.mockResolvedValueOnce({
      bytes: new Uint8Array([1, 2, 3]),
      pack: networkPack,
    });

    const result = await resolvePackagedCertificates(mockRegistry(newerRoot));

    expect(result.source).toBe('network');
    expect(result.certRoot).toBe(newerRoot);
    expect(result.packaged).toBe(networkPack);
    expect(writeCachedPack).toHaveBeenCalledWith(
      newerRoot,
      expect.any(Uint8Array),
    );
    expect(pruneDiskCache).toHaveBeenCalledWith([bundledRoot, newerRoot]);
  });

  it('falls back to bundled when fetch fails for newer root', async () => {
    fetchPackagedCertificateBytes.mockRejectedValueOnce(
      new Error('CDN down'),
    );

    const result = await resolvePackagedCertificates(mockRegistry(newerRoot));

    expect(result.source).toBe('bundled-fallback');
    expect(result.certRoot).toBe(bundledRoot);
    expect(result.packaged).toBe(mockPack);
  });
});
