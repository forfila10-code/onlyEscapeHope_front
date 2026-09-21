import axios from 'axios';

// 1. 기본 설정이 된 axios 인스턴스 생성
const api = axios.create({
  baseURL: 'http://localhost:8081', // 스프링 부트 서버 주소
});

// 2. 요청(Request)이 서버로 떠나기 직전에 가로채서 토큰 붙이기
api.interceptors.request.use(
  (config) => {
    // 로컬 스토리지에서 방금 저장한 토큰 꺼내기
    const token = localStorage.getItem('accessToken');
    
    // 토큰이 있으면 헤더에 달아주기
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 3. 응답(Response) 인터셉터 — 인증 실패 처리
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const path = window.location.pathname;
    const isAuthPage = path.startsWith('/login') || path.startsWith('/oauth') || path === '/';
    if (status === 401 && !isAuthPage) {
      localStorage.removeItem('accessToken');
      localStorage.setItem('pendingRedirect', `${path}${window.location.search}`);
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;