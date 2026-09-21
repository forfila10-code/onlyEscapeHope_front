/** Supabase 쿠키 설정 항목 */
export type CookieToSet = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};
