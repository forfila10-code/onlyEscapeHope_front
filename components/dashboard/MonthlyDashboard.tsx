'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { createClient } from '../../utils/supabase/client';
import { fmt, getCategoryMeta, getPayerNickname, isIncome } from '../../lib/categories';
import { toLocalISODate } from '../../lib/date';

/** Supabase transactions 행 → UI용 거래 객체 */
export interface TransactionItem {
  id: string;
  date: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  memo: string;
  paid_by: string;
}

interface MonthlyDashboardProps {
  /** 조회 연도 */
  year: number;
  /** 조회 월 (1~12) */
  month: number;
  onMonthChange: (year: number, month: number) => void;
  /** 일일 리스트에서 거래 클릭 시 상세/수정 모달로 전달 */
  onSelectTransaction: (tx: TransactionItem) => void;
}

/** Supabase date 필드 → "YYYY-MM-DD" */
const normalizeDate = (raw: string | null | undefined): string =>
  typeof raw === 'string' ? raw.slice(0, 10) : '';

/** Supabase 행을 UI 거래 객체로 매핑 */
const mapTransaction = (row: {
  id: string;
  date?: string | null;
  amount?: number | null;
  type?: string | null;
  category?: string | null;
  memo?: string | null;
  paid_by?: string | null;
}): TransactionItem => ({
  id: row.id,
  date: normalizeDate(row.date),
  amount: Number(row.amount ?? 0),
  type: isIncome(row.type ?? undefined) ? 'INCOME' : 'EXPENSE',
  category: row.category?.trim() || (isIncome(row.type ?? undefined) ? '수입' : '기타'),
  memo: row.memo ?? '',
  paid_by: row.paid_by ?? '',
});

