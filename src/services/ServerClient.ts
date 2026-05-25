import { Buffer } from 'buffer';
import type { InnerProofPackage, ProofResult } from './ProofGenerator';
import { normalizeProveInnerUrl } from './proveTier';

function jsonStringifySafe(value: unknown): string {
  return JSON.stringify(value, (_k, v) => (typeof v === 'bigint' ? `0x${v.toString(16)}` : v));
}

export interface ProofRequestPayload {
  kind: string;
  version: number;
  aggregateUrl: string;
  proveInnerUrl?: string;
  petitionId?: string;
  /** Path A: trusted validity submit (nullifier only, no ZK package). */
  validityMode?: 'trusted' | 'zk';
  service?: {
    name?: string;
    logo?: string;
    purpose?: string;
    scope?: string;
    mode?: string;
    devMode?: boolean;
    domain?: string;
  };
  query?: Record<string, any>;
}

export type TrustedValiditySubmitBody = {
  validityMode: 'trusted';
  nullifier: string;
  scope: string;
  request?: { petitionId?: string };
};

function normalizeAggregateUrl(value: string): string {
  const trimmed = value.trim().replace(/\/$/, '');
  if (trimmed.endsWith('/api/proofs/aggregate')) {
    return trimmed;
  }
  return `${trimmed}/api/proofs/aggregate`;
}

function baseUrlFromAggregate(value: string): string {
  return normalizeAggregateUrl(value).replace(/\/api\/proofs\/aggregate$/, '');
}

export interface ServerHealthStatus {
  url: string;
  status: string;
  service?: string;
}

export async function fetchProofRequestPayload(requestUrl: string): Promise<ProofRequestPayload> {
  const trimmed = String(requestUrl || '').trim();
  if (!trimmed) {
    throw new Error('Request link is empty');
  }

  // Validate with a string check — avoid URL object property access which throws
  // "not implemented" in React Native (same constraint as requestLinks.ts).
  const lower = trimmed.toLowerCase();
  if (!lower.startsWith('http://') && !lower.startsWith('https://')) {
    throw new Error('Request link is not a valid URL');
  }

  const resp = await fetch(trimmed, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  const text = await resp.text();
  let body: any = {};
  try { body = text ? JSON.parse(text) : {}; } catch {
    throw new Error(`Request link returned non-JSON response (${resp.status}): ${text.slice(0, 200)}`);
  }
  if (!resp.ok) {
    throw new Error(body?.error || body?.message || `Request link failed (${resp.status})`);
  }
  if (!body || typeof body !== 'object') {
    throw new Error('Request link did not return a valid JSON payload');
  }
  if (!body.aggregateUrl || typeof body.aggregateUrl !== 'string') {
    throw new Error('Request payload is missing aggregateUrl');
  }
  return body as ProofRequestPayload;
}

export async function pingServerHealth(baseUrl: string): Promise<ServerHealthStatus> {
  const url = `${baseUrlFromAggregate(baseUrl)}/api/health`;
  const resp = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  const text = await resp.text();
  let body: any = {};
  try { body = text ? JSON.parse(text) : {}; } catch {
    throw new Error(`Health endpoint returned non-JSON response (${resp.status}): ${text.slice(0, 200)}`);
  }
  if (!resp.ok) {
    throw new Error(body?.error || body?.message || `Health check failed (${resp.status})`);
  }
  if (body?.status !== 'ok') {
    throw new Error(`Unexpected health response from server: ${JSON.stringify(body)}`);
  }
  return {
    url,
    status: String(body.status || 'ok'),
    service: body?.service ? String(body.service) : undefined,
  };
}

export class DuplicateSignatureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DuplicateSignatureError';
  }
}

export class ServerError extends Error {
  public statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'ServerError';
    this.statusCode = statusCode;
  }
}

export async function submitTrustedValidityOnServer(
  baseUrl: string,
  body: TrustedValiditySubmitBody,
): Promise<ProofResult> {
  const url = normalizeAggregateUrl(baseUrl);
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await resp.text();
  let parsed: any = {};
  try { parsed = text ? JSON.parse(text) : {}; } catch {
    throw new ServerError(`Server returned non-JSON response (${resp.status}): ${text.slice(0, 300)}`, resp.status);
  }
  if (!resp.ok) {
    const errorMsg = parsed?.error || parsed?.message || `Trusted submit failed (${resp.status})`;
    if (resp.status === 409 || errorMsg.toLowerCase().includes('already exists') || errorMsg.toLowerCase().includes('duplicate')) {
      throw new DuplicateSignatureError(errorMsg);
    }
    throw new ServerError(errorMsg, resp.status);
  }
  return parsed as ProofResult;
}

export async function aggregateProofOnServer(baseUrl: string, inner: InnerProofPackage, request?: ProofRequestPayload | null): Promise<ProofResult> {
  const url = normalizeAggregateUrl(baseUrl);
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: jsonStringifySafe({ ...inner, request }),
  });
  const text = await resp.text();
  let body: any = {};
  try { body = text ? JSON.parse(text) : {}; } catch {
    throw new ServerError(`Server returned non-JSON response (${resp.status}): ${text.slice(0, 300)}`, resp.status);
  }
  if (!resp.ok) {
    const errorMsg = body?.error || body?.message || `Aggregation failed (${resp.status})`;
    // Check for duplicate signature (HTTP 409 Conflict)
    if (resp.status === 409 || errorMsg.toLowerCase().includes('already exists') || errorMsg.toLowerCase().includes('duplicate')) {
      throw new DuplicateSignatureError(errorMsg);
    }
    throw new ServerError(errorMsg, resp.status);
  }
  return body as ProofResult;
}

export interface ProveInnerServerParams {
  circuitName: string;
  circuitVersion: string;
  witness: Uint8Array;
}

export interface ProveInnerServerResult {
  proof: string[];
  publicInputs: string[];
}

function resolveProveInnerUrl(
  proveInnerUrl: string | undefined,
  aggregateUrl: string | undefined,
): string {
  const explicit = proveInnerUrl?.trim();
  if (explicit) {
    return explicit;
  }
  if (aggregateUrl?.trim()) {
    return normalizeProveInnerUrl(aggregateUrl);
  }
  throw new Error('proveInnerUrl is missing (and aggregateUrl could not be used to derive it)');
}

export async function proveInnerOnServer(
  proveInnerUrl: string | undefined,
  aggregateUrl: string | undefined,
  params: ProveInnerServerParams,
): Promise<ProveInnerServerResult> {
  const url = resolveProveInnerUrl(proveInnerUrl, aggregateUrl);
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      circuitName: params.circuitName,
      circuitVersion: params.circuitVersion,
      witness: Buffer.from(params.witness).toString('base64'),
    }),
  });
  const text = await resp.text();
  let body: any = {};
  try { body = text ? JSON.parse(text) : {}; } catch {
    throw new ServerError(`Prove-inner returned non-JSON (${resp.status}): ${text.slice(0, 300)}`, resp.status);
  }
  if (!resp.ok) {
    throw new ServerError(body?.error || body?.message || `Prove-inner failed (${resp.status})`, resp.status);
  }
  if (!Array.isArray(body?.proof) || !Array.isArray(body?.publicInputs)) {
    throw new ServerError('Prove-inner response missing proof/publicInputs arrays', resp.status);
  }
  return {
    proof: body.proof,
    publicInputs: body.publicInputs,
  };
}
