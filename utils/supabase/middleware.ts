import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * 미들웨어에서 세션을 갱신하고, 보호 경로 접근 시 로그인으로 보냅니다.
 *
 * @param request Next.js 미들웨어 요청
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic =
    path.startsWith('/login') ||
    path.startsWith('/auth') ||
    path.startsWith('/workspace/join');

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    const nextPath = `${path}${request.nextUrl.search}`;
    url.pathname = '/login';
    url.search = nextPath && nextPath !== '/' ? `?next=${encodeURIComponent(nextPath)}` : '';
    return NextResponse.redirect(url);
  }

  if (user && path.startsWith('/login')) {
    const url = request.nextUrl.clone();
    const next = request.nextUrl.searchParams.get('next');
    if (next && next.startsWith('/') && !next.startsWith('//')) {
      const [pathname, query] = next.split('?');
      url.pathname = pathname;
      url.search = query ? `?${query}` : '';
    } else {
      url.pathname = '/';
      url.search = '';
    }
    return NextResponse.redirect(url);
  }

  return response;
}
