'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { createClient } from '../../utils/supabase/client';
import { fmt, getCategoryMeta, getPayerNickname, isIncome } from '../../lib/categories';
import { periodYearMonth, resolveHomeRange, type PeriodCode } from '../../lib/date';
import { downloadTransactionsCsv } from '../../lib/csv';
import type { Transaction } from '../../lib/types';
import BottomNav from './BottomNav';
import TransactionModal from './TransactionModal';
import ExpenseChart from './ExpenseChart';
import MonthlyDashboard from './MonthlyDashboard';
import SettlementCard from './SettlementCard';
import WorkspaceSwitcher from './WorkspaceSwitcher';
import WorkspaceCreateModal from './WorkspaceCreateModal';
import BudgetPanel from './BudgetPanel';
import RecurringPanel from './RecurringPanel';
import NicknameCard from './NicknameCard';

const PERIODS: { id: PeriodCode; label: string }[] = [
  { id: 'THIS_MONTH', label: '이번 달' },
  { id: 'LAST_MONTH', label: '지난 달' },
  { id: 'LAST_3_MONTHS', label: '3개월' },
  { id: 'THIS_YEAR', label: '올해' },
];

const TABS = ['home', 'stats', 'calendar', 'settings'] as const;

/**
 * 메인 대시보드: 홈/통계/달력/설정 탭 + 거래 모달
 */
