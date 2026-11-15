'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { createClient } from '../utils/supabase/client';
import { useWorkspace } from './WorkspaceContext';
import {
  defaultCategories,
  registerCategoryMeta,
  validateCategoryName,
  type CategoryKind,
  type CategoryOption,
} from '../lib/categories';

interface CustomCategory {
  /** workspace_categories.id */
  id: string;
  kind: CategoryKind;
  name: string;
  emoji: string;
}

interface CategoryContextValue {
  /** 지출 기본 목록 + 이 워크스페이스에서 추가한 항목 */
  expenseCategories: CategoryOption[];
  /** 수입 기본 목록 + 이 워크스페이스에서 추가한 항목 */
  incomeCategories: CategoryOption[];
  /** 테이블이 없거나 조회에 실패하면 안내 문장 */
  loadError: string;
  /**
   * 워크스페이스에 카테고리를 추가합니다.
   *
   * @param kind 지출 또는 수입
   * @param name 거래에 저장할 이름
   * @param emoji 표시 이모지
   */
  addCategory: (kind: CategoryKind, name: string, emoji: string) => Promise<void>;
  /**
   * 사용자가 추가한 카테고리만 삭제합니다.
   *
   * @param rowId workspace_categories.id
   */
  removeCategory: (rowId: string) => Promise<void>;
}

const CategoryContext = createContext<CategoryContextValue | null>(null);

function mergeCategories(kind: CategoryKind, custom: CustomCategory[]): CategoryOption[] {
  const extras = custom
    .filter((row) => row.kind === kind)
    .map((row) => ({
      id: row.name,
      label: row.name,
      emoji: row.emoji,
      custom: true,
      rowId: row.id,
    }));
  return [...defaultCategories(kind), ...extras];
}

/**
 * 워크스페이스 카테고리. 기본 목록은 코드에 있고, 추가분은 Supabase에 있습니다.
 */
export function CategoryProvider({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const { currentWorkspaceId } = useWorkspace();
  const [custom, setCustom] = useState<CustomCategory[]>([]);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    if (!currentWorkspaceId) {
      setCustom([]);
      setLoadError('');
      return;
    }
    const { data, error } = await supabase
      .from('workspace_categories')
      .select('id, kind, name, emoji')
      .eq('workspace_id', currentWorkspaceId)
      .order('created_at', { ascending: true });
    if (error) {
      console.error('[Category] 로딩 실패:', error);
      setCustom([]);
      setLoadError('카테고리를 불러오지 못했습니다. SQL 005를 실행했는지 확인해 주세요.');
      return;
    }
    setLoadError('');
    setCustom((data ?? []) as CustomCategory[]);
  }, [currentWorkspaceId, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    custom.forEach((row) => registerCategoryMeta(row.name, row.emoji));
  }, [custom]);

  const expenseCategories = useMemo(() => mergeCategories('EXPENSE', custom), [custom]);
  const incomeCategories = useMemo(() => mergeCategories('INCOME', custom), [custom]);

  const addCategory = useCallback(
    async (kind: CategoryKind, name: string, emoji: string) => {
      if (!currentWorkspaceId) throw new Error('워크스페이스가 없습니다.');
      const invalid = validateCategoryName(name, [...expenseCategories, ...incomeCategories]);
      if (invalid) throw new Error(invalid);
      const { error } = await supabase.from('workspace_categories').insert({
        workspace_id: currentWorkspaceId,
        kind,
        name: name.trim(),
        emoji: emoji || '🏷️',
      });
      if (error) {
        const missing =
          error.code === '42P01' ||
          error.code === 'PGRST205' ||
          /workspace_categories/.test(error.message);
        throw new Error(
          missing
            ? 'Supabase에서 005_workspace_categories.sql을 먼저 실행해 주세요.'
            : error.message
        );
      }
      await load();
    },
    [currentWorkspaceId, expenseCategories, incomeCategories, load, supabase]
  );

  const removeCategory = useCallback(
    async (rowId: string) => {
      const { error } = await supabase.from('workspace_categories').delete().eq('id', rowId);
      if (error) throw new Error(error.message);
      await load();
    },
    [load, supabase]
  );

  const value = useMemo(
    () => ({
      expenseCategories,
      incomeCategories,
      loadError,
      addCategory,
      removeCategory,
    }),
    [expenseCategories, incomeCategories, loadError, addCategory, removeCategory]
  );

  return <CategoryContext.Provider value={value}>{children}</CategoryContext.Provider>;
}

export function useCategories() {
  const context = useContext(CategoryContext);
  if (!context) throw new Error('useCategories는 CategoryProvider 안에서만 사용할 수 있습니다.');
  return context;
}
