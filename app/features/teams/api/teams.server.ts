import { resolveOrganizationActor } from '~/features/auth/api/auth.server';
import { MAX_TEAM_NAME_LENGTH } from '~/features/teams/type';
import { prisma } from '~/lib/db.server';
import { errorCodeLabel, isMissingRecord } from '~/lib/error.server';
import { isUuid } from '~/lib/uuid.server';

import type { OrganizationActor } from '~/features/auth/api/auth.server';
import type {
  TeamCompanyOption,
  TeamDetail,
  TeamFieldErrors,
  TeamListItem,
  TeamMemberOption,
} from '~/features/teams/type';

export type TeamListResult =
  | {
      status: 'ok';
      company: TeamCompanyOption | null;
      companies: TeamCompanyOption[];
      teams: TeamListItem[];
    }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'not-found' };

export type TeamCreateResult =
  | { status: 'ok'; team: TeamListItem }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'not-found' }
  | { status: 'invalid'; fieldErrors: TeamFieldErrors }
  | { status: 'failed' };

export type TeamDetailResult =
  | { status: 'ok'; team: TeamDetail }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'not-found' };

export type TeamNameResult =
  | { status: 'ok'; name: string }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'not-found' }
  | { status: 'invalid'; fieldErrors: TeamFieldErrors }
  | { status: 'failed' };

export type TeamStatusResult =
  | { status: 'ok'; isActive: boolean }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'not-found' }
  | { status: 'failed' };

export type TeamLeaderResult =
  | { status: 'ok'; leaderId: string | null; leaderName: string | null }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'not-found' }
  | { status: 'invalid'; formError: string }
  | { status: 'failed' };

const NAME_REQUIRED_MESSAGE = '팀 이름을 입력하세요.';
const NAME_TOO_LONG_MESSAGE = `팀 이름은 ${MAX_TEAM_NAME_LENGTH}자 이하여야 합니다.`;
const LEADER_INVALID_MESSAGE = '같은 팀의 직원을 선택하세요.';

function validateTeamName(name: string): TeamFieldErrors {
  const fieldErrors: TeamFieldErrors = {};
  const trimmed = name.trim();
  if (trimmed.length < 1) {
    fieldErrors.name = NAME_REQUIRED_MESSAGE;
  } else if (trimmed.length > MAX_TEAM_NAME_LENGTH) {
    fieldErrors.name = NAME_TOO_LONG_MESSAGE;
  }
  return fieldErrors;
}

async function readCompanyOptions(): Promise<TeamCompanyOption[]> {
  return prisma.company.findMany({
    select: { id: true, name: true },
    orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
  });
}

function toTeamListItem(team: {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  leader?: { name: string } | null;
  _count?: { members: number };
}): TeamListItem {
  return {
    id: team.id,
    name: team.name,
    memberCount: team._count?.members ?? 0,
    leaderName: team.leader?.name ?? null,
    createdAt: team.createdAt.toISOString(),
    isActive: team.isActive,
  };
}

async function readCompanyTeams(
  companyId: string,
): Promise<{ company: TeamCompanyOption; teams: TeamListItem[] } | null> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      name: true,
      teams: {
        select: {
          id: true,
          name: true,
          isActive: true,
          createdAt: true,
          leader: { select: { name: true } },
          _count: { select: { members: true } },
        },
        orderBy: [{ createdAt: 'desc' }, { name: 'asc' }],
      },
    },
  });
  if (!company) {
    return null;
  }
  return {
    company: { id: company.id, name: company.name },
    teams: company.teams.map(toTeamListItem),
  };
}

