import { data, redirect } from 'react-router';

import { resolveSession } from '~/features/auth/api/auth.server';
import LoginPage from '~/features/auth/components/LoginPage';
import { createSupabaseServerClient } from '~/lib/supabase.server';

import type { JSX } from 'react';
import type { Route } from './+types/login';

export function meta(): Route.MetaDescriptors {
  return [{ title: '로그인 | 온빛 CMS' }];
}

export async function loader({
  request,
}: Route.LoaderArgs): Promise<ReturnType<typeof data<null>>> {
  const { supabase, headers } = createSupabaseServerClient(request);
  const session = await resolveSession(supabase);

  if (session.status === 'authenticated') {
    throw redirect('/', { headers });
  }

  if (session.status === 'rejected') {
    await supabase.auth.signOut();
  }

  return data(null, { headers });
}

export default function Login(): JSX.Element {
  return <LoginPage />;
}
