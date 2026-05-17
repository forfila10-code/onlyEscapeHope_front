import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import api from '../../api/axiosInstance';

/* ── 아바타 색상 팔레트 ── */
const AVATAR_COLORS = [
  'bg-blue-100 text-blue-600',
  'bg-purple-100 text-purple-600',
  'bg-green-100 text-green-600',
  'bg-orange-100 text-orange-600',
  'bg-pink-100 text-pink-600',
  'bg-teal-100 text-teal-600',
];

function avatarColor(index) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

/* ── 토스트 컴포넌트 ── */
function Toast({ message, visible }) {
  return (
    <div
      className={`fixed bottom-28 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-gray-900 text-white text-sm font-medium rounded-2xl shadow-lg whitespace-nowrap transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
      }`}
    >
      {message}
    </div>
  );
}

/* ── 섹션 카드 래퍼 ── */
function SectionCard({ children }) {
  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow-sm">
      {children}
    </div>
  );
}

/* ── 섹션 헤더 ── */
function SectionLabel({ children }) {
  return (
    <p className="px-5 pt-6 pb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
      {children}
    </p>
  );
}

export default function WorkspaceManagePage() {
  const navigate = useNavigate();
  const { currentWorkspace, currentWorkspaceId, members, loadWorkspaces } = useWorkspace();

  const [name, setName] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameEdited, setNameEdited] = useState(false);

  const [toast, setToast] = useState({ visible: false, message: '' });
  const toastTimer = useRef(null);

  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (currentWorkspace?.name) {
      setName(currentWorkspace.name);
    }
  }, [currentWorkspace]);

  const showToast = (message) => {
    clearTimeout(toastTimer.current);
    setToast({ visible: true, message });
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2400);
  };

  const handleNameSave = async () => {
    if (!name.trim() || name.trim() === currentWorkspace?.name) {
      setNameEdited(false);
      return;
    }
    setNameSaving(true);
    try {
      await api.put(`/api/workspaces/${currentWorkspaceId}`, { name: name.trim() });
      showToast('워크스페이스 이름이 변경되었습니다.');
      setNameEdited(false);
      if (loadWorkspaces) await loadWorkspaces();
    } catch {
      showToast('이름 변경에 실패했습니다.');
    } finally {
      setNameSaving(false);
    }
  };

  const handleInvite = async () => {
    try {
      const res = await api.post(`/api/workspaces/${currentWorkspaceId}/invite-token`);
      const inviteUrl = `${window.location.origin}/workspace/join/${res.data.token}`;

      if (navigator.share) {
        await navigator.share({
          title: `${currentWorkspace?.name ?? '워크스페이스'} 초대`,
          text: `PocketFree 가계부 워크스페이스에 초대합니다! 아래 링크를 눌러 참여하세요.`,
          url: inviteUrl,
        });
      } else {
        await navigator.clipboard.writeText(inviteUrl);
        showToast('초대 링크가 복사되었습니다 🔗');
      }
    } catch (err) {
      if (err?.name === 'AbortError') return;
      showToast('초대 링크 생성에 실패했습니다.');
    }
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await api.delete(`/api/workspaces/${currentWorkspaceId}`);
      localStorage.removeItem('currentWorkspaceId');
      // navigate 대신 하드 리다이렉트로 WorkspaceProvider 상태를 완전히 초기화합니다.
      window.location.replace('/home');
    } catch {
      showToast('워크스페이스 삭제에 실패했습니다.');
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f2f3f7] font-sans">

      {/* ── 상단 앱바 ── */}
      <header className="bg-white px-5 pt-12 pb-4 flex items-center gap-3 sticky top-0 z-10 shadow-[0_1px_0_rgba(0,0,0,0.06)]">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100 transition-colors -ml-1"
          aria-label="뒤로가기"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-800">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="text-lg font-extrabold text-gray-900 tracking-tight">워크스페이스 관리</h1>
      </header>

      {/* ── 콘텐츠 ── */}
      <main className="flex-1 overflow-y-auto px-4 pt-5 pb-16 space-y-2">

        {/* 워크스페이스 이름 */}
        <SectionLabel>워크스페이스 이름</SectionLabel>
        <SectionCard>
          <div className="px-5 py-4">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameEdited(true);
                }}
                placeholder="워크스페이스 이름"
                className="flex-1 bg-gray-50 rounded-xl px-4 py-3 text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-blue-300 transition"
              />
              <button
                type="button"
                onClick={handleNameSave}
                disabled={!nameEdited || nameSaving}
                className={`px-4 py-3 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                  nameEdited
                    ? 'bg-blue-500 text-white shadow-sm shadow-blue-200'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {nameSaving ? '저장 중' : '저장'}
              </button>
            </div>
          </div>
        </SectionCard>

        {/* 멤버 */}
        <SectionLabel>멤버</SectionLabel>
        <SectionCard>
          {/* 멤버 목록 헤더 */}
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <span className="text-sm font-bold text-gray-700">
              참여 중인 멤버 <span className="text-blue-500">{members.length}</span>
            </span>
            <button
              type="button"
              onClick={handleInvite}
              className="flex items-center gap-1.5 bg-blue-50 text-blue-600 text-xs font-bold px-3 py-2 rounded-xl active:scale-95 transition-transform"
            >
              <span>+</span>
              <span>멤버 초대하기</span>
            </button>
          </div>

          {/* 멤버 리스트 */}
          <div className="divide-y divide-gray-50 pb-2">
            {members.length === 0 ? (
              <p className="px-5 py-4 text-sm text-gray-400">멤버 정보를 불러오는 중입니다.</p>
            ) : (
              members.map((member, index) => {
                const initials = (member.nickname ?? member.name ?? '?').slice(0, 2);
                const isMe = index === 0;
                return (
                  <div key={member.id ?? index} className="flex items-center gap-4 px-5 py-4">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${avatarColor(index)}`}
                    >
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {member.nickname ?? member.name ?? '알 수 없음'}
                        {isMe && (
                          <span className="ml-2 text-[10px] bg-blue-100 text-blue-600 font-bold px-1.5 py-0.5 rounded-md">
                            나
                          </span>
                        )}
                      </p>
                      {member.email && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{member.email}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-300 font-medium flex-shrink-0">
                      {member.role === 'OWNER' ? '관리자' : '멤버'}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </SectionCard>

        {/* 위험 구역 */}
        <SectionLabel>위험 구역</SectionLabel>
        <SectionCard>
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="w-full px-5 py-4 flex items-center gap-3 active:bg-red-50 transition-colors"
            >
              <span className="text-xl">🗑️</span>
              <span className="text-sm font-semibold text-red-500">이 워크스페이스 삭제하기</span>
            </button>
          ) : (
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm font-semibold text-gray-800">정말 삭제할까요?</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                워크스페이스를 삭제하면 모든 거래 내역과 멤버 정보가 영구적으로 사라집니다. 이 작업은 되돌릴 수 없습니다.
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 py-3 rounded-xl bg-gray-100 text-sm font-bold text-gray-600 active:scale-95 transition-transform"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className="flex-1 py-3 rounded-xl bg-red-500 text-sm font-bold text-white shadow-sm shadow-red-200 active:scale-95 transition-transform disabled:opacity-60"
                >
                  {deleting ? '삭제 중…' : '삭제하기'}
                </button>
              </div>
            </div>
          )}
        </SectionCard>

      </main>

      {/* 토스트 */}
      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
