'use client';

import { useState } from 'react';
import { useCategories } from '../../contexts/CategoryContext';
import { CATEGORY_EMOJI_OPTIONS, type CategoryKind } from '../../lib/categories';

/**
 * 설정 탭의 카테고리 관리. 기본 항목은 유지하고, 추가한 항목만 지울 수 있습니다.
 */
export default function CategoryCard() {
  const { expenseCategories, incomeCategories, loadError, addCategory, removeCategory } =
    useCategories();
  const [kind, setKind] = useState<CategoryKind>('EXPENSE');
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState<string>(CATEGORY_EMOJI_OPTIONS[0]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const list = kind === 'INCOME' ? incomeCategories : expenseCategories;

  const handleAdd = async () => {
    setSaving(true);
    setMessage('');
    try {
      await addCategory(kind, name, emoji);
      setName('');
      setMessage('추가했습니다.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '추가에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (rowId: string, label: string) => {
    if (!window.confirm(`「${label}」 카테고리를 삭제할까요? 이미 기록된 거래는 그대로 남습니다.`)) {
      return;
    }
    setMessage('');
    try {
      await removeCategory(rowId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '삭제에 실패했습니다.');
    }
  };

  return (
    <div className="bg-white rounded-3xl px-5 py-5 shadow-sm space-y-3">
      <div>
        <p className="text-sm font-bold text-gray-900">카테고리</p>
        <p className="text-xs text-gray-400 mt-0.5">이 가계부에 항목을 추가하면 둘 다 쓸 수 있습니다.</p>
      </div>

      <div className="flex gap-2 bg-gray-100 rounded-2xl p-1">
        {(['EXPENSE', 'INCOME'] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setKind(item)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold ${
              kind === item ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'
            }`}
          >
            {item === 'EXPENSE' ? '지출' : '수입'}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {list.map((item) => (
          <span
            key={item.rowId ?? item.id}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-100 text-xs font-semibold text-gray-700"
          >
            {item.emoji} {item.label}
            {item.custom && item.rowId && (
              <button
                type="button"
                onClick={() => handleRemove(item.rowId!, item.label)}
                className="text-gray-400 font-bold"
                aria-label={`${item.label} 삭제`}
              >
                ×
              </button>
            )}
          </span>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-none">
        {CATEGORY_EMOJI_OPTIONS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setEmoji(item)}
            className={`flex-shrink-0 w-9 h-9 rounded-xl text-lg ${
              emoji === item ? 'bg-gray-900' : 'bg-gray-100'
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="예: 육아, 경조사"
          maxLength={12}
          className="flex-1 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-semibold outline-none"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={saving}
          className="px-4 rounded-2xl bg-blue-500 text-white text-sm font-bold disabled:opacity-40"
        >
          추가
        </button>
      </div>
      {(message || loadError) && (
        <p className="text-xs font-medium text-gray-500">{message || loadError}</p>
      )}
    </div>
  );
}
