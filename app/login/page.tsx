'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Capacitor } from '@capacitor/core';
import { createClient } from '../../utils/supabase/client';

function LoginForm() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/';
  const errorCode = searchParams.get('error');

  const errorText =
    errorCode === 'auth_failed'
      ? '로그인에 실패했습니다. 다시 시도해 주세요.'
      : errorCode === 'bad_anon_key'
        ? 'Supabase anon 키가 올바르지 않습니다. .env.local을 확인하세요.'
        : errorCode === 'invalid_scope'
          ? '카카오 동의 항목(이메일) 설정이 필요합니다.'
          : errorCode === 'bad_oauth_state'
            ? '로그인 세션이 만료되었습니다. 다시 시도해 주세요.'
            : errorCode
              ? '로그인 중 오류가 발생했습니다.'
              : '';

  const handleKakaoLogin = async () => {
    // 앱(Capacitor) WebView는 origin 이 localhost 로 잡힐 수 있어 배포 URL을 고정합니다.
    const origin = Capacitor.isNativePlatform()
      ? 'https://only-escape-hope-front.vercel.app'
      : window.location.origin;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        scopes: 'profile_nickname',
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (error) {
      console.error('카카오 로그인 에러:', error.message);
      alert('로그인 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f2f3f7] font-sans px-6">
      <div className="text-center mb-10">
        <div className="text-6xl mb-4">💰</div>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">PocketFree</h1>
        <p className="text-gray-500">우리 부부의 현명한 가계부</p>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-md w-full max-w-xs text-center">
        <h2 className="text-lg font-bold text-gray-800 mb-6">시작하기</h2>
        {errorText && (
          <p className="mb-4 text-xs font-semibold text-red-500 bg-red-50 rounded-2xl px-3 py-2">
            {errorText}
          </p>
        )}
        <button
          type="button"
          onClick={handleKakaoLogin}
          className="w-full flex items-center justify-center gap-3 bg-[#FEE500] text-[#000000] font-bold py-3 px-4 rounded-xl hover:bg-[#E5CF00] transition-colors"
        >
          <span className="text-xl">💬</span>
          카카오로 3초 만에 시작
        </button>
      </div>

      <p className="mt-8 text-xs text-gray-400 text-center">
        로그인 시 이용약관 및 개인정보 처리방침에 동의하게 됩니다.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-gray-400">로딩 중…</div>}>
      <LoginForm />
    </Suspense>
  );
}
