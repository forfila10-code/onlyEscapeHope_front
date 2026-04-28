import React, { useState, useEffect, useMemo } from 'react';
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
import api from '../api/axiosInstance';

// 카테고리 이모지 매핑
const CATEGORY_EMOJI = {
  식비: '🍽️',
  카페: '☕',
  교통: '🚌',
  쇼핑: '🛍️',
  생활: '🏠',
  의료: '💊',
  문화: '🎬',
  운동: '💪',
  기타: '📦',
  급여: '💰',
  용돈: '💵',
  이자: '🏦',
  수입: '💰',
  INCOME: '💰',
  EXPENSE: '📦',
};

const CATEGORY_BG = {
  식비: 'bg-orange-100',
  카페: 'bg-yellow-100',
  교통: 'bg-sky-100',
  쇼핑: 'bg-pink-100',
  생활: 'bg-green-100',
  의료: 'bg-red-100',
  문화: 'bg-purple-100',
  운동: 'bg-emerald-100',
  기타: 'bg-gray-100',
  급여: 'bg-blue-100',
  용돈: 'bg-blue-100',
  이자: 'bg-blue-100',
  수입: 'bg-blue-100',
};

/** 숫자 → "1,234" 형식 */
const fmt = (n) =>
  Math.abs(n).toLocaleString('ko-KR');

/** transaction 객체에서 카테고리명 추출 (문자열 or 객체) */
const getCategoryName = (tx) => {
  if (!tx.category) return tx.type === 'INCOME' ? '수입' : '기타';
  if (typeof tx.category === 'string') return tx.category;
  return tx.category.name ?? '기타';
};

/** transaction 객체에서 날짜 문자열 추출 → 항상 "YYYY-MM-DD" 형식으로 정규화 */
const getTxDate = (tx) => {
  const raw =
    tx.transactionDate ??
    tx.transaction_date ??
    tx.date ??
    '';
  // "2026-04-26T00:00:00" 같은 datetime 문자열도 앞 10자만 사용
  return typeof raw === 'string' ? raw.slice(0, 10) : '';
};

/** transaction 객체에서 메모 추출 */
const getMemo = (tx) =>
  tx.description ?? tx.memo ?? '';

/** transaction 타입 정규화 → 'INCOME' | 'EXPENSE' */
const getType = (tx) => {
  const t = (tx.type ?? '').toUpperCase();
  if (t === 'INCOME') return 'INCOME';
  return 'EXPENSE';
};

