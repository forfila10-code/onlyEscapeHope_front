'use client';

import { useEffect, useState } from 'react';
import { useWorkspace } from '../../contexts/WorkspaceContext';

/**
 * 내 닉네임 수정 (정산/결제자 표시에 사용)
 */
export default function NicknameCard() {
  const { profile, updateNickname } = useWorkspace();
  const [nickname, setNickname] = useState(profile?.nickname ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setNickname(profile?.nickname ?? '');
  }, [profile?.nickname]);

  const handleSave = async () => {
    const trimmed = nickname.trim();
    if (!trimmed) {
      setMessage('닉네임을 입력해 주세요.');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      await updateNickname(trimmed);
      setMessage('저장했습니다.');
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl px-5 py-5 shadow-sm space-y-3">
      <div>
        <p className="text-sm font-bold text-gray-900">내 닉네임</p>
        <p className="text-xs text-gray-400 mt-0.5">정산과 결제자 이름에 사용됩니다.</p>
      </div>
      <input
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        maxLength={24}
        className="w-full rounded-2xl bg-gray-100 px-4 py-3 text-sm font-semibold outline-none"
      />
      {message && <p className="text-xs text-gray-500">{message}</p>}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 rounded-2xl bg-gray-900 text-white text-sm font-bold disabled:opacity-50"
      >
        {saving ? '저장 중…' : '닉네임 저장'}
      </button>
    </div>
  );
}
