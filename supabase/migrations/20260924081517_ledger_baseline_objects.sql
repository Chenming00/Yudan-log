-- Add only the missing baseline ledger objects to an existing normalized
-- database. Does not recreate tables/policies or rewrite financial records.
begin;

create index if not exists idx_transactions_transaction_time
  on public.transactions (transaction_time desc);

create or replace function public.total_expense()
returns numeric language sql stable security invoker set search_path = ''
as $function$
  select coalesce(sum(amount), 0)
  from public.transactions where type = 'expense';
$function$;
revoke all on function public.total_expense() from public, anon, authenticated;
grant execute on function public.total_expense() to anon, authenticated, service_role;

commit;
