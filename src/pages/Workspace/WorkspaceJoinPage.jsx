import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axiosInstance';

/* ── 상태 종류 ── */
const STATUS = {
  LOADING: 'loading',
  READY: 'ready',
  JOINING: 'joining',
  ALREADY: 'already',
  SUCCESS: 'success',
  EXPIRED: 'expired',
  INVALID: 'invalid',
  ERROR: 'error',
};

export default function WorkspaceJoinPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState(STATUS.LOADING);
  const [workspaceName, setWorkspaceName] = useState('');
  const [memberCount, setMemberCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');

    if (!accessToken) {
      // 비로그인 → 현재 URL을 기억하고 로그인 페이지로 보냄
      localStorage.setItem('pendingRedirect', `/workspace/join/${token}`);
      navigate('/login', { replace: true });
      return;
    }

    // 로그인 상태 → 초대 정보 조회
    api
      .get(`/api/workspaces/join/${token}`)
      .then((res) => {
        setWorkspaceName(res.data.workspaceName);
        setMemberCount(res.data.memberCount);
        if (res.data.alreadyJoined) {
          setStatus(STATUS.ALREADY);
        } else {
          setStatus(STATUS.READY);
        }
      })
      .catch((err) => {
        const msg = err?.response?.data?.error ?? '';
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
      });
  }, [token, navigate]);

  const handleJoin = async () => {
    setStatus(STATUS.JOINING);
    try {
      await api.post(`/api/workspaces/join/${token}`);
      setStatus(STATUS.SUCCESS);
    } catch (err) {
      const msg = err?.response?.data?.error ?? '';
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
    window.location.replace('/home');
  };

  /* ── 공통 래퍼 ── */
  const Wrapper = ({ children }) => (
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
        <p className="text-sm font-medium text-gray-400">초대 링크를 확인하는 중입니다…</p>
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
          <p className="text-xs text-gray-400 leading-relaxed">{errorMessage}</p>
        </div>
        <button
          type="button"
          onClick={goHome}
          className="w-full py-3.5 rounded-2xl bg-gray-100 text-sm font-bold text-gray-600 active:scale-95 transition-transform"
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
        <div className="text-center space-y-1">
          <p className="text-base font-bold text-gray-900">오류가 발생했습니다</p>
          <p className="text-xs text-gray-400">{errorMessage}</p>
        </div>
        <button
          type="button"
          onClick={goHome}
          className="w-full py-3.5 rounded-2xl bg-gray-100 text-sm font-bold text-gray-600 active:scale-95 transition-transform"
        >
          홈으로 돌아가기
        </button>
      </Wrapper>
    );
  }

  if (status === STATUS.SUCCESS) {
    return (
      <Wrapper>
        <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center text-4xl">
          🎉
        </div>
        <div className="text-center space-y-1">
          <p className="text-base font-bold text-gray-900">가입 완료!</p>
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-blue-500">{workspaceName}</span>에
            합류했습니다.
          </p>
        </div>
        <button
          type="button"
          onClick={goHome}
          className="w-full py-3.5 rounded-2xl bg-blue-500 text-sm font-bold text-white shadow-sm shadow-blue-200 active:scale-95 transition-transform"
        >
          워크스페이스 시작하기
        </button>
      </Wrapper>
    );
  }

  if (status === STATUS.ALREADY) {
    return (
      <Wrapper>
        <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-4xl">
          ✅
        </div>
        <div className="text-center space-y-1">
          <p className="text-base font-bold text-gray-900">이미 참여 중인 워크스페이스</p>
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-blue-500">{workspaceName}</span>의
            멤버입니다.
          </p>
        </div>
        <button
          type="button"
          onClick={goHome}
          className="w-full py-3.5 rounded-2xl bg-blue-500 text-sm font-bold text-white shadow-sm shadow-blue-200 active:scale-95 transition-transform"
        >
          바로 이동하기
        </button>
      </Wrapper>
    );
  }

  /* READY / JOINING */
  return (
    <Wrapper>
      {/* 워크스페이스 아이콘 */}
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-3xl shadow-md shadow-blue-100">
        🗂️
      </div>

      {/* 안내 문구 */}
      <div className="text-center space-y-1.5">
        <p className="text-xs text-gray-400 font-medium">워크스페이스 초대</p>
        <p className="text-xl font-extrabold text-gray-900 leading-tight">{workspaceName}</p>
        <p className="text-xs text-gray-400">
          현재 멤버{' '}
          <span className="font-bold text-blue-500">{memberCount}명</span>이 함께하고 있어요
        </p>
      </div>

      {/* 초대 안내 카드 */}
      <div className="w-full bg-blue-50 rounded-2xl px-4 py-3 flex items-start gap-3">
        <span className="text-lg">🔗</span>
        <p className="text-xs text-blue-700 leading-relaxed font-medium">
          이 링크를 통해{' '}
          <span className="font-bold">{workspaceName}</span>에
          멤버로 참여할 수 있습니다.
          <br />
          초대 링크는 <span className="font-bold">48시간</span> 동안 유효합니다.
        </p>
      </div>

      {/* 가입 버튼 */}
      <button
        type="button"
        onClick={handleJoin}
        disabled={status === STATUS.JOINING}
        className="w-full py-4 rounded-2xl bg-blue-500 text-sm font-bold text-white shadow-sm shadow-blue-200 active:scale-95 transition-transform disabled:opacity-60"
      >
        {status === STATUS.JOINING ? '가입하는 중…' : '워크스페이스 참여하기'}
      </button>

      <button
        type="button"
        onClick={goHome}
        className="text-xs text-gray-400 font-medium active:opacity-50 transition-opacity"
      >
        취소
      </button>
    </Wrapper>
  );
}
