import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '../../../utils/supabase/server';
import WorkspaceManagePage from './WorkspaceManageClient';

export default async function WorkspaceManageRoute() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return <WorkspaceManagePage />;
}
