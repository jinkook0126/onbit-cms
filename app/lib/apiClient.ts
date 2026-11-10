export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown) {
    super('API 요청이 실패했습니다.');
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export type ApiRequest = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
};

export type ApiResponse = {
  ok: boolean;
  status: number;
  body: unknown;
};

function parseJson(text: string): unknown {
  return JSON.parse(text) as unknown;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.trim() === '') {
    return null;
  }
  try {
    return parseJson(text);
  } catch {
    throw new ApiError(response.status, null);
  }
}

export async function apiClient(path: string, request: ApiRequest = {}): Promise<ApiResponse> {
  const headers = new Headers();
  headers.set('Accept', 'application/json');
  if (request.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(path, {
    method: request.method ?? 'GET',
    headers,
    credentials: 'same-origin',
    body: request.body === undefined ? undefined : JSON.stringify(request.body),
    signal: request.signal,
  });
  const body = await readJson(response);
  if (response.status >= 500) {
    throw new ApiError(response.status, body);
  }

  return { ok: response.ok, status: response.status, body };
}
