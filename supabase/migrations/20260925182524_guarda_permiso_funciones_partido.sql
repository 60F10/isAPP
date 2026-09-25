-- =============================================================================
-- T-105b · Guarda de permiso en las dos funciones de partido expuestas por RPC
-- -----------------------------------------------------------------------------
-- La prueba de aislamiento (supabase/pruebas/aislamiento_clubes.sql) destapó que
-- rebuild_match_stints y flag_duplicate_candidates, las dos SECURITY DEFINER y
-- ejecutables por authenticated, no comprobaban permiso: cualquier usuario con
-- sesión las lanzaba sobre un partido de otro club.
--
-- Permisos exigidos (decididos con Raúl el 25/09):
--   · rebuild_match_stints → match.live.write, event.approve, lineup.manage o
--     match.close. Los tramos se recalculan cada vez que cambia un cambio, una
--     expulsión o la convocatoria (DOC 04 §6.1), así que vale cualquiera de los
--     cuatro que tocan esas cosas.
--   · flag_duplicate_candidates → event.approve. Quien usa el resultado es
--     quien revisa discordancias.
--
-- Sin sesión (auth.uid() nulo) la guarda no actúa, igual que en
-- enforce_match_changes: anon ya no puede ejecutarlas desde la migración del
-- 12/09 y lo que llega sin uid es el servidor.
--
-- CREATE OR REPLACE con la misma firma: conservan sus permisos de EXECUTE.
-- =============================================================================

create or replace function public.rebuild_match_stints(p_match_id uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_period   record;
  v_event    record;
  v_on_pitch uuid[];
  v_dur      integer;
  v_at       integer;
  v_count    integer;
  v_skipped  uuid[] := '{}'::uuid[];
  v_team     uuid;
begin
  if auth.uid() is not null then
    v_team := public.team_of_match(p_match_id);
    if v_team is null
       or not (public.has_team_permission(v_team, 'match.live.write')
            or public.has_team_permission(v_team, 'event.approve')
            or public.has_team_permission(v_team, 'lineup.manage')
            or public.has_team_permission(v_team, 'match.close')) then
      raise exception insufficient_privilege
        using message = 'Recalcular los tramos exige match.live.write, event.approve, lineup.manage o match.close en el equipo del partido';
    end if;
  end if;

  delete from player_match_stints where match_id = p_match_id;

  select coalesce(array_agg(player_id), '{}'::uuid[]) into v_on_pitch
    from match_squad
   where match_id = p_match_id and call_status = 'starter';

  for v_period in
    select mp.period_number,
           coalesce(mp.actual_seconds, mp.planned_seconds) as dur
      from match_periods mp
     where mp.match_id = p_match_id
     order by mp.period_number
  loop
    v_dur := v_period.dur;

    insert into player_match_stints (
      match_id, player_id, period, start_seconds, end_seconds, start_reason, end_reason)
    select p_match_id, p, v_period.period_number, 0, v_dur, 'period_start', 'period_end'
      from unnest(v_on_pitch) as p;

    for v_event in
      select id, event_type, seconds, player_id, secondary_player_id, created_at
        from match_events
       where match_id = p_match_id
         and status = 'approved'
         and period = v_period.period_number
         and event_type in ('substitution','red_card','second_yellow')
       order by seconds nulls last, created_at
    loop
      v_at := least(coalesce(v_event.seconds, v_dur), v_dur);

      if v_event.event_type = 'substitution' then

        if v_event.secondary_player_id = any (v_on_pitch) then
          v_skipped := v_skipped || v_event.id;
          continue;
        end if;

        update player_match_stints
           set end_seconds = v_at, end_reason = 'substitution'
         where match_id = p_match_id
           and period = v_period.period_number
           and player_id = v_event.player_id
           and end_reason = 'period_end';

        insert into player_match_stints (
          match_id, player_id, period, start_seconds, end_seconds, start_reason, end_reason)
        values (p_match_id, v_event.secondary_player_id, v_period.period_number,
                v_at, v_dur, 'substitution', 'period_end');

        v_on_pitch := array_remove(v_on_pitch, v_event.player_id) || v_event.secondary_player_id;
      else
        update player_match_stints
           set end_seconds = v_at, end_reason = 'sent_off'
         where match_id = p_match_id
           and period = v_period.period_number
           and player_id = v_event.player_id
           and end_reason = 'period_end';

        v_on_pitch := array_remove(v_on_pitch, v_event.player_id);
      end if;
    end loop;
  end loop;

  select count(*) into v_count from player_match_stints where match_id = p_match_id;

  return jsonb_build_object(
    'stints',  v_count,
    'skipped', to_jsonb(v_skipped)
  );
end;
$function$;

create or replace function public.flag_duplicate_candidates(p_match_id uuid)
 returns integer
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_cfg     jsonb;
  v_default integer;
  v_count   integer;
  v_team    uuid;
begin
  if auth.uid() is not null then
    v_team := public.team_of_match(p_match_id);
    if v_team is null or not public.has_team_permission(v_team, 'event.approve') then
      raise exception insufficient_privilege
        using message = 'Marcar candidatos a duplicado exige event.approve en el equipo del partido';
    end if;
  end if;

  select value into v_cfg from app_settings where key = 'duplicate_window_seconds';
  v_default := coalesce((v_cfg->>'default')::integer, 30);

  update match_events set duplicate_group_id = null where match_id = p_match_id;

  with pairs as (
    select a.id as id_a, b.id as id_b
      from match_events a
      join match_events b
        on b.match_id = a.match_id
       and a.id < b.id
       and a.event_type  = b.event_type
       and a.is_opponent = b.is_opponent
       and a.period      = b.period
       and a.created_by <> b.created_by
       and a.status <> 'rejected'
       and b.status <> 'rejected'
       and abs(a.seconds - b.seconds) <= coalesce(
             (v_cfg->'by_type'->>(a.event_type::text))::integer,
             v_default)
     where a.match_id = p_match_id
       and a.seconds is not null
       and b.seconds is not null
  ),
  members as (
    select id_a as id, id_a as anchor from pairs
    union
    select id_b, id_a from pairs
  ),
  grouped as (
    select id, (array_agg(anchor order by anchor))[1] as group_id
    from members group by id
  )
  update match_events e
     set duplicate_group_id = g.group_id
    from grouped g
   where e.id = g.id;

  get diagnostics v_count = row_count;
  return v_count;
end;
$function$;
