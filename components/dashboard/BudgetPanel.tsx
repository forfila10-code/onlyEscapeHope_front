'use client';

import { useEffect, useState } from 'react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { createClient } from '../../utils/supabase/client';
import { EXPENSE_CATEGORIES, fmt, getCategoryMeta } from '../../lib/categories';
import { buildBudgetProgress } from '../../lib/budget';

interface BudgetPanelProps {
  /** 조회 연도 */
  year: number;
  /** 조회 월 (1~12) */
  month: number;
  /** 홈에서는 편집 없이 진행률만 표시 */
  compact?: boolean;
}

/**
 * 카테고리 월 예산 vs 사용액
 *
 * @param year 연도
 * @param month 월
 * @param compact true면 진행률만
 */
export default function BudgetPanel({ year, month, compact = false }: BudgetPanelProps) {
  const supabase = createClient();
  const { currentWorkspaceId, refreshVersion, refreshWorkspaceData } = useWorkspace();
  const [spent, setSpent] = useState<Record<string, number>>({});
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!currentWorkspaceId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = new Date(year, month, 0).getDate();
      const end = `${year}-${String(month).padStart(2, '0')}-${String(endDate).padStart(2, '0')}`;

      const [budgetRes, txRes] = await Promise.all([
        supabase
          .from('category_budgets')
          .select('category, amount')
          .eq('workspace_id', currentWorkspaceId)
          .eq('year', year)
          .eq('month', month),
        supabase
          .from('transactions')
          .select('category, amount, type')
          .eq('workspace_id', currentWorkspaceId)
          .eq('type', 'EXPENSE')
          .gte('date', monthStart)
          .lte('date', end),
      ]);

      if (cancelled) return;

      if (budgetRes.error || txRes.error) {
        setError(compact ? '' : '예산을 불러오지 못했습니다. SQL 004를 실행했는지 확인하세요.');
        setLoading(false);
        return;
      }

      const nextAmounts: Record<string, string> = {};
      EXPENSE_CATEGORIES.forEach((c) => {
        nextAmounts[c.id] = '';
      });
      (budgetRes.data ?? []).forEach((row: { category: string; amount: number }) => {
        nextAmounts[row.category] = String(row.amount);
      });

      const nextSpent: Record<string, number> = {};
      (txRes.data ?? []).forEach((row: { category?: string; amount?: number }) => {
        const key = row.category ?? '기타';
        nextSpent[key] = (nextSpent[key] ?? 0) + Number(row.amount ?? 0);
      });

      setAmounts(nextAmounts);
      setSpent(nextSpent);
      setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [currentWorkspaceId, year, month, refreshVersion, supabase]);

  const progress = buildBudgetProgress(
    Object.entries(amounts)
      .filter(([, value]) => Number(value) > 0)
      .map(([category, value]) => ({ category, amount: Number(value) })),
    spent
  );

  const handleSave = async () => {
    if (!currentWorkspaceId) return;
    setSaving(true);
    setError('');
    const rows = EXPENSE_CATEGORIES.map((c) => ({
      workspace_id: currentWorkspaceId,
      year,
      month,
      category: c.id,
      amount: Math.max(0, Math.floor(Number(amounts[c.id] || 0))),
    })).filter((row) => row.amount > 0);

    const { error: delErr } = await supabase
      .from('category_budgets')
      .delete()
      .eq('workspace_id', currentWorkspaceId)
      .eq('year', year)
      .eq('month', month);
    if (delErr) {
      setError(delErr.message);
      setSaving(false);
      return;
    }

    if (rows.length > 0) {
      const { error: insErr } = await supabase.from('category_budgets').insert(rows);
      if (insErr) {
        setError(insErr.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    refreshWorkspaceData();
  };

  if (compact) {
    if (loading || progress.length === 0) return null;
    return (
      <div className="bg-white rounded-3xl px-5 py-4 space-y-3">
        <p className="text-sm font-bold text-gray-900">이번 기간 예산</p>
        {progress.map((item) => {
          const meta = getCategoryMeta(item.category, 'EXPENSE');
          const width = Math.min(item.ratio * 100, 100);
          return (
            <div key={item.category}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-gray-700">
                  {meta.emoji} {item.category}
                </span>
                <span className={`text-xs font-bold ${item.over ? 'text-red-500' : 'text-gray-800'}`}>
                  {fmt(item.spent)} / {fmt(item.budget)}원
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${item.over ? 'bg-red-400' : 'bg-blue-400'}`}
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl px-5 py-5 space-y-4 shadow-sm">
      <div>
        <p className="text-sm font-bold text-gray-900">
          {year}년 {month}월 예산
        </p>
        <p className="text-xs text-gray-400 mt-0.5">카테고리 한도를 정하면 사용액과 비교합니다.</p>
      </div>
      {loading ? (
        <p className="text-sm text-gray-400">불러오는 중…</p>
      ) : (
        <div className="space-y-3">
          {EXPENSE_CATEGORIES.map((cat) => {
            const spentAmt = spent[cat.id] ?? 0;
            const budgetAmt = Number(amounts[cat.id] || 0);
            const over = budgetAmt > 0 && spentAmt > budgetAmt;
            return (
              <div key={cat.id} className="flex items-center gap-3">
                <span className="w-16 text-xs font-semibold text-gray-700 flex-shrink-0">
                  {cat.emoji} {cat.label}
                </span>
                <input
                  inputMode="numeric"
                  value={amounts[cat.id] ?? ''}
                  onChange={(e) =>
                    setAmounts((prev) => ({
                      ...prev,
                      [cat.id]: e.target.value.replace(/[^\d]/g, ''),
                    }))
                  }
                  placeholder="한도"
                  className="flex-1 rounded-xl bg-gray-100 px-3 py-2 text-sm font-semibold outline-none"
                />
                <span className={`w-[92px] text-right text-[11px] ${over ? 'text-red-500' : 'text-gray-400'}`}>
                  {fmt(spentAmt)}원
                </span>
              </div>
            );
          })}
        </div>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving || loading}
        className="w-full py-3 rounded-2xl bg-gray-900 text-white text-sm font-bold disabled:opacity-50"
      >
        {saving ? '저장 중…' : '예산 저장'}
      </button>
    </div>
  );
}
