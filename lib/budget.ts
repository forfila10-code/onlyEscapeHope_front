export interface CategoryBudget {
  id: string;
  workspace_id: string;
  year: number;
  month: number;
  category: string;
  amount: number;
}

export interface BudgetProgress {
  category: string;
  budget: number;
  spent: number;
  ratio: number;
  over: boolean;
}

/**
 * 카테고리별 지출 vs 예산 진행률을 만듭니다.
 *
 * @param budgets 해당 월 예산 행
 * @param spentByCategory 카테고리 → 지출 합
 */
export function buildBudgetProgress(
  budgets: { category: string; amount: number }[],
  spentByCategory: Record<string, number>
): BudgetProgress[] {
  return budgets
    .filter((row) => Number(row.amount) > 0)
    .map((row) => {
      const spent = spentByCategory[row.category] ?? 0;
      const budget = Number(row.amount);
      return {
        category: row.category,
        budget,
        spent,
        ratio: budget > 0 ? spent / budget : 0,
        over: spent > budget,
      };
    })
    .sort((a, b) => b.ratio - a.ratio);
}
