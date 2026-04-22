import React from 'react';

function MainPage() {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#f5f6f8] font-sans">
      
      {/* 💻 사이드바 (태블릿 이상에서만 보임) */}
      <aside className="hidden md:flex md:flex-col w-64 bg-white p-8 sticky top-0 h-screen border-r border-gray-100 shadow-sm">
        <h2 className="text-xl font-bold mb-10 text-center text-gray-800">💰 PocketFree</h2>
        <nav className="space-y-4">
          <p className="font-bold text-gray-900 cursor-pointer bg-blue-50 p-3 rounded-xl text-center">🏠 홈 대시보드</p>
          <p className="text-gray-500 hover:text-gray-900 p-3 cursor-pointer transition-colors text-center">📊 통계 및 차트</p>
          <p className="text-gray-500 hover:text-gray-900 p-3 cursor-pointer transition-colors text-center">🗓️ 달력 보기</p>
          <p className="text-gray-500 hover:text-gray-900 p-3 cursor-pointer transition-colors text-center">⚙️ 설정</p>
        </nav>
      </aside>

      {/* 📱 메인 콘텐츠 영역 (완벽한 가운데 정렬!) */}
      <main className="flex-1 flex flex-col items-center justify-start p-5 pb-28 md:p-10 w-full">
        
        {/* 💡 이 div가 핵심입니다! 콘텐츠가 너무 퍼지지 않게 스마트폰 너비(max-w-md)로 잡아줍니다. */}
        <div className="w-full max-w-md flex flex-col items-center">
          
          {/* 헤더 및 인사말 */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-800 tracking-tight">PocketFree</h2>
            <p className="text-gray-400 mt-1 text-sm">이번 달도 현명하게 화이팅!</p>
          </div>

          {/* 위젯 1: 잔액 */}
          <div className="w-full bg-white p-8 rounded-3xl shadow-sm mb-4 flex flex-col items-center justify-center">
            <div className="text-sm text-gray-400 mb-3">이번 달 남은 생활비</div>
            <div className="text-4xl font-extrabold text-gray-900 tracking-tight">1,450,000 원</div>
          </div>

          {/* 위젯 2: 수입 */}
          <div className="w-full bg-white p-6 rounded-3xl shadow-sm mb-4 flex flex-col items-center justify-center">
            <div className="text-sm text-gray-400 mb-2">들어온 돈 (수입)</div>
            <div className="text-2xl font-bold text-blue-500">+ 5,000,000 원</div>
          </div>

          {/* 위젯 3: 지출 */}
          <div className="w-full bg-white p-6 rounded-3xl shadow-sm mb-6 flex flex-col items-center justify-center">
            <div className="text-sm text-gray-400 mb-2">나간 돈 (지출)</div>
            <div className="text-2xl font-bold text-red-500">- 3,550,000 원</div>
          </div>

          {/* 위젯 4: 최근 내역 */}
          <div className="w-full bg-white p-6 rounded-3xl shadow-sm flex flex-col items-center">
            <h3 className="text-lg font-bold mb-6 text-gray-800">최근 지출 내역</h3>
            
            <div className="w-full space-y-6">
              {/* 내역 1 (가운데 정렬) */}
              <div className="flex flex-col items-center text-center">
                <div className="font-bold text-gray-800 text-lg">스타벅스 강남점</div>
                <div className="text-xs text-gray-400 mt-1 mb-2">식비/카페 • 오늘 13:00</div>
                <div className="font-bold text-gray-900 text-lg">- 9,000 원</div>
              </div>
              
              {/* 구분선 */}
              <div className="w-full h-px bg-gray-100"></div>
              
              {/* 내역 2 (가운데 정렬) */}
              <div className="flex flex-col items-center text-center">
                <div className="font-bold text-gray-800 text-lg">이마트 장보기</div>
                <div className="text-xs text-gray-400 mt-1 mb-2">생활비 • 어제 18:30</div>
                <div className="font-bold text-gray-900 text-lg">- 85,000 원</div>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* 📱 모바일 하단 네비게이션 (가운데 정렬 + 플러스 버튼 강조) */}
      <nav className="md:hidden fixed bottom-0 w-full bg-white flex justify-center items-center gap-10 p-3 border-t border-gray-100 shadow-[0_-10px_20px_rgba(0,0,0,0.03)] pb-safe z-50">
        <div className="text-2xl grayscale-0 cursor-pointer hover:scale-110 transition-transform">🏠</div>
        <div className="text-2xl grayscale opacity-30 cursor-pointer hover:opacity-100 transition-opacity">📊</div>
        
        {/* 중앙 플러스 버튼 */}
        <div className="text-4xl bg-blue-500 text-white w-14 h-14 flex items-center justify-center rounded-full shadow-lg shadow-blue-200 -mt-8 cursor-pointer hover:bg-blue-600 hover:scale-105 transition-all">
          +
        </div>
        
        <div className="text-2xl grayscale opacity-30 cursor-pointer hover:opacity-100 transition-opacity">🗓️</div>
        <div className="text-2xl grayscale opacity-30 cursor-pointer hover:opacity-100 transition-opacity">⚙️</div>
      </nav>
      
    </div>
  );
}

export default MainPage;