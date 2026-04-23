import React, { useState } from 'react';
// @ts-ignore
import TransactionModal from '../../components/TransactionModal';

const RECENT_ITEMS = [
  { id: 1, emoji: '🍽️', emojiColor: 'bg-orange-100', title: '스타벅스 강남점', sub: '식비 • 오늘 13:00', amount: '-9,000원', isExpense: true },
  { id: 2, emoji: '🏠', emojiColor: 'bg-green-100', title: '이마트 장보기', sub: '생활 • 어제 18:30', amount: '-85,000원', isExpense: true },
  { id: 3, emoji: '💰', emojiColor: 'bg-blue-100', title: '4월 월급', sub: '수입 • 4/1 09:00', amount: '+5,000,000원', isExpense: false },
];

function MainPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('home');

  return (
    <div className="flex flex-col min-h-screen bg-[#f2f3f7] font-sans">

      {/* ── 상단 앱바 ── */}
      <header className="bg-white px-5 pt-12 pb-4 flex items-center justify-between sticky top-0 z-10 shadow-[0_1px_0_rgba(0,0,0,0.06)]">
        <div>
          <p className="text-xs text-gray-400 font-medium">2025년 4월</p>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight leading-tight">
            PocketFree
          </h1>
        </div>
        <button className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-base active:scale-90 transition-transform">
          🔔
        </button>
      </header>

      {/* ── 스크롤 가능한 메인 콘텐츠 ── */}
      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-32 space-y-3">

        {/* 잔액 카드 — 다크 그라데이션 */}
        <div className="w-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 rounded-3xl p-6 relative overflow-hidden">
          {/* 장식 원 */}
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full" />
          <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/5 rounded-full" />

          <p className="text-gray-400 text-xs font-medium mb-1 relative z-10">이번 달 잔액</p>
          <p className="text-white text-4xl font-extrabold tracking-tight mb-5 relative z-10">
            1,450,000<span className="text-xl font-semibold ml-1 text-gray-300">원</span>
          </p>

          {/* 수입 / 지출 요약 */}
          <div className="flex gap-5 relative z-10">
            <div>
              <p className="text-gray-500 text-xs mb-1">수입</p>
              <p className="text-blue-400 text-base font-bold">+5,000,000</p>
            </div>
            <div className="w-px bg-white/10" />
            <div>
              <p className="text-gray-500 text-xs mb-1">지출</p>
              <p className="text-red-400 text-base font-bold">-3,550,000</p>
            </div>
          </div>
        </div>

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

          <div className="divide-y divide-gray-50">
            {RECENT_ITEMS.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-5 py-4 active:bg-gray-50 transition-colors">
                {/* 카테고리 아이콘 */}
                <div
                  className={`w-11 h-11 ${item.emojiColor} rounded-2xl flex items-center justify-center text-xl flex-shrink-0`}
                >
                  {item.emoji}
                </div>

                {/* 내용 */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>
                </div>

                {/* 금액 */}
                <span
                  className={`text-sm font-bold flex-shrink-0 ${
                    item.isExpense ? 'text-red-500' : 'text-blue-500'
                  }`}
                >
                  {item.amount}
                </span>
              </div>
            ))}
          </div>

          {/* 더보기 버튼 */}
          <button className="w-full py-4 text-xs text-gray-400 font-medium active:bg-gray-50 transition-colors border-t border-gray-50">
            내역 더 보기
          </button>
        </div>

      </main>

      {/* ── 하단 탭 바 ── */}
      <nav className="fixed bottom-0 w-full max-w-[430px] bg-white border-t border-gray-100 flex items-end justify-around px-2 pt-3 pb-6 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">

        {(['home', 'stats'] as const).map((tab, i) => {
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
