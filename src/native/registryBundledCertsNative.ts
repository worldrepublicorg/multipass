import {Platform} from 'react-native';

import {
  getRegistryBundledCerts,
  type Spec,
} from '../../specs/NativeRegistryBundledCerts';

function moduleOrNull(): Spec | null {
  if (Platform.OS !== 'android') {
    return null;
  }
  return getRegistryBundledCerts();
}

export function isRegistryBundledCertsNativeAvailable(): boolean {
  return moduleOrNull()?.readGzipBase64 != null;
}

export async function readBundledRegistryGzipBase64(): Promise<string> {
  const mod = moduleOrNull();
  if (!mod?.readGzipBase64) {
    throw new Error('RegistryBundledCerts native module is not available');
  }
  return mod.readGzipBase64();
}
