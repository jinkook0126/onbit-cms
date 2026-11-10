import { createSupabaseServerClient } from '~/lib/supabase.server';

export type SignOutResult = { ok: true; headers: Headers } | { ok: false };

export async function signOutSession(request: Request): Promise<SignOutResult> {
  const { supabase, headers } = createSupabaseServerClient(request);
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('로그아웃에 실패했습니다.', error);
    return { ok: false };
  }
  return { ok: true, headers };
}
