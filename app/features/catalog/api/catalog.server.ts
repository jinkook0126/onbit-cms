import { resolveSession } from '~/features/auth/api/auth.server';
import { MAX_CATALOG_NAME_LENGTH } from '~/features/catalog/type';
import { prisma } from '~/lib/db.server';
import { errorCodeLabel, isUniqueConflict } from '~/lib/error.server';
import { createSupabaseServerClient } from '~/lib/supabase.server';
import { isUuid } from '~/lib/uuid.server';

import type {
  CatalogCreateResponse,
  CatalogDeleteResponse,
  CatalogDetail,
  CatalogFieldErrors,
  CatalogKind,
  CatalogListResponse,
  CatalogNameResponse,
  CatalogOption,
  CatalogStatusResponse,
} from '~/features/catalog/type';

export type CatalogActor =
  | { status: 'ok'; role: 'COMPANY_ADMIN'; companyId: string }
  | { status: 'ok'; role: 'EMPLOYEE'; companyId: string }
  | { status: 'anonymous' }
  | { status: 'forbidden' };

export type CatalogListResult =
  | { status: 'ok'; items: CatalogOption[] }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'failed' };

export type CatalogDetailResult =
  | { status: 'ok'; item: CatalogDetail }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'not-found' }
  | { status: 'failed' };

export type CatalogMutateResult =
  | { status: 'ok'; item: CatalogOption }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'not-found' }
  | { status: 'invalid'; fieldErrors: CatalogFieldErrors }
  | { status: 'conflict' }
  | { status: 'in-use' }
  | { status: 'failed' };

export type CatalogNameResult =
  | { status: 'ok'; name: string }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'not-found' }
  | { status: 'invalid'; fieldErrors: CatalogFieldErrors }
  | { status: 'conflict' }
  | { status: 'failed' };

export type CatalogStatusResult =
  | { status: 'ok'; isActive: boolean }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'not-found' }
  | { status: 'failed' };

export type CatalogDeleteResult =
  | { status: 'ok' }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'not-found' }
  | { status: 'in-use' }
  | { status: 'failed' };

const NAME_REQUIRED_MESSAGE = '이름을 입력하세요.';
const NAME_TOO_LONG_MESSAGE = `이름은 ${MAX_CATALOG_NAME_LENGTH}자 이하여야 합니다.`;
const NAME_CONFLICT_MESSAGE = '같은 이름의 항목이 이미 있습니다.';
const IN_USE_MESSAGE = '사용 중인 항목은 삭제할 수 없습니다.';

export async function resolveCatalogActor(
  request: Request,
): Promise<{ actor: CatalogActor; headers: Headers }> {
  const { supabase, headers } = createSupabaseServerClient(request);
  const session = await resolveSession(supabase);
  if (session.status !== 'authenticated') {
    return { actor: { status: 'anonymous' }, headers };
  }
  if (session.user.role === 'SUPER_ADMIN' || !session.user.companyId) {
    return { actor: { status: 'forbidden' }, headers };
  }
  if (session.user.role === 'COMPANY_ADMIN') {
    return {
      actor: { status: 'ok', role: 'COMPANY_ADMIN', companyId: session.user.companyId },
      headers,
    };
  }
  return {
    actor: { status: 'ok', role: 'EMPLOYEE', companyId: session.user.companyId },
    headers,
  };
}

function toOption(row: {
  id: string;
  name: string;
  code: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
}): CatalogOption {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
  };
}

function validateName(name: string): CatalogFieldErrors {
  const fieldErrors: CatalogFieldErrors = {};
  const trimmed = name.trim();
  if (trimmed.length < 1) {
    fieldErrors.name = NAME_REQUIRED_MESSAGE;
  } else if (trimmed.length > MAX_CATALOG_NAME_LENGTH) {
    fieldErrors.name = NAME_TOO_LONG_MESSAGE;
  }
  return fieldErrors;
}

