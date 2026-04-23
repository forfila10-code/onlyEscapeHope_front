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

export default api;