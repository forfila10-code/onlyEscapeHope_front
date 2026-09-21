/**
 * Date 객체를 로컬 타임존 기준 yyyy-MM-dd 문자열로 변환합니다.
 *
 * @param date 변환할 날짜
 * @return yyyy-MM-dd 형식 문자열
 */
export function toLocalISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 오늘 기준 n일 전 날짜를 반환합니다.
 *
 * @param days 빼거나 더할 일 수
 * @return 계산된 Date
 */
export function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}
