-- 공유 일정 수정 권한
-- 006_schedules.sql 을 이미 실행한 뒤, SQL Editor에서 이 파일만 실행하세요.

drop policy if exists "schedules_update_member" on public.schedules;
create policy "schedules_update_member"
  on public.schedules for update
  to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (
    public.is_workspace_member(workspace_id)
    and public.is_workspace_member_user(workspace_id, owner_id)
  );
