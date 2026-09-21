/** 카테고리 메타 (이모지/색상) — Vite 앱과 동일 */

export const EXPENSE_CATEGORIES = [
  { id: '식비', emoji: '🍽️', label: '식비' },
  { id: '카페', emoji: '☕', label: '카페' },
  { id: '교통', emoji: '🚌', label: '교통' },
  { id: '쇼핑', emoji: '🛍️', label: '쇼핑' },
  { id: '생활', emoji: '🏠', label: '생활' },
  { id: '의료', emoji: '💊', label: '의료' },
  { id: '문화', emoji: '🎬', label: '문화' },
  { id: '운동', emoji: '💪', label: '운동' },
  { id: '기타', emoji: '📦', label: '기타' },
] as const;

export const INCOME_CATEGORIES = [
  { id: '급여', emoji: '💰', label: '급여' },
  { id: '용돈', emoji: '💵', label: '용돈' },
  { id: '이자', emoji: '🏦', label: '이자' },
] as const;

const CATEGORY_META: Record<string, { emoji: string; emojiColor: string }> = {
  식비: { emoji: '🍽️', emojiColor: 'bg-orange-100' },
  카페: { emoji: '☕', emojiColor: 'bg-yellow-100' },
  교통: { emoji: '🚌', emojiColor: 'bg-sky-100' },
  쇼핑: { emoji: '🛍️', emojiColor: 'bg-pink-100' },
  생활: { emoji: '🏠', emojiColor: 'bg-green-100' },
  의료: { emoji: '💊', emojiColor: 'bg-red-100' },
  문화: { emoji: '🎬', emojiColor: 'bg-purple-100' },
  운동: { emoji: '💪', emojiColor: 'bg-emerald-100' },
  기타: { emoji: '📦', emojiColor: 'bg-gray-100' },
  급여: { emoji: '💰', emojiColor: 'bg-blue-100' },
  용돈: { emoji: '💵', emojiColor: 'bg-blue-100' },
  이자: { emoji: '🏦', emojiColor: 'bg-blue-100' },
  수입: { emoji: '💰', emojiColor: 'bg-blue-100' },
};

export const fmt = (value: number | null | undefined) =>
  Math.abs(Number(value ?? 0)).toLocaleString('ko-KR');

export const isIncome = (type: string | undefined) =>
  (type ?? '').toUpperCase() === 'INCOME';

export const getCategoryMeta = (category?: string, type?: string) =>
  CATEGORY_META[category ?? ''] ??
  (isIncome(type) ? CATEGORY_META.수입 : CATEGORY_META.기타);

/** 거래 paid_by → 멤버 닉네임. 공유 워크스페이스에서 결제자 표시용 */
export function getPayerNickname(
  paidBy: string | null | undefined,
  members: { user_id: string; nickname: string }[]
): string | null {
  if (!paidBy || members.length < 2) return null;
  return members.find((m) => m.user_id === paidBy)?.nickname ?? null;
}
