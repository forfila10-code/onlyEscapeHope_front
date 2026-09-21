'use client';

import { useEffect, useState } from 'react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { createClient } from '../../utils/supabase/client';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, fmt } from '../../lib/categories';
import type { RecurringRule } from '../../lib/recurring';

/**
 * 반복 거래 규칙 목록/추가. 앱 오픈 시 해당 월 거래가 자동 생성됩니다.
 */
export default function RecurringPanel() {
  const supabase = createClient();
  const { user, currentWorkspaceId, members, refreshWorkspaceData, refreshVersion } =
    useWorkspace();
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [type, setType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('생활');
  const [memo, setMemo] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [paidBy, setPaidBy] = useState('');
  const [saving, setSaving] = useState(false);

  const categories = type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  useEffect(() => {
    if (!currentWorkspaceId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('recurring_rules')
        .select(
          'id, workspace_id, user_id, paid_by, type, amount, category, memo, day_of_month, active'
        )
        .eq('workspace_id', currentWorkspaceId)
        .order('created_at', { ascending: false });
      if (cancelled) return;
      if (err) {
        setError('반복 규칙을 불러오지 못했습니다. SQL 004를 실행했는지 확인하세요.');
        setRules([]);
      } else {
        setError('');
        setRules((data ?? []) as RecurringRule[]);
      }
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [currentWorkspaceId, refreshVersion, supabase]);

  useEffect(() => {
    setPaidBy(String(members[0]?.user_id ?? user?.id ?? ''));
  }, [members, user, currentWorkspaceId]);

  const handleCreate = async () => {
    if (!currentWorkspaceId || !user) return;
    const parsedAmount = Math.floor(Number(amount));
    const day = Math.floor(Number(dayOfMonth));
    if (!parsedAmount || parsedAmount <= 0) {
      setError('금액을 입력해 주세요.');
      return;
    }
    if (day < 1 || day > 28) {
      setError('날짜는 1~28일만 가능합니다.');
      return;
    }
    setSaving(true);
    setError('');
    const { error: insErr } = await supabase.from('recurring_rules').insert({
      workspace_id: currentWorkspaceId,
      user_id: user.id,
      paid_by: paidBy || user.id,
      type,
      amount: parsedAmount,
      category,
      memo: memo.trim() || null,
      day_of_month: day,
      active: true,
    });
    setSaving(false);
    if (insErr) {
      setError(insErr.message);
      return;
    }
    setAmount('');
    setMemo('');
    refreshWorkspaceData();
  };

  const toggleActive = async (rule: RecurringRule) => {
    const { error: err } = await supabase
      .from('recurring_rules')
      .update({ active: !rule.active })
      .eq('id', rule.id);
    if (err) setError(err.message);
    else refreshWorkspaceData();
  };

  const removeRule = async (id: string) => {
    const { error: err } = await supabase.from('recurring_rules').delete().eq('id', id);
    if (err) setError(err.message);
    else refreshWorkspaceData();
  };

  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow-sm">
      <div className="px-5 pt-5 pb-3">
        <p className="text-sm font-bold text-gray-900">반복 거래</p>
        <p className="text-xs text-gray-400 mt-0.5">월세·구독처럼 매달 같은 내역을 자동으로 넣습니다.</p>
      </div>

      <div className="px-5 pb-4 space-y-3">
        <div className="flex rounded-2xl bg-gray-100 p-1 gap-1">
          {(['EXPENSE', 'INCOME'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setType(item);
                setCategory(item === 'INCOME' ? '급여' : '생활');
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold ${
                type === item ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'
              }`}
            >
              {item === 'EXPENSE' ? '지출' : '수입'}
            </button>
          ))}
        </div>
        <input
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
          placeholder="금액"
          className="w-full rounded-2xl bg-gray-100 px-4 py-3 text-sm font-semibold outline-none"
        />
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold ${
                category === c.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            inputMode="numeric"
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(e.target.value.replace(/[^\d]/g, ''))}
            placeholder="매월 n일"
            className="w-24 rounded-2xl bg-gray-100 px-3 py-3 text-sm font-semibold outline-none"
          />
          <input
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="메모 (월세, 넷플릭스…)"
            className="flex-1 rounded-2xl bg-gray-100 px-4 py-3 text-sm outline-none"
          />
        </div>
        {members.length > 1 && (
          <select
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
            className="w-full rounded-2xl bg-gray-100 px-4 py-3 text-sm outline-none"
          >
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.nickname}
              </option>
            ))}
          </select>
        )}
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          type="button"
          onClick={handleCreate}
          disabled={saving}
          className="w-full py-3 rounded-2xl bg-blue-500 text-white text-sm font-bold disabled:opacity-50"
        >
          {saving ? '추가 중…' : '반복 규칙 추가'}
        </button>
      </div>

      <div className="border-t border-gray-50 divide-y divide-gray-50">
        {loading && <p className="px-5 py-4 text-sm text-gray-400">불러오는 중…</p>}
        {!loading && rules.length === 0 && (
          <p className="px-5 py-4 text-sm text-gray-400">등록된 반복 거래가 없습니다.</p>
        )}
        {rules.map((rule) => (
          <div key={rule.id} className="px-5 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {rule.category} · 매월 {rule.day_of_month}일
              </p>
              <p className="text-xs text-gray-400 truncate">
                {rule.type === 'INCOME' ? '+' : '-'}
                {fmt(rule.amount)}원
                {rule.memo ? ` · ${rule.memo}` : ''}
                {rule.active ? '' : ' · 중지됨'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggleActive(rule)}
              className="text-[11px] font-bold text-blue-500"
            >
              {rule.active ? '중지' : '재개'}
            </button>
            <button
              type="button"
              onClick={() => removeRule(rule.id)}
              className="text-[11px] font-bold text-red-400"
            >
              삭제
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
