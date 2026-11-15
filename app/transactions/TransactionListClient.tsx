'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { createClient } from '../../utils/supabase/client';
import { fmt, getCategoryMeta, getPayerNickname, isIncome } from '../../lib/categories';
import { useCategories } from '../../contexts/CategoryContext';
import { resolveHomeRange, type PeriodCode } from '../../lib/date';
import {
  EXCEL_APP_UNSUPPORTED_MESSAGE,
  saveExcelFile,
  toTransactionsXlsx,
} from '../../lib/excel';
import { matchesTxSearch, type TxTypeFilter } from '../../lib/search';
import TransactionModal from '../../components/dashboard/TransactionModal';
import type { Transaction } from '../../lib/types';

type ListPeriod = PeriodCode | 'ALL';

const PERIODS: { id: ListPeriod; label: string }[] = [
  { id: 'THIS_MONTH', label: '이번 달' },
  { id: 'LAST_MONTH', label: '지난 달' },
  { id: 'LAST_3_MONTHS', label: '3개월' },
  { id: 'THIS_YEAR', label: '올해' },
  { id: 'ALL', label: '전체' },
];

/**
 * 전체 거래 내역 목록 + 검색/필터 + 기간 엑셀 내보내기
 */
export default function TransactionListClient() {
  const router = useRouter();
  const supabase = createClient();
  const {
    currentWorkspace,
    currentWorkspaceId,
    members,
    loading: wsLoading,
    refreshVersion,
    refreshWorkspaceData,
  } = useWorkspace();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [period, setPeriod] = useState<ListPeriod>('THIS_MONTH');
  /** 클릭이 끊겨 바로 저장이 막힌 엑셀. 버튼을 한 번 더 누르면 저장됩니다. */
  const [exportFile, setExportFile] = useState<{ blob: Blob; filename: string } | null>(null);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TxTypeFilter>('ALL');
  const [categoryFilter, setCategoryFilter] = useState('');
  const { expenseCategories, incomeCategories } = useCategories();

  const categoryOptions =
    typeFilter === 'INCOME'
      ? incomeCategories
      : typeFilter === 'EXPENSE'
        ? expenseCategories
        : [...expenseCategories, ...incomeCategories];

  useEffect(() => {
    if (wsLoading) return;
    if (!currentWorkspaceId) {
      setLoading(false);
      setTransactions([]);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(false);
      let request = supabase
        .from('transactions')
        .select('id, workspace_id, user_id, paid_by, type, amount, category, memo, date, created_at')
        .eq('workspace_id', currentWorkspaceId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (period !== 'ALL') {
        const { startDate, endDate } = resolveHomeRange(period);
        request = request.gte('date', startDate).lte('date', endDate);
      }

      const { data, error: err } = await request.limit(2000);
      if (cancelled) return;
      if (err) {
        console.error(err);
        setError(true);
        setTransactions([]);
      } else {
        setTransactions((data ?? []) as Transaction[]);
      }
      setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [currentWorkspaceId, refreshVersion, supabase, wsLoading, period]);

  // 기간 조회 결과를 검색어·구분·카테고리로 한 번 더 좁힙니다.
  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (typeFilter !== 'ALL') {
        const income = isIncome(tx.type);
        if (typeFilter === 'INCOME' && !income) return false;
        if (typeFilter === 'EXPENSE' && income) return false;
      }
      if (categoryFilter && tx.category !== categoryFilter) return false;
      return matchesTxSearch(tx, query, members);
    });
  }, [transactions, typeFilter, categoryFilter, query, members]);

  // 기간·검색이 바뀌면 이전에 만들어 둔 엑셀은 버립니다.
  useEffect(() => {
    setExportFile(null);
  }, [period, query, typeFilter, categoryFilter]);

  const handleExport = async () => {
    if (filtered.length === 0 && !exportFile) return;

    // 이미 만들어 둔 파일이면 이번 클릭에서 바로 저장합니다.
    if (exportFile) {
      const result = await saveExcelFile(exportFile.blob, exportFile.filename);
      if (result === 'unsupported') alert(EXCEL_APP_UNSUPPORTED_MESSAGE);
      if (result === 'shared' || result === 'downloaded') setExportFile(null);
      return;
    }

    const stamp = period === 'ALL' ? 'all' : period.toLowerCase();
    const filename = `pocketfree-${stamp}.xlsx`;
    const blob = await toTransactionsXlsx(filtered, members);
    const result = await saveExcelFile(blob, filename);
    if (result === 'blocked') setExportFile({ blob, filename });
    else if (result === 'unsupported') alert(EXCEL_APP_UNSUPPORTED_MESSAGE);
    else setExportFile(null);
  };

  const groups: Record<string, Transaction[]> = {};
  filtered.forEach((tx) => {
    const key = String(tx.date).slice(0, 10);
    if (!groups[key]) groups[key] = [];
    groups[key].push(tx);
  });
  const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));
  const hasFilter = Boolean(query.trim() || typeFilter !== 'ALL' || categoryFilter);

  return (
    <div className="flex flex-col min-h-screen bg-[#f2f3f7] font-sans">
      <header className="bg-white px-5 pt-12 pb-3 sticky top-0 z-10 shadow-[0_1px_0_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100 -ml-1"
          >
            ←
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-extrabold text-gray-900">전체 내역</h1>
            {currentWorkspace?.name && (
              <p className="text-xs text-gray-400 mt-0.5">{currentWorkspace.name}</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={loading || (filtered.length === 0 && !exportFile)}
            className="text-xs font-bold text-blue-500 disabled:text-gray-300"
          >
            {exportFile ? '눌러서 저장' : '엑셀 저장'}
          </button>
        </div>

        <div className="relative mt-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="메모, 카테고리, 금액, 결제자 검색"
            className="w-full rounded-2xl bg-gray-100 pl-4 pr-10 py-3 text-sm font-medium text-gray-900 outline-none placeholder:text-gray-400"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-300 text-white text-xs font-bold"
              aria-label="검색어 지우기"
            >
              ×
            </button>
          )}
        </div>
      </header>

      <div className="px-4 pt-3 space-y-2">
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          {PERIODS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPeriod(item.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold ${
                period === item.id
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-500 border border-gray-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          {([
            { id: 'ALL', label: '전체' },
            { id: 'EXPENSE', label: '지출' },
            { id: 'INCOME', label: '수입' },
          ] as const).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTypeFilter(item.id);
                setCategoryFilter('');
              }}
              className={`flex-1 py-2 rounded-2xl text-xs font-bold ${
                typeFilter === item.id
                  ? item.id === 'INCOME'
                    ? 'bg-blue-500 text-white'
                    : item.id === 'EXPENSE'
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-900 text-white'
                  : 'bg-white text-gray-500 border border-gray-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          <button
            type="button"
            onClick={() => setCategoryFilter('')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold ${
              !categoryFilter ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 border border-gray-200'
            }`}
          >
            모든 카테고리
          </button>
          {categoryOptions.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoryFilter((prev) => (prev === c.id ? '' : c.id))}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold ${
                categoryFilter === c.id
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-500 border border-gray-200'
              }`}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        {!loading && !error && currentWorkspaceId && (
          <p className="px-1 text-[11px] text-gray-400 font-medium">
            {hasFilter ? `검색 결과 ${filtered.length}건` : `${filtered.length}건`}
          </p>
        )}
      </div>

      <main className="flex-1 overflow-y-auto px-4 pt-2 pb-10 space-y-3">
        {wsLoading || loading ? (
          <p className="text-center text-sm text-gray-400 py-10">불러오는 중…</p>
        ) : null}
        {!wsLoading && !currentWorkspaceId && (
          <p className="text-center text-sm text-gray-400 py-10">워크스페이스가 없습니다.</p>
        )}
        {error && (
          <p className="text-center text-sm text-red-400 py-10">내역을 불러오지 못했습니다.</p>
        )}
        {!loading && !error && currentWorkspaceId && sortedDates.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-10">
            {hasFilter ? '검색 결과가 없습니다.' : '거래 내역이 없습니다.'}
          </p>
        )}

        {sortedDates.map((date) => (
          <div key={date} className="bg-white rounded-3xl overflow-hidden">
            <p className="px-5 pt-4 pb-2 text-xs font-bold text-gray-400">{date}</p>
            <div className="divide-y divide-gray-50">
              {groups[date].map((tx) => {
                const meta = getCategoryMeta(tx.category, tx.type);
                const income = isIncome(tx.type);
                const payer = getPayerNickname(tx.paid_by, members);
                return (
                  <button
                    key={tx.id}
                    type="button"
                    onClick={() => {
                      setEditingTx(tx);
                      setIsModalOpen(true);
                    }}
                    className="w-full flex items-center gap-3 px-5 py-4 active:bg-gray-50 text-left"
                  >
                    <div
                      className={`w-11 h-11 ${meta.emojiColor} rounded-2xl flex items-center justify-center text-xl`}
                    >
                      {meta.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {tx.category}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {tx.memo || '메모 없음'}
                        {payer ? ` • ${payer} 결제` : ''}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-bold ${income ? 'text-blue-500' : 'text-red-500'}`}
                    >
                      {income ? '+' : '-'}
                      {fmt(tx.amount)}원
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </main>

      <TransactionModal
        isOpen={isModalOpen}
        transaction={editingTx}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTx(null);
          refreshWorkspaceData();
        }}
      />
    </div>
  );
}
