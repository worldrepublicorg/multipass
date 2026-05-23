import pako from 'pako';
import { parseRegistryJsonBytes } from '../fetchPackagedCertificates';

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
