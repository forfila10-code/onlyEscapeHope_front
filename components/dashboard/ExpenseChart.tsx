'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { startOfMonth, endOfMonth } from 'date-fns';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { createClient } from '../../utils/supabase/client';
import { fmt, getCategoryMeta } from '../../lib/categories';
import { toLocalISODate } from '../../lib/date';

// ── 파이 차트용 카테고리별 색상 (hex) ─────────────────────
const CATEGORY_COLOR: Record<string, string> = {
  식비: '#FF6B35',
  카페: '#F7B731',
  교통: '#45AAF2',
  쇼핑: '#FC5C9C',
  생활: '#26DE81',
  의료: '#FC5C65',
  문화: '#A55EEA',
  운동: '#2BCBBA',
  기타: '#A5B1C2',
  급여: '#3867D6',
  용돈: '#4A90D9',
  이자: '#20BF6B',
  수입: '#3867D6',
};

const DEFAULT_COLORS = [
  '#FF6B35', '#F7B731', '#45AAF2', '#FC5C9C',
  '#26DE81', '#FC5C65', '#A55EEA', '#2BCBBA',
  '#A5B1C2', '#3867D6', '#FD9644', '#20BF6B',
];

const getCategoryColor = (name: string, index: number) =>
  CATEGORY_COLOR[name] ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length];

const toAmount = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const fmtPercent = (ratio: number) =>
  Number.isFinite(ratio) ? `${(ratio * 100).toFixed(1)}%` : '0.0%';

/** Supabase type 필드 → 'INCOME' | 'EXPENSE' */
const normalizeType = (type?: string | null): 'INCOME' | 'EXPENSE' =>
  (type ?? '').toUpperCase() === 'INCOME' ? 'INCOME' : 'EXPENSE';

interface CategoryBreakdownItem {
  category: string;
  type: 'INCOME' | 'EXPENSE';
  totalAmount: number;
  percent: number;
}

interface MonthSummary {
  categoryBreakdown: CategoryBreakdownItem[];
  totalExpense: number;
  totalIncome: number;
  netAmount: number;
  year: number;
  month: number;
}

interface ChartDatum {
  name: string;
  value: number;
  percent: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { payload: ChartDatum; percent?: number }[];
}

// ── 커스텀 툴팁 ─────────────────────────────────────────
const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const { name, value, percent } = item.payload;
  return (
    <div className="bg-white rounded-2xl shadow-lg px-4 py-3 text-center border border-gray-100">
      <p className="text-xs font-bold text-gray-700">{name}</p>
      <p className="text-sm font-extrabold text-gray-900 mt-0.5">{fmt(value)}원</p>
      <p className="text-xs text-gray-400">{fmtPercent(percent)}</p>
    </div>
  );
};

/**
 * Supabase 거래 목록을 카테고리별 통계로 집계합니다 (Spring statistics API와 동일 로직).
 *
 * @param rows 해당 월 transactions 행 배열
 * @param year 조회 연도
 * @param month 조회 월 (1~12)
 */
function aggregateStatistics(
  rows: { category?: string | null; type?: string | null; amount?: number | null }[],
  year: number,
  month: number
): MonthSummary {
  const bucket: Record<string, { category: string; type: 'INCOME' | 'EXPENSE'; totalAmount: number }> = {};
  let totalExpense = 0;
  let totalIncome = 0;

  for (const row of rows) {
    const type = normalizeType(row.type);
    const amount = toAmount(row.amount);
    if (amount <= 0) continue;

    const category = row.category?.trim() || (type === 'INCOME' ? '수입' : '기타');
    const key = `${type}:${category}`;

    if (!bucket[key]) {
      bucket[key] = { category, type, totalAmount: 0 };
    }
    bucket[key].totalAmount += amount;

    if (type === 'INCOME') totalIncome += amount;
    else totalExpense += amount;
  }

  const categoryBreakdown: CategoryBreakdownItem[] = Object.values(bucket)
    .map((item) => {
      const typeTotal = item.type === 'INCOME' ? totalIncome : totalExpense;
      return {
        category: item.category,
        type: item.type,
        totalAmount: item.totalAmount,
        percent: typeTotal > 0 ? item.totalAmount / typeTotal : 0,
      };
    })
    .sort((a, b) => b.totalAmount - a.totalAmount);

  return {
    categoryBreakdown,
    totalExpense,
    totalIncome,
    netAmount: totalIncome - totalExpense,
    year,
    month,
  };
}

