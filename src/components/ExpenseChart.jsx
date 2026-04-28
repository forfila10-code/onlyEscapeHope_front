import React, { useState, useEffect, useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import api from '../api/axiosInstance';

// ── 카테고리별 색상 ──────────────────────────────────────
const CATEGORY_COLOR = {
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

const getCategoryColor = (name, index) =>
  CATEGORY_COLOR[name] ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length];

const CATEGORY_EMOJI = {
  식비: '🍽️', 카페: '☕', 교통: '🚌', 쇼핑: '🛍️',
  생활: '🏠', 의료: '💊', 문화: '🎬', 운동: '💪',
  기타: '📦', 급여: '💰', 용돈: '💵', 이자: '🏦',
};

const fmt = (n) => Math.abs(n).toLocaleString('ko-KR');

// categoryBreakdown 항목에서 정규화된 타입 추출
// 서버 응답 type: 'income' | 'expense' (소문자)
const normalizeType = (type) =>
  (type ?? '').toLowerCase() === 'income' ? 'INCOME' : 'EXPENSE';

// ── 커스텀 툴팁 ─────────────────────────────────────────
const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { name, value, percent } = payload[0].payload;
  return (
    <div className="bg-white rounded-2xl shadow-lg px-4 py-3 text-center border border-gray-100">
      <p className="text-xs font-bold text-gray-700">{name}</p>
      <p className="text-sm font-extrabold text-gray-900 mt-0.5">{fmt(value)}원</p>
      <p className="text-xs text-gray-400">{(percent * 100).toFixed(1)}%</p>
    </div>
  );
};

export default function ExpenseChart() {
  const today = new Date();

  // ── year / month를 숫자로 분리 → useEffect 의존성 비교 확실 ──
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1~12
  const [viewType, setViewType] = useState('EXPENSE');       // 'EXPENSE' | 'INCOME'

  const [summary, setSummary]         = useState(null);  // { categoryBreakdown, totalExpense, totalIncome, netAmount, year, month }
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [activeIndex, setActiveIndex] = useState(null);

  // ── 월 이동 ───────────────────────────────────────────
  const prevMonth = () => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else              setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else               setMonth((m) => m + 1);
  };

  // ── API 로딩 — year/month 숫자 의존 → 변경 시 확실히 재실행 ──
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { setError('auth'); setLoading(false); return; }

    setLoading(true);
    setError(null);
    setSummary(null); // 이전 달 데이터 즉시 초기화

    console.log(`[ExpenseChart] API 호출: year=${year}, month=${month}`);

    api
      .get(`/api/transactions/statistics?year=${year}&month=${month}`)
      .then((res) => {
        console.log('[ExpenseChart] 응답:', res.data);
        setSummary(res.data ?? null);
      })
      .catch((err) => {
        console.error('[ExpenseChart] 오류:', err?.response?.status, err?.message);
        const status = err?.response?.status;
        setError(status === 401 || status === 403 ? 'auth' : 'server');
      })
      .finally(() => setLoading(false));
  }, [year, month]); // ← 숫자 비교로 확실한 재실행

  // ── categoryBreakdown → 차트 데이터 (viewType 필터) ──
  // 응답: { categoryBreakdown: [{category, type, totalAmount}], totalExpense, totalIncome, netAmount }
  // type은 소문자 'income' | 'expense'
  const chartData = useMemo(() => {
    const breakdown = summary?.categoryBreakdown ?? [];
    return breakdown
      .filter((item) => normalizeType(item.type) === viewType)
      .map((item) => ({
        name: item.category ?? '기타',
        value: Number(item.totalAmount ?? 0),
      }))
      .sort((a, b) => b.value - a.value);
  }, [summary, viewType]);

  const isExpense = viewType === 'EXPENSE';

  // 백엔드 totalExpense/totalIncome이 0이면 categoryBreakdown에서 직접 계산
  const totalFromBreakdown = chartData.reduce((s, d) => s + d.value, 0);
  const totalFromServer = isExpense
    ? Number(summary?.totalExpense ?? 0)
    : Number(summary?.totalIncome ?? 0);
  const total = totalFromServer > 0 ? totalFromServer : totalFromBreakdown;

  const monthLabel = `${year}년 ${month}월`;

  return (
    <div className="flex flex-col gap-3">
      {/* ── 헤더 카드 ── */}
      <div className="bg-white rounded-3xl px-5 pt-5 pb-4 shadow-sm">
        {/* 월 네비게이션 */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={prevMonth}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 active:scale-90 transition-transform text-sm font-bold"
          >
            ‹
          </button>
          <div className="text-center">
            <p className="text-base font-extrabold text-gray-900">{monthLabel}</p>
            <p className="text-xs text-gray-400 mt-0.5">카테고리별 분석</p>
          </div>
          <button
            onClick={nextMonth}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 active:scale-90 transition-transform text-sm font-bold"
          >
            ›
          </button>
        </div>

        {/* 지출 / 수입 토글 */}
        <div className="flex rounded-2xl bg-gray-100 p-1 gap-1">
          {['EXPENSE', 'INCOME'].map((type) => (
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
              onClick={() => { localStorage.removeItem('accessToken'); window.location.href = '/login'; }}
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
            {/* 도넛 차트 */}
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
                        opacity={
                          activeIndex === null || activeIndex === index ? 1 : 0.4
                        }
                        style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              {/* 중앙 총액 */}
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

            {/* ── 순위별 범례 ── */}
            <div className="flex flex-col gap-3">
              {chartData.map((entry, index) => {
                const pct =
                  total > 0
                    ? ((entry.value / total) * 100).toFixed(1)
                    : '0.0';
                const color = getCategoryColor(entry.name, index);
                const emoji = CATEGORY_EMOJI[entry.name] ?? (isExpense ? '📦' : '💰');
                const barWidth =
                  total > 0 ? (entry.value / chartData[0].value) * 100 : 0;

                return (
                  <div key={entry.name} className="flex items-center gap-3">
                    <span className="w-5 text-xs font-bold text-gray-400 text-right flex-shrink-0">
                      {index + 1}
                    </span>
                    <span className="text-base flex-shrink-0">{emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-700">
                          {entry.name}
                        </span>
                        <span className="text-xs font-bold text-gray-900 ml-2 flex-shrink-0">
                          {fmt(entry.value)}원
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
                      {pct}%
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
