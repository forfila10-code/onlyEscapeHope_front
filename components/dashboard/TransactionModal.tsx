'use client';

import { useEffect, useState } from 'react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { createClient } from '../../utils/supabase/client';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../lib/categories';
import { addDays, toLocalISODate } from '../../lib/date';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** 수정할 기존 거래. 없으면 신규 등록 */
  transaction?: any | null;
}

/**
 * 거래 추가/수정/삭제 바텀시트
 *
 * @param isOpen 모달 표시 여부
 * @param onClose 닫기 콜백
 * @param transaction 수정 대상 거래 (없으면 생성)
 */
export default function TransactionModal({
  isOpen,
  onClose,
  transaction = null,
}: TransactionModalProps) {
  const supabase = createClient();
  const {
    user,
    currentWorkspace,
    currentWorkspaceId,
    members,
    refreshWorkspaceData,
  } = useWorkspace();

  const [type, setType] = useState<'income' | 'expense'>('expense');
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
    setPaidByUserId(String(members[0]?.user_id ?? user?.id ?? ''));
    setSaving(false);
    setDeleting(false);
    setConfirmDelete(false);
    setError('');
  };

  useEffect(() => {
    if (!isOpen) return;

    if (transaction) {
      const txType =
        (transaction.type || 'EXPENSE').toUpperCase() === 'INCOME' ? 'income' : 'expense';
      const txDate = String(transaction.date ?? '').slice(0, 10);
      const today = toLocalISODate(new Date());
      const yesterday = toLocalISODate(addDays(-1));

      setType(txType);
      setAmount(transaction.amount != null ? String(transaction.amount) : '');
      setCategory(transaction.category || (txType === 'income' ? '급여' : '식비'));
      setMemo(transaction.memo || '');
      setPaidByUserId(
        String(transaction.paid_by ?? transaction.paidByUserId ?? members[0]?.user_id ?? '')
      );
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, transaction, members, user?.id]);

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
    if (!currentWorkspaceId || !user) {
      setError('로그인/워크스페이스가 필요합니다.');
      return;
    }

    const payload = {
      type: type === 'income' ? 'INCOME' : 'EXPENSE',
      date,
      amount: Number(amount),
      category,
      memo: memo || null,
      workspace_id: currentWorkspaceId,
      user_id: user.id,
      paid_by: paidByUserId || user.id,
    };

    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        const { error: updErr } = await supabase
          .from('transactions')
          .update({
            type: payload.type,
            date: payload.date,
            amount: payload.amount,
            category: payload.category,
            memo: payload.memo,
            paid_by: payload.paid_by,
            updated_at: new Date().toISOString(),
          })
          .eq('id', transaction.id);
        if (updErr) throw updErr;
      } else {
        const { error: insErr } = await supabase.from('transactions').insert(payload);
        if (insErr) throw insErr;
      }
      refreshWorkspaceData();
      resetForm();
      onClose();
    } catch (err: any) {
      console.error('거래 저장 실패:', err);
      setError(err?.message || '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isEdit) return;
    setDeleting(true);
    setError('');
    try {
      const { error: delErr } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transaction.id);
      if (delErr) throw delErr;
      refreshWorkspaceData();
      resetForm();
      onClose();
    } catch (err: any) {
      console.error('거래 삭제 실패:', err);
      setError(err?.message || '삭제에 실패했습니다.');
      setDeleting(false);
    }
  };

  const handleTypeChange = (nextType: 'income' | 'expense') => {
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

      <div className="relative w-full max-w-[430px] mx-auto bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[92vh]">
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 text-sm font-medium active:opacity-50"
          >
            취소
          </button>
          <h2 className="text-base font-bold text-gray-900">
            {isEdit ? '내역 수정' : '내역 추가'}
          </h2>
          <button
            type="button"
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
              type="button"
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                type === 'income' ? 'bg-white text-blue-500 shadow-sm' : 'text-gray-400'
              }`}
              onClick={() => handleTypeChange('income')}
            >
              💰 수입
            </button>
            <button
              type="button"
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
                  type="button"
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
                  type="button"
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
                  <option key={member.user_id} value={member.user_id}>
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
                  <p className="text-xs text-center text-gray-500">
                    정말 삭제할까요? 되돌릴 수 없습니다.
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
