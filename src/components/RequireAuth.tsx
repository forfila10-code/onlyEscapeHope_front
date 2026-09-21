import { Navigate, useLocation } from 'react-router-dom';

/**
 * 로그인 토큰이 없으면 로그인 페이지로 보내고,
 * 원래 가려던 경로는 pendingRedirect에 저장합니다.
 *
 * @param children 인증된 사용자만 볼 수 있는 페이지
 */
function RequireAuth({ children }) {
  const location = useLocation();
  const token = localStorage.getItem('accessToken');

  if (!token) {
    localStorage.setItem('pendingRedirect', `${location.pathname}${location.search}`);
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default RequireAuth;
