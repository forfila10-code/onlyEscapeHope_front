import React, { useState } from 'react';
import api from '../api/axiosInstance'

const CATEGORIES = [
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

function TransactionModal({ isOpen, onClose }) {
  const [type, setType] = useState('expense');
  const [dateMode, setDateMode] = useState('today'); // 'today' | 'yesterday' | 'custom'
  const [customDate, setCustomDate] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('식비');
  const [memo, setMemo] = useState('');

  if (!isOpen) return null;

  const resetForm = () => {
    setType('expense');
    setDateMode('today');
    setCustomDate('');
    setAmount('');
    setCategory('식비');
    setMemo('');
  };

  const handleSave = async () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const toISODate = (d) => d.toISOString().split('T')[0];

    const date =
      dateMode === 'today'
        ? toISODate(today)
        : dateMode === 'yesterday'
        ? toISODate(yesterday)
        : customDate;

    const payload = {
      type,
      date,
      amount: Number(amount),
      category,
      memo,
    };

    try {
      await api.post('api/transactions', payload);
      alert('저장되었습니다!');
      resetForm();
      onClose();
    } catch (error) {
      console.error('거래 저장 실패:', error);
      alert('저장에 실패했습니다.');
    }
  };

  return (
    /* 배경 오버레이 */
    <div
      className="fixed inset-0 z-50 flex items-end"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* ── Bottom Sheet ── */}
      <div className="relative w-full bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[92vh]">

        {/* 핸들 바 */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* 헤더 (iOS 스타일) */}
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="text-gray-400 text-sm font-medium active:opacity-50"
          >
            취소
          </button>
          <h2 className="text-base font-bold text-gray-900">내역 추가</h2>
          <button
            onClick={handleSave}
            className="text-blue-500 text-sm font-bold active:opacity-50"
          >
            저장
          </button>
        </div>

        {/* 스크롤 가능 본문 */}
        <div className="overflow-y-auto flex-1 px-5 pb-10">

          {/* 수입 / 지출 — 세그먼트 컨트롤 */}
          <div className="flex bg-gray-100 rounded-2xl p-1 mb-6">
            <button
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                type === 'income'
                  ? 'bg-white text-blue-500 shadow-sm'
                  : 'text-gray-400'
              }`}
              onClick={() => setType('income')}
            >
              💰 수입
            </button>
            <button
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                type === 'expense'
                  ? 'bg-white text-red-500 shadow-sm'
                  : 'text-gray-400'
              }`}
              onClick={() => setType('expense')}
            >
              💸 지출
            </button>
          </div>

          {/* 금액 — 큰 숫자 입력 */}
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

          {/* 날짜 — 칩 버튼 */}
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
                    dateMode === mode
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-500'
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

          {/* 카테고리 — 이모지 그리드 */}
          <div className="mb-6">
            <p className="text-[10px] font-semibold text-gray-400 mb-3 tracking-widest uppercase">
              카테고리
            </p>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
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

          {/* 메모 */}
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

        </div>
      </div>
    </div>
  );
}

export default TransactionModal;
