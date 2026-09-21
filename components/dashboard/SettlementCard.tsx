'use client';

import { useEffect, useState } from 'react';
import { startOfMonth, endOfMonth } from 'date-fns';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { createClient } from '../../utils/supabase/client';
import { fmt } from '../../lib/categories';
import { toLocalISODate } from '../../lib/date';
import {
  calculateSettlement,
  type SettlementResult,
} from '../../lib/settlement';

interface SettlementCardProps {
  /** 조회 연도 */
  year: number;
  /** 조회 월 (1~12) */
  month: number;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
}

/**
 * 공유 워크스페이스의 이번 달 1/N 정산 카드입니다.
 * Supabase EXPENSE 거래를 불러와 클라이언트에서 정산합니다.
 */
export default function SettlementCard({
  year,
  month,
  onPrevMonth,
  onNextMonth,
}: SettlementCardProps) {
  const supabase = createClient();
  const { currentWorkspaceId, members, refreshVersion } = useWorkspace();
  const [settlement, setSettlement] = useState<SettlementResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!currentWorkspaceId || members.length < 2) {
      setSettlement(null);
      return;
    }

    const monthDate = new Date(year, month - 1, 1);
    const rangeStart = toLocalISODate(startOfMonth(monthDate));
    const rangeEnd = toLocalISODate(endOfMonth(monthDate));

    // workspace_members → calculateSettlement 입력 형식 (user_id → userId)
    const memberInputs = members.map((m) => ({
      userId: m.user_id,
      nickname: m.nickname,
    }));

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(false);

      const { data, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('workspace_id', currentWorkspaceId)
        .eq('type', 'EXPENSE')
        .gte('date', rangeStart)
        .lte('date', rangeEnd);

      if (cancelled) return;

      if (fetchError) {
        console.error('[Settlement] 로딩 실패:', fetchError);
        setError(true);
        setSettlement(null);
      } else {
        const result = calculateSettlement(
          memberInputs,
          (data ?? []).map((row) => ({
            type: row.type,
            amount: Number(row.amount ?? 0),
            paid_by: row.paid_by,
            user_id: row.user_id,
          })),
          year,
          month
        );
        setSettlement(result.totalExpense > 0 ? result : null);
      }
      setLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, [currentWorkspaceId, members, year, month, refreshVersion, supabase]);

  if (members.length < 2) return null;

  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow-sm">
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between">
          {onPrevMonth ? (
            <button
              type="button"
              onClick={onPrevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 text-sm font-bold"
            >
              ‹
            </button>
          ) : (
            <span className="w-8" />
          )}
          <div className="text-center">
            <p className="text-sm font-bold text-gray-900">
              {year}년 {month}월 정산
            </p>
            <p className="text-xs text-gray-400 mt-0.5">지출을 멤버 수로 나눈 1/N 기준입니다.</p>
          </div>
          {onNextMonth ? (
            <button
              type="button"
              onClick={onNextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 text-sm font-bold"
            >
              ›
            </button>
          ) : (
            <span className="w-8" />
          )}
        </div>
      </div>

      {loading ? (
        <p className="px-5 pb-5 text-sm text-gray-400">정산 내역을 계산하는 중입니다.</p>
      ) : error ? (
        <p className="px-5 pb-5 text-sm text-red-400">정산 데이터를 가져오지 못했습니다.</p>
      ) : !settlement ? (
        <p className="px-5 pb-5 text-sm text-gray-400">정산할 내역이 없습니다.</p>
      ) : (
        <div className="px-5 pb-5 space-y-4">
          <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3">
            <span className="text-xs text-gray-500">총 지출</span>
            <span className="text-sm font-bold text-gray-900">{fmt(settlement.totalExpense)}원</span>
          </div>

          <div className="space-y-2">
            {(settlement.members ?? []).map((member) => (
              <div key={member.userId} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{member.nickname}</p>
                  <p className="text-[11px] text-gray-400">결제 {fmt(member.paidAmount)}원</p>
                </div>
                <span
                  className={`text-sm font-bold ${
                    member.netAmount > 0
                      ? 'text-blue-500'
                      : member.netAmount < 0
                      ? 'text-red-500'
                      : 'text-gray-400'
                  }`}
                >
                  {member.netAmount > 0 ? '+' : member.netAmount < 0 ? '-' : ''}
                  {fmt(member.netAmount)}원
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-50 pt-3 space-y-2">
            {(settlement.transfers ?? []).length === 0 ? (
              <p className="text-xs text-gray-400">지금은 주고받을 금액이 없습니다.</p>
            ) : (
              settlement.transfers.map((transfer, index) => (
                <p
                  key={`${transfer.fromUserId}-${transfer.toUserId}-${index}`}
                  className="text-sm text-gray-700"
                >
                  <span className="font-semibold">{transfer.fromNickname}</span>
                  <span className="text-gray-400"> → </span>
                  <span className="font-semibold">{transfer.toNickname}</span>
                  <span className="ml-2 font-bold text-gray-900">{fmt(transfer.amount)}원</span>
                </p>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
