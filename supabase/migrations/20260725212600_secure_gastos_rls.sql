-- Protege public.gastos_david con Supabase Auth y Row Level Security.
-- Si existen filas antiguas sin user_id, asígnales primero el UUID correcto
-- de auth.users antes de ejecutar esta migración.

begin;

alter table public.gastos_david
  add column if not exists user_id uuid references auth.users(id);

do $$
begin
  if exists (
    select 1
      from public.gastos_david
     where user_id is null
  ) then
    raise exception 'Existen gastos sin user_id. Asigna el propietario antes de continuar.';
  end if;
end
$$;

alter table public.gastos_david
  alter column user_id set default auth.uid(),
  alter column user_id set not null;

create index if not exists gastos_david_user_id_idx
  on public.gastos_david (user_id);

alter table public.gastos_david enable row level security;

-- Retira cualquier política anterior para evitar accesos permisivos heredados.
do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
      from pg_policies
     where schemaname = 'public'
       and tablename = 'gastos_david'
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  end loop;
end
$$;

revoke all privileges on table public.gastos_david from anon;
revoke all privileges on table public.gastos_david from authenticated;

grant select, insert on table public.gastos_david to authenticated;

create policy "gastos_select_own"
  on public.gastos_david
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "gastos_insert_own"
  on public.gastos_david
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

commit;
