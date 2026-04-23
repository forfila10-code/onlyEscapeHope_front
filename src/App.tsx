import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/Login/LoginPage';
import MainPage from './pages/Home/MainPage';
import OAuthCallback from './pages/OAuth/OAuthCallback';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 기본 주소(/)로 접속하면 로그인 페이지가 뜹니다 */}
        <Route path="/" element={<LoginPage />} />
        
        {/* 로그인이 성공해서 이쪽으로 리다이렉트 되면 메인 화면이 뜹니다 */}
        <Route path="/home" element={<MainPage />} />

        <Route path="/oauth/callback" element={<OAuthCallback />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;