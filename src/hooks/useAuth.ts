import ReactNativeBiometrics from 'react-native-biometrics';

// Initialize biometrics with device credentials fallback (PIN/password)
const biometrics = new ReactNativeBiometrics({
  allowDeviceCredentials: true,
});

/**
 * Authenticates the user before a sensitive action (verification, viewing ID details, etc.).
 * Returns true if authentication succeeded, false otherwise.
 */
export async function authenticateUser(
  promptMessage = 'Authenticate to continue',
): Promise<boolean> {
  try {
    const {available} = await biometrics.isSensorAvailable();

    if (!available) {
      console.warn('[authenticateUser] No biometrics available');
      return true;
    }

    const {success, error} = await biometrics.simplePrompt({
      promptMessage,
      cancelButtonText: 'Cancel',
    });

    if (error) {
      console.error('[authenticateUser] Biometric prompt error:', error);
      return false;
    }

    return success;
  } catch (error: any) {
    console.error('[authenticateUser] Error:', error);
    return false;
  }
}
