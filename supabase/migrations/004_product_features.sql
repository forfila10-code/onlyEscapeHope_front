-- PocketFree 제품 기능 + RLS 보완
-- SQL Editor에서 001 → 002 → 003 이후 이 파일을 실행하세요.

-- ════════════════════════════════════════
-- 0) 002/003 필수 함수 존재 확인 (없으면 여기서 바로 실패)
-- ════════════════════════════════════════
do $$
begin
  if to_regprocedure('public.ensure_my_workspace()') is null then
    raise exception '002_ensure_workspace.sql 을 먼저 실행하세요. (ensure_my_workspace 없음)';
  end if;
  if to_regprocedure('public.create_workspace(text)') is null then
    raise exception '003_create_workspace.sql 을 먼저 실행하세요. (create_workspace 없음)';
  end if;
end $$;

-- 워크스페이스에 특정 유저가 멤버인지 (RLS 재귀 방지)
create or replace function public.is_workspace_member_user(p_workspace_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = p_workspace_id
      and user_id = p_user_id
  );
$$;

-- ════════════════════════════════════════
-- 1) 카테고리 월 예산
-- ════════════════════════════════════════
create table if not exists public.category_budgets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  year int not null check (year between 2000 and 2100),
  month int not null check (month between 1 and 12),
  -- 카테고리 id (식비, 카페 등)
  category text not null,
  -- 월 한도 (원, 0 이상)
  amount bigint not null check (amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, year, month, category)
);

alter table public.category_budgets enable row level security;

drop policy if exists "category_budgets_select_member" on public.category_budgets;
create policy "category_budgets_select_member"
  on public.category_budgets for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

-- 부부 가계부: 멤버면 예산을 함께 수정할 수 있습니다.
drop policy if exists "category_budgets_write_member" on public.category_budgets;
create policy "category_budgets_insert_member"
  on public.category_budgets for insert
  to authenticated
  with check (public.is_workspace_member(workspace_id));

drop policy if exists "category_budgets_update_member" on public.category_budgets;
create policy "category_budgets_update_member"
  on public.category_budgets for update
  to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

drop policy if exists "category_budgets_delete_member" on public.category_budgets;
create policy "category_budgets_delete_member"
  on public.category_budgets for delete
  to authenticated
  using (public.is_workspace_member(workspace_id));

-- ════════════════════════════════════════
-- 2) 반복 거래 규칙
-- ════════════════════════════════════════
create table if not exists public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  -- 규칙을 만든 사용자 (자동 생성 거래의 user_id)
  user_id uuid not null references public.profiles(id) on delete cascade,
  -- 결제자 (정산 기준)
  paid_by uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('INCOME', 'EXPENSE')),
  amount bigint not null check (amount > 0),
  category text not null,
  memo text,
  -- 매월 생성일 (1~28, 월말 이슈 회피)
  day_of_month int not null check (day_of_month between 1 and 28),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.recurring_rules enable row level security;

drop policy if exists "recurring_rules_select_member" on public.recurring_rules;
create policy "recurring_rules_select_member"
  on public.recurring_rules for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

drop policy if exists "recurring_rules_insert_member" on public.recurring_rules;
create policy "recurring_rules_insert_member"
  on public.recurring_rules for insert
  to authenticated
  with check (
    public.is_workspace_member(workspace_id)
    and user_id = auth.uid()
    and public.is_workspace_member_user(workspace_id, paid_by)
  );

drop policy if exists "recurring_rules_update_member" on public.recurring_rules;
create policy "recurring_rules_update_member"
  on public.recurring_rules for update
  to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (
    public.is_workspace_member(workspace_id)
    and public.is_workspace_member_user(workspace_id, paid_by)
  );

drop policy if exists "recurring_rules_delete_member" on public.recurring_rules;
create policy "recurring_rules_delete_member"
  on public.recurring_rules for delete
  to authenticated
  using (public.is_workspace_member(workspace_id));

alter table public.transactions
  add column if not exists recurring_rule_id uuid references public.recurring_rules(id) on delete set null;

create unique index if not exists transactions_recurring_rule_date_uidx
  on public.transactions (recurring_rule_id, date)
  where recurring_rule_id is not null;

-- 앱 오픈 시 이번 달·지난 달 미생성 반복 거래를 넣습니다.
create or replace function public.apply_recurring_rules()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  inserted int := 0;
  n int;
  r record;
  target_date date;
  last_day int;
  y int;
  m int;
  month_offset int;
  base_month date;
begin
  if uid is null then
    raise exception '로그인이 필요합니다.';
  end if;

  for r in
    select rr.*
    from public.recurring_rules rr
    where rr.active
      and public.is_workspace_member(rr.workspace_id)
  loop
    for month_offset in 0..1 loop
      base_month := (date_trunc('month', current_date) - (month_offset || ' month')::interval)::date;
      y := extract(year from base_month)::int;
      m := extract(month from base_month)::int;
      last_day := extract(day from (base_month + interval '1 month - 1 day'))::int;
      target_date := make_date(y, m, least(r.day_of_month, last_day));

      insert into public.transactions (
        workspace_id, user_id, paid_by, type, amount, category, memo, date, recurring_rule_id
      )
      select
        r.workspace_id,
        r.user_id,
        r.paid_by,
        r.type,
        r.amount,
        r.category,
        r.memo,
        target_date,
        r.id
      where not exists (
        select 1
        from public.transactions t
        where t.recurring_rule_id = r.id
          and t.date = target_date
      );

      get diagnostics n = row_count;
      inserted := inserted + n;
    end loop;
  end loop;

  return inserted;
end;
$$;

grant execute on function public.apply_recurring_rules() to authenticated;
grant execute on function public.is_workspace_member_user(uuid, uuid) to authenticated;

-- ════════════════════════════════════════
-- 3) RLS 강화 — 프로필은 본인 + 같은 워크스페이스만
-- ════════════════════════════════════════
drop policy if exists "profiles_select_authenticated" on public.profiles;
drop policy if exists "profiles_select_self_or_shared" on public.profiles;
create policy "profiles_select_self_or_shared"
  on public.profiles for select
  to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.workspace_members me
      join public.workspace_members them
        on them.workspace_id = me.workspace_id
      where me.user_id = auth.uid()
        and them.user_id = profiles.id
    )
  );

-- 결제자는 해당 워크스페이스 멤버여야 합니다. (부부 공동 수정은 유지)
drop policy if exists "transactions_insert_member" on public.transactions;
create policy "transactions_insert_member"
  on public.transactions for insert
  to authenticated
  with check (
    public.is_workspace_member(workspace_id)
    and user_id = auth.uid()
    and public.is_workspace_member_user(workspace_id, paid_by)
  );

drop policy if exists "transactions_update_member" on public.transactions;
create policy "transactions_update_member"
  on public.transactions for update
  to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (
    public.is_workspace_member(workspace_id)
    and public.is_workspace_member_user(workspace_id, paid_by)
  );
