function LoginPage() {
  
  // 💡 핵심! 카카오 로그인 버튼을 누르면 백엔드 주소로 이동시킵니다.
  const handleKakaoLogin = () => {
    // 스프링 부트가 만들어놓은 소셜 로그인 진입점입니다.
    window.location.href = 'http://localhost:8081/oauth2/authorization/kakao';
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 font-sans">
      
      {/* 로고 및 환영 인사 */}
      <div className="text-center mb-10">
        <div className="text-6xl mb-4">💰</div>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">PocketFree</h1>
        <p className="text-gray-500">우리 부부의 현명한 가계부</p>
      </div>

      {/* 로그인 박스 */}
      <div className="bg-white p-8 rounded-3xl shadow-md w-80 text-center">
        <h2 className="text-lg font-bold text-gray-800 mb-6">시작하기</h2>
        
        {/* 카카오 로그인 버튼 */}
        <button 
          onClick={handleKakaoLogin}
          className="w-full flex items-center justify-center gap-3 bg-[#FEE500] text-[#000000] font-bold py-3 px-4 rounded-xl hover:bg-[#E5CF00] transition-colors"
        >
          {/* 카카오 아이콘 (간단히 텍스트로 처리) */}
          <span className="text-xl">💬</span>
          카카오로 3초 만에 시작
        </button>
      </div>

    </div>
  );
}

export default LoginPage;