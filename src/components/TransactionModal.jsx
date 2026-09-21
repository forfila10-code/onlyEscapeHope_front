import React, { useEffect, useState } from 'react';
import api from '../api/axiosInstance';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { addDays, toLocalISODate } from '../utils/date';

const EXPENSE_CATEGORIES = [
  { id: '식비', emoji: '🍽️', label: '식비' },
  { id: '카페', emoji: '☕', label: '카페' },
  { id: '교통', emoji: '🚌', label: '교통' },
  { id: '쇼핑', emoji: '🛍️', label: '쇼핑' },
  { id: '생활', emoji: '🏠', label: '생활' },
  { id: '의료', emoji: '💊', label: '의료' },
  { id: '문화', emoji: '🎬', label: '문화' },
  { id: '운동', emoji: '💪', label: '운동' },
  { id: '기타', emoji: '📦', label: '기타' },
];

const INCOME_CATEGORIES = [
  { id: '급여', emoji: '💰', label: '급여' },
  { id: '용돈', emoji: '💵', label: '용돈' },
  { id: '이자', emoji: '🏦', label: '이자' },
];

/**
 * 거래 내역을 추가/수정하는 Bottom Sheet입니다.
 *
 * @param isOpen 모달 표시 여부
 * @param onClose 모달을 닫을 때 호출하는 함수
 * @param transaction 수정할 기존 거래. 없으면 신규 등록 모드
 */
