-- PocketFree Supabase 초기 스키마
-- SQL Editor 에서 전체 실행하세요.
-- 기존에 부분 실행/구버전 테이블이 있어도 전부 지우고 다시 만듭니다.

-- ════════════════════════════════════════
-- 0) 기존 객체 정리
-- ════════════════════════════════════════

drop trigger if exists on_auth_user_created on auth.users;

drop function if exists public.handle_new_user() cascade;
drop function if exists public.preview_workspace_invite(text) cascade;
drop function if exists public.join_workspace_by_token(text) cascade;
drop function if exists public.is_workspace_member(uuid) cascade;
drop function if exists public.is_workspace_owner(uuid) cascade;

drop table if exists public.transactions cascade;
drop table if exists public.workspace_invites cascade;
drop table if exists public.workspace_members cascade;
drop table if exists public.workspaces cascade;
drop table if exists public.profiles cascade;
-- 예전 스텁 테이블이 있으면 함께 제거
drop table if exists public.households cascade;
drop table if exists public.categories cascade;

-- ════════════════════════════════════════
-- 1) 테이블
-- ════════════════════════════════════════

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  email text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('OWNER', 'MEMBER')),
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create index idx_workspace_members_user on public.workspace_members(user_id);
create index idx_workspace_members_workspace on public.workspace_members(workspace_id);

create table public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index idx_workspace_invites_token on public.workspace_invites(token);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete restrict,
  paid_by uuid not null references public.profiles(id) on delete restrict,
  type text not null check (type in ('INCOME', 'EXPENSE')),
  amount bigint not null check (amount > 0),
  category text not null,
  memo text,
  date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_transactions_workspace_date
  on public.transactions(workspace_id, date desc);

-- ════════════════════════════════════════
-- 2) 헬퍼 함수
-- ════════════════════════════════════════

create or replace function public.is_workspace_member(ws_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = ws_id
      and wm.user_id = auth.uid()
  );
end;
$$;

create or replace function public.is_workspace_owner(ws_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = ws_id
      and wm.user_id = auth.uid()
      and wm.role = 'OWNER'
  );
end;
$$;

-- ════════════════════════════════════════
-- 3) RLS
-- ════════════════════════════════════════

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invites enable row level security;
alter table public.transactions enable row level security;

create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "workspaces_select_member"
  on public.workspaces for select
  to authenticated
  using (public.is_workspace_member(id));

create policy "workspaces_insert_authenticated"
  on public.workspaces for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "workspaces_update_owner"
  on public.workspaces for update
  to authenticated
  using (public.is_workspace_owner(id))
  with check (public.is_workspace_owner(id));

create policy "workspaces_delete_owner"
  on public.workspaces for delete
  to authenticated
  using (public.is_workspace_owner(id));

create policy "workspace_members_select"
  on public.workspace_members for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "workspace_members_insert"
  on public.workspace_members for insert
  to authenticated
  with check (
    (user_id = auth.uid() and role = 'OWNER')
    or public.is_workspace_owner(workspace_id)
  );

create policy "workspace_members_delete"
  on public.workspace_members for delete
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_workspace_owner(workspace_id)
  );

create policy "workspace_invites_select_owner"
  on public.workspace_invites for select
  to authenticated
  using (public.is_workspace_owner(workspace_id));

create policy "workspace_invites_insert_owner"
  on public.workspace_invites for insert
  to authenticated
  with check (public.is_workspace_owner(workspace_id) and created_by = auth.uid());

create policy "workspace_invites_delete_owner"
  on public.workspace_invites for delete
  to authenticated
  using (public.is_workspace_owner(workspace_id));

create policy "transactions_select_member"
  on public.transactions for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "transactions_insert_member"
  on public.transactions for insert
  to authenticated
  with check (
    public.is_workspace_member(workspace_id)
    and user_id = auth.uid()
  );

create policy "transactions_update_member"
  on public.transactions for update
  to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "transactions_delete_member"
  on public.transactions for delete
  to authenticated
  using (public.is_workspace_member(workspace_id));

-- ════════════════════════════════════════
-- 4) 회원가입 트리거
-- ════════════════════════════════════════

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_ws_id uuid;
  display_name text;
begin
  display_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'nickname',
    split_part(coalesce(new.email, 'user'), '@', 1),
    '사용자'
  );

  insert into public.profiles (id, nickname, email, avatar_url)
  values (
    new.id,
    display_name,
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  insert into public.workspaces (name, created_by)
  values ('나의 가계부', new.id)
  returning id into new_ws_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_ws_id, new.id, 'OWNER');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ════════════════════════════════════════
-- 5) 초대 RPC
-- ════════════════════════════════════════

create or replace function public.preview_workspace_invite(invite_token text)
returns table (
  workspace_id uuid,
  workspace_name text,
  member_count bigint,
  already_joined boolean,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.workspace_invites%rowtype;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select * into inv
  from public.workspace_invites
  where token = invite_token;

  if not found then
    raise exception '유효하지 않은 초대 링크입니다.';
  end if;

  if inv.expires_at <= now() then
    raise exception '만료된 초대 링크입니다.';
  end if;

  return query
  select
    inv.workspace_id,
    w.name,
    (select count(*) from public.workspace_members wm where wm.workspace_id = inv.workspace_id),
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = inv.workspace_id and wm.user_id = auth.uid()
    ),
    inv.expires_at
  from public.workspaces w
  where w.id = inv.workspace_id;
end;
$$;

grant execute on function public.preview_workspace_invite(text) to authenticated;

create or replace function public.join_workspace_by_token(invite_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.workspace_invites%rowtype;
  already boolean;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select * into inv
  from public.workspace_invites
  where token = invite_token;

  if not found then
    raise exception '유효하지 않은 초대 링크입니다.';
  end if;

  if inv.expires_at <= now() then
    raise exception '만료된 초대 링크입니다.';
  end if;

  select exists (
    select 1 from public.workspace_members
    where workspace_members.workspace_id = inv.workspace_id
      and workspace_members.user_id = auth.uid()
  ) into already;

  if not already then
    insert into public.workspace_members (workspace_id, user_id, role)
    values (inv.workspace_id, auth.uid(), 'MEMBER');
  end if;

  return inv.workspace_id;
end;
$$;

grant execute on function public.join_workspace_by_token(text) to authenticated;
