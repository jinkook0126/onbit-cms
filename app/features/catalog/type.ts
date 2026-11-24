export const MAX_CATALOG_NAME_LENGTH = 40;

export const catalogKinds = {
  'consultation-statuses': 'consultation-statuses',
  'inflow-sources': 'inflow-sources',
  'case-types': 'case-types',
} as const;

export type CatalogKind = keyof typeof catalogKinds;

export const catalogKindLabels = {
  'consultation-statuses': '상담관리',
  'inflow-sources': '유입처관리',
  'case-types': '사건관리',
} as const;

export const catalogKindDescriptions = {
  'consultation-statuses': '상담 상태 목록을 관리합니다.',
  'inflow-sources': '고객 유입 경로 목록을 관리합니다.',
  'case-types': '사건 유형 목록을 관리합니다.',
} as const;

export const catalogKindItemLabels = {
  'consultation-statuses': '상담 상태',
  'inflow-sources': '유입처',
  'case-types': '사건 유형',
} as const;

export type CatalogOption = {
  id: string;
  name: string;
  code: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
};

export type CatalogOptionRef = {
  id: string;
  name: string;
  code: string | null;
};

export type CatalogListResponse = {
  items: CatalogOption[];
};

export type CatalogDetail = CatalogOption;

export type CatalogFieldErrors = {
  name?: string;
};

export type CatalogCreateSubmission = {
  name: string;
};

export type CatalogCreateResponse = {
  item?: CatalogOption;
  fieldErrors?: CatalogFieldErrors;
  formError?: string;
};

export type CatalogNameSubmission = {
  name: string;
};

export type CatalogNameResponse = {
  name?: string;
  fieldErrors?: CatalogFieldErrors;
  formError?: string;
};

export type CatalogStatusSubmission = {
  isActive: boolean;
};

export type CatalogStatusResponse = {
  isActive?: boolean;
  formError?: string;
};

export type CatalogDeleteResponse = {
  deleted?: boolean;
  formError?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string';
}

function isCatalogOption(value: unknown): value is CatalogOption {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    (value.code === null || typeof value.code === 'string') &&
    typeof value.sortOrder === 'number' &&
    typeof value.isActive === 'boolean' &&
    typeof value.createdAt === 'string'
  );
}

export function isCatalogKind(value: string): value is CatalogKind {
  return Object.hasOwn(catalogKinds, value);
}

export function isCatalogListResponse(value: unknown): value is CatalogListResponse {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    return false;
  }
  return value.items.every(isCatalogOption);
}

export function isCatalogDetail(value: unknown): value is CatalogDetail {
  return isCatalogOption(value);
}

export function isCatalogCreateSubmission(value: unknown): value is CatalogCreateSubmission {
  return isRecord(value) && typeof value.name === 'string';
}

export function isCatalogCreateResponse(value: unknown): value is CatalogCreateResponse {
  if (!isRecord(value)) {
    return false;
  }
  if (value.item !== undefined && !isCatalogOption(value.item)) {
    return false;
  }
  if (value.formError !== undefined && typeof value.formError !== 'string') {
    return false;
  }
  if (value.fieldErrors !== undefined) {
    if (!isRecord(value.fieldErrors) || !isOptionalString(value.fieldErrors.name)) {
      return false;
    }
  }
  return true;
}

export function isCatalogNameSubmission(value: unknown): value is CatalogNameSubmission {
  return isRecord(value) && typeof value.name === 'string';
}

export function isCatalogNameResponse(value: unknown): value is CatalogNameResponse {
  if (!isRecord(value)) {
    return false;
  }
  if (value.name !== undefined && typeof value.name !== 'string') {
    return false;
  }
  if (value.formError !== undefined && typeof value.formError !== 'string') {
    return false;
  }
  if (value.fieldErrors !== undefined) {
    if (!isRecord(value.fieldErrors) || !isOptionalString(value.fieldErrors.name)) {
      return false;
    }
  }
  return true;
}

export function isCatalogStatusSubmission(value: unknown): value is CatalogStatusSubmission {
  return isRecord(value) && typeof value.isActive === 'boolean';
}

export function isCatalogStatusResponse(value: unknown): value is CatalogStatusResponse {
  if (!isRecord(value)) {
    return false;
  }
  if (value.isActive !== undefined && typeof value.isActive !== 'boolean') {
    return false;
  }
  return value.formError === undefined || typeof value.formError === 'string';
}

export function isCatalogDeleteResponse(value: unknown): value is CatalogDeleteResponse {
  if (!isRecord(value)) {
    return false;
  }
  if (value.deleted !== undefined && typeof value.deleted !== 'boolean') {
    return false;
  }
  return value.formError === undefined || typeof value.formError === 'string';
}

export function isCatalogOptionRef(value: unknown): value is CatalogOptionRef {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    (value.code === null || typeof value.code === 'string')
  );
}

export function catalogBadgeVariant(
  code: string | null,
): 'default' | 'secondary' | 'outline' | 'destructive' | 'success' {
  switch (code) {
    case 'IN_CONSULTATION':
      return 'default';
    case 'CONSIDERING':
      return 'secondary';
    case 'ABSENT':
      return 'outline';
    case 'REJECTED':
      return 'destructive';
    case 'RETAINED':
      return 'success';
    case null:
      return 'secondary';
    default:
      return 'secondary';
  }
}
