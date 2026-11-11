export const MAX_TEAM_NAME_LENGTH = 30;

export type TeamCompanyOption = {
  id: string;
  name: string;
};

export type TeamListItem = {
  id: string;
  name: string;
  memberCount: number;
  leaderName: string | null;
  createdAt: string;
  isActive: boolean;
};

export type TeamListResponse = {
  company: TeamCompanyOption | null;
  companies: TeamCompanyOption[];
  teams: TeamListItem[];
};

export type TeamFieldErrors = {
  name?: string;
};

export type TeamCreateSubmission = {
  name: string;
  companyId?: string;
};

export type TeamCreateResponse = {
  team?: TeamListItem;
  fieldErrors?: TeamFieldErrors;
  formError?: string;
};

const teamFieldErrorKeys = ['name'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string';
}

function isTeamCompanyOption(value: unknown): value is TeamCompanyOption {
  if (!isRecord(value)) {
    return false;
  }
  return typeof value.id === 'string' && typeof value.name === 'string';
}

function isNullableString(value: unknown): boolean {
  return value === null || typeof value === 'string';
}

function isTeamListItem(value: unknown): value is TeamListItem {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.memberCount === 'number' &&
    isNullableString(value.leaderName) &&
    typeof value.createdAt === 'string' &&
    typeof value.isActive === 'boolean'
  );
}

export function isTeamListResponse(value: unknown): value is TeamListResponse {
  if (!isRecord(value) || !Array.isArray(value.companies) || !Array.isArray(value.teams)) {
    return false;
  }
  if (value.company !== null && !isTeamCompanyOption(value.company)) {
    return false;
  }
  return value.companies.every(isTeamCompanyOption) && value.teams.every(isTeamListItem);
}

export function isTeamCreateSubmission(value: unknown): value is TeamCreateSubmission {
  if (!isRecord(value) || typeof value.name !== 'string') {
    return false;
  }
  return isOptionalString(value.companyId);
}

function hasOnlyOptionalStrings(
  value: unknown,
  keys: readonly string[],
): value is Record<string, string | undefined> {
  if (!isRecord(value)) {
    return false;
  }
  return keys.every((key) => isOptionalString(value[key]));
}

export function isTeamCreateResponse(value: unknown): value is TeamCreateResponse {
  if (!isRecord(value) || !isOptionalString(value.formError)) {
    return false;
  }
  if (value.team !== undefined && !isTeamListItem(value.team)) {
    return false;
  }
  return (
    value.fieldErrors === undefined || hasOnlyOptionalStrings(value.fieldErrors, teamFieldErrorKeys)
  );
}

export function teamFormError(value: unknown): string | undefined {
  if (!isRecord(value) || typeof value.formError !== 'string') {
    return undefined;
  }
  return value.formError;
}

export type TeamMemberOption = {
  id: string;
  name: string;
};

export type TeamDetail = {
  id: string;
  name: string;
  isActive: boolean;
  leaderId: string | null;
  leaderName: string | null;
  members: TeamMemberOption[];
};

export type TeamNameFieldErrors = {
  name?: string;
};

export type TeamNameSubmission = {
  name: string;
};

export type TeamNameResponse = {
  name?: string;
  fieldErrors?: TeamNameFieldErrors;
  formError?: string;
};

export type TeamStatusSubmission = {
  isActive: boolean;
};

export type TeamStatusResponse = {
  isActive?: boolean;
  formError?: string;
};

export type TeamLeaderSubmission = {
  leaderId: string | null;
};

export type TeamLeaderResponse = {
  leaderId?: string | null;
  leaderName?: string | null;
  formError?: string;
};

const teamNameErrorKeys = ['name'] as const;

function isTeamMemberOption(value: unknown): value is TeamMemberOption {
  if (!isRecord(value)) {
    return false;
  }
  return typeof value.id === 'string' && typeof value.name === 'string';
}

export function isTeamDetail(value: unknown): value is TeamDetail {
  if (!isRecord(value) || !Array.isArray(value.members)) {
    return false;
  }
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.isActive === 'boolean' &&
    isNullableString(value.leaderId) &&
    isNullableString(value.leaderName) &&
    value.members.every(isTeamMemberOption)
  );
}

export function isTeamNameSubmission(value: unknown): value is TeamNameSubmission {
  return (
    isRecord(value) &&
    typeof value.name === 'string' &&
    !Object.hasOwn(value, 'isActive') &&
    !Object.hasOwn(value, 'leaderId')
  );
}

export function isTeamStatusSubmission(value: unknown): value is TeamStatusSubmission {
  return (
    isRecord(value) &&
    typeof value.isActive === 'boolean' &&
    !Object.hasOwn(value, 'name') &&
    !Object.hasOwn(value, 'leaderId')
  );
}

export function isTeamLeaderSubmission(value: unknown): value is TeamLeaderSubmission {
  return (
    isRecord(value) &&
    isNullableString(value.leaderId) &&
    !Object.hasOwn(value, 'name') &&
    !Object.hasOwn(value, 'isActive')
  );
}

export function isTeamNameResponse(value: unknown): value is TeamNameResponse {
  if (!isRecord(value) || !isOptionalString(value.name) || !isOptionalString(value.formError)) {
    return false;
  }
  return (
    value.fieldErrors === undefined || hasOnlyOptionalStrings(value.fieldErrors, teamNameErrorKeys)
  );
}

export function isTeamStatusResponse(value: unknown): value is TeamStatusResponse {
  if (!isRecord(value) || !isOptionalString(value.formError)) {
    return false;
  }
  return value.isActive === undefined || typeof value.isActive === 'boolean';
}

export function isTeamLeaderResponse(value: unknown): value is TeamLeaderResponse {
  if (!isRecord(value) || !isOptionalString(value.formError)) {
    return false;
  }
  if (value.leaderId !== undefined && !isNullableString(value.leaderId)) {
    return false;
  }
  return value.leaderName === undefined || isNullableString(value.leaderName);
}
