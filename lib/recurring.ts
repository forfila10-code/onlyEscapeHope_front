import type { SupabaseClient } from '@supabase/supabase-js';

export interface RecurringRule {
  id: string;
  workspace_id: string;
  user_id: string;
  paid_by: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  category: string;
  memo: string | null;
  day_of_month: number;
  active: boolean;
}

/** yyyy-MM-dd (해당 월의 dayOfMonth, 말일 보정) */
function ruleDate(year: number, month: number, dayOfMonth: number): string {
  const lastDay = new Date(year, month, 0).getDate();
  const day = Math.min(dayOfMonth, lastDay);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * RPC가 없을 때 클라이언트에서 이번 달·지난 달 반복 거래를 생성합니다.
 *
 * @param supabase 브라우저 클라이언트
 * @param workspaceId 현재 워크스페이스
 * @param userId 현재 로그인 유저 (insert RLS의 user_id)
 */
export async function applyRecurringRulesClient(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string
): Promise<number> {
  const { data: rules, error } = await supabase
    .from('recurring_rules')
    .select(
      'id, workspace_id, user_id, paid_by, type, amount, category, memo, day_of_month, active'
    )
    .eq('workspace_id', workspaceId)
    .eq('active', true);

  if (error || !rules?.length) return 0;

  const now = new Date();
  const months = [0, -1].map((offset) => {
    const date = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return { year: date.getFullYear(), month: date.getMonth() + 1 };
  });

  let inserted = 0;
  for (const rule of rules) {
    for (const { year, month } of months) {
      const date = ruleDate(year, month, Number(rule.day_of_month));
      const { data: existing } = await supabase
        .from('transactions')
        .select('id')
        .eq('recurring_rule_id', rule.id)
        .eq('date', date)
        .maybeSingle();
      if (existing) continue;

      const { error: insertError } = await supabase.from('transactions').insert({
        workspace_id: workspaceId,
        user_id: userId,
        paid_by: rule.paid_by,
        type: rule.type,
        amount: rule.amount,
        category: rule.category,
        memo: rule.memo,
        date,
        recurring_rule_id: rule.id,
      });
      if (!insertError) inserted += 1;
    }
  }
  return inserted;
}
