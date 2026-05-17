import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../contexts/WorkspaceContext';

export default function WorkspaceSwitcher() {
  const {
    workspaces,
    currentWorkspace,
    currentWorkspaceId,
    loading,
    selectWorkspace,
    createWorkspace,
  } = useWorkspace();

  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleCreate = async () => {
    setOpen(false);
    const name = window.prompt('새 워크스페이스 이름을 입력해 주세요.', '공유 가계부');
    if (!name?.trim()) return;
    try {
      await createWorkspace(name.trim());
    } catch (error) {
      console.error('[WorkspaceSwitcher] 워크스페이스 생성 실패:', error);
      alert('워크스페이스 생성에 실패했습니다.');
    }
  };

  const handleSelect = (id) => {
    selectWorkspace(id);
    setOpen(false);
  };

  const handleManage = () => {
    setOpen(false);
    navigate('/workspace/manage');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 현재 워크스페이스 표시 버튼 */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        disabled={loading}
        className="flex items-center gap-1.5 bg-gray-100 rounded-2xl px-3 py-2 text-xs font-bold text-gray-800 max-w-[180px] active:scale-95 transition-transform"
      >
        <span className="truncate">
          {loading ? '로딩 중…' : (currentWorkspace?.name ?? '워크스페이스')}
        </span>
        <span className={`text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>

      {/* 드롭다운 패널 */}
      {open && (
        <>
          {/* 바깥 클릭 시 닫기용 오버레이 */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            {/* 워크스페이스 목록 */}
            <div className="py-2">
              {workspaces.length === 0 ? (
                <p className="px-4 py-3 text-xs text-gray-400">워크스페이스가 없습니다.</p>
              ) : (
                workspaces.map((ws) => {
                  const isActive = String(ws.id) === String(currentWorkspaceId);
                  return (
                    <button
                      key={ws.id}
                      type="button"
                      onClick={() => handleSelect(ws.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors active:bg-gray-50 ${
                        isActive ? 'text-blue-600 font-bold' : 'text-gray-700 font-medium'
                      }`}
                    >
                      <span className="truncate">{ws.name}</span>
                      {isActive && <span className="text-blue-500 text-xs ml-2">✓</span>}
                    </button>
                  );
                })
              )}
            </div>

            <div className="border-t border-gray-100">
              {/* 새 워크스페이스 만들기 */}
              <button
                type="button"
                onClick={handleCreate}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-500 font-medium active:bg-gray-50 transition-colors"
              >
                <span className="text-base">＋</span>
                <span>새 워크스페이스 만들기</span>
              </button>

              {/* 워크스페이스 관리 */}
              <button
                type="button"
                onClick={handleManage}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-500 font-medium active:bg-gray-50 transition-colors border-t border-gray-50"
              >
                <span className="text-base">⚙️</span>
                <span>워크스페이스 관리</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
