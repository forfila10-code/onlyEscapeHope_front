-- 002/003/004 적용 여부 확인 (SQL Editor에서 실행, 읽기 전용)

select
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as args
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'ensure_my_workspace',
    'create_workspace',
    'apply_recurring_rules',
    'preview_workspace_invite',
    'join_workspace_by_token'
  )
order by 1;

select tablename
from pg_tables
where schemaname = 'public'
  and tablename in (
    'workspaces',
    'workspace_members',
    'workspace_invites',
    'transactions',
    'category_budgets',
    'recurring_rules'
  )
order by 1;
