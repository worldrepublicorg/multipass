import {TurboModuleRegistry} from 'react-native';

export {getMrzScanner} from '../../specs/NativeMrzScanner';
export type {Spec as MrzScannerSpec} from '../../specs/NativeMrzScanner';

import type {Spec} from '../../specs/NativeMrzScanner';

export function isMrzScannerAvailable(): boolean {
  return TurboModuleRegistry.get<Spec>('MrzScanner') != null;
}
