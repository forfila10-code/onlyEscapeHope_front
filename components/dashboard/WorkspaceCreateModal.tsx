'use client';

import { useEffect, useState } from 'react';

interface WorkspaceCreateModalProps {
  /** 모달 표시 여부 */
  open: boolean;
  /** 입력 기본값 */
  defaultName?: string;
  /** 닫기 */
  onClose: () => void;
  /** 이름 확정 후 생성. 실패 시 throw */
  onSubmit: (name: string) => Promise<void>;
}

/**
 * 워크스페이스 생성 모달 (window.prompt 대체)
 *
 * @param open 표시 여부
 * @param defaultName 이름 기본값
 * @param onClose 취소/배경 클릭
 * @param onSubmit 생성 콜백
 */
export default function WorkspaceCreateModal({
  open,
  defaultName = '공유 가계부',
  onClose,
  onSubmit,
}: WorkspaceCreateModalProps) {
  const [name, setName] = useState(defaultName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(defaultName);
    setSaving(false);
    setError('');
  }, [open, defaultName]);

  if (!open) return null;

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('이름을 입력해 주세요.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSubmit(trimmed);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '생성에 실패했습니다.';
      setError(message);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40">
      <button type="button" className="absolute inset-0" onClick={onClose} aria-label="닫기" />
      <div className="relative w-full max-w-[430px] bg-white rounded-t-3xl px-5 pt-5 pb-8">
        <p className="text-base font-extrabold text-gray-900">새 워크스페이스</p>
        <p className="text-xs text-gray-400 mt-1">부부·가족 공유 가계부 이름을 정하세요.</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          className="mt-4 w-full rounded-2xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-900 outline-none"
          placeholder="예: 우리집 가계부"
        />
        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-gray-100 text-sm font-bold text-gray-500"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 py-3 rounded-2xl bg-blue-500 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving ? '만드는 중…' : '만들기'}
          </button>
        </div>
      </div>
    </div>
  );
}
