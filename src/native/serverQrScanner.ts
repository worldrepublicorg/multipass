import {TurboModuleRegistry} from 'react-native';

export {getServerQrScanner} from '../../specs/NativeServerQrScanner';
export type {Spec as ServerQrScannerSpec} from '../../specs/NativeServerQrScanner';

import type {Spec} from '../../specs/NativeServerQrScanner';

export function isServerQrScannerAvailable(): boolean {
  return TurboModuleRegistry.get<Spec>('ServerQrScanner') != null;
}
