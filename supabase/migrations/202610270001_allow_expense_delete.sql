begin;

grant delete on table public.gastos_david to authenticated;

drop policy if exists "gastos_delete_own" on public.gastos_david;
create policy "gastos_delete_own"
  on public.gastos_david
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

commit;
