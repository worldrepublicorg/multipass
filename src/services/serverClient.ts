export const MULTIPASS_REQUEST_KIND = 'multipass-request';

export interface SubmitResult {
  nullifier?: string;
  name?: string;
}

export interface SessionRequestPayload {
  kind: string;
  version: number;
  submitUrl: string;
  sessionId?: string;
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

export type ValiditySubmitBody = {
  nullifier: string;
  scope: string;
  request?: {sessionId?: string};
};

export function getSubmitUrl(
  payload: Pick<SessionRequestPayload, 'submitUrl'>,
): string {
  const raw =
    typeof payload.submitUrl === 'string' ? payload.submitUrl.trim() : '';
  if (!raw) {
    throw new Error('Request payload is missing submitUrl');
  }
  return raw;
}

export function getSessionId(
  payload: Pick<SessionRequestPayload, 'sessionId'>,
): string | undefined {
  const id = payload.sessionId;
  return typeof id === 'string' && id.trim() ? id.trim() : undefined;
}

const SUBMIT_PATH = '/api/submit';

function normalizeSubmitEndpoint(value: string): string {
  const trimmed = value.trim().replace(/\/$/, '');
  if (trimmed.endsWith(SUBMIT_PATH)) {
    return trimmed;
  }
  return `${trimmed}${SUBMIT_PATH}`;
}

function baseUrlFromSubmit(value: string): string {
  return normalizeSubmitEndpoint(value).slice(0, -SUBMIT_PATH.length);
}

export interface ServerHealthStatus {
  url: string;
  status: string;
  service?: string;
}

function normalizeSessionRequestPayload(body: Record<string, unknown>): SessionRequestPayload {
  const payload = body as unknown as SessionRequestPayload;
  getSubmitUrl(payload);
  return payload;
}

export async function fetchSessionRequestPayload(
  requestUrl: string,
): Promise<SessionRequestPayload> {
  const trimmed = String(requestUrl || '').trim();
  if (!trimmed) {
    throw new Error('Request link is empty');
  }

  const lower = trimmed.toLowerCase();
  if (!lower.startsWith('http://') && !lower.startsWith('https://')) {
    throw new Error('Request link is not a valid URL');
  }

  const resp = await fetch(trimmed, {
    method: 'GET',
    headers: {Accept: 'application/json'},
  });
  const text = await resp.text();
  let body: Record<string, unknown> = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      `Request link returned non-JSON response (${resp.status}): ${text.slice(0, 200)}`,
    );
  }
  if (!resp.ok) {
    throw new Error(
      (body?.error as string) ||
        (body?.message as string) ||
        `Request link failed (${resp.status})`,
    );
  }
  if (!body || typeof body !== 'object') {
    throw new Error('Request link did not return a valid JSON payload');
  }
  const payload = normalizeSessionRequestPayload(body);
  getSubmitUrl(payload);
  return payload;
}

export async function pingServerHealth(
  submitUrl: string,
): Promise<ServerHealthStatus> {
  const url = `${baseUrlFromSubmit(submitUrl)}/api/health`;
  const resp = await fetch(url, {
    method: 'GET',
    headers: {Accept: 'application/json'},
  });
  const text = await resp.text();
  let body: any = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      `Health endpoint returned non-JSON response (${resp.status}): ${text.slice(0, 200)}`,
    );
  }
  if (!resp.ok) {
    throw new Error(
      body?.error || body?.message || `Health check failed (${resp.status})`,
    );
  }
  if (body?.status !== 'ok') {
    throw new Error(
      `Unexpected health response from server: ${JSON.stringify(body)}`,
    );
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

export async function submitValidityOnServer(
  submitUrl: string,
  body: ValiditySubmitBody,
): Promise<SubmitResult> {
  const url = normalizeSubmitEndpoint(submitUrl);
  const resp = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(body),
  });
  const text = await resp.text();
  let parsed: any = {};
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    throw new ServerError(
      `Server returned non-JSON response (${resp.status}): ${text.slice(0, 300)}`,
      resp.status,
    );
  }
  if (!resp.ok) {
    const errorMsg =
      parsed?.error ||
      parsed?.message ||
      `Submit failed (${resp.status})`;
    if (
      resp.status === 409 ||
      errorMsg.toLowerCase().includes('already exists') ||
      errorMsg.toLowerCase().includes('duplicate')
    ) {
      throw new DuplicateSignatureError(errorMsg);
    }
    throw new ServerError(errorMsg, resp.status);
  }
  return parsed as SubmitResult;
}