export default function Dashboard() {
  const router = useRouter();
  const supabase = createClient();
  const {
    currentWorkspace,
    currentWorkspaceId,
    members,
    loading: wsLoading,
    refreshVersion,
    refreshWorkspaceData,
    createWorkspace,
  } = useWorkspace();

  const now = new Date();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [period, setPeriod] = useState<PeriodCode>('THIS_MONTH');
  const [homeLoading, setHomeLoading] = useState(false);
  const [homeError, setHomeError] = useState(false);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [ledgerYear, setLedgerYear] = useState(now.getFullYear());
  const [ledgerMonth, setLedgerMonth] = useState(now.getMonth() + 1);
  const [createOpen, setCreateOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const periodLabel = PERIODS.find((p) => p.id === period)?.label ?? '이번 달';
  const budgetPeriod = periodYearMonth(period);

  const shiftLedger = (delta: number) => {
    const date = new Date(ledgerYear, ledgerMonth - 1 + delta, 1);
    setLedgerYear(date.getFullYear());
    setLedgerMonth(date.getMonth() + 1);
  };

  // 하단 탭을 ?tab= 으로 남겨 새로고침해도 같은 화면을 봅니다.
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('tab') === tab) return;
    url.searchParams.set('tab', tab);
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}`);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const tab = new URLSearchParams(window.location.search).get('tab');
    if (tab && (TABS as readonly string[]).includes(tab)) setActiveTab(tab);
  }, []);

  // 기간별 합계 + 최근 5건만 조회 (전체 행을 끌어오지 않음)
  useEffect(() => {
    if (!currentWorkspaceId) return;

    const fetchSummary = async () => {
      setHomeLoading(true);
      setHomeError(false);
      const { startDate, endDate } = resolveHomeRange(period);

      const range = { startDate, endDate };
      const [sumRes, recentRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('type, amount')
          .eq('workspace_id', currentWorkspaceId)
          .gte('date', range.startDate)
          .lte('date', range.endDate),
        supabase
          .from('transactions')
          .select('id, workspace_id, user_id, paid_by, type, amount, category, memo, date')
          .eq('workspace_id', currentWorkspaceId)
          .gte('date', range.startDate)
          .lte('date', range.endDate)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      if (sumRes.error || recentRes.error) {
        console.error('[Dashboard] 홈 요약 실패:', sumRes.error ?? recentRes.error);
        setHomeError(true);
        setTotalIncome(0);
        setTotalExpense(0);
        setRecentTransactions([]);
        setHomeLoading(false);
        return;
      }

      let income = 0;
      let expense = 0;
      (sumRes.data ?? []).forEach((tx: { type?: string; amount?: number }) => {
        if ((tx.type ?? '').toUpperCase() === 'INCOME') income += Number(tx.amount);
        else expense += Number(tx.amount);
      });
      setTotalIncome(income);
      setTotalExpense(expense);
      setRecentTransactions((recentRes.data ?? []) as Transaction[]);
      setHomeLoading(false);
    };

    fetchSummary();
  }, [currentWorkspaceId, period, refreshVersion, supabase]);

  const handleLogout = async () => {
    localStorage.removeItem('currentWorkspaceId');
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const handleExportPeriod = async () => {
    if (!currentWorkspaceId) return;
    setExporting(true);
    const { startDate, endDate } = resolveHomeRange(period);
    const { data, error } = await supabase
      .from('transactions')
      .select('date, type, category, amount, memo, paid_by')
      .eq('workspace_id', currentWorkspaceId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });
    setExporting(false);
    if (error) {
      alert('내보내기에 실패했습니다.');
      return;
    }
    downloadTransactionsCsv(
      data ?? [],
      `pocketfree-${startDate}-${endDate}.csv`,
      members
    );
  };

  if (wsLoading) {
    return <div className="p-8 text-center text-sm text-gray-400">워크스페이스 불러오는 중…</div>;
  }

  if (!currentWorkspace) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-8 text-center">
        <p className="text-4xl mb-4">📒</p>
        <p className="text-base font-bold text-gray-900 mb-2">워크스페이스가 없습니다</p>
        <p className="text-sm text-gray-400 mb-6">
          첫 가계부를 만들거나, SQL에서 002_ensure_workspace.sql을 실행해 주세요.
        </p>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="px-5 py-3 rounded-2xl bg-blue-500 text-white text-sm font-bold active:scale-95"
        >
          워크스페이스 만들기
        </button>
        <WorkspaceCreateModal
          open={createOpen}
          defaultName="나의 가계부"
          onClose={() => setCreateOpen(false)}
          onSubmit={async (name) => {
            await createWorkspace(name);
          }}
        />
      </div>
    );
  }

  const netAmount = totalIncome - totalExpense;

  return (
    <div className="flex flex-col min-h-screen bg-[#f2f3f7] font-sans">
      <header className="bg-white px-5 pt-12 pb-4 flex items-center justify-between sticky top-0 z-40 shadow-[0_1px_0_rgba(0,0,0,0.06)]">
        <div>
          <p className="text-xs text-gray-400 font-medium">{periodLabel}</p>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight leading-tight">
            PocketFree
          </h1>
        </div>
        <WorkspaceSwitcher />
      </header>

      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-32 space-y-3">
        {activeTab === 'calendar' && (
          <MonthlyDashboard
            year={ledgerYear}
            month={ledgerMonth}
            onMonthChange={(year, month) => {
              setLedgerYear(year);
              setLedgerMonth(month);
            }}
            onSelectTransaction={(tx) => {
              setEditingTx(tx as Transaction);
              setIsModalOpen(true);
            }}
          />
        )}

        {activeTab === 'stats' && (
          <>
            <ExpenseChart
              year={ledgerYear}
              month={ledgerMonth}
              onPrevMonth={() => shiftLedger(-1)}
              onNextMonth={() => shiftLedger(1)}
            />
            <BudgetPanel year={ledgerYear} month={ledgerMonth} />
          </>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-2">
            <p className="px-1 pt-2 pb-1 text-xs font-bold text-gray-400 uppercase tracking-wider">
              프로필
            </p>
            <NicknameCard />

            <p className="px-1 pt-4 pb-1 text-xs font-bold text-gray-400 uppercase tracking-wider">
              워크스페이스
            </p>
            <div className="bg-white rounded-3xl overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => router.push('/workspace/manage')}
                className="w-full flex items-center gap-4 px-5 py-4 active:bg-gray-50 transition-colors"
              >
                <div className="w-11 h-11 bg-blue-50 rounded-2xl flex items-center justify-center text-xl flex-shrink-0">
                  🗂️
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">내 워크스페이스 관리</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {currentWorkspace?.name ?? '워크스페이스'}
                  </p>
                </div>
                <span className="text-gray-300">›</span>
              </button>
            </div>

            <p className="px-1 pt-4 pb-1 text-xs font-bold text-gray-400 uppercase tracking-wider">
              반복 거래
            </p>
            <RecurringPanel />

            <p className="px-1 pt-4 pb-1 text-xs font-bold text-gray-400 uppercase tracking-wider">
              앱 정보
            </p>
            <div className="bg-white rounded-3xl overflow-hidden shadow-sm divide-y divide-gray-50">
              <div className="flex items-center justify-between px-5 py-4">
                <span className="text-sm font-medium text-gray-700">버전</span>
                <span className="text-sm text-gray-400">1.0.0</span>
              </div>
              <div className="flex items-center justify-between px-5 py-4">
                <span className="text-sm font-medium text-gray-700">앱 이름</span>
                <span className="text-sm text-gray-400">PocketFree</span>
              </div>
            </div>

            {members.length > 1 && (
              <>
                <p className="px-1 pt-4 pb-1 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  정산
                </p>
                <SettlementCard
                  year={ledgerYear}
                  month={ledgerMonth}
                  onPrevMonth={() => shiftLedger(-1)}
                  onNextMonth={() => shiftLedger(1)}
                />
              </>
            )}

            <p className="px-1 pt-4 pb-1 text-xs font-bold text-gray-400 uppercase tracking-wider">
              계정
            </p>
            <div className="bg-white rounded-3xl overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-4 px-5 py-4 active:bg-gray-50 transition-colors"
              >
                <div className="w-11 h-11 bg-red-50 rounded-2xl flex items-center justify-center text-xl flex-shrink-0">
                  🚪
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-gray-900">로그아웃</p>
                  <p className="text-xs text-gray-400 mt-0.5">이 기기에서 로그인 정보를 지웁니다</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'home' && (
          <>
            <div className="w-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full" />
              <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/5 rounded-full" />
              <p className="text-gray-400 text-xs font-medium mb-1 relative z-10">{periodLabel} 잔액</p>
              <p className="text-white text-4xl font-extrabold tracking-tight mb-5 relative z-10">
                {homeLoading ? '...' : fmt(netAmount)}
                <span className="text-xl font-semibold ml-1 text-gray-300">원</span>
              </p>
              <div className="flex gap-5 relative z-10">
                <div>
                  <p className="text-gray-500 text-xs mb-1">수입</p>
                  <p className="text-blue-400 text-base font-bold">
                    +{homeLoading ? '...' : fmt(totalIncome)}
                  </p>
                </div>
                <div className="w-px bg-white/10" />
                <div>
                  <p className="text-gray-500 text-xs mb-1">지출</p>
                  <p className="text-red-400 text-base font-bold">
                    -{homeLoading ? '...' : fmt(totalExpense)}
                  </p>
                </div>
              </div>
            </div>
            {homeError && (
              <p className="text-xs text-red-400 font-semibold">메인 데이터를 가져오지 못했습니다.</p>
            )}

            <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
              {PERIODS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPeriod(item.id)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                    period === item.id
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-500 border border-gray-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {budgetPeriod && (
              <BudgetPanel year={budgetPeriod.year} month={budgetPeriod.month} compact />
            )}

            <div className="bg-white rounded-3xl overflow-hidden">
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <h3 className="text-sm font-bold text-gray-900">최근 내역</h3>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => router.push('/transactions')}
                    className="text-xs text-blue-500 font-semibold active:opacity-50"
                  >
                    검색
                  </button>
                  <button
                    type="button"
                    onClick={handleExportPeriod}
                    disabled={exporting}
                    className="text-xs text-gray-400 font-semibold active:opacity-50"
                  >
                    {exporting ? '내보내는 중…' : 'CSV'}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/transactions')}
                    className="text-xs text-gray-400 font-semibold active:opacity-50"
                  >
                    전체보기
                  </button>
                </div>
              </div>

              {homeLoading ? (
                <div className="px-5 py-8 text-center text-sm text-gray-400">최근 내역을 불러오는 중…</div>
              ) : recentTransactions.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-gray-400">최근 내역이 없습니다.</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {recentTransactions.map((tx) => {
                    const meta = getCategoryMeta(tx.category, tx.type);
                    const income = isIncome(tx.type);
                    const payer = getPayerNickname(tx.paid_by, members);
                    const paidByText = payer ? ` • ${payer} 결제` : '';
                    return (
                      <button
                        key={tx.id}
                        type="button"
                        onClick={() => {
                          setEditingTx(tx);
                          setIsModalOpen(true);
                        }}
                        className="w-full flex items-center gap-3 px-5 py-4 active:bg-gray-50 transition-colors text-left"
                      >
                        <div
                          className={`w-11 h-11 ${meta.emojiColor} rounded-2xl flex items-center justify-center text-xl flex-shrink-0`}
                        >
                          {meta.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {tx.category ?? (income ? '수입' : '기타')}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5 truncate">
                            {(tx.memo || tx.date || '메모 없음') + paidByText}
                          </p>
                        </div>
                        <span
                          className={`text-sm font-bold flex-shrink-0 ${
                            income ? 'text-blue-500' : 'text-red-500'
                          }`}
                        >
                          {income ? '+' : '-'}
                          {fmt(tx.amount)}원
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              <button
                type="button"
                onClick={() => router.push('/transactions')}
                className="w-full py-4 text-xs text-gray-400 font-medium active:bg-gray-50 border-t border-gray-50"
              >
                내역 더 보기
              </button>
            </div>
          </>
        )}
      </main>

      <BottomNav
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onAddClick={() => {
          setEditingTx(null);
          setIsModalOpen(true);
        }}
      />

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
