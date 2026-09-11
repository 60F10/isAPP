-- =====================================================================
-- GavetaStats — Endurecimiento tras el auditor de Supabase
-- Anexo del DOC 05 · 11/09/2026
--
-- Destino: supabase/migrations/0002_hardening_rls_y_permisos.sql
-- Se ejecuta después del 0001, sobre el proyecto ya creado.
--
-- Corrige lo que el auditor de seguridad y rendimiento destapó al aplicar
-- el esquema inicial. Cada bloque dice qué estaba mal y por qué importaba.
-- =====================================================================


-- =====================================================================
-- 1 · search_path fijo en set_updated_at
--
-- Era la única función del proyecto sin search_path declarado. Una función
-- con search_path variable se puede engañar con un esquema falso.
-- =====================================================================

alter function public.set_updated_at() set search_path = public;


-- =====================================================================
-- 2 · Ninguna función del proyecto es ejecutable sin sesión iniciada
--
-- El 0001 hacía `revoke all on all functions ... from anon`, y no bastaba:
-- PostgreSQL concede EXECUTE a PUBLIC por defecto al crear una función, y
-- anon hereda de PUBLIC. Revocar solo de anon no quita lo heredado.
--
-- Consecuencia real: cualquiera con la anon key —que va en el frontend por
-- diseño— podía llamar a rebuild_match_stints o flag_duplicate_candidates
-- por /rest/v1/rpc sin iniciar sesión. Son SECURITY DEFINER: escriben en la
-- base saltándose la RLS. Era el único agujero de verdad del esquema.
--
-- authenticated conserva su concesión explícita del 0001 §19.
-- =====================================================================

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in (
         'is_platform_admin','is_team_member','has_team_permission','is_team_follower',
         'can_read_team','is_club_member','can_read_club','has_club_permission',
         'team_of_match','set_updated_at','handle_new_user','set_match_club_id',
         'audit_row','validate_match_event','enforce_match_changes',
         'rebuild_match_stints','flag_duplicate_candidates',
         'metric_reliability','player_metric_reliability'
       )
  loop
    execute format('revoke all on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated', f.sig);
  end loop;
end $$;


-- =====================================================================
-- 3 · auth.uid() se evalúa una vez por consulta, no una por fila
--
-- Envuelta en (select ...), la llamada se convierte en un InitPlan que el
-- planificador resuelve una sola vez. Sin envolver, se ejecuta por cada
-- fila examinada. En match_events, que es la tabla que crece, la diferencia
-- se nota en la pantalla de directo, que es justo donde no se puede notar.
-- =====================================================================

drop policy profiles_select on profiles;
create policy profiles_select on profiles for select to authenticated
  using (
    id = (select auth.uid())
    or public.is_platform_admin()
    or exists (
      select 1 from team_members me
      join team_members other on other.team_id = me.team_id
      where me.user_id = (select auth.uid()) and me.is_active and other.user_id = profiles.id
    )
  );

drop policy profiles_update on profiles;
create policy profiles_update on profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy clubs_insert on clubs;
create policy clubs_insert on clubs for insert to authenticated
  with check (created_by = (select auth.uid()));

drop policy team_members_select on team_members;
create policy team_members_select on team_members for select to authenticated
  using (user_id = (select auth.uid()) or public.is_team_member(team_id));

drop policy team_permissions_select on team_member_permissions;
create policy team_permissions_select on team_member_permissions for select to authenticated
  using (exists (
    select 1 from team_members tm
    where tm.id = team_member_id
      and (tm.user_id = (select auth.uid()) or public.is_team_member(tm.team_id))
  ));

drop policy team_followers_select on team_followers;
create policy team_followers_select on team_followers for select to authenticated
  using (user_id = (select auth.uid()) or public.has_team_permission(team_id, 'members.manage'));

drop policy match_events_insert on match_events;
create policy match_events_insert on match_events for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and public.has_team_permission(public.team_of_match(match_id), 'match.live.write')
  );

drop policy match_events_update on match_events;
create policy match_events_update on match_events for update to authenticated
  using (
    (created_by = (select auth.uid()) and status = 'pending')
    or public.has_team_permission(public.team_of_match(match_id), 'match.close')
  )
  with check (
    (created_by = (select auth.uid()) and status = 'pending')
    or public.has_team_permission(public.team_of_match(match_id), 'match.close')
  );

