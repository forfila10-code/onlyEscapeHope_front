-- 워크스페이스 공유 일정
-- SQL Editor에서 001 → 005 이후 이 파일을 실행하세요.

create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  -- 일정을 만든 사용자
  user_id uuid not null references public.profiles(id) on delete cascade,
  -- 누구의 일정인지 (워크스페이스 멤버)
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 40),
  date date not null,
  -- 없으면 시간 없는 하루 일정
  start_time time,
  memo text,
  created_at timestamptz not null default now()
);

create index if not exists schedules_workspace_date_idx
  on public.schedules (workspace_id, date);

alter table public.schedules enable row level security;

drop policy if exists "schedules_select_member" on public.schedules;
create policy "schedules_select_member"
  on public.schedules for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

drop policy if exists "schedules_insert_member" on public.schedules;
create policy "schedules_insert_member"
  on public.schedules for insert
  to authenticated
  with check (
    public.is_workspace_member(workspace_id)
    and user_id = auth.uid()
    and public.is_workspace_member_user(workspace_id, owner_id)
  );

drop policy if exists "schedules_delete_member" on public.schedules;
create policy "schedules_delete_member"
  on public.schedules for delete
  to authenticated
  using (public.is_workspace_member(workspace_id));
