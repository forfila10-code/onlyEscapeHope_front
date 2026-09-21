'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '../utils/supabase/client';
import { applyRecurringRulesClient } from '../lib/recurring';

export interface Workspace {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: 'OWNER' | 'MEMBER';
  nickname: string;
  email?: string | null;
}

export interface Profile {
  id: string;
  nickname: string;
  email?: string | null;
}

interface WorkspaceContextType {
  user: User | null;
  profile: Profile | null;
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  currentWorkspaceId: string | null;
  members: WorkspaceMember[];
  loading: boolean;
  refreshVersion: number;
  selectWorkspace: (workspaceId: string) => void;
  createWorkspace: (name: string) => Promise<Workspace>;
  loadWorkspaces: () => Promise<void>;
  refreshWorkspaceData: () => void;
  /** 내 프로필 닉네임 변경 */
  updateNickname: (nickname: string) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

/**
 * 워크스페이스/멤버/현재 유저를 Supabase에서 로드해 전역으로 공유합니다.
 *
 * @param children 하위 React 트리
 */
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const appliedRecurringKey = useRef('');
  const initialLoadDone = useRef(false);

  const currentWorkspace = useMemo(
    () => workspaces.find((ws) => ws.id === currentWorkspaceId) ?? null,
    [workspaces, currentWorkspaceId]
  );

  const loadWorkspaces = useCallback(async () => {
    // 첫 로딩만 전체 화면 스피너를 씁니다. 이후 재조회는 달력/홈을 유지합니다.
    if (!initialLoadDone.current) setLoading(true);
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      setUser((prev) => (prev?.id === authUser?.id ? prev : authUser));

      if (!authUser) {
        setProfile(null);
        setWorkspaces([]);
        setMembers([]);
        setCurrentWorkspaceId(null);
        return;
      }

      // 트리거 이전에 가입한 계정도 profile + 개인 워크스페이스를 보장
      const { error: ensureErr } = await supabase.rpc('ensure_my_workspace');
      if (ensureErr) {
        console.error('[Workspace] 워크스페이스 보장 실패:', ensureErr);
      }

      const { data: profileRow } = await supabase
        .from('profiles')
        .select('id, nickname, email')
        .eq('id', authUser.id)
        .maybeSingle();
      setProfile(profileRow ?? null);

      // 내가 멤버인 워크스페이스만 조회
      const { data: memberships, error: memErr } = await supabase
        .from('workspace_members')
        .select('workspace_id, workspaces(id, name, created_by, created_at)')
        .eq('user_id', authUser.id);

      if (memErr) {
        console.error('[Workspace] 목록 로딩 실패:', memErr);
        setWorkspaces([]);
        return;
      }

      const list: Workspace[] = (memberships ?? [])
        .map((row: any) => row.workspaces)
        .filter(Boolean)
        .sort(
          (a: Workspace, b: Workspace) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

      setWorkspaces(list);

      const stored =
        typeof window !== 'undefined'
          ? localStorage.getItem('currentWorkspaceId')
          : null;
      const saved = list.find((ws) => ws.id === stored);
      const next = saved ?? list[0] ?? null;

      if (next) {
        setCurrentWorkspaceId(next.id);
        localStorage.setItem('currentWorkspaceId', next.id);
      } else {
        setCurrentWorkspaceId(null);
      }
    } finally {
      initialLoadDone.current = true;
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadWorkspaces();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      // getUser()를 모든 이벤트에서 다시 치면 TOKEN_REFRESHED 루프가 납니다.
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        loadWorkspaces();
      }
    });