export async function readTeams(
  request: Request,
  requestedCompanyId: string | null,
): Promise<{ result: TeamListResult; headers: Headers }> {
  const { actor, headers } = await resolveOrganizationActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }

  if (actor.role === 'COMPANY_ADMIN') {
    const scoped = await readCompanyTeams(actor.companyId);
    if (!scoped) {
      return { result: { status: 'not-found' }, headers };
    }
    return {
      result: { status: 'ok', company: scoped.company, companies: [], teams: scoped.teams },
      headers,
    };
  }

  const companies = await readCompanyOptions();
  if (!requestedCompanyId) {
    return { result: { status: 'ok', company: null, companies, teams: [] }, headers };
  }
  if (!isUuid(requestedCompanyId)) {
    return { result: { status: 'not-found' }, headers };
  }
  const scoped = await readCompanyTeams(requestedCompanyId);
  if (!scoped) {
    return { result: { status: 'not-found' }, headers };
  }
  return {
    result: { status: 'ok', company: scoped.company, companies, teams: scoped.teams },
    headers,
  };
}

export async function createTeam(
  request: Request,
  name: string,
  requestedCompanyId: string | undefined,
): Promise<{ result: TeamCreateResult; headers: Headers }> {
  const { actor, headers } = await resolveOrganizationActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }

  const fieldErrors = validateTeamName(name);
  if (fieldErrors.name) {
    return { result: { status: 'invalid', fieldErrors }, headers };
  }

  const companyId = actor.role === 'COMPANY_ADMIN' ? actor.companyId : requestedCompanyId;
  if (!companyId || !isUuid(companyId)) {
    return { result: { status: 'not-found' }, headers };
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true },
  });
  if (!company) {
    return { result: { status: 'not-found' }, headers };
  }

  try {
    const team = await prisma.team.create({
      data: { companyId, name: name.trim() },
      select: { id: true, name: true, isActive: true, createdAt: true },
    });
    return { result: { status: 'ok', team: toTeamListItem(team) }, headers };
  } catch (error) {
    console.error('팀을 등록하지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}

type AccessibleTeam = {
  id: string;
  companyId: string;
  name: string;
  isActive: boolean;
  leaderId: string | null;
  leaderName: string | null;
};

async function readAccessibleTeam(
  actor: Extract<OrganizationActor, { status: 'ok' }>,
  teamId: string,
): Promise<AccessibleTeam | null> {
  if (!isUuid(teamId)) {
    return null;
  }
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      id: true,
      companyId: true,
      name: true,
      isActive: true,
      leaderId: true,
      leader: { select: { name: true } },
    },
  });
  if (!team) {
    return null;
  }
  if (actor.role === 'COMPANY_ADMIN' && team.companyId !== actor.companyId) {
    return null;
  }
  return {
    id: team.id,
    companyId: team.companyId,
    name: team.name,
    isActive: team.isActive,
    leaderId: team.leaderId,
    leaderName: team.leader?.name ?? null,
  };
}

async function readTeamMembers(team: AccessibleTeam): Promise<TeamMemberOption[]> {
  const employees = await prisma.user.findMany({
    where: {
      companyId: team.companyId,
      teamId: team.id,
      role: 'EMPLOYEE',
      ...(team.leaderId ? { OR: [{ isActive: true }, { id: team.leaderId }] } : { isActive: true }),
    },
    select: { id: true, name: true },
    orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
  });
  if (!team.leaderId || employees.some((member) => member.id === team.leaderId)) {
    return employees;
  }
  const leader = await prisma.user.findUnique({
    where: { id: team.leaderId },
    select: { id: true, name: true },
  });
  if (!leader) {
    return employees;
  }
  return [...employees, leader].sort((left, right) => left.name.localeCompare(right.name, 'ko'));
}

export async function readTeam(
  request: Request,
  teamId: string,
): Promise<{ result: TeamDetailResult; headers: Headers }> {
  const { actor, headers } = await resolveOrganizationActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }
  const team = await readAccessibleTeam(actor, teamId);
  if (!team) {
    return { result: { status: 'not-found' }, headers };
  }
  const members = await readTeamMembers(team);
  return {
    result: {
      status: 'ok',
      team: {
        id: team.id,
        name: team.name,
        isActive: team.isActive,
        leaderId: team.leaderId,
        leaderName: team.leaderName,
        members,
      },
    },
    headers,
  };
}