export default function MonthlyDashboard({
  year,
  month,
  onMonthChange,
  onSelectTransaction,
}: MonthlyDashboardProps) {
  const router = useRouter();
  const supabase = createClient();
  const today = new Date();
  // 선택된 워크스페이스 ID와 refetch 버전을 기준으로 월별 거래 목록을 다시 불러옵니다.
  const { currentWorkspaceId, members, refreshVersion } = useWorkspace();

  // year/month primitive만 의존해야 렌더마다 새 Date로 조회가 반복되지 않습니다.
  const currentMonth = useMemo(() => new Date(year, month - 1, 1), [year, month]);
  const [selectedDate, setSelectedDate] = useState(today);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<'auth' | 'server' | null>(null);

  useEffect(() => {
    const now = new Date();
    const monthDate = new Date(year, month - 1, 1);
    if (isSameMonth(now, monthDate)) setSelectedDate(now);
    else setSelectedDate(monthDate);
  }, [year, month]);

  // ── 이번 달 데이터 로딩 (Supabase) ──
  useEffect(() => {
    if (!currentWorkspaceId) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    const monthDate = new Date(year, month - 1, 1);
    const rangeStart = toLocalISODate(startOfMonth(monthDate));
    const rangeEnd = toLocalISODate(endOfMonth(monthDate));

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await supabase
          .from('transactions')
          .select('id, date, amount, type, category, memo, paid_by')
          .eq('workspace_id', currentWorkspaceId)
          .gte('date', rangeStart)
          .lte('date', rangeEnd)
          .order('date', { ascending: true });

        if (cancelled) return;

        if (fetchError) {
          console.error('[MonthlyDashboard] 거래 내역 로딩 실패:', fetchError);
          const isAuth =
            fetchError.code === 'PGRST301' ||
            fetchError.message?.includes('JWT') ||
            fetchError.message?.includes('auth');
          setError(isAuth ? 'auth' : 'server');
          setTransactions([]);
        } else {
          setTransactions((data ?? []).map(mapTransaction));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [year, month, currentWorkspaceId, refreshVersion, supabase]);

  // ── 날짜별 집계 맵 { "YYYY-MM-DD": { income, expense, items[] } } ──
  const dailyMap = useMemo(() => {
    const map: Record<
      string,
      { income: number; expense: number; items: TransactionItem[] }
    > = {};

    transactions.forEach((tx) => {
      const dateKey = tx.date;
      if (!dateKey) return;
      if (!map[dateKey]) map[dateKey] = { income: 0, expense: 0, items: [] };

      if (tx.type === 'INCOME') map[dateKey].income += tx.amount;
      else map[dateKey].expense += tx.amount;
      map[dateKey].items.push(tx);
    });
    return map;
  }, [transactions]);

  // ── 달력 날짜 배열 생성 ──
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const selectedKey = format(selectedDate, 'yyyy-MM-dd');
  const selectedItems = dailyMap[selectedKey]?.items ?? [];

  const moveMonth = (offset: number) => {
    const next = new Date(year, month - 1 + offset, 1);
    onMonthChange(next.getFullYear(), next.getMonth() + 1);
    setSelectedDate(next);
  };

  const prevMonth = () => moveMonth(-1);
  const nextMonth = () => moveMonth(1);

  // ── 월 총계 ──
  const monthlyTotal = useMemo(() => {
    let income = 0;
    let expense = 0;
    transactions.forEach((tx) => {
      if (tx.type === 'INCOME') income += tx.amount;
      else expense += tx.amount;
    });
    return { income, expense };
  }, [transactions]);

  const WEEK_DAYS = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className="flex flex-col gap-3">
      {/* ──────── 달력 카드 ──────── */}
      <div className="bg-white rounded-3xl overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <button
            onClick={prevMonth}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 active:scale-90 transition-transform text-sm font-bold"
          >
            ‹
          </button>
          <div className="text-center">
            <p className="text-base font-extrabold text-gray-900">
              {format(currentMonth, 'yyyy년 M월', { locale: ko })}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              <span className="text-blue-500 font-semibold">+{fmt(monthlyTotal.income)}</span>
              <span className="mx-1.5 text-gray-300">|</span>
              <span className="text-red-400 font-semibold">-{fmt(monthlyTotal.expense)}</span>
            </p>
          </div>
          <button
            onClick={nextMonth}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 active:scale-90 transition-transform text-sm font-bold"
          >
            ›
          </button>
        </div>

        <div className="grid grid-cols-7 px-2 pb-1">
          {WEEK_DAYS.map((d, i) => (
            <div
              key={d}
              className={`text-center text-[10px] font-semibold py-1 ${
                i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 px-2 pb-4 gap-y-1">
            {calendarDays.map((day) => {
              const key = format(day, 'yyyy-MM-dd');
              const dayData = dailyMap[key];
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = isSameDay(day, selectedDate);
              const isTodayDay = isToday(day);
              const dayNum = format(day, 'd');
              const col = day.getDay();

              return (
                <button
                  key={key}
                  onClick={() => {
                    if (isCurrentMonth) setSelectedDate(day);
                  }}
                  className={`
                    flex flex-col items-center rounded-xl py-1 px-0.5 transition-all active:scale-95
                    ${!isCurrentMonth ? 'opacity-25 pointer-events-none' : ''}
                    ${isSelected ? 'bg-gray-900' : isTodayDay ? 'bg-blue-50' : 'bg-transparent'}
                  `}
                >
                  <span
                    className={`text-xs font-bold leading-none mb-0.5 ${
                      isSelected
                        ? 'text-white'
                        : isTodayDay
                        ? 'text-blue-600'
                        : col === 0
                        ? 'text-red-400'
                        : col === 6
                        ? 'text-blue-400'
                        : 'text-gray-800'
                    }`}
                  >
                    {dayNum}
                  </span>

                  {dayData?.expense > 0 && (
                    <span
                      className={`text-[8px] font-semibold leading-none truncate w-full text-center ${
                        isSelected ? 'text-red-300' : 'text-red-400'
                      }`}
                    >
                      -{fmt(dayData.expense)}
                    </span>
                  )}
                  {dayData?.income > 0 && (
                    <span
                      className={`text-[8px] font-semibold leading-none truncate w-full text-center ${
                        isSelected ? 'text-blue-300' : 'text-blue-500'
                      }`}
                    >
                      +{fmt(dayData.income)}
                    </span>
                  )}
                  {!dayData && <span className="text-[8px] leading-none">&nbsp;</span>}
                </button>
              );
            })}
          </div>

        {error === 'auth' && (
          <div className="flex flex-col items-center gap-3 py-8 px-4">
            <span className="text-3xl">🔐</span>
            <p className="text-sm text-gray-500 font-medium text-center">
              인증에 실패했습니다.
            </p>
            <p className="text-xs text-gray-400 text-center">
              로그인 세션이 만료되었습니다.
            </p>
            <button
              onClick={async () => {
                localStorage.removeItem('currentWorkspaceId');
                await supabase.auth.signOut();
                router.replace('/login');
              }}
              className="px-6 py-2 bg-gray-900 text-white text-sm font-semibold rounded-full active:scale-95 transition-transform"
            >
              다시 로그인
            </button>
          </div>
        )}
        {error === 'server' && (
          <div className="flex flex-col items-center gap-2 py-8 px-4">
            <span className="text-3xl">⚠️</span>
            <p className="text-sm text-gray-500 font-medium text-center">
              서버에서 데이터를 가져오지 못했습니다.
            </p>
            <p className="text-xs text-gray-400 text-center">
              Supabase 연결 또는 RLS 설정을 확인해 주세요.
            </p>
          </div>
        )}
      </div>

      {/* ──────── 일일 리스트 카드 ──────── */}
      <div className="bg-white rounded-3xl overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-gray-900">
              {format(selectedDate, 'M월 d일 (eee)', { locale: ko })}
            </h3>
            {selectedItems.length > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">
                {(() => {
                  const d = dailyMap[selectedKey];
                  const parts: string[] = [];
                  if (d?.income > 0) parts.push(`수입 +${fmt(d.income)}원`);
                  if (d?.expense > 0) parts.push(`지출 -${fmt(d.expense)}원`);
                  return parts.join('  ');
                })()}
              </p>
            )}
          </div>
          <span className="text-xs text-gray-400 font-medium">
            {selectedItems.length > 0 ? `${selectedItems.length}건` : ''}
          </span>
        </div>

        {selectedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <span className="text-3xl">📭</span>
            <p className="text-sm text-gray-400 font-medium">이 날 거래가 없습니다</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 pb-2">
            {selectedItems.map((tx) => {
              const meta = getCategoryMeta(tx.category, tx.type);
              const isExpense = tx.type === 'EXPENSE';
              const payer = getPayerNickname(tx.paid_by, members);

              return (
                <button
                  key={tx.id}
                  type="button"
                  onClick={() => onSelectTransaction(tx)}
                  className="w-full flex items-center gap-3 px-5 py-4 active:bg-gray-50 transition-colors text-left"
                >
                  <div
                    className={`w-11 h-11 ${meta.emojiColor} rounded-2xl flex items-center justify-center text-xl flex-shrink-0`}
                  >
                    {meta.emoji}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {tx.category}
                    </p>
                    {tx.memo || payer ? (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {tx.memo || '메모 없음'}
                        {payer ? ` • ${payer} 결제` : ''}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-300 mt-0.5">메모 없음</p>
                    )}
                  </div>

                  <span
                    className={`text-sm font-bold flex-shrink-0 ${
                      isExpense ? 'text-red-500' : 'text-blue-500'
                    }`}
                  >
                    {isExpense ? '-' : '+'}
                    {fmt(tx.amount)}원
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