async function listRows(kind: CatalogKind, companyId: string, activeOnly: boolean) {
  const where = {
    companyId,
    ...(activeOnly ? { isActive: true } : {}),
  };
  const orderBy = [{ sortOrder: 'asc' as const }, { name: 'asc' as const }];
  switch (kind) {
    case 'consultation-statuses':
      return prisma.consultationStatusOption.findMany({ where, orderBy });
    case 'inflow-sources':
      return prisma.inflowSourceOption.findMany({ where, orderBy });
    case 'case-types':
      return prisma.caseTypeOption.findMany({ where, orderBy });
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}

async function findRow(kind: CatalogKind, companyId: string, id: string) {
  const where = { id, companyId };
  switch (kind) {
    case 'consultation-statuses':
      return prisma.consultationStatusOption.findFirst({ where });
    case 'inflow-sources':
      return prisma.inflowSourceOption.findFirst({ where });
    case 'case-types':
      return prisma.caseTypeOption.findFirst({ where });
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}

async function nextSortOrder(kind: CatalogKind, companyId: string): Promise<number> {
  switch (kind) {
    case 'consultation-statuses': {
      const last = await prisma.consultationStatusOption.findFirst({
        where: { companyId },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      });
      return (last?.sortOrder ?? -1) + 1;
    }
    case 'inflow-sources': {
      const last = await prisma.inflowSourceOption.findFirst({
        where: { companyId },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      });
      return (last?.sortOrder ?? -1) + 1;
    }
    case 'case-types': {
      const last = await prisma.caseTypeOption.findFirst({
        where: { companyId },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      });
      return (last?.sortOrder ?? -1) + 1;
    }
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}

async function usageCount(kind: CatalogKind, id: string): Promise<number> {
  switch (kind) {
    case 'consultation-statuses':
      return prisma.customer.count({ where: { statusId: id } });
    case 'inflow-sources':
      return prisma.customer.count({ where: { sourceId: id } });
    case 'case-types': {
      const [customers, cases] = await Promise.all([
        prisma.customer.count({ where: { caseTypeId: id } }),
        prisma.customerCase.count({ where: { caseTypeId: id } }),
      ]);
      return customers + cases;
    }
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}

export async function readCatalogList(
  request: Request,
  kind: CatalogKind,
  activeOnly = false,
): Promise<{ result: CatalogListResult; headers: Headers }> {
  const { actor, headers } = await resolveCatalogActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }
  try {
    const rows = await listRows(kind, actor.companyId, activeOnly);
    return { result: { status: 'ok', items: rows.map(toOption) }, headers };
  } catch (error) {
    console.error('마스터 목록을 불러오지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}

export async function readCatalogDetail(
  request: Request,
  kind: CatalogKind,
  id: string,
): Promise<{ result: CatalogDetailResult; headers: Headers }> {
  const { actor, headers } = await resolveCatalogActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }
  if (actor.role !== 'COMPANY_ADMIN') {
    return { result: { status: 'forbidden' }, headers };
  }
  if (!isUuid(id)) {
    return { result: { status: 'not-found' }, headers };
  }
  try {
    const row = await findRow(kind, actor.companyId, id);
    if (!row) {
      return { result: { status: 'not-found' }, headers };
    }
    return { result: { status: 'ok', item: toOption(row) }, headers };
  } catch (error) {
    console.error('마스터 상세를 불러오지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}

export async function createCatalogItem(
  request: Request,
  kind: CatalogKind,
  name: string,
): Promise<{ result: CatalogMutateResult; headers: Headers }> {
  const { actor, headers } = await resolveCatalogActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }
  if (actor.role !== 'COMPANY_ADMIN') {
    return { result: { status: 'forbidden' }, headers };
  }
  const fieldErrors = validateName(name);
  if (fieldErrors.name) {
    return { result: { status: 'invalid', fieldErrors }, headers };
  }
  try {
    const sortOrder = await nextSortOrder(kind, actor.companyId);
    const data = {
      companyId: actor.companyId,
      name: name.trim(),
      code: null,
      sortOrder,
    };
    let row;
    switch (kind) {
      case 'consultation-statuses':
        row = await prisma.consultationStatusOption.create({ data });
        break;
      case 'inflow-sources':
        row = await prisma.inflowSourceOption.create({ data });
        break;
      case 'case-types':
        row = await prisma.caseTypeOption.create({ data });
        break;
      default: {
        const unreachable: never = kind;
        return unreachable;
      }
    }
    return { result: { status: 'ok', item: toOption(row) }, headers };
  } catch (error) {
    if (isUniqueConflict(error)) {
      return { result: { status: 'conflict' }, headers };
    }
    console.error('마스터를 추가하지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}

export async function updateCatalogName(
  request: Request,
  kind: CatalogKind,
  id: string,
  name: string,
): Promise<{ result: CatalogNameResult; headers: Headers }> {
  const { actor, headers } = await resolveCatalogActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }
  if (actor.role !== 'COMPANY_ADMIN') {
    return { result: { status: 'forbidden' }, headers };
  }
  if (!isUuid(id)) {
    return { result: { status: 'not-found' }, headers };
  }
  const fieldErrors = validateName(name);
  if (fieldErrors.name) {
    return { result: { status: 'invalid', fieldErrors }, headers };
  }
  try {
    const existing = await findRow(kind, actor.companyId, id);
    if (!existing) {
      return { result: { status: 'not-found' }, headers };
    }
    const trimmed = name.trim();
    switch (kind) {
      case 'consultation-statuses':
        await prisma.consultationStatusOption.update({
          where: { id },
          data: { name: trimmed },
        });
        break;
      case 'inflow-sources':
        await prisma.inflowSourceOption.update({ where: { id }, data: { name: trimmed } });
        break;
      case 'case-types':
        await prisma.caseTypeOption.update({ where: { id }, data: { name: trimmed } });
        break;
      default: {
        const unreachable: never = kind;
        return unreachable;
      }
    }
    return { result: { status: 'ok', name: trimmed }, headers };
  } catch (error) {
    if (isUniqueConflict(error)) {
      return { result: { status: 'conflict' }, headers };
    }
    console.error('마스터 이름을 바꾸지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}

export async function updateCatalogStatus(
  request: Request,
  kind: CatalogKind,
  id: string,
  isActive: boolean,
): Promise<{ result: CatalogStatusResult; headers: Headers }> {
  const { actor, headers } = await resolveCatalogActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }
  if (actor.role !== 'COMPANY_ADMIN') {
    return { result: { status: 'forbidden' }, headers };
  }
  if (!isUuid(id)) {
    return { result: { status: 'not-found' }, headers };
  }
  try {
    const existing = await findRow(kind, actor.companyId, id);
    if (!existing) {
      return { result: { status: 'not-found' }, headers };
    }
    switch (kind) {
      case 'consultation-statuses':
        await prisma.consultationStatusOption.update({ where: { id }, data: { isActive } });
        break;
      case 'inflow-sources':
        await prisma.inflowSourceOption.update({ where: { id }, data: { isActive } });
        break;
      case 'case-types':
        await prisma.caseTypeOption.update({ where: { id }, data: { isActive } });
        break;
      default: {
        const unreachable: never = kind;
        return unreachable;
      }
    }
    return { result: { status: 'ok', isActive }, headers };
  } catch (error) {
    console.error('마스터 상태를 바꾸지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}

export async function deleteCatalogItem(
  request: Request,
  kind: CatalogKind,
  id: string,
): Promise<{ result: CatalogDeleteResult; headers: Headers }> {
  const { actor, headers } = await resolveCatalogActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }
  if (actor.role !== 'COMPANY_ADMIN') {
    return { result: { status: 'forbidden' }, headers };
  }
  if (!isUuid(id)) {
    return { result: { status: 'not-found' }, headers };
  }
  try {
    const existing = await findRow(kind, actor.companyId, id);
    if (!existing) {
      return { result: { status: 'not-found' }, headers };
    }
    if ((await usageCount(kind, id)) > 0) {
      return { result: { status: 'in-use' }, headers };
    }
    switch (kind) {
      case 'consultation-statuses':
        await prisma.consultationStatusOption.delete({ where: { id } });
        break;
      case 'inflow-sources':
        await prisma.inflowSourceOption.delete({ where: { id } });
        break;
      case 'case-types':
        await prisma.caseTypeOption.delete({ where: { id } });
        break;
      default: {
        const unreachable: never = kind;
        return unreachable;
      }
    }
    return { result: { status: 'ok' }, headers };
  } catch (error) {
    console.error('마스터를 삭제하지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}

export function catalogCreateBody(result: CatalogMutateResult): CatalogCreateResponse {
  switch (result.status) {
    case 'ok':
      return { item: result.item };
    case 'invalid':
      return { fieldErrors: result.fieldErrors };
    case 'conflict':
      return { fieldErrors: { name: NAME_CONFLICT_MESSAGE } };
    case 'anonymous':
    case 'forbidden':
    case 'not-found':
    case 'in-use':
    case 'failed':
      return { formError: '항목을 추가하지 못했습니다. 다시 시도하세요.' };
    default: {
      const unreachable: never = result;
      return unreachable;
    }
  }
}

export function catalogNameBody(result: CatalogNameResult): CatalogNameResponse {
  switch (result.status) {
    case 'ok':
      return { name: result.name };
    case 'invalid':
      return { fieldErrors: result.fieldErrors };
    case 'conflict':
      return { fieldErrors: { name: NAME_CONFLICT_MESSAGE } };
    case 'anonymous':
    case 'forbidden':
    case 'not-found':
    case 'failed':
      return { formError: '이름을 바꾸지 못했습니다. 다시 시도하세요.' };
    default: {
      const unreachable: never = result;
      return unreachable;
    }
  }
}

export function catalogStatusBody(result: CatalogStatusResult): CatalogStatusResponse {
  if (result.status === 'ok') {
    return { isActive: result.isActive };
  }
  return { formError: '상태를 바꾸지 못했습니다. 다시 시도하세요.' };
}

export function catalogDeleteBody(result: CatalogDeleteResult): CatalogDeleteResponse {
  if (result.status === 'ok') {
    return { deleted: true };
  }
  if (result.status === 'in-use') {
    return { formError: IN_USE_MESSAGE };
  }
  return { formError: '항목을 삭제하지 못했습니다. 다시 시도하세요.' };
}

export function catalogListBody(result: Extract<CatalogListResult, { status: 'ok' }>): CatalogListResponse {
  return { items: result.items };
}
