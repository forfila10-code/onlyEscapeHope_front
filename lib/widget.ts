import { Capacitor, registerPlugin } from '@capacitor/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { addDays, toLocalISODate } from './date';
import { formatScheduleTime, memberDotHex } from './schedules';

/** 위젯에 넘기는 일정 한 줄 */
export interface WidgetSchedule {
  /** yyyy-MM-dd */
  date: string;
  /** HH:mm. 비어 있으면 시간 없는 일정 */
  time: string;
  title: string;
  /** 화면용 닉네임 */
  owner: string;
  /** #RRGGBB */
  color: string;
}

interface ScheduleWidgetPlugin {
  /** 홈 화면 위젯 내용을 갈아끼웁니다. */
  update(options: { workspaceName: string; items: WidgetSchedule[] }): Promise<void>;
  /** 로그아웃 때 위젯을 비웁니다. */
  clear(): Promise<void>;
}

const ScheduleWidget = registerPlugin<ScheduleWidgetPlugin>('ScheduleWidget');

/** 일정 추가·수정·삭제 후 위젯을 다시 맞출 때 씁니다. */
export const SCHEDULES_CHANGED_EVENT = 'pocketfree-schedules-changed';

export function notifySchedulesChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(SCHEDULES_CHANGED_EVENT));
}

function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * 오늘부터 2주 일정을 안드로이드 위젯에 저장합니다.
 * 웹·구버전 앱에서는 아무 일도 하지 않습니다.
 *
 * @param supabase 로그인된 클라이언트
 * @param workspaceId 현재 가계부 id
 * @param workspaceName 위젯 제목에 보일 이름
 * @param members 점 색과 닉네임을 고를 멤버
 */
export async function syncScheduleWidget(
  supabase: SupabaseClient,
  workspaceId: string,
  workspaceName: string,
  members: { user_id: string; nickname: string }[]
): Promise<void> {
  if (!isNativeApp()) return;

  const startDate = toLocalISODate(new Date());
  const endDate = toLocalISODate(addDays(60));
  const { data, error } = await supabase
    .from('schedules')
    .select('date, title, start_time, owner_id')
    .eq('workspace_id', workspaceId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(5);

  if (error) {
    console.error('[widget] 일정 조회 실패:', error);
    return;
  }

  const items: WidgetSchedule[] = (data ?? []).map((row) => ({
    date: String(row.date).slice(0, 10),
    time: formatScheduleTime(row.start_time),
    title: row.title,
    owner: members.find((member) => member.user_id === row.owner_id)?.nickname ?? '',
    color: memberDotHex(row.owner_id, members),
  }));

  try {
    await ScheduleWidget.update({ workspaceName, items });
  } catch (updateError) {
    console.error('[widget] 위젯 갱신 실패:', updateError);
  }
}

/** 위젯에 남은 일정을 지웁니다. */
export async function clearScheduleWidget(): Promise<void> {
  if (!isNativeApp()) return;
  try {
    await ScheduleWidget.clear();
  } catch (error) {
    console.error('[widget] 위젯 비우기 실패:', error);
  }
}
