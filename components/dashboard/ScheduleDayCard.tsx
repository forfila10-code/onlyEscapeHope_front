'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { createClient } from '../../utils/supabase/client';
import { formatScheduleTime, memberDotClass, type ScheduleItem } from '../../lib/schedules';

interface ScheduleDayCardProps {
  /** 선택한 날짜 */
  date: Date;
  /** 그날의 일정 */
  items: ScheduleItem[];
  /** 워크스페이스 id */
  workspaceId: string;
  /** 로그인 사용자 id. 일정 작성자로 저장합니다. */
  userId: string;
  /** 누구 일정인지 고르는 멤버 */
  members: { user_id: string; nickname: string }[];
  /** 저장·삭제 후 달력을 다시 불러옵니다. */
  onChanged: () => void;
}

/**
 * 선택한 날의 공유 일정 목록과 추가 폼
 */
export default function ScheduleDayCard({
  date,
  items,
  workspaceId,
  userId,
  members,
  onChanged,
}: ScheduleDayCardProps) {
  const supabase = createClient();
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [ownerId, setOwnerId] = useState(userId);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleAdd = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setMessage('제목을 입력해 주세요.');
      return;
    }
    setSaving(true);
    setMessage('');
    const { error } = await supabase.from('schedules').insert({
      workspace_id: workspaceId,
      user_id: userId,
      owner_id: ownerId || userId,
      title: trimmed,
      date: format(date, 'yyyy-MM-dd'),
      start_time: time || null,
    });
    setSaving(false);
    if (error) {
      const missing =
        error.code === '42P01' || error.code === 'PGRST205' || /schedules/.test(error.message);
      setMessage(
        missing ? 'Supabase에서 006_schedules.sql을 먼저 실행해 주세요.' : '일정 저장에 실패했습니다.'
      );
      return;
    }
    setTitle('');
    setTime('');
    onChanged();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('schedules').delete().eq('id', id);
    if (error) {
      setMessage('일정 삭제에 실패했습니다.');
      return;
    }
    onChanged();
  };

  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow-sm">
      <div className="px-5 pt-5 pb-3">
        <h3 className="text-sm font-extrabold text-gray-900">
          {format(date, 'M월 d일 (eee)', { locale: ko })}
        </h3>
        <p className="text-xs text-gray-400 mt-0.5">
          {items.length > 0 ? `일정 ${items.length}개` : '이 날 일정이 없습니다'}
        </p>
      </div>

      {items.length > 0 && (
        <div className="divide-y divide-gray-50">
          {items.map((item) => {
            const owner = members.find((member) => member.user_id === item.owner_id);
            const timeLabel = formatScheduleTime(item.start_time);
            return (
              <div key={item.id} className="flex items-center gap-3 px-5 py-3">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${memberDotClass(item.owner_id, members)}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {timeLabel || '하루 종일'}
                    {owner?.nickname ? ` · ${owner.nickname}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  className="text-xs font-bold text-red-400"
                >
                  삭제
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="px-5 py-4 space-y-2 border-t border-gray-50">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="일정 제목"
          maxLength={40}
          className="w-full rounded-2xl bg-gray-100 px-4 py-3 text-sm font-semibold outline-none"
        />
        <div className="flex gap-2">
          <input
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            className="w-28 rounded-2xl bg-gray-100 px-3 py-3 text-sm font-semibold outline-none"
          />
          <select
            value={ownerId}
            onChange={(event) => setOwnerId(event.target.value)}
            className="flex-1 rounded-2xl bg-gray-100 px-3 py-3 text-sm font-semibold outline-none"
          >
            {(members.length > 0 ? members : [{ user_id: userId, nickname: '나' }]).map((member) => (
              <option key={member.user_id} value={member.user_id}>
                {member.nickname || '멤버'}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAdd}
            disabled={saving}
            className="px-4 rounded-2xl bg-blue-500 text-white text-sm font-bold disabled:opacity-40"
          >
            추가
          </button>
        </div>
        {message && <p className="text-xs font-medium text-red-400">{message}</p>}
      </div>
    </div>
  );
}