    return () => subscription.unsubscribe();
  }, [loadWorkspaces]);

  // 선택 워크스페이스의 멤버 목록 로드
  useEffect(() => {
    if (!currentWorkspaceId) {
      setMembers([]);
      return;
    }

    const loadMembers = async () => {
      const { data, error } = await supabase
        .from('workspace_members')
        .select('id, workspace_id, user_id, role, profiles(id, nickname, email)')
        .eq('workspace_id', currentWorkspaceId);

      if (error) {
        console.error('[Workspace] 멤버 로딩 실패:', error);
        setMembers([]);
        return;
      }

      const mapped: WorkspaceMember[] = (data ?? []).map((row: any) => ({
        id: row.id,
        workspace_id: row.workspace_id,
        user_id: row.user_id,
        role: row.role,
        nickname: row.profiles?.nickname ?? '사용자',
        email: row.profiles?.email ?? null,
      }));
      setMembers(mapped);
    };

    loadMembers();
  }, [currentWorkspaceId, refreshVersion, supabase]);

  // 같은 워크스페이스의 거래 변경을 다른 기기에도 반영
  useEffect(() => {
    if (!currentWorkspaceId) return;

    let realtimeTimer: number | undefined;
    const channel = supabase
      .channel(`transactions:${currentWorkspaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `workspace_id=eq.${currentWorkspaceId}`,
        },
        () => {
          window.clearTimeout(realtimeTimer);
          realtimeTimer = window.setTimeout(() => {
            setRefreshVersion((v) => v + 1);
          }, 400);
        }
      )
      .subscribe();

    return () => {
      window.clearTimeout(realtimeTimer);
      supabase.removeChannel(channel);
    };
  }, [currentWorkspaceId, supabase]);

  // 앱 오픈 시 이번 달·지난 달 반복 거래 미생성분을 넣습니다.
  useEffect(() => {
    if (!currentWorkspaceId || !user) return;
    const now = new Date();
    const key = `${currentWorkspaceId}-${now.getFullYear()}-${now.getMonth()}-${user.id}`;
    if (appliedRecurringKey.current === key) return;
    appliedRecurringKey.current = key;

    let cancelled = false;
    const run = async () => {
      const { data, error } = await supabase.rpc('apply_recurring_rules');
      let inserted = !error ? Number(data ?? 0) : 0;
      if (error) {
        inserted = await applyRecurringRulesClient(supabase, currentWorkspaceId, user.id);
      }
      if (!cancelled && inserted > 0) {
        setRefreshVersion((v) => v + 1);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [currentWorkspaceId, user, supabase]);

  const selectWorkspace = (workspaceId: string) => {
    setCurrentWorkspaceId(workspaceId);
    localStorage.setItem('currentWorkspaceId', workspaceId);
  };

  /**
   * 공유 워크스페이스를 생성하고 OWNER 멤버십을 추가한 뒤 선택합니다.
   *
   * @param name 워크스페이스 이름
   */
  const createWorkspace = async (name: string): Promise<Workspace> => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) throw new Error('로그인이 필요합니다.');

    // INSERT 직후 SELECT 가 "멤버만 조회" RLS에 막히므로 RPC 또는 클라이언트 UUID 사용
    const { data: rpcId, error: rpcErr } = await supabase.rpc('create_workspace', {
      ws_name: name,
    });

    if (!rpcErr && rpcId) {
      await loadWorkspaces();
      selectWorkspace(String(rpcId));
      return {
        id: String(rpcId),
        name,
        created_by: authUser.id,
        created_at: new Date().toISOString(),
      };
    }

    const id = crypto.randomUUID();
    const { error: wsErr } = await supabase.from('workspaces').insert({
      id,
      name,
      created_by: authUser.id,
    });
    if (wsErr) throw wsErr;

    const { error: memErr } = await supabase.from('workspace_members').insert({
      workspace_id: id,
      user_id: authUser.id,
      role: 'OWNER',
    });
    if (memErr) throw memErr;

    await loadWorkspaces();
    selectWorkspace(id);
    return {
      id,
      name,
      created_by: authUser.id,
      created_at: new Date().toISOString(),
    };
  };

  const refreshWorkspaceData = () => {
    setRefreshVersion((v) => v + 1);
  };

  /**
   * 로그인한 사용자의 표시 닉네임을 수정합니다.
   *
   * @param nickname 새 닉네임
   */
  const updateNickname = async (nickname: string) => {
    if (!user) throw new Error('로그인이 필요합니다.');
    const trimmed = nickname.trim();
    if (!trimmed) throw new Error('닉네임을 입력해 주세요.');
    const { error } = await supabase
      .from('profiles')
      .update({ nickname: trimmed })
      .eq('id', user.id);
    if (error) throw error;
    setProfile((prev) => (prev ? { ...prev, nickname: trimmed } : prev));
    setRefreshVersion((v) => v + 1);
  };

  return (
    <WorkspaceContext.Provider
      value={{
        user,
        profile,
        workspaces,
        currentWorkspace,
        currentWorkspaceId,
        members,
        loading,
        refreshVersion,
        selectWorkspace,
        createWorkspace,
        loadWorkspaces,
        refreshWorkspaceData,
        updateNickname,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
