import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '../utils/supabase/server';
import Dashboard from '../components/dashboard/Dashboard';

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return <Dashboard />;
}
