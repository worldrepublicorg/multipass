import type {TurboModule} from 'react-native';
import {TurboModuleRegistry} from 'react-native';

export interface Spec extends TurboModule {
  scan(): Promise<{payload: string}>;
}

/** Lazy lookup — avoids getEnforcing at import time. */
export function getServerQrScanner(): Spec {
  return TurboModuleRegistry.getEnforcing<Spec>('ServerQrScanner');
}
