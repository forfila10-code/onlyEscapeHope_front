-- 워크스페이스 생성 RPC
-- INSERT ... RETURNING 이 RLS(멤버만 SELECT)에 막히는 문제를 피합니다.

create or replace function public.create_workspace(ws_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  new_id uuid;
begin
  if uid is null then
    raise exception '로그인이 필요합니다.';
  end if;

  if ws_name is null or length(trim(ws_name)) = 0 then
    raise exception '워크스페이스 이름은 필수입니다.';
  end if;

  -- profile 이 없으면 FK 때문에 workspaces insert 가 실패함
  perform public.ensure_my_workspace();

  insert into public.workspaces (name, created_by)
  values (trim(ws_name), uid)
  returning id into new_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_id, uid, 'OWNER');

  return new_id;
end;
$$;

grant execute on function public.create_workspace(text) to authenticated;

-- INSERT 직후 RETURNING/SELECT 가 멤버십 전에 실패하지 않도록 생성자도 조회 가능
drop policy if exists "workspaces_select_member" on public.workspaces;
create policy "workspaces_select_member"
  on public.workspaces for select
  to authenticated
  using (
    public.is_workspace_member(id)
    or created_by = auth.uid()
  );

