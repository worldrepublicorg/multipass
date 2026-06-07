import {TurboModuleRegistry} from 'react-native';

export {getEmrtdReader as getNfcReader} from '../../specs/NativeEmrtdReader';
export type {
  Spec as NfcReaderSpec,
  ScanOptions,
  ScanResult,
  NfcProgressEvent,
} from '../../specs/NativeEmrtdReader';

import type {Spec} from '../../specs/NativeEmrtdReader';

export function isNfcReaderAvailable(): boolean {
  return TurboModuleRegistry.get<Spec>('EmrtdReader') != null;
}