drop policy match_events_delete on match_events;
create policy match_events_delete on match_events for delete to authenticated
  using (
    (created_by = (select auth.uid()) and status = 'pending')
    or public.has_team_permission(public.team_of_match(match_id), 'match.close')
  );

drop policy coverage_insert on coverage_declarations;
create policy coverage_insert on coverage_declarations for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.has_team_permission(public.team_of_match(match_id), 'match.live.write')
  );

drop policy coverage_update on coverage_declarations;
create policy coverage_update on coverage_declarations for update to authenticated
  using (user_id = (select auth.uid())
      or public.has_team_permission(public.team_of_match(match_id), 'match.close'))
  with check (user_id = (select auth.uid())
      or public.has_team_permission(public.team_of_match(match_id), 'match.close'));

drop policy error_logs_insert on error_logs;
create policy error_logs_insert on error_logs for insert to authenticated
  with check (user_id = (select auth.uid()) or user_id is null);


-- =====================================================================
-- 4 · club_id en la auditoría
--
-- La política audit_log_select del 0001 exige club_id para que quien tiene
-- members.manage pueda leer la auditoría de su club. audit_row() lo dejaba
-- siempre nulo, así que solo la veía el administrador de plataforma y E9-02
-- se quedaba a medias. El club se deduce de la propia fila auditada.
-- =====================================================================

create or replace function public.audit_row()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_diff jsonb;
  v_id   uuid;
  v_row  jsonb;
  v_club uuid;
begin
  if tg_op = 'UPDATE' then
    select jsonb_object_agg(key, jsonb_build_object('before', to_jsonb(old)->key, 'after', value))
      into v_diff
      from jsonb_each(to_jsonb(new))
     where to_jsonb(old)->key is distinct from value
       and key <> 'updated_at';
    if v_diff is null then
      return new;
    end if;
    v_row := to_jsonb(new);
  elsif tg_op = 'INSERT' then
    v_diff := to_jsonb(new);
    v_row  := to_jsonb(new);
  else
    v_diff := to_jsonb(old);
    v_row  := to_jsonb(old);
  end if;

  v_id := (v_row->>'id')::uuid;

  -- El club sale de la fila, del partido o del equipo, según la tabla.
  if v_row ? 'club_id' then
    v_club := (v_row->>'club_id')::uuid;
  elsif v_row ? 'match_id' then
    select m.club_id into v_club from matches m where m.id = (v_row->>'match_id')::uuid;
  elsif v_row ? 'team_id' then
    select t.club_id into v_club from teams t where t.id = (v_row->>'team_id')::uuid;
  elsif v_row ? 'team_member_id' then
    select t.club_id into v_club
      from team_members tm join teams t on t.id = tm.team_id
     where tm.id = (v_row->>'team_member_id')::uuid;
  end if;

  insert into audit_log (table_name, record_id, action, diff, actor_id, club_id)
  values (tg_table_name, v_id, lower(tg_op), v_diff, auth.uid(), v_club);

  return coalesce(new, old);
end;
$$;

revoke all on function public.audit_row() from public, anon;
grant execute on function public.audit_row() to authenticated;

create index if not exists audit_log_club_idx on audit_log (club_id, created_at desc);


-- =====================================================================
-- 5 · Índices sobre las claves ajenas que se recorren de verdad
--
-- El auditor marcó cuarenta claves ajenas sin índice. La mayoría son
-- columnas created_by que nadie consulta y no merecen un índice que
-- mantener. Aquí entran solo las que sostienen un borrado en cascada o
-- una consulta del día de partido.
-- =====================================================================

create index if not exists match_squad_player_idx         on match_squad (player_id);
create index if not exists squad_player_idx               on squad_memberships (player_id);
create index if not exists squad_season_idx               on squad_memberships (season_id);
create index if not exists matches_season_idx             on matches (season_id);
create index if not exists matches_opponent_idx           on matches (opponent_team_id);
create index if not exists competitions_club_season_idx   on competitions (club_id, season_id);
create index if not exists stints_player_idx              on player_match_stints (player_id);
create index if not exists coverage_user_idx              on coverage_declarations (user_id);
create index if not exists invitations_team_idx           on invitations (team_id);
create index if not exists sanctions_club_season_idx      on sanctions (club_id, season_id);
create index if not exists training_sessions_season_idx   on training_sessions (season_id);
create index if not exists training_attendance_player_idx on training_attendance (player_id);
create index if not exists match_events_created_by_idx    on match_events (created_by);

-- Fin del endurecimiento.
