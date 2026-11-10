import { redirect } from 'react-router';

import { authenticatedUserContext, resolveSession } from '~/features/auth/api/auth.server';
import { AppShell } from '~/features/shell/components/AppShell';
import { isShellRole } from '~/features/shell/type';
import { createSupabaseServerClient, mergeResponseHeaders } from '~/lib/supabase.server';

import type { JSX } from 'react';
import type { ShellAccount } from '~/features/shell/type';
import type { Route } from './+types/authenticated';

const authMiddleware: Route.MiddlewareFunction = async ({ request, context }, next) => {
  const { supabase, headers } = createSupabaseServerClient(request);
  const session = await resolveSession(supabase);

  if (session.status !== 'authenticated') {
    if (session.status === 'rejected') {
      await supabase.auth.signOut();
    }
    throw redirect('/login', { headers });
  }

  context.set(authenticatedUserContext, session.user);
  const response = await next();
  if (!(response instanceof Response)) {
    throw new Error('인증 middleware 다음에 응답이 없습니다.');
  }
  return mergeResponseHeaders(response, headers);
};

export const middleware: Route.MiddlewareFunction[] = [authMiddleware];

export function loader({ context }: Route.LoaderArgs): ShellAccount {
  const user = context.get(authenticatedUserContext);
  if (!user) {
    throw redirect('/login');
  }
  if (!isShellRole(user.role)) {
    throw new Error('알 수 없는 사용자 권한입니다.');
  }

  return { loginId: user.loginId, companyName: user.companyName };
}

export default function AuthenticatedLayout({ loaderData }: Route.ComponentProps): JSX.Element {
  return <AppShell account={loaderData} />;
}
