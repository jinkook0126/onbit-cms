import { ApiError } from '~/lib/apiClient';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function readFormError(value: unknown): string | undefined {
  if (!isRecord(value) || typeof value.formError !== 'string') {
    return undefined;
  }
  return value.formError;
}

export function readQueryError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return readFormError(error.body) ?? fallback;
  }
  return fallback;
}
