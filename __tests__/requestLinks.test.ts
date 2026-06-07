import {MULTIPASS_REQUEST_KIND} from '../src/services/serverClient';
import {
  parseSessionRequestPayload,
  resolveSessionRequestPayload,
} from '../src/utils/requestLinks';
import {fetchSessionRequestPayload} from '../src/services/serverClient';

jest.mock('../src/services/serverClient', () => {
  const actual = jest.requireActual('../src/services/serverClient');
  return {
    ...actual,
    fetchSessionRequestPayload: jest.fn(),
  };
});

const mockedFetchSessionRequestPayload = jest.mocked(fetchSessionRequestPayload);

const MOCK_PAYLOAD = {
  kind: MULTIPASS_REQUEST_KIND,
  version: 1,
  submitUrl: 'https://www.worldrepublic.org/api/dev/multipass',
  sessionId: '69dc1a09ef71bbf1140d43e5',
};

describe('requestLinks', () => {
  beforeEach(() => {
    mockedFetchSessionRequestPayload.mockReset();
  });

  describe('parseSessionRequestPayload', () => {
    it('parses embedded request payload links locally', () => {
      const payload = {...MOCK_PAYLOAD};
      const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString(
        'base64url',
      );

      expect(
        parseSessionRequestPayload(
          `https://example.com/verify?request=${encoded}`,
        ),
      ).toEqual(payload);
      expect(mockedFetchSessionRequestPayload).not.toHaveBeenCalled();
    });

    it('requires submitUrl in embedded payloads', () => {
      const payload = {
        kind: MULTIPASS_REQUEST_KIND,
        version: 1,
        sessionId: '69dc1a09ef71bbf1140d43e5',
      };

      expect(() => parseSessionRequestPayload(JSON.stringify(payload))).toThrow(
        'Request payload is missing submitUrl',
      );
    });
  });

  describe('resolveSessionRequestPayload — session URLs', () => {
    it('fetches World Republic session JSON URLs', async () => {
      mockedFetchSessionRequestPayload.mockResolvedValue(MOCK_PAYLOAD as any);

      await resolveSessionRequestPayload(
        'https://www.worldrepublic.org/api/dev/multipass/sessions/69dc1a09ef71bbf1140d43e5',
      );

      expect(mockedFetchSessionRequestPayload).toHaveBeenCalledWith(
        'https://www.worldrepublic.org/api/dev/multipass/sessions/69dc1a09ef71bbf1140d43e5',
      );
    });
  });

  describe('resolveSessionRequestPayload — error cases', () => {
    it('throws on empty input', async () => {
      await expect(resolveSessionRequestPayload('')).rejects.toThrow(
        'Empty request payload',
      );
    });

    it('throws a clear error on plain non-URL text', async () => {
      await expect(
        resolveSessionRequestPayload('not a url or json'),
      ).rejects.toThrow('Request is neither valid JSON nor a valid URL');
    });
  });
});