export default function MonthlyDashboard() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDate, setSelectedDate] = useState(today);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ── 이번 달 데이터 로딩 ──
  useEffect(() => {
    // 토큰 없으면 API 호출 자체를 막고 로그인 유도
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setError('auth');
      setLoading(false);
      return;
    }

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    setLoading(true);
    setError(null);
    api
      .get(`/api/transactions?year=${year}&month=${month}`)
      .then((res) => {
        console.log('[MonthlyDashboard] API 응답 원본:', res.data);
        const list = Array.isArray(res.data) ? res.data : [];
        if (list.length > 0) {
          console.log('[MonthlyDashboard] 첫 번째 항목 키 목록:', Object.keys(list[0]));
          console.log('[MonthlyDashboard] 첫 번째 항목 값:', list[0]);
        }
        setTransactions(list);
      })
      .catch((err) => {
        console.error('[MonthlyDashboard] 거래 내역 로딩 실패:', err);
        const status = err?.response?.status;
        // 401/403 → 토큰 만료 (인터셉터가 로그인 페이지로 이동시키므로 여기선 auth 표시)
        if (status === 401 || status === 403) {
          setError('auth');
        } else {
          // Network Error(CORS 차단) 등은 백엔드 설정 문제 → 서버 오류 안내
          setError('server');
        }
        setTransactions([]);
      })
      .finally(() => setLoading(false));
  }, [currentMonth]);

  // ── 날짜별 집계 맵 { "YYYY-MM-DD": { income, expense, items[] } } ──
  const dailyMap = useMemo(() => {
    const map = {};
    transactions.forEach((tx) => {
      const dateKey = getTxDate(tx);
      if (!dateKey) return;
      if (!map[dateKey]) map[dateKey] = { income: 0, expense: 0, items: [] };
      const type = getType(tx);
      if (type === 'INCOME') map[dateKey].income += Number(tx.amount ?? 0);
      else map[dateKey].expense += Number(tx.amount ?? 0);
      map[dateKey].items.push(tx);
    });
    return map;
  }, [transactions]);

  // ── 달력 날짜 배열 생성 ──
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // 일요일 시작
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  // ── 선택된 날짜의 거래 내역 ──
  const selectedKey = format(selectedDate, 'yyyy-MM-dd');
  const selectedItems = dailyMap[selectedKey]?.items ?? [];

  // ── 월 이동 ──
  const prevMonth = () =>
    setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () =>
    setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  // ── 월 총계 ──
  const monthlyTotal = useMemo(() => {
    let income = 0;
    let expense = 0;
    transactions.forEach((tx) => {
      if (getType(tx) === 'INCOME') income += Number(tx.amount ?? 0);
      else expense += Number(tx.amount ?? 0);
    });
    return { income, expense };
  }, [transactions]);

  const WEEK_DAYS = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className="flex flex-col gap-3">
      {/* ──────── 달력 카드 ──────── */}
      <div className="bg-white rounded-3xl overflow-hidden shadow-sm">
        {/* 월 네비게이션 */}
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
            {!loading && (
              <p className="text-xs text-gray-400 mt-0.5">
                <span className="text-blue-500 font-semibold">+{fmt(monthlyTotal.income)}</span>
                <span className="mx-1.5 text-gray-300">|</span>
                <span className="text-red-400 font-semibold">-{fmt(monthlyTotal.expense)}</span>
              </p>
            )}
          </div>
          <button
            onClick={nextMonth}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 active:scale-90 transition-transform text-sm font-bold"
          >
            ›
          </button>
        </div>

        {/* 요일 헤더 */}
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

        {/* 날짜 그리드 */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-7 px-2 pb-4 gap-y-1">
            {calendarDays.map((day) => {
              const key = format(day, 'yyyy-MM-dd');
              const dayData = dailyMap[key];
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = isSameDay(day, selectedDate);
              const isTodayDay = isToday(day);
              const dayNum = format(day, 'd');
              const col = day.getDay(); // 0=일, 6=토

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
                  {/* 날짜 숫자 */}
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

                  {/* 지출 */}
                  {dayData?.expense > 0 && (
                    <span
                      className={`text-[8px] font-semibold leading-none truncate w-full text-center ${
                        isSelected ? 'text-red-300' : 'text-red-400'
                      }`}
                    >
                      -{fmt(dayData.expense)}
                    </span>
                  )}
                  {/* 수입 */}
                  {dayData?.income > 0 && (
                    <span
                      className={`text-[8px] font-semibold leading-none truncate w-full text-center ${
                        isSelected ? 'text-blue-300' : 'text-blue-500'
                      }`}
                    >
                      +{fmt(dayData.income)}
                    </span>
                  )}
                  {/* 데이터 없을 때 빈 공간 유지 */}
                  {!dayData && <span className="text-[8px] leading-none">&nbsp;</span>}
                </button>
              );
            })}
          </div>
        )}

        {error === 'auth' && (
          <div className="flex flex-col items-center gap-3 py-8 px-4">
            <span className="text-3xl">🔐</span>
            <p className="text-sm text-gray-500 font-medium text-center">
              인증에 실패했습니다.
            </p>
            <p className="text-xs text-gray-400 text-center">
              토큰이 만료되었거나 서버 키와 불일치합니다.
            </p>
            <button
              onClick={() => {
                localStorage.removeItem('accessToken');
                window.location.href = '/login';
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
              백엔드 서버 또는 인증 설정을 확인해 주세요.
            </p>
          </div>
        )}
      </div>

      {/* ──────── 일일 리스트 카드 ──────── */}
      <div className="bg-white rounded-3xl overflow-hidden shadow-sm">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-gray-900">
              {format(selectedDate, 'M월 d일 (eee)', { locale: ko })}
            </h3>
            {selectedItems.length > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">
                {(() => {
                  const d = dailyMap[selectedKey];
                  const parts = [];
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

        {/* 내역 리스트 */}
        {selectedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <span className="text-3xl">📭</span>
            <p className="text-sm text-gray-400 font-medium">지출 내역이 없습니다</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 pb-2">
            {selectedItems.map((tx, idx) => {
              const categoryName = getCategoryName(tx);
              const memo = getMemo(tx);
              const type = getType(tx);
              const emoji = CATEGORY_EMOJI[categoryName] ?? (type === 'INCOME' ? '💰' : '📦');
              const bgColor = CATEGORY_BG[categoryName] ?? 'bg-gray-100';
              const isExpense = type === 'EXPENSE';

              return (
                <div
                  key={tx.id ?? idx}
                  className="flex items-center gap-3 px-5 py-4 active:bg-gray-50 transition-colors"
                >
                  {/* 카테고리 아이콘 */}
                  <div
                    className={`w-11 h-11 ${bgColor} rounded-2xl flex items-center justify-center text-xl flex-shrink-0`}
                  >
                    {emoji}
                  </div>

                  {/* 내용 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {categoryName}
                    </p>
                    {memo ? (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{memo}</p>
                    ) : (
                      <p className="text-xs text-gray-300 mt-0.5">메모 없음</p>
                    )}
                  </div>

                  {/* 금액 */}
                  <span
                    className={`text-sm font-bold flex-shrink-0 ${
                      isExpense ? 'text-red-500' : 'text-blue-500'
                    }`}
                  >
                    {isExpense ? '-' : '+'}
                    {fmt(tx.amount)}원
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
