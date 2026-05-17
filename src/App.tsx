import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/Login/LoginPage';
import MainPage from './pages/Home/MainPage';
import OAuthCallback from './pages/OAuth/OAuthCallback';
// @ts-ignore
import { WorkspaceProvider } from './contexts/WorkspaceContext';
// @ts-ignore
import WorkspaceManagePage from './pages/Workspace/WorkspaceManagePage';
// @ts-ignore
import WorkspaceJoinPage from './pages/Workspace/WorkspaceJoinPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 기본 주소(/)로 접속하면 로그인 페이지가 뜹니다 */}
        <Route path="/" element={<LoginPage />} />
        
        {/* 로그인이 성공해서 이쪽으로 리다이렉트 되면 메인 화면이 뜹니다 */}
        <Route
          path="/home"
          element={
            <WorkspaceProvider>
              <MainPage />
            </WorkspaceProvider>
          }
        />

        {/* 워크스페이스 관리 페이지 */}
        <Route
          path="/workspace/manage"
          element={
            <WorkspaceProvider>
              <WorkspaceManagePage />
            </WorkspaceProvider>
          }
        />

        {/* 워크스페이스 초대 링크 가입 페이지 (인증 불필요, 페이지 자체에서 처리) */}
        <Route path="/workspace/join/:token" element={<WorkspaceJoinPage />} />

        <Route path="/oauth/callback" element={<OAuthCallback />} />

        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;