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
  /** 목록에서 뺀 기본 카테고리. 되돌리기에 씁니다. */
  hiddenExpense: CategoryOption[];
  /** 목록에서 뺀 기본 수입 카테고리 */
  hiddenIncome: CategoryOption[];
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
   * 카테고리를 목록에서 뺍니다.
   * 추가 항목은 행을 지우고, 기본 항목은 숨김 표시만 남깁니다.
   *
   * @param item 삭제할 카테고리
   */
  removeCategory: (item: CategoryOption) => Promise<void>;
  /**
   * 숨긴 기본 카테고리를 다시 목록에 넣습니다.
   *
   * @param rowId workspace_categories.id
   */
  restoreCategory: (rowId: string) => Promise<void>;
}

const CategoryContext = createContext<CategoryContextValue | null>(null);

function defaultNameSet(): Set<string> {
  return new Set(
    [...defaultCategories('EXPENSE'), ...defaultCategories('INCOME')].map((item) => item.id)
  );
}

/**
 * 기본 이름과 같은 행은 "숨김"으로 보고, 그 외 행만 추가 카테고리로 보여 줍니다.
 *
 * @param kind 지출 또는 수입
 * @param custom workspace_categories 행
 */
function mergeCategories(kind: CategoryKind, custom: CustomCategory[]) {
  const defaults = defaultCategories(kind);
  const defaultIds = new Set(defaults.map((item) => item.id));
  const markers = custom.filter((row) => row.kind === kind && defaultIds.has(row.name));
  const hiddenIds = new Set(markers.map((row) => row.name));
  const extras = custom
    .filter((row) => row.kind === kind && !defaultIds.has(row.name))
    .map((row) => ({
      id: row.name,
      label: row.name,
      emoji: row.emoji,
      custom: true,
      rowId: row.id,
    }));
  const hidden = markers.map((row) => {
    const base = defaults.find((item) => item.id === row.name);
    return {
      id: row.name,
      label: row.name,
      emoji: base?.emoji ?? row.emoji,
      custom: false,
      rowId: row.id,
    };
  });
  return {
    visible: [...defaults.filter((item) => !hiddenIds.has(item.id)), ...extras],
    hidden,
  };
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

  const expense = useMemo(() => mergeCategories('EXPENSE', custom), [custom]);
  const income = useMemo(() => mergeCategories('INCOME', custom), [custom]);
  const expenseCategories = expense.visible;
  const incomeCategories = income.visible;

  const addCategory = useCallback(
    async (kind: CategoryKind, name: string, emoji: string) => {
      if (!currentWorkspaceId) throw new Error('워크스페이스가 없습니다.');
      const invalid = validateCategoryName(name, [
        ...expenseCategories,
        ...incomeCategories,
        ...expense.hidden,
        ...income.hidden,
      ]);
      if (invalid) throw new Error(invalid);
      if (defaultNameSet().has(name.trim())) throw new Error('이미 있는 카테고리입니다.');
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
    [currentWorkspaceId, expense.hidden, expenseCategories, income.hidden, incomeCategories, load, supabase]
  );

  const removeCategory = useCallback(
    async (item: CategoryOption) => {
      if (!currentWorkspaceId) throw new Error('워크스페이스가 없습니다.');
      if (item.custom && item.rowId) {
        const { error } = await supabase.from('workspace_categories').delete().eq('id', item.rowId);
        if (error) throw new Error(error.message);
      } else {
        // 기본 항목은 행을 하나 넣어 숨김 표시로 씁니다. 기록된 거래는 지우지 않습니다.
        const kind: CategoryKind = defaultCategories('INCOME').some((row) => row.id === item.id)
          ? 'INCOME'
          : 'EXPENSE';
        const { error } = await supabase.from('workspace_categories').insert({
          workspace_id: currentWorkspaceId,
          kind,
          name: item.id,
          emoji: item.emoji,
        });
        if (error && error.code !== '23505') throw new Error(error.message);
      }
      await load();
    },
    [currentWorkspaceId, load, supabase]
  );

  const restoreCategory = useCallback(
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
      hiddenExpense: expense.hidden,
      hiddenIncome: income.hidden,
      loadError,
      addCategory,
      removeCategory,
      restoreCategory,
    }),
    [
      expense.hidden,
      expenseCategories,
      income.hidden,
      incomeCategories,
      loadError,
      addCategory,
      removeCategory,
      restoreCategory,
    ]
  );

  return <CategoryContext.Provider value={value}>{children}</CategoryContext.Provider>;
}

export function useCategories() {
  const context = useContext(CategoryContext);
  if (!context) throw new Error('useCategories는 CategoryProvider 안에서만 사용할 수 있습니다.');
  return context;
}
