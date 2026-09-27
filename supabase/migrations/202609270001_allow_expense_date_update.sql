begin;

grant update (fecha) on table public.gastos_david to authenticated;

create policy "gastos_update_own"
  on public.gastos_david
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

commit;
