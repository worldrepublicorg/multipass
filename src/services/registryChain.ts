/** zkPassport registry chain (Ethereum mainnet). */
export const REGISTRY_CHAIN_ID = 1;

export function normalizeCertRoot(root: string): string {
  const trimmed = String(root || '').trim().toLowerCase();
  if (!trimmed) {
    return '';
  }
  return trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`;
}
