/**
 * 로컬 타임존 기준 날짜 유틸
 */

/** Date → yyyy-MM-dd */
export function toLocalISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 오늘 기준 n일 전/후 Date */
export function addDays(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

export type PeriodCode = 'THIS_MONTH' | 'LAST_MONTH' | 'LAST_3_MONTHS' | 'THIS_YEAR';

/** 홈 요약용 기간 → 시작/종료 날짜 */
export function resolveHomeRange(
  period: PeriodCode,
  now: Date = new Date()
): { startDate: string; endDate: string } {
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-indexed

  const endOfMonth = (year: number, monthIndex: number) =>
    toLocalISODate(new Date(year, monthIndex + 1, 0));
  const startOfMonth = (year: number, monthIndex: number) =>
    toLocalISODate(new Date(year, monthIndex, 1));

  switch (period) {
    case 'LAST_MONTH': {
      const ly = m === 0 ? y - 1 : y;
      const lm = m === 0 ? 11 : m - 1;
      return { startDate: startOfMonth(ly, lm), endDate: endOfMonth(ly, lm) };
    }
    case 'LAST_3_MONTHS': {
      const start = new Date(y, m - 2, 1);
      return {
        startDate: startOfMonth(start.getFullYear(), start.getMonth()),
        endDate: endOfMonth(y, m),
      };
    }
    case 'THIS_YEAR':
      return { startDate: `${y}-01-01`, endDate: toLocalISODate(now) };
    case 'THIS_MONTH':
    default:
      return { startDate: startOfMonth(y, m), endDate: endOfMonth(y, m) };
  }
}

/** 단일 월 기간이면 연·월, 그 외(3개월/올해)는 null */
export function periodYearMonth(
  period: PeriodCode,
  now: Date = new Date()
): { year: number; month: number } | null {
  if (period === 'THIS_MONTH') {
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }
  if (period === 'LAST_MONTH') {
    const date = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return { year: date.getFullYear(), month: date.getMonth() + 1 };
  }
  return null;
}
