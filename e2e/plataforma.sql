-- =====================================================================
-- GavetaStats — lo que en producción pone la plataforma (T-236)
--
-- ESTO ES UNA COPIA, MANTENIDA A MANO, del ejemplo de Supabase «auto
-- enable Row Level Security»:
-- https://supabase.com/docs/guides/database/postgres/event-triggers
--
-- En producción, la función `public.rls_auto_enable()` y el disparador de
-- eventos `ensure_rls` los gestiona la plataforma: no los crea ninguna
-- migración del repositorio y el Supabase local no los trae. Sin ellos, la
-- base de las pruebas no se parecería a la de verdad: las tablas nuevas
-- de `public` nacerían sin RLS.
--
-- SOLO LO APLICA EL FLUJO E2E (`.github/workflows/e2e.yml`), contra la base
-- local y después de las migraciones. No es una migración, no se aplica a
-- producción y no entra en `supabase/migrations/`.
-- =====================================================================

create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  cmd record;
begin
  for cmd in
    select * from pg_event_trigger_ddl_commands()
    where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      and object_type in ('table', 'partitioned table')
  loop
    if cmd.schema_name = 'public' then
      execute format('alter table if exists %s enable row level security', cmd.object_identity);
    end if;
  end loop;
end;
$$;

drop event trigger if exists ensure_rls;
create event trigger ensure_rls on ddl_command_end
  when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  execute function public.rls_auto_enable();

-- Lo mismo que hizo en producción la migración del 19/09.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