function TransactionModal({ isOpen, onClose, transaction = null }) {
  const {
    currentWorkspace,
    currentWorkspaceId,
    members,
    refreshWorkspaceData,
  } = useWorkspace();
  const [type, setType] = useState('expense');
  const [dateMode, setDateMode] = useState('today');
  const [customDate, setCustomDate] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('식비');
  const [memo, setMemo] = useState('');
  const [paidByUserId, setPaidByUserId] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  const isEdit = Boolean(transaction?.id);
  const isSharedWorkspace = members.length > 1;
  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const resetForm = () => {
    setType('expense');
    setDateMode('today');
    setCustomDate('');
    setAmount('');
    setCategory('식비');
    setMemo('');
    setPaidByUserId(String(members[0]?.userId ?? ''));
    setSaving(false);
    setDeleting(false);
    setConfirmDelete(false);
    setError('');
  };

  // 모달이 열릴 때 신규/수정 값으로 폼을 채웁니다.
  useEffect(() => {
    if (!isOpen) return;

    if (transaction) {
      const txType = (transaction.type || 'EXPENSE').toUpperCase() === 'INCOME' ? 'income' : 'expense';
      const txDate = String(transaction.date ?? '').slice(0, 10);
      const today = toLocalISODate(new Date());
      const yesterday = toLocalISODate(addDays(-1));

      setType(txType);
      setAmount(transaction.amount != null ? String(transaction.amount) : '');
      setCategory(transaction.category || (txType === 'income' ? '급여' : '식비'));
      setMemo(transaction.memo || '');
      setPaidByUserId(String(transaction.paidByUserId ?? members[0]?.userId ?? ''));
      setSaving(false);
      setDeleting(false);
      setConfirmDelete(false);
      setError('');

      if (txDate === today) {
        setDateMode('today');
        setCustomDate('');
      } else if (txDate === yesterday) {
        setDateMode('yesterday');
        setCustomDate('');
      } else {
        setDateMode('custom');
        setCustomDate(txDate);
      }
      return;
    }

    resetForm();
  }, [isOpen, transaction, members]);

  if (!isOpen) return null;

  const resolveDate = () => {
    if (dateMode === 'today') return toLocalISODate(new Date());
    if (dateMode === 'yesterday') return toLocalISODate(addDays(-1));
    return customDate;
  };

  const handleSave = async () => {
    const date = resolveDate();
    if (!amount || Number(amount) <= 0) {
      setError('금액을 입력해 주세요.');
      return;
    }
    if (!date) {
      setError('날짜를 선택해 주세요.');
      return;
    }

    // 서버로 전달하는 거래 저장/수정 요청 데이터입니다.
    const payload = {
      type,
      date,
      amount: Number(amount),
      category,
      memo,
      workspaceId: currentWorkspaceId,
      paidByUserId: paidByUserId ? Number(paidByUserId) : undefined,
    };

    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await api.put(`/api/transactions/${transaction.id}`, payload);
      } else {
        await api.post('/api/transactions', payload);
      }
      refreshWorkspaceData();
      resetForm();
      onClose();
    } catch (err) {
      console.error('거래 저장 실패:', err);
      setError(err?.response?.data?.error || '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isEdit) return;
    setDeleting(true);
    setError('');
    try {
      await api.delete(`/api/transactions/${transaction.id}`);
      refreshWorkspaceData();
      resetForm();
      onClose();
    } catch (err) {
      console.error('거래 삭제 실패:', err);
      setError(err?.response?.data?.error || '삭제에 실패했습니다.');
      setDeleting(false);
    }
  };

  const handleTypeChange = (nextType) => {
    setType(nextType);
    const nextCategories = nextType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    if (!nextCategories.some((item) => item.id === category)) {
      setCategory(nextCategories[0].id);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[92vh]">
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="text-gray-400 text-sm font-medium active:opacity-50"
          >
            취소
          </button>
          <h2 className="text-base font-bold text-gray-900">{isEdit ? '내역 수정' : '내역 추가'}</h2>
          <button
            onClick={handleSave}
            disabled={saving || deleting}
            className="text-blue-500 text-sm font-bold active:opacity-50 disabled:opacity-40"
          >
            {saving ? '저장 중' : '저장'}
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 pb-10">
          {error && (
            <p className="mb-4 text-xs font-semibold text-red-500 bg-red-50 rounded-2xl px-4 py-3">
              {error}
            </p>
          )}

          {currentWorkspace && (
            <div className="mb-5 bg-blue-50 rounded-2xl px-4 py-3">
              <p className="text-[10px] font-semibold text-blue-400 mb-1 tracking-widest uppercase">
                워크스페이스
              </p>
              <p className="text-sm font-bold text-blue-700">{currentWorkspace.name}</p>
            </div>
          )}

          <div className="flex bg-gray-100 rounded-2xl p-1 mb-6">
            <button
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                type === 'income' ? 'bg-white text-blue-500 shadow-sm' : 'text-gray-400'
              }`}
              onClick={() => handleTypeChange('income')}
            >
              💰 수입
            </button>
            <button
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                type === 'expense' ? 'bg-white text-red-500 shadow-sm' : 'text-gray-400'
              }`}
              onClick={() => handleTypeChange('expense')}
            >
              💸 지출
            </button>
          </div>

          <div className="mb-6 text-center">
            <p className="text-[10px] font-semibold text-gray-400 mb-2 tracking-widest uppercase">
              금액
            </p>
            <div className="flex items-baseline justify-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="text-5xl font-extrabold text-gray-900 text-center bg-transparent border-none outline-none w-48 placeholder-gray-200"
              />
              <span className="text-2xl font-bold text-gray-300">원</span>
            </div>
            <div className="mt-3 h-px bg-gray-100 mx-6" />
          </div>

          <div className="mb-6">
            <p className="text-[10px] font-semibold text-gray-400 mb-3 tracking-widest uppercase">
              날짜
            </p>
            <div className="flex gap-2">
              {[
                { mode: 'today', label: '오늘' },
                { mode: 'yesterday', label: '어제' },
                { mode: 'custom', label: '직접 입력' },
              ].map(({ mode, label }) => (
                <button
                  key={mode}
                  onClick={() => setDateMode(mode)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all active:scale-95 ${
                    dateMode === mode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {dateMode === 'custom' && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="mt-3 w-full bg-gray-100 rounded-2xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300 border-none"
              />
            )}
          </div>

          <div className="mb-6">
            <p className="text-[10px] font-semibold text-gray-400 mb-3 tracking-widest uppercase">
              카테고리
            </p>
            <div className="grid grid-cols-3 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`flex flex-col items-center justify-center py-4 rounded-2xl transition-all active:scale-95 ${
                    category === cat.id
                      ? 'bg-gray-900 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <span className="text-2xl mb-1">{cat.emoji}</span>
                  <span className="text-xs font-semibold">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {isSharedWorkspace && (
            <div className="mb-6">
              <p className="text-[10px] font-semibold text-gray-400 mb-3 tracking-widest uppercase">
                결제자
              </p>
              <select
                value={paidByUserId}
                onChange={(e) => setPaidByUserId(e.target.value)}
                className="w-full bg-gray-100 rounded-2xl px-4 py-3.5 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300 border-none"
              >
                {members.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.nickname || member.email}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <p className="text-[10px] font-semibold text-gray-400 mb-3 tracking-widest uppercase">
              메모 (선택)
            </p>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="어디서 뭘 샀나요?"
              className="w-full bg-gray-100 rounded-2xl px-4 py-3.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300 border-none"
            />
          </div>

          {isEdit && (
            <div className="mt-8">
              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="w-full py-3.5 rounded-2xl text-sm font-bold text-red-500 bg-red-50 active:scale-95 transition-transform"
                >
                  이 내역 삭제
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-center text-gray-500">정말 삭제할까요? 되돌릴 수 없습니다.</p>
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
                      onClick={handleDelete}
                      disabled={deleting}
                      className="flex-1 py-3 rounded-2xl bg-red-500 text-sm font-bold text-white disabled:opacity-60"
                    >
                      {deleting ? '삭제 중…' : '삭제하기'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TransactionModal;
