import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
// @ts-ignore
import api from '../../api/axiosInstance';
// @ts-ignore
import TransactionModal from '../../components/TransactionModal';
// @ts-ignore
import MonthlyDashboard from '../../components/MonthlyDashboard';
// @ts-ignore
import ExpenseChart from '../../components/ExpenseChart';
// @ts-ignore
import WorkspaceSwitcher from '../../components/WorkspaceSwitcher';
// @ts-ignore
import { useWorkspace } from '../../contexts/WorkspaceContext';

const CATEGORY_META: Record<string, { emoji: string; emojiColor: string }> = {
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
  수입: { emoji: '💰', emojiColor: 'bg-blue-100' },
};

const fmt = (value: number | null | undefined) =>
  Math.abs(Number(value ?? 0)).toLocaleString('ko-KR');

const isIncome = (type: string | undefined) => (type ?? '').toUpperCase() === 'INCOME';

const getCategoryMeta = (category: string | undefined, type: string | undefined) =>
  CATEGORY_META[category ?? ''] ?? (isIncome(type) ? CATEGORY_META.수입 : CATEGORY_META.기타);

function MainPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const navigate = useNavigate();
  const { currentWorkspaceId, currentWorkspace, refreshVersion } = useWorkspace();
  const [homeSummary, setHomeSummary] = useState<any>(null);
  const [homeLoading, setHomeLoading] = useState(false);
  const [homeError, setHomeError] = useState(false);

  const today = new Date();
  const targetYear = today.getFullYear();
  const targetMonth = today.getMonth() + 1;

  // 선택된 워크스페이스가 바뀌거나 거래 저장 refresh 신호가 오면 메인 홈 요약을 다시 조회합니다.
  useEffect(() => {
    if (!currentWorkspaceId) return;

    setHomeLoading(true);
    setHomeError(false);

    api
      .get('/api/transactions/home-summary', {
        params: {
          year: targetYear,
          month: targetMonth,
          workspaceId: currentWorkspaceId,
        },
      })
      .then((res: any) => {
        setHomeSummary(res.data ?? null);
      })
      .catch((error: unknown) => {
        console.error('[MainPage] 홈 요약 로딩 실패:', error);
        setHomeError(true);
        setHomeSummary(null);
      })
      .finally(() => setHomeLoading(false));
  }, [currentWorkspaceId, refreshVersion, targetYear, targetMonth]);

  const totalIncome = Number(homeSummary?.totalIncome ?? 0);
  const totalExpense = Number(homeSummary?.totalExpense ?? 0);
  const netAmount = Number(homeSummary?.netAmount ?? totalIncome - totalExpense);
  const recentTransactions = Array.isArray(homeSummary?.recentTransactions)
    ? homeSummary.recentTransactions
    : [];

  return (
    <div className="flex flex-col min-h-screen bg-[#f2f3f7] font-sans">

      {/* ── 상단 앱바 ── */}
      <header className="bg-white px-5 pt-12 pb-4 flex items-center justify-between sticky top-0 z-40 shadow-[0_1px_0_rgba(0,0,0,0.06)]">
        <div>
          <p className="text-xs text-gray-400 font-medium">
            {targetYear}년 {targetMonth}월
          </p>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight leading-tight">
            PocketFree
          </h1>
        </div>
        <WorkspaceSwitcher />
      </header>

      {/* ── 스크롤 가능한 메인 콘텐츠 ── */}
      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-32 space-y-3">

        {/* ── 달력 탭: 월간 대시보드 ── */}
        {activeTab === 'calendar' && <MonthlyDashboard />}

        {/* ── 통계 탭: 카테고리별 지출 차트 ── */}
        {activeTab === 'stats' && <ExpenseChart />}

        {/* ── 설정 탭 ── */}
        {activeTab === 'settings' && (
          <div className="space-y-2">

            {/* 현재 워크스페이스 정보 */}
            <p className="px-1 pt-2 pb-1 text-xs font-bold text-gray-400 uppercase tracking-wider">
              워크스페이스
            </p>
            <div className="bg-white rounded-3xl overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => navigate('/workspace/manage')}
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 flex-shrink-0">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>

            {/* 앱 정보 */}
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

          </div>
        )}

        {/* 홈 탭 콘텐츠 */}
        {activeTab !== 'calendar' && activeTab !== 'stats' && activeTab !== 'settings' && <>

        {/* 잔액 카드 — 다크 그라데이션 */}
        <div className="w-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 rounded-3xl p-6 relative overflow-hidden">
          {/* 장식 원 */}
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full" />
          <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/5 rounded-full" />

          <p className="text-gray-400 text-xs font-medium mb-1 relative z-10">이번 달 잔액</p>
          <p className="text-white text-4xl font-extrabold tracking-tight mb-5 relative z-10">
            {homeLoading ? '...' : fmt(netAmount)}
            <span className="text-xl font-semibold ml-1 text-gray-300">원</span>
          </p>

          {/* 수입 / 지출 요약 */}
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
          <p className="text-xs text-red-300 font-semibold mt-3 relative z-10">
            메인 데이터를 가져오지 못했습니다.
          </p>
        )}

        {/* 빠른 분석 — 가로 스크롤 칩 */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {['이번 달', '지난 달', '3개월', '올해'].map((label, i) => (
            <button
              key={label}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                i === 0
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-500 border border-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 최근 내역 카드 */}
        <div className="bg-white rounded-3xl overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h3 className="text-sm font-bold text-gray-900">최근 내역</h3>
            <button className="text-xs text-blue-500 font-semibold active:opacity-50">
              전체보기
            </button>
          </div>

          {homeLoading ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400 font-medium">
              최근 내역을 불러오는 중입니다.
            </div>
          ) : recentTransactions.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400 font-medium">
              최근 내역이 없습니다.
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentTransactions.map((tx: any) => {
                const meta = getCategoryMeta(tx.category, tx.type);
                const income = isIncome(tx.type);
                const paidByText = tx.paidByNickname ? ` • ${tx.paidByNickname} 결제` : '';

                return (
                  <div key={tx.id} className="flex items-center gap-3 px-5 py-4 active:bg-gray-50 transition-colors">
                    {/* 카테고리 아이콘 */}
                    <div
                      className={`w-11 h-11 ${meta.emojiColor} rounded-2xl flex items-center justify-center text-xl flex-shrink-0`}
                    >
                      {meta.emoji}
                    </div>

                    {/* 내용 */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {tx.category ?? (income ? '수입' : '기타')}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {(tx.memo || tx.date || '메모 없음')}{paidByText}
                      </p>
                    </div>

                    {/* 금액 */}
                    <span
                      className={`text-sm font-bold flex-shrink-0 ${
                        income ? 'text-blue-500' : 'text-red-500'
                      }`}
                    >
                      {income ? '+' : '-'}
                      {fmt(tx.amount)}원
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* 더보기 버튼 */}
          <button className="w-full py-4 text-xs text-gray-400 font-medium active:bg-gray-50 transition-colors border-t border-gray-50">
            내역 더 보기
          </button>
        </div>

        </>}

      </main>

      {/* ── 하단 탭 바 ── */}
      <nav className="fixed bottom-0 w-full max-w-[430px] bg-white border-t border-gray-100 flex items-end justify-around px-2 pt-3 pb-6 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">

        {(['home', 'stats'] as const).map((tab) => {
          const icons = { home: '🏠', stats: '📊' };
          const labels = { home: '홈', stats: '통계' };
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex flex-col items-center gap-1 py-1 min-w-[52px] active:scale-90 transition-transform"
            >
              <span className={`text-2xl transition-all ${activeTab === tab ? '' : 'opacity-30'}`}>
                {icons[tab]}
              </span>
              <span
                className={`text-[10px] font-semibold transition-colors ${
                  activeTab === tab ? 'text-gray-900' : 'text-gray-300'
                }`}
              >
                {labels[tab]}
              </span>
            </button>
          );
        })}

        {/* 중앙 + 버튼 */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="-mt-7 flex flex-col items-center active:scale-90 transition-transform"
        >
          <div className="w-14 h-14 bg-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-blue-200">
            <span className="text-white text-3xl font-light leading-none select-none">+</span>
          </div>
        </button>

        {(['calendar', 'settings'] as const).map((tab) => {
          const icons = { calendar: '🗓️', settings: '⚙️' };
          const labels = { calendar: '달력', settings: '설정' };
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex flex-col items-center gap-1 py-1 min-w-[52px] active:scale-90 transition-transform"
            >
              <span className={`text-2xl transition-all ${activeTab === tab ? '' : 'opacity-30'}`}>
                {icons[tab]}
              </span>
              <span
                className={`text-[10px] font-semibold transition-colors ${
                  activeTab === tab ? 'text-gray-900' : 'text-gray-300'
                }`}
              >
                {labels[tab]}
              </span>
            </button>
          );
        })}

      </nav>

      <TransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}

export default MainPage;
