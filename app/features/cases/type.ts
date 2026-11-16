import {
  caseProgressStageLabels,
  caseTypeLabels,
  isCaseProgressStage,
} from '~/features/customers/type';

import type { CaseProgressStage, CaseType } from '~/features/customers/type';

export const CASE_PAGE_SIZE = 15;

export const caseSearchFieldLabels = {
  name: '고객이름',
  assignee: '담당',
} as const;

export type CaseSearchField = keyof typeof caseSearchFieldLabels;

export type CaseListItem = {
  customerId: string;
  customerName: string;
  caseType: CaseType;
  stage: CaseProgressStage;
  assigneeName: string | null;
  nextTask: string;
  taskDueOn: string | null;
};

export type CaseListResponse = {
  cases: CaseListItem[];
  page: number;
  pageSize: number;
  total: number;
};

export type CaseListParams = {
  field: CaseSearchField;
  keyword: string;
  stage: CaseProgressStage | null;
  page: number;
};

const caseSearchFields = Object.keys(caseSearchFieldLabels);
const caseTypes = Object.keys(caseTypeLabels);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isCaseSearchField(value: string): value is CaseSearchField {
  return caseSearchFields.includes(value);
}

export function isCaseType(value: unknown): value is CaseType {
  return typeof value === 'string' && caseTypes.includes(value);
}

function isNullableString(value: unknown): boolean {
  return value === null || typeof value === 'string';
}

function isCaseListItem(value: unknown): value is CaseListItem {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.customerId === 'string' &&
    typeof value.customerName === 'string' &&
    isCaseType(value.caseType) &&
    isCaseProgressStage(value.stage) &&
    isNullableString(value.assigneeName) &&
    typeof value.nextTask === 'string' &&
    isNullableString(value.taskDueOn)
  );
}

export function isCaseListResponse(value: unknown): value is CaseListResponse {
  if (
    !isRecord(value) ||
    !Array.isArray(value.cases) ||
    typeof value.page !== 'number' ||
    typeof value.pageSize !== 'number' ||
    typeof value.total !== 'number'
  ) {
    return false;
  }
  return value.cases.every(isCaseListItem);
}

export function parseCaseSearchField(value: string | null): CaseSearchField | null {
  if (value === null) {
    return 'name';
  }
  if (isCaseSearchField(value)) {
    return value;
  }
  return null;
}

export function parseCaseProgressStage(value: string | null): CaseProgressStage | null {
  if (value === null || value === 'all') {
    return null;
  }
  if (isCaseProgressStage(value)) {
    return value;
  }
  return null;
}

export function isCaseProgressStageParam(value: string | null): boolean {
  return value === null || value === 'all' || isCaseProgressStage(value);
}

export function caseFormError(value: unknown): string | undefined {
  if (!isRecord(value) || typeof value.formError !== 'string') {
    return undefined;
  }
  return value.formError;
}

export const caseStageOptions = Object.keys(caseProgressStageLabels) as CaseProgressStage[];
