import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axiosInstance';
import TransactionModal from '../../components/TransactionModal';
import { useWorkspace } from '../../contexts/WorkspaceContext';

const CATEGORY_META = {
  식비: { emoji: '🍽️', emojiColor: 'bg-orange-100' },
  카페: { emoji: '☕', emojiColor: 'bg-yellow-100' },
  교통: { emoji: '🚌', emojiColor: 'bg-sky-100' },
  쇼핑: { emoji: '🛍️', emojiColor: 'bg-pink-100' },
  생활: { emoji: '🏠', emojiColor: 'bg-green-100' },
  의료: { emoji: '💊', emojiColor: 'bg-red-100' },
  문화: { emoji: '🎬', emojiColor: 'bg-purple-100' },
  운동: { emoji: '💪', emojiColor: 'bg-emerald-100' },
  기타: { emoji: '📦', emojiColor: 'bg-gray-100' },
  급여: { emoji: '💰', emojiColor: 'bg-blue-100' },
  용돈: { emoji: '💵', emojiColor: 'bg-blue-100' },
  이자: { emoji: '🏦', emojiColor: 'bg-blue-100' },
};

const fmt = (value) => Math.abs(Number(value ?? 0)).toLocaleString('ko-KR');
const isIncome = (type) => (type ?? '').toUpperCase() === 'INCOME';
const getCategoryMeta = (category, type) =>
  CATEGORY_META[category ?? ''] ?? (isIncome(type) ? CATEGORY_META.급여 : CATEGORY_META.기타);

/**
 * 선택한 워크스페이스의 전체 거래 내역 페이지입니다.
 */
function TransactionListPage() {
  const navigate = useNavigate();
  const { currentWorkspace, currentWorkspaceId, refreshVersion } = useWorkspace();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [editingTx, setEditingTx] = useState(null);

  useEffect(() => {
    if (!currentWorkspaceId) return;
    setLoading(true);
    setError(false);
    api
      .get('/api/transactions', { params: { workspaceId: currentWorkspaceId } })
      .then((res) => setTransactions(Array.isArray(res.data) ? res.data : []))
      .catch((err) => {
        console.error('[TransactionList] 로딩 실패:', err);
        setError(true);
        setTransactions([]);
      })
      .finally(() => setLoading(false));
  }, [currentWorkspaceId, refreshVersion]);

  const grouped = useMemo(() => {
    const map = new Map();
    transactions.forEach((tx) => {
      const key = String(tx.date ?? '').slice(0, 10) || '날짜 없음';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(tx);
    });
    return Array.from(map.entries());
  }, [transactions]);

  return (
    <div className="flex flex-col min-h-screen bg-[#f2f3f7] font-sans">
      <header className="bg-white px-5 pt-12 pb-4 flex items-center gap-3 sticky top-0 z-10 shadow-[0_1px_0_rgba(0,0,0,0.06)]">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100 transition-colors -ml-1"
          aria-label="뒤로가기"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-800">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="min-w-0">
          <h1 className="text-lg font-extrabold text-gray-900 tracking-tight">전체 내역</h1>
          <p className="text-xs text-gray-400 truncate">{currentWorkspace?.name ?? '워크스페이스'}</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-10 space-y-3">
        {loading ? (
          <div className="bg-white rounded-3xl py-12 text-center text-sm text-gray-400">내역을 불러오는 중입니다.</div>
        ) : error ? (
          <div className="bg-white rounded-3xl py-12 text-center text-sm text-red-400">내역을 가져오지 못했습니다.</div>
        ) : grouped.length === 0 ? (
          <div className="bg-white rounded-3xl py-12 text-center text-sm text-gray-400">아직 거래 내역이 없습니다.</div>
        ) : (
          grouped.map(([date, items]) => (
            <div key={date} className="bg-white rounded-3xl overflow-hidden shadow-sm">
              <p className="px-5 pt-4 pb-2 text-xs font-bold text-gray-400">{date}</p>
              <div className="divide-y divide-gray-50">
                {items.map((tx) => {
                  const meta = getCategoryMeta(tx.category, tx.type);
                  const income = isIncome(tx.type);
                  return (
                    <button
                      key={tx.id}
                      type="button"
                      onClick={() => setEditingTx(tx)}
                      className="w-full flex items-center gap-3 px-5 py-4 active:bg-gray-50 transition-colors text-left"
                    >
                      <div className={`w-11 h-11 ${meta.emojiColor} rounded-2xl flex items-center justify-center text-xl flex-shrink-0`}>
                        {meta.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{tx.category ?? (income ? '수입' : '기타')}</p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                          {tx.memo || '메모 없음'}
                          {tx.paidByNickname ? ` • ${tx.paidByNickname} 결제` : ''}
                        </p>
                      </div>
                      <span className={`text-sm font-bold flex-shrink-0 ${income ? 'text-blue-500' : 'text-red-500'}`}>
                        {income ? '+' : '-'}
                        {fmt(tx.amount)}원
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </main>

      <TransactionModal
        isOpen={Boolean(editingTx)}
        transaction={editingTx}
        onClose={() => setEditingTx(null)}
      />
    </div>
  );
}

export default TransactionListPage;
