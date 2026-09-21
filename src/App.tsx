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
// @ts-ignore
import TransactionListPage from './pages/Home/TransactionListPage';
import RequireAuth from './components/RequireAuth';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/oauth/callback" element={<OAuthCallback />} />
        <Route path="/workspace/join/:token" element={<WorkspaceJoinPage />} />

        <Route
          path="/home"
          element={
            <RequireAuth>
              <WorkspaceProvider>
                <MainPage />
              </WorkspaceProvider>
            </RequireAuth>
          }
        />
        <Route
          path="/workspace/manage"
          element={
            <RequireAuth>
              <WorkspaceProvider>
                <WorkspaceManagePage />
              </WorkspaceProvider>
            </RequireAuth>
          }
        />
        <Route
          path="/transactions"
          element={
            <RequireAuth>
              <WorkspaceProvider>
                <TransactionListPage />
              </WorkspaceProvider>
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
