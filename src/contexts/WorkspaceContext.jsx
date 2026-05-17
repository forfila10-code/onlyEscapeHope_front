import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api/axiosInstance';

const WorkspaceContext = createContext(null);

/**
 * 앱 전역에서 선택된 워크스페이스와 멤버 목록을 공유합니다.
 *
 * @param children 워크스페이스 상태를 사용할 하위 React 컴포넌트
 */
export function WorkspaceProvider({ children }) {
  // 로그인 유저가 접근 가능한 워크스페이스 목록
  const [workspaces, setWorkspaces] = useState([]);

  // 새로고침 후에도 마지막으로 선택한 워크스페이스를 유지하기 위한 ID
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState(
    () => localStorage.getItem('currentWorkspaceId') || ''
  );

  // 현재 워크스페이스의 멤버 목록. 거래 등록 시 결제자 드롭다운에 사용합니다.
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  // 거래 저장 후 달력/통계 컴포넌트가 같은 워크스페이스 데이터를 다시 조회하도록 올리는 버전 값
  const [refreshVersion, setRefreshVersion] = useState(0);

  // 선택된 ID와 워크스페이스 목록을 조합해 현재 워크스페이스 객체를 계산합니다.
  const currentWorkspace = useMemo(
    () => workspaces.find((workspace) => String(workspace.id) === String(currentWorkspaceId)) ?? null,
    [workspaces, currentWorkspaceId]
  );

  // 서버에서 워크스페이스 목록을 불러오고, 저장된 선택값이 없으면 첫 번째 워크스페이스를 기본값으로 잡습니다.
  const loadWorkspaces = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    setLoading(true);
    try {
      const res = await api.get('/api/workspaces');
      const list = Array.isArray(res.data) ? res.data : [];
      setWorkspaces(list);

      const savedWorkspace = list.find(
        (workspace) => String(workspace.id) === String(currentWorkspaceId)
      );
      const nextWorkspace = savedWorkspace ?? list[0] ?? null;

      if (nextWorkspace) {
        setCurrentWorkspaceId(String(nextWorkspace.id));
        localStorage.setItem('currentWorkspaceId', String(nextWorkspace.id));
      }
    } finally {
      setLoading(false);
    }
  }, [currentWorkspaceId]);

  // 로그인 직후 또는 Provider 마운트 시 워크스페이스 목록을 초기 로딩합니다.
  useEffect(() => {
    loadWorkspaces().catch((error) => {
      console.error('[Workspace] 목록 로딩 실패:', error);
    });
  }, [loadWorkspaces]);

  // 선택된 워크스페이스가 바뀔 때마다 결제자 선택에 필요한 멤버 목록을 다시 불러옵니다.
  useEffect(() => {
    if (!currentWorkspaceId) {
      setMembers([]);
      return;
    }

    api
      .get(`/api/workspaces/${currentWorkspaceId}/members`)
      .then((res) => setMembers(Array.isArray(res.data) ? res.data : []))
      .catch((error) => {
        console.error('[Workspace] 멤버 로딩 실패:', error);
        setMembers([]);
      });
  }, [currentWorkspaceId]);

  /**
   * 사용자가 드롭다운에서 선택한 워크스페이스 ID를 전역 상태와 localStorage에 저장합니다.
   *
   * @param workspaceId 선택한 워크스페이스 ID
   */
  const selectWorkspace = (workspaceId) => {
    setCurrentWorkspaceId(String(workspaceId));
    localStorage.setItem('currentWorkspaceId', String(workspaceId));
  };

  /**
   * 새 워크스페이스를 생성한 뒤, 생성된 워크스페이스를 현재 선택값으로 전환합니다.
   *
   * @param name 생성할 워크스페이스 이름
   * @return 서버에서 반환한 워크스페이스 데이터
   */
  const createWorkspace = async (name) => {
    const res = await api.post('/api/workspaces', { name });
    await loadWorkspaces();
    selectWorkspace(res.data.id);
    return res.data;
  };

  // 거래 저장처럼 하위 데이터가 바뀐 뒤 달력/통계가 refetch되도록 신호를 보냅니다.
  const refreshWorkspaceData = () => {
    setRefreshVersion((version) => version + 1);
  };

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        currentWorkspaceId: currentWorkspace?.id ?? null,
        members,
        loading,
        selectWorkspace,
        createWorkspace,
        refreshWorkspaceData,
        refreshVersion,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

/**
 * WorkspaceContext를 안전하게 꺼내 쓰기 위한 커스텀 훅입니다.
 */
export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used inside WorkspaceProvider');
  }
  return context;
}
