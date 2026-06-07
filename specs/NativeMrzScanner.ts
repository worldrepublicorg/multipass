import type {TurboModule} from 'react-native';
import {TurboModuleRegistry} from 'react-native';

export interface Spec extends TurboModule {
  scan(): Promise<{
    documentNumber: string;
    dateOfBirth: string;
    dateOfExpiry: string;
  }>;
}

export function getMrzScanner(): Spec {
  return TurboModuleRegistry.getEnforcing<Spec>('MrzScanner');
}
