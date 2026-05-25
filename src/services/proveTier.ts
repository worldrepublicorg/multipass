/** When to run Barretenberg prove on server vs on-device JNI. */

const MANIFEST_SIZE_SERVER_THRESHOLD = 200_000;
const ACIR_BYTES_SERVER_THRESHOLD = 10_000_000;

export function normalizeProveInnerUrl(aggregateOrServiceBase: string): string {
	const trimmed = aggregateOrServiceBase.trim().replace(/\/$/, '');
	const base = trimmed.endsWith('/api/proofs/aggregate')
		? trimmed.replace(/\/api\/proofs\/aggregate$/, '')
		: trimmed.endsWith('/api/proofs/prove-inner')
			? trimmed.replace(/\/api\/proofs\/prove-inner$/, '')
			: trimmed;
	return `${base}/api/proofs/prove-inner`;
}

export function shouldProveInnerOnServer(
	circuitName: string,
	manifest: { circuits?: Record<string, { size?: number }> },
	acirByteLength: number,
	proveInnerUrl?: string | null,
): boolean {
	if (!proveInnerUrl?.trim()) {
		return false;
	}
	if (circuitName.includes('rsa_pkcs_4096')) {
		return true;
	}
	const manifestSize = Number(manifest?.circuits?.[circuitName]?.size || 0);
	if (manifestSize >= MANIFEST_SIZE_SERVER_THRESHOLD) {
		return true;
	}
	if (acirByteLength > ACIR_BYTES_SERVER_THRESHOLD) {
		return true;
	}
	return false;
}