interface ExpenseChartProps {
  year: number;
  month: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

export default function ExpenseChart({
  year,
  month,
  onPrevMonth,
  onNextMonth,
}: ExpenseChartProps) {
  const router = useRouter();
  const supabase = createClient();
  // 선택된 워크스페이스 ID와 refetch 버전을 기준으로 통계 데이터를 다시 불러옵니다.
  const { currentWorkspaceId, refreshVersion, user } = useWorkspace();

  const [viewType, setViewType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');

  const [summary, setSummary] = useState<MonthSummary | null>(null);
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<'auth' | 'server' | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // ── Supabase에서 월별 거래 조회 후 클라이언트 집계 ──
  useEffect(() => {
    if (!user) {
      setError('auth');
      setLoading(false);
      setSummary(null);
      return;
    }

    if (!currentWorkspaceId) {
      setSummary(null);
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
      setSummary(null);

      const [txRes, budgetRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('type, amount, category')
          .eq('workspace_id', currentWorkspaceId)
          .gte('date', rangeStart)
          .lte('date', rangeEnd),
        supabase
          .from('category_budgets')
          .select('category, amount')
          .eq('workspace_id', currentWorkspaceId)
          .eq('year', year)
          .eq('month', month),
      ]);

      if (cancelled) return;

      if (txRes.error) {
        console.error('[ExpenseChart] 조회 실패:', txRes.error);
        const isAuth =
          txRes.error.code === 'PGRST301' ||
          txRes.error.message?.includes('JWT') ||
          txRes.error.message?.includes('auth');
        setError(isAuth ? 'auth' : 'server');
        setSummary(null);
        setBudgets({});
      } else {
        setSummary(aggregateStatistics(txRes.data ?? [], year, month));
        const nextBudgets: Record<string, number> = {};
        (budgetRes.data ?? []).forEach((row: { category: string; amount: number }) => {
          nextBudgets[row.category] = Number(row.amount);
        });
        setBudgets(nextBudgets);
      }
      setLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, [year, month, currentWorkspaceId, refreshVersion, user, supabase]);

  // ── categoryBreakdown → 차트 데이터 (viewType 필터) ──
  const chartData = useMemo((): ChartDatum[] => {
    const breakdown = summary?.categoryBreakdown ?? [];
    const data = breakdown
      .filter((item) => item.type === viewType)
      .map((item) => ({
        name: item.category,
        value: item.totalAmount,
        percent: item.percent,
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);

    const chartTotal = data.reduce((sum, item) => sum + item.value, 0);
    return data.map((item) => ({
      ...item,
      percent: chartTotal > 0 ? item.value / chartTotal : 0,
    }));
  }, [summary, viewType]);

  const isExpense = viewType === 'EXPENSE';
  const chartTotal = chartData.reduce((s, d) => s + d.value, 0);
  const totalFromServer = isExpense
    ? toAmount(summary?.totalExpense)
    : toAmount(summary?.totalIncome);
  const total = totalFromServer > 0 ? totalFromServer : chartTotal;

  const monthLabel = `${year}년 ${month}월`;

  return (
    <div className="flex flex-col gap-3">
      {/* ── 헤더 카드 ── */}
      <div className="bg-white rounded-3xl px-5 pt-5 pb-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={onPrevMonth}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 active:scale-90 transition-transform text-sm font-bold"
          >
            ‹
          </button>
          <div className="text-center">
            <p className="text-base font-extrabold text-gray-900">{monthLabel}</p>
            <p className="text-xs text-gray-400 mt-0.5">카테고리별 분석</p>
          </div>
          <button
            onClick={onNextMonth}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 active:scale-90 transition-transform text-sm font-bold"
          >
            ›
          </button>
        </div>

        <div className="flex rounded-2xl bg-gray-100 p-1 gap-1">
          {(['EXPENSE', 'INCOME'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setViewType(type)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                viewType === type
                  ? type === 'EXPENSE'
                    ? 'bg-white text-red-500 shadow-sm'
                    : 'bg-white text-blue-500 shadow-sm'
                  : 'text-gray-400'
              }`}
            >
              {type === 'EXPENSE' ? '💸 지출' : '💰 수입'}
            </button>
          ))}
        </div>
      </div>

      {/* ── 차트 + 범례 카드 ── */}
      <div className="bg-white rounded-3xl px-5 pt-5 pb-6 shadow-sm">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error === 'auth' ? (
          <div className="flex flex-col items-center gap-3 py-10">
            <span className="text-3xl">🔐</span>
            <p className="text-sm text-gray-500 font-medium">인증에 실패했습니다.</p>
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
        ) : error === 'server' ? (
          <div className="flex flex-col items-center gap-2 py-10">
            <span className="text-3xl">⚠️</span>
            <p className="text-sm text-gray-500 font-medium">서버에서 데이터를 가져오지 못했습니다.</p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10">
            <span className="text-3xl">{isExpense ? '📊' : '💳'}</span>
            <p className="text-sm text-gray-400 font-medium">
              {monthLabel} {isExpense ? '지출' : '수입'} 내역이 없습니다.
            </p>
          </div>
        ) : (
          <>
            <div className="relative" style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={2}
                    dataKey="value"
                    onMouseEnter={(_, index) => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(null)}
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={getCategoryColor(entry.name, index)}
                        opacity={activeIndex === null || activeIndex === index ? 1 : 0.4}
                        style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-[10px] text-gray-400 font-medium">
                  총 {isExpense ? '지출' : '수입'}
                </p>
                <p
                  className={`text-lg font-extrabold leading-tight ${
                    isExpense ? 'text-red-500' : 'text-blue-500'
                  }`}
                >
                  {fmt(total)}
                </p>
                <p className="text-[10px] text-gray-500">원</p>
              </div>
            </div>

            <div className="border-t border-gray-50 my-4" />

            <div className="flex flex-col gap-3">
              {chartData.map((entry, index) => {
                const pct = fmtPercent(entry.percent);
                const color = getCategoryColor(entry.name, index);
                const meta = getCategoryMeta(entry.name, viewType);
                const barWidth =
                  chartData[0]?.value > 0 ? (entry.value / chartData[0].value) * 100 : 0;

                return (
                  <div key={entry.name} className="flex items-center gap-3">
                    <span className="w-5 text-xs font-bold text-gray-400 text-right flex-shrink-0">
                      {index + 1}
                    </span>
                    <span className="text-base flex-shrink-0">{meta.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-700">
                          {entry.name}
                        </span>
                        <span
                          className={`text-xs font-bold ml-2 flex-shrink-0 ${
                            isExpense &&
                            budgets[entry.name] > 0 &&
                            entry.value > budgets[entry.name]
                              ? 'text-red-500'
                              : 'text-gray-900'
                          }`}
                        >
                          {fmt(entry.value)}원
                          {isExpense && budgets[entry.name]
                            ? ` / ${fmt(budgets[entry.name])}`
                            : ''}
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${barWidth}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                    <span
                      className="text-xs font-bold flex-shrink-0 w-10 text-right"
                      style={{ color }}
                    >
                      {pct}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
