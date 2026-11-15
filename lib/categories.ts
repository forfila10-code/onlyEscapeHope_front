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

/** 거래 입력·설정에서 고르는 카테고리 */
export interface CategoryOption {
  /** 거래에 저장되는 이름 */
  id: string;
  /** 화면에 보이는 이름 */
  label: string;
  emoji: string;
  /** 사용자가 추가한 항목. 기본 목록은 false */
  custom: boolean;
  /** workspace_categories.id. 기본 카테고리는 없음 */
  rowId?: string;
}

export type CategoryKind = 'EXPENSE' | 'INCOME';

/** 추가할 때 고르는 이모지 */
export const CATEGORY_EMOJI_OPTIONS = [
  '🏷️', '👶', '🎁', '🐶', '✈️', '📚', '💄', '🎮', '🍺', '🎓', '🌸', '🚗', '🏥', '💡', '📱', '🧾',
] as const;

const EXTRA_COLORS = [
  'bg-amber-100',
  'bg-lime-100',
  'bg-teal-100',
  'bg-indigo-100',
  'bg-rose-100',
  'bg-cyan-100',
];

/** 사용자가 추가한 카테고리 이모지. 기본 목록을 덮지 않습니다. */
const extraMeta = new Map<string, { emoji: string; emojiColor: string }>();

export function defaultCategories(kind: CategoryKind): CategoryOption[] {
  const source = kind === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return source.map((item) => ({
    id: item.id,
    label: item.label,
    emoji: item.emoji,
    custom: false,
  }));
}

/**
 * 카테고리 이름이 기본 목록·이미 추가된 이름과 겹치지 않는지 확인합니다.
 *
 * @param name 입력한 이름
 * @param existing 비교할 카테고리 목록
 * @returns 문제 없으면 null, 있으면 안내 문장
 */
export function validateCategoryName(
  name: string,
  existing: { label: string }[]
): string | null {
  const trimmed = name.trim();
  if (!trimmed) return '이름을 입력해 주세요.';
  if (trimmed.length > 12) return '이름은 12자까지 가능합니다.';
  if (existing.some((item) => item.label === trimmed)) return '이미 있는 카테고리입니다.';
  return null;
}

/** 추가 카테고리의 이모지를 목록·통계에서 쓰도록 등록합니다. */
export function registerCategoryMeta(name: string, emoji: string) {
  extraMeta.set(name, { emoji, emojiColor: colorForName(name) });
}

function colorForName(name: string) {
  let index = 0;
  for (let i = 0; i < name.length; i += 1) index = (index + name.charCodeAt(i)) % EXTRA_COLORS.length;
  return EXTRA_COLORS[index];
}

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
  extraMeta.get(category ?? '') ??
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
