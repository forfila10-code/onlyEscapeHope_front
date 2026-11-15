/** 공유 일정 한 건 */
export interface ScheduleItem {
  id: string;
  /** yyyy-MM-dd */
  date: string;
  title: string;
  /** HH:mm:ss 또는 null (시간 없는 일정) */
  start_time: string | null;
  /** 누구의 일정인지 */
  owner_id: string;
  memo: string | null;
}

/** 멤버 순서대로 고정된 점 색. Tailwind가 클래스를 지우지 않게 문자열을 그대로 둡니다. */
const MEMBER_DOT_COLORS = [
  'bg-rose-400',
  'bg-sky-400',
  'bg-amber-400',
  'bg-emerald-400',
  'bg-violet-400',
  'bg-orange-400',
] as const;

/** 위젯에서 쓰는 같은 순서의 색 */
const MEMBER_DOT_HEX = ['#FB7185', '#38BDF8', '#FBBF24', '#34D399', '#A78BFA', '#FB923C'] as const;

/**
 * 멤버 순서에 맞는 일정 점 색을 돌려줍니다.
 *
 * @param userId 일정 주인 user id
 * @param members 워크스페이스 멤버 (순서대로 색을 배정)
 */
function memberColorIndex(userId: string, members: { user_id: string }[]): number {
  const index = members.findIndex((member) => member.user_id === userId);
  const safe = index >= 0 ? index : 0;
  return safe % MEMBER_DOT_COLORS.length;
}

export function memberDotClass(userId: string, members: { user_id: string }[]): string {
  return MEMBER_DOT_COLORS[memberColorIndex(userId, members)];
}

/** 위젯 점 색. #RRGGBB */
export function memberDotHex(userId: string, members: { user_id: string }[]): string {
  return MEMBER_DOT_HEX[memberColorIndex(userId, members)];
}

/** DB time 값을 화면용 HH:mm 로 줄입니다. */
export function formatScheduleTime(value: string | null | undefined): string {
  if (!value) return '';
  return value.slice(0, 5);
}
