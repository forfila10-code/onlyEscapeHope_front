import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const oauthError = searchParams.get('error');
  let next = searchParams.get('next') ?? '/';
  if (!next.startsWith('/')) next = '/';

  // 카카오/Supabase가 에러 쿼리로 돌려보낸 경우
  if (oauthError) {
    console.error('[auth/callback]', oauthError, searchParams.get('error_description'));
    return NextResponse.redirect(`${origin}/login?error=${oauthError}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey || !anonKey.startsWith('eyJ')) {
    console.error(
      '[auth/callback] NEXT_PUBLIC_SUPABASE_ANON_KEY 가 올바르지 않습니다. eyJ로 시작하는 anon public 키를 넣으세요.'
    );
    return NextResponse.redirect(`${origin}/login?error=bad_anon_key`);
  }

  // 세션 쿠키를 redirect 응답에 직접 심기
  let redirectResponse = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          redirectResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error('[auth/callback] 세션 교환 실패:', error.message);
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  return redirectResponse;
}