export async function updateTeamName(
  request: Request,
  teamId: string,
  name: string,
): Promise<{ result: TeamNameResult; headers: Headers }> {
  const { actor, headers } = await resolveOrganizationActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }
  const team = await readAccessibleTeam(actor, teamId);
  if (!team) {
    return { result: { status: 'not-found' }, headers };
  }

  const fieldErrors = validateTeamName(name);
  if (fieldErrors.name) {
    return { result: { status: 'invalid', fieldErrors }, headers };
  }

  try {
    const updated = await prisma.team.update({
      where: { id: team.id },
      data: { name: name.trim() },
      select: { name: true },
    });
    return { result: { status: 'ok', name: updated.name }, headers };
  } catch (error) {
    if (isMissingRecord(error)) {
      return { result: { status: 'not-found' }, headers };
    }
    console.error('팀 이름을 변경하지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}

export async function updateTeamStatus(
  request: Request,
  teamId: string,
  isActive: boolean,
): Promise<{ result: TeamStatusResult; headers: Headers }> {
  const { actor, headers } = await resolveOrganizationActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }
  const team = await readAccessibleTeam(actor, teamId);
  if (!team) {
    return { result: { status: 'not-found' }, headers };
  }

  try {
    const updated = await prisma.team.update({
      where: { id: team.id },
      data: { isActive },
      select: { isActive: true },
    });
    return { result: { status: 'ok', isActive: updated.isActive }, headers };
  } catch (error) {
    if (isMissingRecord(error)) {
      return { result: { status: 'not-found' }, headers };
    }
    console.error('팀 상태를 변경하지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}

export async function updateTeamLeader(
  request: Request,
  teamId: string,
  leaderId: string | null,
): Promise<{ result: TeamLeaderResult; headers: Headers }> {
  const { actor, headers } = await resolveOrganizationActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }
  const team = await readAccessibleTeam(actor, teamId);
  if (!team) {
    return { result: { status: 'not-found' }, headers };
  }

  if (leaderId === null) {
    try {
      await prisma.team.update({
        where: { id: team.id },
        data: { leaderId: null },
        select: { id: true },
      });
      return { result: { status: 'ok', leaderId: null, leaderName: null }, headers };
    } catch (error) {
      if (isMissingRecord(error)) {
        return { result: { status: 'not-found' }, headers };
      }
      console.error('팀장을 변경하지 못했습니다.', errorCodeLabel(error));
      return { result: { status: 'failed' }, headers };
    }
  }

  if (!isUuid(leaderId)) {
    return { result: { status: 'invalid', formError: LEADER_INVALID_MESSAGE }, headers };
  }
  if (leaderId === team.leaderId) {
    return {
      result: { status: 'ok', leaderId: team.leaderId, leaderName: team.leaderName },
      headers,
    };
  }

  const member = await prisma.user.findFirst({
    where: {
      id: leaderId,
      teamId: team.id,
      companyId: team.companyId,
      role: 'EMPLOYEE',
      ...(leaderId === team.leaderId ? {} : { isActive: true }),
    },
    select: { id: true, name: true },
  });
  if (!member) {
    return { result: { status: 'invalid', formError: LEADER_INVALID_MESSAGE }, headers };
  }

  try {
    const updated = await prisma.team.update({
      where: { id: team.id },
      data: { leaderId: member.id },
      select: { leaderId: true, leader: { select: { name: true } } },
    });
    return {
      result: {
        status: 'ok',
        leaderId: updated.leaderId,
        leaderName: updated.leader?.name ?? null,
      },
      headers,
    };
  } catch (error) {
    if (isMissingRecord(error)) {
      return { result: { status: 'not-found' }, headers };
    }
    console.error('팀장을 변경하지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}
