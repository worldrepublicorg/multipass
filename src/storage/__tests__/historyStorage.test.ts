import {
  getSignatureStatusDisplay,
  resolveFailureReason,
  type SignatureRecord,
} from '../historyStorage';

function baseRecord(overrides: Partial<SignatureRecord> = {}): SignatureRecord {
  return {
    id: 'sig_test',
    timestamp: Date.now(),
    serviceName: 'Test',
    success: true,
    durationMs: 1000,
    usedIdRef: 'id1',
    usedIdLabel: 'US Passport',
    ...overrides,
  };
}

describe('resolveFailureReason', () => {
  it('prefers duplicate over expired', () => {
    expect(resolveFailureReason({isDuplicate: true, isExpired: true})).toBe(
      'duplicate',
    );
  });

  it('returns expired when only expired', () => {
    expect(resolveFailureReason({isDuplicate: false, isExpired: true})).toBe(
      'expired',
    );
  });

  it('returns error otherwise', () => {
    expect(resolveFailureReason({isDuplicate: false, isExpired: false})).toBe(
      'error',
    );
  });
});

describe('getSignatureStatusDisplay', () => {
  it('shows success for completed records', () => {
    const display = getSignatureStatusDisplay(baseRecord({success: true}));
    expect(display.variant).toBe('success');
    expect(display.icon).toBe('✓');
  });

  it('shows warning for duplicate failures', () => {
    const display = getSignatureStatusDisplay(
      baseRecord({success: false, failureReason: 'duplicate'}),
    );
    expect(display.variant).toBe('warning');
    expect(display.shortLabel).toBe('Already used');
  });

  it('shows warning for expired failures', () => {
    const display = getSignatureStatusDisplay(
      baseRecord({success: false, failureReason: 'expired'}),
    );
    expect(display.variant).toBe('warning');
    expect(display.shortLabel).toBe('Expired');
  });

  it('shows failed for generic errors', () => {
    const display = getSignatureStatusDisplay(
      baseRecord({success: false, failureReason: 'error'}),
    );
    expect(display.variant).toBe('failed');
  });

  it('treats legacy failures without failureReason as error', () => {
    const display = getSignatureStatusDisplay(baseRecord({success: false}));
    expect(display.variant).toBe('failed');
    expect(display.shortLabel).toBe('Failed');
  });
});
