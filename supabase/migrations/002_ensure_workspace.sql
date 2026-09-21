-- 기존 가입자 백필 + 로그인 시 profile/개인 워크스페이스 보장
-- SQL Editor 에서 전체 실행하세요.

-- 로그인 유저에게 profile + 최소 1개 워크스페이스를 보장합니다.
create or replace function public.ensure_my_workspace()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  ws_id uuid;
  display_name text;
  meta jsonb;
  user_email text;
begin
  if uid is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select raw_user_meta_data, email
    into meta, user_email
  from auth.users
  where id = uid;

  display_name := coalesce(
    meta->>'full_name',
    meta->>'name',
    meta->>'nickname',
    split_part(coalesce(user_email, 'user'), '@', 1),
    '사용자'
  );

  insert into public.profiles (id, nickname, email, avatar_url)
  values (uid, display_name, user_email, meta->>'avatar_url')
  on conflict (id) do nothing;

  select wm.workspace_id into ws_id
  from public.workspace_members wm
  where wm.user_id = uid
  order by wm.created_at asc
  limit 1;

  if ws_id is not null then
    return ws_id;
  end if;

  insert into public.workspaces (name, created_by)
  values ('나의 가계부', uid)
  returning id into ws_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (ws_id, uid, 'OWNER');

  return ws_id;
end;
$$;

grant execute on function public.ensure_my_workspace() to authenticated;

-- 트리거 이전에 가입한 계정 일괄 보정
do $$
declare
  r record;
  new_ws uuid;
  display_name text;
begin
  for r in
    select u.id, u.email, u.raw_user_meta_data
    from auth.users u
    where not exists (
      select 1 from public.workspace_members wm where wm.user_id = u.id
    )
  loop
    display_name := coalesce(
      r.raw_user_meta_data->>'full_name',
      r.raw_user_meta_data->>'name',
      r.raw_user_meta_data->>'nickname',
      split_part(coalesce(r.email, 'user'), '@', 1),
      '사용자'
    );

    insert into public.profiles (id, nickname, email, avatar_url)
    values (
      r.id,
      display_name,
      r.email,
      r.raw_user_meta_data->>'avatar_url'
    )
    on conflict (id) do nothing;

    insert into public.workspaces (name, created_by)
    values ('나의 가계부', r.id)
    returning id into new_ws;

    insert into public.workspace_members (workspace_id, user_id, role)
    values (new_ws, r.id, 'OWNER');
  end loop;
end $$;

-- 거래 변경 Realtime (이미 추가돼 있으면 무시)
do $$
begin
  alter publication supabase_realtime add table public.transactions;
exception
  when duplicate_object then null;
end $$;
