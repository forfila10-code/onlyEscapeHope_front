import React from 'react';
import { useWorkspace } from '../contexts/WorkspaceContext';

/**
 * 상단 헤더에서 현재 워크스페이스를 전환하거나 새 워크스페이스를 만드는 UI입니다.
 */
export default function WorkspaceSwitcher() {
  const {
    workspaces,
    currentWorkspaceId,
    loading,
    selectWorkspace,
    createWorkspace,
  } = useWorkspace();

  // 사용자가 입력한 이름으로 공유 워크스페이스를 생성하고 즉시 선택 상태로 전환합니다.
  const handleCreate = async () => {
    const name = window.prompt('새 워크스페이스 이름을 입력해 주세요.', '공유 가계부');
    if (!name?.trim()) return;

    try {
      await createWorkspace(name.trim());
    } catch (error) {
      console.error('[WorkspaceSwitcher] 워크스페이스 생성 실패:', error);
      alert('워크스페이스 생성에 실패했습니다.');
    }
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={currentWorkspaceId ?? ''}
        onChange={(e) => selectWorkspace(e.target.value)}
        disabled={loading || workspaces.length === 0}
        className="max-w-[180px] bg-gray-100 rounded-2xl px-3 py-2 text-xs font-bold text-gray-800 outline-none"
      >
        {workspaces.length === 0 ? (
          <option value="">워크스페이스 로딩 중</option>
        ) : (
          workspaces.map((workspace) => (
            <option key={workspace.id} value={workspace.id}>
              {workspace.name}
            </option>
          ))
        )}
      </select>
      <button
        type="button"
        onClick={handleCreate}
        className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-bold text-gray-600 active:scale-90 transition-transform"
        aria-label="워크스페이스 추가"
      >
        +
      </button>
    </div>
  );
}
