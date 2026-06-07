import {alertIcons, showSimpleAlert} from '../components/common/alertHelpers';
import {
  getServerQrScanner,
  isServerQrScannerAvailable,
} from '../native/serverQrScanner';
import {navigateToVerificationRequest} from '../navigation/rootNavigation';
import {
  isSupportedSessionRequest,
  unsupportedSessionMessage,
} from '../services/validity';
import {resolveSessionRequestPayload} from './requestLinks';

export function isQrScanCancelled(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' &&
          error != null &&
          'message' in error
        ? String((error as {message?: unknown}).message)
        : '';
  return message.includes('cancelled');
}

/** Opens native QR scanner (Android) and starts verification when a session is read. */
export async function openSessionFromQrScan(): Promise<void> {
  if (!isServerQrScannerAvailable()) {
    throw new Error('QR scanner is not available on this device');
  }

  const result = await getServerQrScanner().scan();
  const payload = await resolveSessionRequestPayload(result?.payload || '');

  if (!isSupportedSessionRequest(payload)) {
    const unsupported = unsupportedSessionMessage();
    showSimpleAlert({
      title: unsupported.title,
      message: unsupported.detail,
      icon: alertIcons.unsupported,
    });
    return;
  }

  navigateToVerificationRequest(payload);
}
