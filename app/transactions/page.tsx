import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '../../utils/supabase/server';
import TransactionListClient from './TransactionListClient';

export default async function TransactionsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return <TransactionListClient />;
}
