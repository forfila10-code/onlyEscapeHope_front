'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '../../../../utils/supabase/client';

const STATUS = {
  LOADING: 'loading',
  READY: 'ready',
  JOINING: 'joining',
  ALREADY: 'already',
  SUCCESS: 'success',
  EXPIRED: 'expired',
  INVALID: 'invalid',
  ERROR: 'error',
} as const;

type Status = (typeof STATUS)[keyof typeof STATUS];

/**
 * 초대 토큰으로 워크스페이스에 가입하는 페이지
 */
export default function WorkspaceJoinClient() {
  const params = useParams();
  const token = String(params.token ?? '');
  const router = useRouter();
  const supabase = createClient();

  const [status, setStatus] = useState<Status>(STATUS.LOADING);
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const run = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace(`/login?next=/workspace/join/${token}`);
        return;
      }

      const { data, error } = await supabase.rpc('preview_workspace_invite', {
        invite_token: token,
      });

      if (error) {
        const msg = error.message ?? '';
        if (msg.includes('만료')) {
          setStatus(STATUS.EXPIRED);
          setErrorMessage(msg);
        } else if (msg.includes('유효하지')) {
          setStatus(STATUS.INVALID);
          setErrorMessage(msg);
        } else {
          setStatus(STATUS.ERROR);
          setErrorMessage('초대 정보를 불러오지 못했습니다.');
        }
        return;
      }

      const row = Array.isArray(data) ? data[0] : data;
      if (!row) {
        setStatus(STATUS.INVALID);
        setErrorMessage('유효하지 않은 초대 링크입니다.');
        return;
      }

      setWorkspaceName(row.workspace_name ?? '워크스페이스');
      setWorkspaceId(row.workspace_id ?? null);
      setMemberCount(Number(row.member_count ?? 0));
      setStatus(row.already_joined ? STATUS.ALREADY : STATUS.READY);
    };

    run();
  }, [token, router, supabase]);

  const handleJoin = async () => {
    setStatus(STATUS.JOINING);
    try {
      const { data, error } = await supabase.rpc('join_workspace_by_token', {
        invite_token: token,
      });
      if (error) throw error;
      const joinedId = (data as string | null) ?? workspaceId;
      if (joinedId) {
        localStorage.setItem('currentWorkspaceId', joinedId);
      }
      setStatus(STATUS.SUCCESS);
    } catch (err: any) {
      const msg = err?.message ?? '';
      if (msg.includes('만료')) {
        setStatus(STATUS.EXPIRED);
        setErrorMessage(msg);
      } else {
        setStatus(STATUS.ERROR);
        setErrorMessage('가입에 실패했습니다. 다시 시도해 주세요.');
      }
    }
  };

  const goHome = () => {
    if (workspaceId) {
      localStorage.setItem('currentWorkspaceId', workspaceId);
    }
    window.location.replace('/');
  };

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-[#f2f3f7] flex flex-col items-center justify-center px-6 font-sans">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm p-8 flex flex-col items-center gap-5">
        {children}
      </div>
    </div>
  );

  if (status === STATUS.LOADING) {
    return (
      <Wrapper>
        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-2xl animate-pulse">
          🔗
        </div>
        <p className="text-sm font-medium text-gray-400">초대 링크를 확인하는 중…</p>
      </Wrapper>
    );
  }

  if (status === STATUS.EXPIRED || status === STATUS.INVALID) {
    return (
      <Wrapper>
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center text-3xl">
          ⏰
        </div>
        <div className="text-center space-y-1">
          <p className="text-base font-bold text-gray-900">
            {status === STATUS.EXPIRED ? '만료된 초대 링크' : '유효하지 않은 초대 링크'}
          </p>
          <p className="text-xs text-gray-400">{errorMessage}</p>
        </div>
        <button
          type="button"
          onClick={goHome}
          className="w-full py-3.5 rounded-2xl bg-gray-100 text-sm font-bold text-gray-600"
        >
          홈으로 돌아가기
        </button>
      </Wrapper>
    );
  }

  if (status === STATUS.ERROR) {
    return (
      <Wrapper>
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center text-3xl">
          ❌
        </div>
        <p className="text-base font-bold text-gray-900">오류가 발생했습니다</p>
        <p className="text-xs text-gray-400">{errorMessage}</p>
        <button
          type="button"
          onClick={goHome}
          className="w-full py-3.5 rounded-2xl bg-gray-100 text-sm font-bold text-gray-600"
        >
          홈으로 돌아가기
        </button>
      </Wrapper>
    );
  }

  if (status === STATUS.SUCCESS || status === STATUS.ALREADY) {
    return (
      <Wrapper>
        <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center text-3xl">
          ✅
        </div>
        <div className="text-center space-y-1">
          <p className="text-base font-bold text-gray-900">
            {status === STATUS.ALREADY ? '이미 가입된 워크스페이스' : '가입 완료!'}
          </p>
          <p className="text-sm text-gray-500">{workspaceName}</p>
        </div>
        <button
          type="button"
          onClick={goHome}
          className="w-full py-3.5 rounded-2xl bg-blue-500 text-sm font-bold text-white"
        >
          홈으로 이동
        </button>
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center text-3xl">
        🏠
      </div>
      <div className="text-center space-y-1">
        <p className="text-base font-bold text-gray-900">{workspaceName}</p>
        <p className="text-xs text-gray-400">멤버 {memberCount}명 · 초대에 응하시겠어요?</p>
      </div>
      <button
        type="button"
        onClick={handleJoin}
        disabled={status === STATUS.JOINING}
        className="w-full py-3.5 rounded-2xl bg-blue-500 text-sm font-bold text-white disabled:opacity-60"
      >
        {status === STATUS.JOINING ? '가입 중…' : '참여하기'}
      </button>
      <button type="button" onClick={goHome} className="text-xs text-gray-400 font-medium">
        취소
      </button>
    </Wrapper>
  );
}
