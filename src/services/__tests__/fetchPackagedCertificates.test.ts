import pako from 'pako';
import {
  normalizePackagedCertificates,
  parseRegistryJsonBytes,
} from '../fetchPackagedCertificates';

describe('parseRegistryJsonBytes', () => {
  it('parses plain JSON', () => {
    const payload = { certificates: [{}], serialised: [1] };
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    expect(parseRegistryJsonBytes(bytes)).toEqual(payload);
  });

  it('parses gzip-wrapped JSON like zkPassport IPFS/CDN', () => {
    const payload = { certificates: [{}], serialised: [1] };
    const gz = pako.gzip(new TextEncoder().encode(JSON.stringify(payload)));
    expect(parseRegistryJsonBytes(gz)).toEqual(payload);
  });
});

describe('normalizePackagedCertificates', () => {
  it('maps IPFS certificates_serialised to serialised', () => {
    const raw = { certificates: [{ country: 'HUN' }], certificates_serialised: [['0xabc']] };
    expect(normalizePackagedCertificates(raw)).toEqual({
      certificates: [{ country: 'HUN' }],
      certificates_serialised: [['0xabc']],
      serialised: [['0xabc']],
    });
  });

  it('leaves CDN shape unchanged', () => {
    const raw = { certificates: [{}], serialised: [['0xdef']] };
    expect(normalizePackagedCertificates(raw)).toBe(raw);
  });
});
