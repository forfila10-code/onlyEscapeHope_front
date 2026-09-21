/** 거래 내역 (transactions 테이블) */
export interface Transaction {
  id: string;
  workspace_id: string;
  user_id: string;
  paid_by: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  category: string;
  memo: string | null;
  date: string;
  created_at?: string;
  updated_at?: string;
  recurring_rule_id?: string | null;
  paidByNickname?: string | null;
}
