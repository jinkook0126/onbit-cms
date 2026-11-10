import { Outlet, redirect } from 'react-router';

import { authenticatedUserContext, resolveSession } from '~/features/auth/api/auth.server';
import { createSupabaseServerClient, mergeResponseHeaders } from '~/lib/supabase.server';

import type { JSX } from 'react';
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

export function loader(): null {
  return null;
}

export default function AuthenticatedLayout(): JSX.Element {
  return <Outlet />;
}
