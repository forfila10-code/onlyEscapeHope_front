import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { CookieToSet } from './cookies';

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey || !anonKey.startsWith('eyJ')) {
    console.error(
      '[Supabase] NEXT_PUBLIC_SUPABASE_ANON_KEY 가 JWT가 아닙니다. Dashboard → Project Settings → API → anon public 키(eyJ로 시작)를 .env.local에 넣으세요.'
    );
  }

  return { url: url!, anonKey: anonKey! };
}

/**
 * Server Components / Server Actions / Route Handlers용 Supabase 클라이언트
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Component 에서 set 호출 시 무시
        }
      },
    },
  });
}
