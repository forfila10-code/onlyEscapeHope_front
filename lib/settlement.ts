/**
 * 공유 워크스페이스 1/N 정산 + 최소 송금 목록 (Spring TransactionService 이식)
 */

export interface SettlementMemberInput {
  userId: string;
  nickname: string;
}

export interface SettlementMemberResult {
  userId: string;
  nickname: string;
  paidAmount: number;
  shareAmount: number;
  netAmount: number;
}

export interface SettlementTransfer {
  fromUserId: string;
  fromNickname: string;
  toUserId: string;
  toNickname: string;
  amount: number;
}

export interface SettlementResult {
  year: number;
  month: number;
  memberCount: number;
  totalExpense: number;
  members: SettlementMemberResult[];
  transfers: SettlementTransfer[];
}

interface ExpenseTx {
  type: string;
  amount: number;
  paid_by?: string | null;
  user_id?: string | null;
}

export function calculateSettlement(
  members: SettlementMemberInput[],
  transactions: ExpenseTx[],
  year: number,
  month: number
): SettlementResult {
  const paidByMember: Record<string, number> = {};
  members.forEach((m) => {
    paidByMember[m.userId] = 0;
  });

  let totalExpense = 0;
  for (const tx of transactions) {
    if ((tx.type ?? '').toUpperCase() !== 'EXPENSE') continue;
    const amount = Number(tx.amount ?? 0);
    totalExpense += amount;
    const payerId = tx.paid_by || tx.user_id;
    if (payerId && payerId in paidByMember) {
      paidByMember[payerId] += amount;
    }
  }

  const memberCount = Math.max(members.length, 1);
  const baseShare = Math.floor(totalExpense / memberCount);
  const remainder = totalExpense % memberCount;

  const memberResults: SettlementMemberResult[] = members.map((member, i) => {
    const shareAmount = baseShare + (i < remainder ? 1 : 0);
    const paidAmount = paidByMember[member.userId] ?? 0;
    return {
      userId: member.userId,
      nickname: member.nickname,
      paidAmount,
      shareAmount,
      netAmount: paidAmount - shareAmount,
    };
  });

  return {
    year,
    month,
    memberCount: members.length,
    totalExpense,
    members: memberResults,
    transfers: simplifyTransfers(memberResults),
  };
}

function simplifyTransfers(members: SettlementMemberResult[]): SettlementTransfer[] {
  const debtors: { index: number; amount: number }[] = [];
  const creditors: { index: number; amount: number }[] = [];

  members.forEach((m, i) => {
    if (m.netAmount < 0) debtors.push({ index: i, amount: -m.netAmount });
    else if (m.netAmount > 0) creditors.push({ index: i, amount: m.netAmount });
  });

  const transfers: SettlementTransfer[] = [];
  let d = 0;
  let c = 0;
  while (d < debtors.length && c < creditors.length) {
    const pay = Math.min(debtors[d].amount, creditors[c].amount);
    if (pay > 0) {
      const from = members[debtors[d].index];
      const to = members[creditors[c].index];
      transfers.push({
        fromUserId: from.userId,
        fromNickname: from.nickname,
        toUserId: to.userId,
        toNickname: to.nickname,
        amount: pay,
      });
    }
    debtors[d].amount -= pay;
    creditors[c].amount -= pay;
    if (debtors[d].amount === 0) d++;
    if (creditors[c].amount === 0) c++;
  }
  return transfers;
}
