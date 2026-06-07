import {Buffer} from 'buffer';
import {
  fetchSessionRequestPayload,
  getSubmitUrl,
  type SessionRequestPayload,
} from '../services/serverClient';

// ─── NOTE on React Native URL compatibility ────────────────────────────────────
// React Native's built-in URL polyfill supports construction (`new URL(str)`)
// but throws "not implemented" for every property access: .hostname, .pathname,
// .searchParams, .toString(), etc.  All URL parsing in this file therefore uses
// plain string operations.  Do NOT introduce new URL(…).anything calls.
// ──────────────────────────────────────────────────────────────────────────────

function tryJsonParse(value: string): unknown | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function isValidHttpUrl(text: string): boolean {
  const lower = text.toLowerCase();
  return lower.startsWith('https://') || lower.startsWith('http://');
}

export function getQueryParam(rawUrl: string, key: string): string | null {
  const text = String(rawUrl || '').trim();
  const queryIndex = text.indexOf('?');
  if (queryIndex < 0) {
    return null;
  }

  const fragmentIndex = text.indexOf('#', queryIndex);
  const query = text.slice(
    queryIndex + 1,
    fragmentIndex >= 0 ? fragmentIndex : undefined,
  );
  for (const part of query.split('&')) {
    if (!part) {
      continue;
    }

    const eqIndex = part.indexOf('=');
    const rawKey = eqIndex >= 0 ? part.slice(0, eqIndex) : part;
    const rawValue = eqIndex >= 0 ? part.slice(eqIndex + 1) : '';
    const decodedKey = decodeURIComponent(rawKey.replace(/\+/g, ' '));
    if (decodedKey !== key) {
      continue;
    }

    return decodeURIComponent(rawValue.replace(/\+/g, ' '));
  }

  return null;
}

function parseEmbeddedPayload(payload: Record<string, unknown>): SessionRequestPayload {
  const normalized = payload as unknown as SessionRequestPayload;
  getSubmitUrl(normalized);
  return normalized;
}

export function parseSessionRequestPayload(raw: string): SessionRequestPayload {
  const text = String(raw || '').trim();
  if (!text) {
    throw new Error('Empty request payload');
  }

  let payload = tryJsonParse(text);
  if (!payload) {
    try {
      const b64 =
        getQueryParam(text, 'payload') ||
        getQueryParam(text, 'request') ||
        getQueryParam(text, 'c');
      if (b64) {
        const normalized = b64.replace(/-/g, '+').replace(/_/g, '/');
        const padded =
          normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
        payload = tryJsonParse(Buffer.from(padded, 'base64').toString('utf8'));
      }
    } catch {}
  }

  if (!payload || typeof payload !== 'object') {
    throw new Error('Link does not contain a valid request');
  }

  const normalized = parseEmbeddedPayload(payload as Record<string, unknown>);
  getSubmitUrl(normalized);
  return normalized;
}

export async function resolveSessionRequestPayload(
  raw: string,
): Promise<SessionRequestPayload> {
  const text = String(raw || '').trim();
  if (!text) {
    throw new Error('Empty request payload');
  }

  try {
    return parseSessionRequestPayload(text);
  } catch {}

  if (!isValidHttpUrl(text)) {
    throw new Error('Request is neither valid JSON nor a valid URL');
  }

  const embeddedPayload =
    getQueryParam(text, 'payload') ||
    getQueryParam(text, 'request') ||
    getQueryParam(text, 'c');

  if (embeddedPayload) {
    return parseSessionRequestPayload(text);
  }

  return fetchSessionRequestPayload(text);
}
