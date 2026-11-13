import { resolveSession } from '~/features/auth/api/auth.server';
import { prisma } from '~/lib/db.server';
import { createSupabaseServerClient } from '~/lib/supabase.server';

import type { Prisma } from '../../../../generated/prisma/client';

export type CustomerActor =
  | { status: 'ok'; role: 'COMPANY_ADMIN'; companyId: string; userId: string }
  | { status: 'ok'; role: 'EMPLOYEE'; companyId: string; userId: string }
  | { status: 'anonymous' }
  | { status: 'forbidden' };

export async function resolveCustomerActor(
  request: Request,
): Promise<{ actor: CustomerActor; headers: Headers }> {
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
      actor: {
        status: 'ok',
        role: 'COMPANY_ADMIN',
        companyId: session.user.companyId,
        userId: session.user.id,
      },
      headers,
    };
  }
  return {
    actor: {
      status: 'ok',
      role: 'EMPLOYEE',
      companyId: session.user.companyId,
      userId: session.user.id,
    },
    headers,
  };
}

export async function customerVisibilityWhere(
  actor: Extract<CustomerActor, { status: 'ok' }>,
): Promise<Prisma.CustomerWhereInput> {
  if (actor.role === 'COMPANY_ADMIN') {
    return { companyId: actor.companyId };
  }

  const ledTeams = await prisma.team.findMany({
    where: { companyId: actor.companyId, leaderId: actor.userId },
    select: { id: true },
  });
  if (ledTeams.length > 0) {
    return {
      companyId: actor.companyId,
      OR: [{ assignee: { teamId: { in: ledTeams.map((team) => team.id) } } }, { assigneeId: null }],
    };
  }
  return { companyId: actor.companyId, assigneeId: actor.userId };
}
