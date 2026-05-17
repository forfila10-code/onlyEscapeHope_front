import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const OAuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const token = searchParams.get('token');

    if (token) {
      localStorage.setItem('accessToken', token);

      // 로그인 전에 방문하려 했던 페이지가 있으면 그쪽으로 복귀
      const pendingRedirect = localStorage.getItem('pendingRedirect');
      if (pendingRedirect) {
        localStorage.removeItem('pendingRedirect');
        navigate(pendingRedirect, { replace: true });
      } else {
        navigate('/home', { replace: true });
      }
    } else {
      alert('로그인에 실패했습니다.');
      navigate('/login');
    }
  }, [location, navigate]);

  return <div>로그인 처리 중입니다... 🔄</div>;
};

export default OAuthCallback;