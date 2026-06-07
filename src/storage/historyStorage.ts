import EncryptedStorage from 'react-native-encrypted-storage';

const HISTORY_STORAGE_KEY = 'multipass_signature_history';

/** Why a record has success: false (omitted on successful submits). */
export type SignatureFailureReason = 'duplicate' | 'expired' | 'error';

export interface SignatureRecord {
  id: string;
  timestamp: number;
  serviceName: string;
  serviceUrl?: string;
  sessionId?: string;
  purpose?: string;
  success: boolean;
  /** Present when success is false; distinguishes expected vs unexpected failures. */
  failureReason?: SignatureFailureReason;
  nullifier?: string;
  durationMs: number;
  usedIdRef: string;
  usedIdLabel: string;
}

export type SignatureStatusVariant = 'success' | 'failed' | 'warning';

export interface SignatureStatusDisplay {
  icon: string;
  shortLabel: string;
  detailLabel: string;
  variant: SignatureStatusVariant;
}

const FAILURE_DETAIL_LABELS: Record<SignatureFailureReason, string> = {
  duplicate: 'This document was used before for this action',
  expired: 'Document not valid for verification',
  error: 'Try again or contact support',
};

export function resolveFailureReason(options: {
  isDuplicate: boolean;
  isExpired: boolean;
}): SignatureFailureReason {
  if (options.isDuplicate) {
    return 'duplicate';
  }
  if (options.isExpired) {
    return 'expired';
  }
  return 'error';
}

export function getSignatureStatusDisplay(
  record: SignatureRecord,
): SignatureStatusDisplay {
  if (record.success) {
    return {
      icon: '✓',
      shortLabel: 'Completed',
      detailLabel: 'Verification completed successfully',
      variant: 'success',
    };
  }

  switch (record.failureReason) {
    case 'duplicate':
      return {
        icon: '↻',
        shortLabel: 'Already used',
        detailLabel: FAILURE_DETAIL_LABELS.duplicate,
        variant: 'warning',
      };
    case 'expired':
      return {
        icon: '📅',
        shortLabel: 'Expired',
        detailLabel: FAILURE_DETAIL_LABELS.expired,
        variant: 'warning',
      };
    default:
      return {
        icon: '✕',
        shortLabel: 'Failed',
        detailLabel: FAILURE_DETAIL_LABELS.error,
        variant: 'failed',
      };
  }
}

export async function getAllSignatures(): Promise<SignatureRecord[]> {
  try {
    const data = await EncryptedStorage.getItem(HISTORY_STORAGE_KEY);
    if (!data) {
      console.log('[historyStorage] No history found');
      return [];
    }
    const records = JSON.parse(data) as SignatureRecord[];
    console.log('[historyStorage] Loaded', records.length, 'signatures');
    return records.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('[historyStorage] Failed to read history:', error);
    return [];
  }
}

export async function getSignatureById(
  id: string,
): Promise<SignatureRecord | null> {
  const records = await getAllSignatures();
  return records.find(item => item.id === id) || null;
}

export async function saveSignature(record: SignatureRecord): Promise<void> {
  try {
    console.log(
      '[historyStorage] Saving signature:',
      record.id,
      record.serviceName,
    );
    const records = await getAllSignatures();
    const existingIndex = records.findIndex(item => item.id === record.id);
    if (existingIndex >= 0) {
      records[existingIndex] = record;
    } else {
      records.unshift(record);
    }
    const trimmed = records.slice(0, 100);
    await EncryptedStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify(trimmed),
    );
    console.log(
      '[historyStorage] Signature saved successfully, total:',
      trimmed.length,
    );
  } catch (error) {
    console.error('[historyStorage] Failed to save signature:', error);
    throw error;
  }
}

export async function deleteSignature(id: string): Promise<void> {
  try {
    const records = await getAllSignatures();
    const filtered = records.filter(item => item.id !== id);
    await EncryptedStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify(filtered),
    );
  } catch (error) {
    console.error('[historyStorage] Failed to delete signature:', error);
    throw error;
  }
}

export async function clearHistory(): Promise<void> {
  try {
    await EncryptedStorage.removeItem(HISTORY_STORAGE_KEY);
  } catch (error) {
    console.error('[historyStorage] Failed to clear history:', error);
    throw error;
  }
}

export function generateSignatureId(): string {
  return `sig_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function groupSignaturesByDate(
  records: SignatureRecord[],
): Map<string, SignatureRecord[]> {
  const groups = new Map<string, SignatureRecord[]>();
  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const yesterday = today - 86400000;

  for (const record of records) {
    const recordDate = new Date(record.timestamp);
    const recordDay = new Date(
      recordDate.getFullYear(),
      recordDate.getMonth(),
      recordDate.getDate(),
    ).getTime();

    let key: string;
    if (recordDay >= today) {
      key = 'Today';
    } else if (recordDay >= yesterday) {
      key = 'Yesterday';
    } else {
      key = recordDate.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });
    }

    const existing = groups.get(key) || [];
    existing.push(record);
    groups.set(key, existing);
  }

  return groups;
}
