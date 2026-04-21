import React from 'react';

function MainPage() {
  return (
    // md:flex-row -> 태블릿 이상에선 가로 배치, 기본은 flex-col (세로)
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50 font-sans">
      
      {/* 💻 사이드바: 모바일(hidden), 태블릿 이상(md:flex) */}
      <aside className="hidden md:flex md:flex-col w-64 bg-white p-8 sticky top-0 h-screen border-r border-gray-100">
        <h2 className="text-xl font-bold mb-10 text-blue-600">💰 PocketFree</h2>
        <nav className="space-y-4">
          <p className="font-bold text-gray-900 cursor-pointer bg-blue-50 p-3 rounded-lg">🏠 홈 대시보드</p>
          <p className="text-gray-500 hover:text-gray-900 p-3 cursor-pointer transition-colors">📊 통계 및 차트</p>
          <p className="text-gray-500 hover:text-gray-900 p-3 cursor-pointer transition-colors">🗓️ 달력 보기</p>
          <p className="text-gray-500 hover:text-gray-900 p-3 cursor-pointer transition-colors">⚙️ 설정</p>
        </nav>
      </aside>

      {/* 📱 메인 콘텐츠 영역 */}
      <main className="flex-1 p-5 md:p-10 pb-24 md:pb-10 grid grid-cols-1 md:grid-cols-2 gap-6 self-start">
        
        {/* 헤더 */}
        <div className="md:col-span-2 mb-2">
          <h2 className="text-2xl font-bold text-gray-800">PocketFree</h2>
          <p className="text-gray-400 mt-1">이번 달도 현명하게 화이팅!</p>
        </div>

        {/* 위젯 1: 잔액 (전체 너비) */}
        <div className="md:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-gray-50">
          <div className="text-sm text-gray-400 mb-2">이번 달 남은 생활비</div>
          <div className="text-3xl font-extrabold text-gray-900">1,450,000 원</div>
        </div>

        {/* 위젯 2: 수입 */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-50">
          <div className="text-sm text-gray-400 mb-2">들어온 돈 (수입)</div>
          <div className="text-xl font-bold text-blue-500">+ 5,000,000 원</div>
        </div>

        {/* 위젯 3: 지출 */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-50">
          <div className="text-sm text-gray-400 mb-2">나간 돈 (지출)</div>
          <div className="text-xl font-bold text-red-500">- 3,550,000 원</div>
        </div>

        {/* 위젯 4: 최근 내역 (전체 너비) */}
        <div className="md:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-gray-50">
          <h3 className="text-lg font-bold mb-5">최근 지출 내역</h3>
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-bold text-gray-800">스타벅스 강남점</div>
                <div className="text-xs text-gray-400">식비/카페 • 오늘 13:00</div>
              </div>
              <div className="font-bold text-gray-900">- 9,000 원</div>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <div className="font-bold text-gray-800">이마트 장보기</div>
                <div className="text-xs text-gray-400">생활비 • 어제 18:30</div>
              </div>
              <div className="font-bold text-gray-900">- 85,000 원</div>
            </div>
          </div>
        </div>
      </main>

      {/* 📱 모바일 하단 네비게이션: 태블릿 이상(md:hidden) */}
      <nav className="md:hidden fixed bottom-0 w-full bg-white flex justify-around items-center p-4 border-t border-gray-100 shadow-lg pb-safe">
        <div className="text-2xl grayscale-0">🏠</div>
        <div className="text-2xl grayscale opacity-40">📊</div>
        <div className="text-4xl bg-blue-600 text-white w-12 h-12 flex items-center justify-center rounded-full shadow-blue-200 shadow-lg mb-8">+</div>
        <div className="text-2xl grayscale opacity-40">🗓️</div>
        <div className="text-2xl grayscale opacity-40">⚙️</div>
      </nav>
      
    </div>
  );
}

export default MainPage;