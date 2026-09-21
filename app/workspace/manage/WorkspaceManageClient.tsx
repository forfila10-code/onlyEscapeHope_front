'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspace } from '../../../contexts/WorkspaceContext';
import { createClient } from '../../../utils/supabase/client';

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-600',
  'bg-purple-100 text-purple-600',
  'bg-green-100 text-green-600',
  'bg-orange-100 text-orange-600',
  'bg-pink-100 text-pink-600',
  'bg-teal-100 text-teal-600',
];

function avatarColor(index: number) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

function Toast({ message, visible }: { message: string; visible: boolean }) {
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

/**
 * 워크스페이스 이름 변경 / 초대 / 멤버 강퇴 / 나가기 / 삭제
 */
export default function WorkspaceManagePage() {
  const router = useRouter();
  const supabase = createClient();
  const {
    user,
    currentWorkspace,
    currentWorkspaceId,
    members,
    loadWorkspaces,
    refreshWorkspaceData,
  } = useWorkspace();

  const [name, setName] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameEdited, setNameEdited] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '' });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [kickingUserId, setKickingUserId] = useState<string | null>(null);

  const myUserId = user?.id;
  const myMembership = members.find((m) => m.user_id === myUserId);
  const isOwner = myMembership?.role === 'OWNER';
  const ownerCount = members.filter((m) => m.role === 'OWNER').length;
  const canLeave = members.length > 1 && !(isOwner && ownerCount <= 1);

  useEffect(() => {
    if (currentWorkspace?.name) setName(currentWorkspace.name);
  }, [currentWorkspace]);

  const showToast = (message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ visible: true, message });
    toastTimer.current = setTimeout(
      () => setToast((t) => ({ ...t, visible: false })),
      2400
    );
  };

  const handleNameSave = async () => {
    if (!currentWorkspaceId || !name.trim() || name.trim() === currentWorkspace?.name) {
      setNameEdited(false);
      return;
    }
    setNameSaving(true);
    try {
      const { error } = await supabase
        .from('workspaces')
        .update({ name: name.trim(), updated_at: new Date().toISOString() })
        .eq('id', currentWorkspaceId);
      if (error) throw error;
      showToast('워크스페이스 이름이 변경되었습니다.');
      setNameEdited(false);
      await loadWorkspaces();
    } catch {
      showToast('이름 변경에 실패했습니다.');
    } finally {
      setNameSaving(false);
    }
  };

  const handleInvite = async () => {
    if (!currentWorkspaceId || !user) return;
    try {
      // 기존 초대 삭제 후 새 토큰 발급 (OWNER만)
      await supabase.from('workspace_invites').delete().eq('workspace_id', currentWorkspaceId);

      const token = crypto.randomUUID().replace(/-/g, '');
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

      const { error } = await supabase.from('workspace_invites').insert({
        workspace_id: currentWorkspaceId,
        created_by: user.id,
        token,
        expires_at: expiresAt,
      });
      if (error) throw error;

      const inviteUrl = `${window.location.origin}/workspace/join/${token}`;

      if (navigator.share) {
        await navigator.share({
          title: `${currentWorkspace?.name ?? '워크스페이스'} 초대`,
          text: 'PocketFree 가계부 워크스페이스에 초대합니다!',
          url: inviteUrl,
        });
      } else {
        await navigator.clipboard.writeText(inviteUrl);
        showToast('초대 링크가 복사되었습니다 🔗');
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.error(err);
      showToast('초대 링크 생성에 실패했습니다.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!currentWorkspaceId) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('workspaces').delete().eq('id', currentWorkspaceId);
      if (error) throw error;
      localStorage.removeItem('currentWorkspaceId');
      window.location.replace('/');
    } catch {
      showToast('워크스페이스 삭제에 실패했습니다.');
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleLeave = async () => {
    if (!myUserId || !currentWorkspaceId) return;
    setLeaving(true);
    try {
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('workspace_id', currentWorkspaceId)
        .eq('user_id', myUserId);
      if (error) throw error;
      localStorage.removeItem('currentWorkspaceId');
      window.location.replace('/');
    } catch (err: any) {
      showToast(err?.message || '나가기에 실패했습니다.');
      setLeaving(false);
    }
  };

  const handleKick = async (targetUserId: string) => {
    if (!currentWorkspaceId) return;
    setKickingUserId(targetUserId);
    try {
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('workspace_id', currentWorkspaceId)
        .eq('user_id', targetUserId);
      if (error) throw error;
      showToast('멤버를 내보냈습니다.');
      await loadWorkspaces();
      refreshWorkspaceData();
    } catch (err: any) {
      showToast(err?.message || '멤버 내보내기에 실패했습니다.');
    } finally {
      setKickingUserId(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f2f3f7] font-sans">
      <header className="bg-white px-5 pt-12 pb-4 flex items-center gap-3 sticky top-0 z-10 shadow-[0_1px_0_rgba(0,0,0,0.06)]">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100 -ml-1"
          aria-label="뒤로가기"
        >
          ←
        </button>
        <h1 className="text-lg font-extrabold text-gray-900 tracking-tight">워크스페이스 관리</h1>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pt-5 pb-16 space-y-2">
        <p className="px-1 pt-2 pb-1 text-xs font-bold text-gray-400 uppercase tracking-wider">
          워크스페이스 이름
        </p>
        <div className="bg-white rounded-3xl overflow-hidden shadow-sm px-5 py-4">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameEdited(true);
              }}
              disabled={!isOwner}
              className="flex-1 bg-gray-50 rounded-xl px-4 py-3 text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-blue-300"
            />
            {isOwner && nameEdited && (
              <button
                type="button"
                onClick={handleNameSave}
                disabled={nameSaving}
                className="px-4 py-3 rounded-xl bg-blue-500 text-white text-sm font-bold disabled:opacity-50"
              >
                {nameSaving ? '저장…' : '저장'}
              </button>
            )}
          </div>
        </div>

        <p className="px-1 pt-4 pb-1 text-xs font-bold text-gray-400 uppercase tracking-wider">
          멤버 ({members.length})
        </p>
        <div className="bg-white rounded-3xl overflow-hidden shadow-sm divide-y divide-gray-50">
          {members.map((member, index) => (
            <div key={member.user_id} className="flex items-center gap-3 px-5 py-4">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${avatarColor(index)}`}
              >
                {(member.nickname || '?').slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {member.nickname}
                  {member.user_id === myUserId ? ' (나)' : ''}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {member.role === 'OWNER' ? '소유자' : '멤버'}
                  {member.email ? ` · ${member.email}` : ''}
                </p>
              </div>
              {isOwner && member.user_id !== myUserId && member.role !== 'OWNER' && (
                <button
                  type="button"
                  onClick={() => handleKick(member.user_id)}
                  disabled={kickingUserId === member.user_id}
                  className="text-xs font-bold text-red-500 px-3 py-2 rounded-xl bg-red-50"
                >
                  {kickingUserId === member.user_id ? '…' : '내보내기'}
                </button>
              )}
            </div>
          ))}
        </div>

        {isOwner && (
          <>
            <p className="px-1 pt-4 pb-1 text-xs font-bold text-gray-400 uppercase tracking-wider">
              초대
            </p>
            <div className="bg-white rounded-3xl overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={handleInvite}
                className="w-full flex items-center gap-4 px-5 py-4 active:bg-gray-50"
              >
                <div className="w-11 h-11 bg-green-50 rounded-2xl flex items-center justify-center text-xl">
                  🔗
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-gray-900">초대 링크 만들기</p>
                  <p className="text-xs text-gray-400 mt-0.5">48시간 동안 유효합니다</p>
                </div>
              </button>
            </div>
          </>
        )}

        <p className="px-1 pt-4 pb-1 text-xs font-bold text-gray-400 uppercase tracking-wider">
          위험 구역
        </p>
        <div className="bg-white rounded-3xl overflow-hidden shadow-sm divide-y divide-gray-50">
          {canLeave && (
            <button
              type="button"
              onClick={handleLeave}
              disabled={leaving}
              className="w-full px-5 py-4 text-left text-sm font-semibold text-orange-500 active:bg-gray-50"
            >
              {leaving ? '나가는 중…' : '워크스페이스 나가기'}
            </button>
          )}
          {isOwner && (
            <div className="px-5 py-4">
              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="w-full py-3 rounded-2xl text-sm font-bold text-red-500 bg-red-50"
                >
                  워크스페이스 삭제
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-center text-gray-500">
                    모든 거래/멤버가 삭제됩니다. 되돌릴 수 없습니다.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="flex-1 py-3 rounded-2xl bg-gray-100 text-sm font-bold text-gray-600"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteConfirm}
                      disabled={deleting}
                      className="flex-1 py-3 rounded-2xl bg-red-500 text-sm font-bold text-white"
                    >
                      {deleting ? '삭제 중…' : '삭제하기'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
