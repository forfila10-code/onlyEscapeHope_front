-- 워크스페이스별 사용자 카테고리
-- SQL Editor에서 001 → 004 이후 이 파일을 실행하세요.

create table if not exists public.workspace_categories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  -- INCOME | EXPENSE
  kind text not null check (kind in ('INCOME', 'EXPENSE')),
  -- 거래 category 컬럼에 그대로 저장되는 이름
  name text not null check (char_length(btrim(name)) between 1 and 12),
  emoji text not null default '🏷️',
  created_at timestamptz not null default now(),
  unique (workspace_id, name)
);

alter table public.workspace_categories enable row level security;

drop policy if exists "workspace_categories_select_member" on public.workspace_categories;
create policy "workspace_categories_select_member"
  on public.workspace_categories for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

drop policy if exists "workspace_categories_insert_member" on public.workspace_categories;
create policy "workspace_categories_insert_member"
  on public.workspace_categories for insert
  to authenticated
  with check (public.is_workspace_member(workspace_id));

drop policy if exists "workspace_categories_delete_member" on public.workspace_categories;
create policy "workspace_categories_delete_member"
  on public.workspace_categories for delete
  to authenticated
  using (public.is_workspace_member(workspace_id));
