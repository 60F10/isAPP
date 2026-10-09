-- =====================================================================
-- GavetaStats — datos de las pruebas en navegador (T-236)
--
-- ESTO NO ES UNA MIGRACIÓN NI LA SIEMBRA DE PRODUCCIÓN. Son los datos de la
-- base LOCAL que levanta el flujo E2E, y solo los aplica la preparación de
-- Playwright (`e2e/preparacion.ts`), con `psql`, después de crear a las tres
-- personas de prueba. La siembra de producción es `supabase/seed.sql`.
--
-- Rompe el mismo ciclo que `supabase/seed.sql` y en el mismo orden: club,
-- temporada, equipo, miembro y permisos, con permisos de servicio, porque
-- la RLS no deja crear un equipo a quien todavía no es miembro de ninguno.
--
-- TODO ES INVENTADO. Los jugadores son «Jugador 1» a «Jugador 14»: ningún
-- nombre real, de nadie. De `players` solo se escribe el apodo.
--
-- Es idempotente: lanzarla dos veces no duplica nada. Los identificadores
-- son fijos para que una prueba pueda nombrarlos (`e2e/ayudas/datos.ts`).
-- Si cambias uno aquí, cámbialo allí.
-- =====================================================================

begin;

do $$
declare
  v_club      constant uuid := 'e2e00000-0000-4000-8000-000000000001';
  v_temporada constant uuid := 'e2e00000-0000-4000-8000-000000000002';
  v_equipo    constant uuid := 'e2e00000-0000-4000-8000-000000000003';
  v_rival     constant uuid := 'e2e00000-0000-4000-8000-000000000004';
  v_liga      constant uuid := 'e2e00000-0000-4000-8000-000000000005';

  v_entrenador uuid;
  v_anotador   uuid;
  v_seguidor   uuid;
  v_miembro    uuid;
  v_jugador    uuid;
  v_numero     integer;
begin
  -- Las tres personas tienen que existir ya: las crea la preparación con
  -- `auth.admin.createUser`, y el disparador `handle_new_user` les da perfil.
  -- Aquí no se toca `auth.users`.
  select id into v_entrenador from auth.users where email = 'entrenador@e2e.test';
  select id into v_anotador   from auth.users where email = 'anotador@e2e.test';
  select id into v_seguidor   from auth.users where email = 'seguidor@e2e.test';

  if v_entrenador is null or v_anotador is null or v_seguidor is null then
    raise exception
      'Faltan personas de prueba: la preparación tiene que crearlas antes de sembrar.';
  end if;

  -- Club, con su campo de casa.
  insert into public.clubs (id, name, short_name, home_venue, home_venue_address, created_by)
       values (v_club, 'Club de pruebas', 'Pruebas', 'Campo de pruebas',
               'Calle de las Pruebas, 1', v_entrenador)
  on conflict (id) do nothing;

  -- Temporada en curso, que contiene siempre la fecha de hoy.
  insert into public.seasons (id, club_id, name, starts_on, ends_on, is_current, created_by)
       values (v_temporada, v_club, 'Temporada de pruebas',
               current_date - 60, current_date + 300, true, v_entrenador)
  on conflict (id) do nothing;

  -- Equipo gestionado y en la lista de equipos, y rival de referencia.
  insert into public.teams (id, club_id, name, category, kind, primary_color,
                            accepts_requests, created_by)
       values (v_equipo, v_club, 'Equipo de pruebas', 'Cadete', 'managed', '#0F2E6B',
               true, v_entrenador),
              (v_rival, v_club, 'Rival de pruebas', null, 'reference', null,
               false, v_entrenador)
  on conflict (id) do nothing;

  -- Competición con el reglamento del cadete: los valores de
  -- `REGLAMENTO_CADETE`, de `src/modules/rules/model/competicion.ts`. Los
  -- tipos de evento se quedan con el valor por defecto de la columna, que son
  -- los once del MVP.
  insert into public.competitions (id, club_id, season_id, name, kind,
                                   periods_count, period_minutes, halftime_minutes,
                                   clock_mode, substitution_type, substitutions_max,
                                   squad_max, players_on_pitch,
                                   yellow_cards_for_ban, red_card_default_bans, created_by)
       values (v_liga, v_club, v_temporada, 'Liga de pruebas', 'league',
               2, 40, 15, 'running', 'fixed', 7, 18, 11, 5, 1, v_entrenador)
  on conflict (id) do nothing;

  -- Plantilla: catorce jugadores, con dorsal y posición. El 1 es el portero.
  for v_numero in 1..14 loop
    v_jugador := ('e2e00000-0000-4000-8000-0000000001' || lpad(v_numero::text, 2, '0'))::uuid;

    insert into public.players (id, club_id, nickname, created_by)
         values (v_jugador, v_club, 'Jugador ' || v_numero, v_entrenador)
    on conflict (id) do nothing;

    insert into public.squad_memberships (team_id, season_id, player_id, shirt_number,
                                          default_position, created_by)
         values (v_equipo, v_temporada, v_jugador, v_numero,
                 case
                   when v_numero = 1 then 'GK'
                   when v_numero <= 5 then 'DF'
                   when v_numero <= 10 then 'MF'
                   else 'FW'
                 end::public.position_code,
                 v_entrenador)
    on conflict (team_id, season_id, player_id) do nothing;
  end loop;

  -- El entrenador, con los doce permisos, leídos del propio enumerado.
  insert into public.team_members (team_id, user_id, role, is_active)
       values (v_equipo, v_entrenador, 'coach', true)
  on conflict (team_id, user_id) do update set is_active = true
    returning id into v_miembro;

  insert into public.team_member_permissions (team_member_id, permission, granted_by)
  select v_miembro, permiso, v_entrenador
    from unnest(enum_range(null::public.app_permission)) as permiso
      on conflict (team_member_id, permission) do nothing;

  -- El anotador: solo apunta en el directo y ve las estadísticas.
  insert into public.team_members (team_id, user_id, role, is_active, invited_by)
       values (v_equipo, v_anotador, 'scout', true, v_entrenador)
  on conflict (team_id, user_id) do update set is_active = true
    returning id into v_miembro;

  insert into public.team_member_permissions (team_member_id, permission, granted_by)
  select v_miembro, permiso, v_entrenador
    from unnest(array['match.live.write', 'stats.view']::public.app_permission[]) as permiso
      on conflict (team_member_id, permission) do nothing;

  -- El seguidor: sin fila de miembro, sin rol y sin permisos.
  insert into public.team_followers (team_id, user_id)
       values (v_equipo, v_seguidor)
  on conflict do nothing;

  raise notice 'Siembra de pruebas lista.';
end;
$$;

commit;
