import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr';

import { requiredServerEnv } from '~/lib/env.server';

import type { SupabaseClient } from '@supabase/supabase-js';

export type SupabaseServerContext = {
  supabase: SupabaseClient;
  headers: Headers;
};

export function createSupabaseServerClient(request: Request): SupabaseServerContext {
  const headers = new Headers();
  const supabase = createServerClient(
    requiredServerEnv('SUPABASE_URL'),
    requiredServerEnv('SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll() {
          return parseCookieHeader(request.headers.get('Cookie') ?? '');
        },
        setAll(cookiesToSet, cacheHeaders) {
          for (const { name, value, options } of cookiesToSet) {
            headers.append('Set-Cookie', serializeCookieHeader(name, value, options));
          }
          for (const [key, value] of Object.entries(cacheHeaders)) {
            headers.set(key, value);
          }
        },
      },
    },
  );

  return { supabase, headers };
}

export function mergeResponseHeaders(response: Response, extra: Headers): Response {
  const headers = new Headers(response.headers);
  extra.forEach((value, key) => {
    if (key.toLowerCase() !== 'set-cookie') {
      headers.set(key, value);
    }
  });
  for (const cookie of extra.getSetCookie()) {
    headers.append('Set-Cookie', cookie);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
