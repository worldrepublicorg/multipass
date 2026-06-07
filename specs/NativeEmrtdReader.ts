import type {TurboModule} from 'react-native';
import {TurboModuleRegistry} from 'react-native';

export interface ScanOptions {
  documentNumber: string;
  dateOfBirth: string;
  dateOfExpiry: string;
}

export interface ScanResult {
  dg1: string;
  sod: string;
  mrz?: string;
  dg2?: string;
  dg7?: string;
  dg11?: string;
  dg12?: string;
  dg13?: string;
  dg14?: string;
  dg15?: string;
  dg1Length?: number;
  sodLength?: number;
  fullScan?: boolean;
}

export interface NfcProgressEvent {
  step: string;
  percent: number;
  message: string;
}

export interface Spec extends TurboModule {
  scan(opts: ScanOptions): Promise<ScanResult>;
  scanAll(opts: ScanOptions): Promise<ScanResult>;
  cancelCurrentScan(): Promise<null>;
  /** Required for NativeEventEmitter with TurboModules. */
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

export function getEmrtdReader(): Spec {
  return TurboModuleRegistry.getEnforcing<Spec>('EmrtdReader');
}
