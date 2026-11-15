'use client';

import { useEffect } from 'react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { createClient } from '../../utils/supabase/client';
import { SCHEDULES_CHANGED_EVENT, syncScheduleWidget } from '../../lib/widget';

/**
 * 앱이 켜져 있는 동안 다가오는 일정을 홈 화면 위젯에 넘깁니다.
 */
export default function ScheduleWidgetSync() {
  const supabase = createClient();
  const { currentWorkspace, currentWorkspaceId, members, refreshVersion } = useWorkspace();

  useEffect(() => {
    if (!currentWorkspaceId) return;

    const run = () => {
      void syncScheduleWidget(
        supabase,
        currentWorkspaceId,
        currentWorkspace?.name ?? '가계부',
        members
      );
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') run();
    };

    run();
    window.addEventListener(SCHEDULES_CHANGED_EVENT, run);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener(SCHEDULES_CHANGED_EVENT, run);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [currentWorkspaceId, currentWorkspace?.name, members, refreshVersion, supabase]);

  return null;
}
