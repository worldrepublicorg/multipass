import type {TurboModule} from 'react-native';
import {TurboModuleRegistry} from 'react-native';

export interface Spec extends TurboModule {
  readGzipBase64(): Promise<string>;
}

export function getRegistryBundledCerts(): Spec | null {
  return TurboModuleRegistry.get<Spec>('RegistryBundledCerts');
}
