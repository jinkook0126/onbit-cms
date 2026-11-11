import { Prisma } from '../../generated/prisma/client';

export function errorCodes(error: unknown): string[] {
  const codes: string[] = [];
  const pending: unknown[] = [error];
  const seen = new Set<unknown>();

  while (pending.length > 0) {
    const current = pending.pop();
    if (typeof current !== 'object' || current === null || seen.has(current)) {
      continue;
    }
    seen.add(current);
    if ('code' in current && typeof current.code === 'string') {
      codes.push(current.code);
    }
    if ('cause' in current) {
      pending.push(current.cause);
    }
    if ('meta' in current) {
      pending.push(current.meta);
    }
  }

  return codes;
}

export function errorCodeLabel(error: unknown): string {
  return errorCodes(error).join(',') || 'unknown';
}

export function isUniqueConflict(error: unknown): boolean {
  return errorCodes(error).some((code) => code === 'P2002' || code === '23505');
}

export function isMissingRecord(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
}
