import pako from 'pako';

/**
 * Registry packaged circuits may ship `bytecode` as base64(gzip(program)) or base64(program).
 *
 * - **ACVM witness** (`solveCompressedWitness`): pass registry `bytecode` unchanged (gzip wire).
 * - **Barretenberg `circuitProve` / bbapi**: use `registryBytecodeToProveBytes` (decompressed ACIR).
 */
export function normalizeRegistryBytecodeToAcirBase64(registryBase64: string): string {
  const buf = Buffer.from(registryBase64, 'base64');
  const raw =
    buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b
      ? Buffer.from(pako.ungzip(new Uint8Array(buf)))
      : buf;
  return raw.toString('base64');
}

/** Decompressed ACIR bytes for native Barretenberg `CircuitProve`. */
export function registryBytecodeToProveBytes(registryBase64: string): Uint8Array {
  return new Uint8Array(Buffer.from(normalizeRegistryBytecodeToAcirBase64(registryBase64), 'base64'));
}

export function bytecodeWireFormat(bytes: Uint8Array): 'empty' | 'gzip' | 'acir' {
  if (bytes.length < 2) {return 'empty';}
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {return 'gzip';}
  return 'acir';
}

/** Witness from ACVM: gzip-wrapped or raw stack (mobile-only; server prove-inner removed). */
export function witnessWireFormat(bytes: Uint8Array): 'empty' | 'gzip' | 'stack' {
  if (bytes.length < 2) {return 'empty';}
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {return 'gzip';}
  return 'stack';
}

export function witnessBytesForProve(witnessWire: Uint8Array): Uint8Array {
  if (witnessWireFormat(witnessWire) === 'gzip') {
    return pako.ungzip(witnessWire);
  }
  return witnessWire;
}
