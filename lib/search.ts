import { getPayerNickname, isIncome } from './categories';

export type TxTypeFilter = 'ALL' | 'INCOME' | 'EXPENSE';

export interface SearchableTx {
  type?: string | null;
  category?: string | null;
  memo?: string | null;
  amount?: number | null;
  date?: string | null;
  paid_by?: string | null;
}

/**
 * 검색어가 거래의 카테고리·메모·금액·결제자·날짜에 포함되는지 봅니다.
 *
 * @param tx 거래 행
 * @param query 사용자가 입력한 검색어
 * @param members 결제자 닉네임 매핑용 멤버 목록
 */
export function matchesTxSearch(
  tx: SearchableTx,
  query: string,
  members: { user_id: string; nickname: string }[]
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const payer =
    members.find((m) => m.user_id === tx.paid_by)?.nickname ??
    getPayerNickname(tx.paid_by, members) ??
    '';
  const amount = Number(tx.amount ?? 0);
  const haystack = [
    tx.category,
    tx.memo,
    payer,
    String(amount),
    amount.toLocaleString('ko-KR'),
    isIncome(tx.type ?? undefined) ? '수입' : '지출',
    String(tx.date ?? '').slice(0, 10),
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(q);
}
