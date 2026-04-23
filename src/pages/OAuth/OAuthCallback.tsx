import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const OAuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // 1. URL에서 token 값 뽑아오기 (?token=어쩌구저쩌구)
    const searchParams = new URLSearchParams(location.search);
    const token = searchParams.get('token');

    if (token) {
      // 2. 로컬 스토리지에 저장
      localStorage.setItem('accessToken', token);
      
      // 3. 메인 가계부 화면으로 이동
      navigate('/home', { replace: true }); // replace: 뒤로가기 방지
    } else {
      alert('로그인에 실패했습니다.');
      navigate('/login');
    }
  }, [location, navigate]);

  return <div>로그인 처리 중입니다... 🔄</div>;
};

export default OAuthCallback;