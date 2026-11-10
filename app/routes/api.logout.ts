import { signOutSession } from '~/features/auth/api/logout.server';
import { mergeResponseHeaders } from '~/lib/supabase.server';

import type { Route } from './+types/api.logout';

function methodNotAllowed(): Response {
  return Response.json({ ok: false }, { status: 405, headers: { 'Cache-Control': 'no-store' } });
}

export function loader(): Response {
  return methodNotAllowed();
}

export async function action({ request }: Route.ActionArgs): Promise<Response> {
  if (request.method !== 'POST') {
    return methodNotAllowed();
  }

  const result = await signOutSession(request);
  if (!result.ok) {
    return Response.json({ ok: false }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }

  return mergeResponseHeaders(
    Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } }),
    result.headers,
  );
}
