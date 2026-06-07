import pako from 'pako';
import {Platform} from 'react-native';
import RNFS from 'react-native-fs';

import {
  clearBundledPackagedCertificatesCache,
  loadBundledPackagedCertificates,
  setBundledPackagedCertificatesForTests,
} from '../registryBundledCerts';
import type {PackagedCertificatesFile} from '../fetchPackagedCertificates';
import {
  isRegistryBundledCertsNativeAvailable,
  readBundledRegistryGzipBase64,
} from '../../native/registryBundledCertsNative';

jest.mock('../../native/registryBundledCertsNative', () => ({
  isRegistryBundledCertsNativeAvailable: jest.fn(),
  readBundledRegistryGzipBase64: jest.fn(),
}));

const mockIsNative = isRegistryBundledCertsNativeAvailable as jest.Mock;
const mockReadNative = readBundledRegistryGzipBase64 as jest.Mock;
const mockExistsAssets = RNFS.existsAssets as jest.Mock;
const mockReadFileAssets = RNFS.readFileAssets as jest.Mock;

describe('loadBundledPackagedCertificates', () => {
  const platformOs = Platform.OS;

  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', {value: 'android'});
    clearBundledPackagedCertificatesCache();
    mockIsNative.mockReturnValue(false);
    mockReadNative.mockReset();
    mockExistsAssets.mockReset();
    mockReadFileAssets.mockReset();
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {value: platformOs});
  });

  it('loads from native Android asset reader when available', async () => {
    const payload = {certificates: [{country: 'HUN'}], serialised: [['0x1']]};
    const gzip = pako.gzip(new TextEncoder().encode(JSON.stringify(payload)));
    mockIsNative.mockReturnValue(true);
    mockReadNative.mockResolvedValue(Buffer.from(gzip).toString('base64'));

    const pack = await loadBundledPackagedCertificates();

    expect(mockReadNative).toHaveBeenCalled();
    expect(pack.certificates).toHaveLength(1);
    expect(
      pack.version === 1 ? pack.certificates_serialised : pack.serialised,
    ).toEqual([['0x1']]);
  });

  it('falls back to RNFS readFileAssets when native reader is unavailable', async () => {
    const payload = {certificates: [{country: 'DEU'}], serialised: [['0x3']]};
    const gzip = pako.gzip(new TextEncoder().encode(JSON.stringify(payload)));
    mockExistsAssets.mockImplementation(async (assetPath: string) =>
      assetPath === 'registry/mainnet-certs.json',
    );
    mockReadFileAssets.mockResolvedValue(Buffer.from(gzip).toString('base64'));

    const pack = await loadBundledPackagedCertificates();

    expect(mockReadFileAssets).toHaveBeenCalledWith(
      'registry/mainnet-certs.json',
      'base64',
    );
    expect(pack.certificates).toHaveLength(1);
  });

  it('uses injected pack in tests without asset IO', async () => {
    setBundledPackagedCertificatesForTests({
      version: 0,
      timestamp: 0,
      root: '0x0',
      certificates: [{country: 'USA'}],
      serialised: [['0x2']],
    } as PackagedCertificatesFile);

    const pack = await loadBundledPackagedCertificates();

    expect(pack.certificates[0]).toEqual({country: 'USA'});
    expect(mockReadNative).not.toHaveBeenCalled();
  });
});
