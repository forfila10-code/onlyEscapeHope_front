'use client';

import { WorkspaceProvider } from '../contexts/WorkspaceContext';

/**
 * 앱 전역 클라이언트 Provider. 페이지 이동 시에도 워크스페이스 상태를 유지합니다.
 */
export default function AppProviders({ children }: { children: React.ReactNode }) {
  return <WorkspaceProvider>{children}</WorkspaceProvider>;
}
