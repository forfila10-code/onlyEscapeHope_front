'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import WorkspaceCreateModal from './WorkspaceCreateModal';

/**
 * 헤더용 워크스페이스 전환 드롭다운
 */
export default function WorkspaceSwitcher() {
  const {
    workspaces,
    currentWorkspace,
    currentWorkspaceId,
    loading,
    selectWorkspace,
    createWorkspace,
  } = useWorkspace();

  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative" ref={dropdownRef}>
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

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="py-2">
              {workspaces.length === 0 ? (
                <p className="px-4 py-3 text-xs text-gray-400">워크스페이스가 없습니다.</p>
              ) : (
                workspaces.map((ws) => {
                  const isActive = ws.id === currentWorkspaceId;
                  return (
                    <button
                      key={ws.id}
                      type="button"
                      onClick={() => {
                        selectWorkspace(ws.id);
                        setOpen(false);
                      }}
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
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setCreateOpen(true);
                }}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-500 font-medium active:bg-gray-50"
              >
                <span className="text-base">＋</span>
                <span>새 워크스페이스 만들기</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push('/workspace/manage');
                }}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-500 font-medium active:bg-gray-50 border-t border-gray-50"
              >
                <span className="text-base">⚙️</span>
                <span>워크스페이스 관리</span>
              </button>
            </div>
          </div>
        </>
      )}

      <WorkspaceCreateModal
        open={createOpen}
        defaultName="공유 가계부"
        onClose={() => setCreateOpen(false)}
        onSubmit={async (name) => {
          await createWorkspace(name);
        }}
      />
    </div>
  );
}
