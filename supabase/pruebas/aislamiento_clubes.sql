-- =============================================================================
-- T-105b · Prueba de aislamiento entre clubes (DOC 05 §12.5)
-- -----------------------------------------------------------------------------
-- Qué hace:
--   1. Siembra dos clubes sintéticos completos (club, temporada, competición,
--      equipo, rival, miembro con los doce permisos, seguidor, invitación,
--      jugador, inscripción, partido, periodo, convocatoria, evento, tramo,
--      cobertura, sanción, entrenamiento y asistencia), cada uno con su usuario.
--   2. Se hace pasar por cada usuario a través de la RLS (rol authenticated y
--      su sub en request.jwt.claims) y comprueba que no lee, no escribe y no
--      llama a ninguna función sobre el otro club, ni sobre el club real.
--   3. Termina SIEMPRE con un error que lleva el informe. El error deshace la
--      transacción entera: no queda ni un usuario ni una fila sembrada.
--
-- Cómo se usa: pegar entero en el SQL Editor de Supabase y ejecutar.
--   · «T-105b SUPERADA ...»  → el aislamiento aguanta.
--   · «T-105b FALLIDA ...»   → el informe dice qué comprobación falla.
--   · Cualquier otro error   → la siembra ya no encaja con el esquema.
--
-- Repetirla después de cada migración que toque políticas o funciones.
-- Los usuarios sintéticos no son administradores de plataforma: un
-- administrador lee todos los clubes por diseño (can_read_team).
-- =============================================================================

do $$
declare
  c        jsonb[] := array['{}'::jsonb, '{}'::jsonb];
  v_uid    uuid;  v_fid   uuid;  v_club  uuid;  v_season uuid;  v_comp uuid;
  v_team   uuid;  v_rival uuid;  v_tm    uuid;  v_inv    uuid;  v_player uuid;
  v_squad  uuid;  v_match uuid;  v_per   uuid;  v_msq    uuid;  v_event uuid;
  v_stint  uuid;  v_cov   uuid;  v_sanc  uuid;  v_train  uuid;  v_att   uuid;
  v_real_club uuid;  v_real_team uuid;

  me int;  ot int;  t jsonb;  o jsonb;
  chk  jsonb;  n bigint;  res text;  v_ret text;
  fails text[] := '{}';  warns text[] := '{}';  total int := 0;
begin
  -- Club real (Unión Tejina). El usuario sintético tampoco debe verlo.
  -- Se lee antes de sembrar, así que solo existen los clubes reales.
  select id into v_real_club from public.clubs order by created_at limit 1;
  select id into v_real_team from public.teams where club_id = v_real_club limit 1;

  -- ------------------------------------------------------------------ siembra
  for i in 1..2 loop
    v_uid := gen_random_uuid();
    v_fid := gen_random_uuid();

    insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
    values
      (v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       format('t105b-miembro-%s@example.invalid', i), jsonb_build_object('full_name', 'T105b miembro ' || i), now(), now()),
      (v_fid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       format('t105b-seguidor-%s@example.invalid', i), jsonb_build_object('full_name', 'T105b seguidor ' || i), now(), now());

    insert into public.clubs (name, short_name, created_by)
    values ('T105b club ' || i, 'T105b' || i, v_uid) returning id into v_club;

    insert into public.seasons (club_id, name, starts_on, ends_on, is_current)
    values (v_club, '2026/27', '2026-08-01', '2027-06-30', true) returning id into v_season;

    insert into public.competitions (club_id, season_id, name)
    values (v_club, v_season, 'Liga T105b') returning id into v_comp;

    insert into public.teams (club_id, name, category, kind)
    values (v_club, 'Cadete T105b', 'Cadete', 'managed') returning id into v_team;

    insert into public.teams (club_id, name, kind)
    values (v_club, 'Rival T105b', 'reference') returning id into v_rival;

    insert into public.team_members (team_id, user_id, role)
    values (v_team, v_uid, 'coach') returning id into v_tm;

    insert into public.team_member_permissions (team_member_id, permission)
    select v_tm, p from unnest(enum_range(null::public.app_permission)) as p;

    insert into public.team_followers (team_id, user_id) values (v_team, v_fid);

    insert into public.invitations (team_id, email, token)
    values (v_team, format('invitado-%s@example.invalid', i), md5(random()::text)) returning id into v_inv;

    insert into public.players (club_id, nickname)
    values (v_club, 'Pibe' || i) returning id into v_player;

    insert into public.squad_memberships (team_id, season_id, player_id, shirt_number)
    values (v_team, v_season, v_player, 10) returning id into v_squad;

    insert into public.matches (club_id, season_id, competition_id, team_id, opponent_team_id, kickoff_at, status)
    values (v_club, v_season, v_comp, v_team, v_rival, now(), 'live') returning id into v_match;

    insert into public.match_periods (match_id, period_number, planned_seconds)
    values (v_match, 1, 2400) returning id into v_per;

    insert into public.match_squad (match_id, player_id, call_status)
    values (v_match, v_player, 'starter') returning id into v_msq;

    insert into public.match_events (client_event_id, match_id, event_type, period, seconds, player_id, created_by)
    values (gen_random_uuid(), v_match, 'goal', 1, 600, v_player, v_uid) returning id into v_event;

    insert into public.player_match_stints (match_id, player_id, period, start_seconds, end_seconds, start_reason, end_reason)
    values (v_match, v_player, 1, 0, 2400, 'period_start', 'period_end') returning id into v_stint;

    insert into public.coverage_declarations (match_id, user_id, covered_event_types, start_period, start_seconds)
    values (v_match, v_uid, '{goal}', 1, 0) returning id into v_cov;

    insert into public.sanctions (club_id, player_id, season_id, type, matches_total)
    values (v_club, v_player, v_season, 'red_card', 1) returning id into v_sanc;

    insert into public.training_sessions (team_id, season_id, scheduled_at)
    values (v_team, v_season, now()) returning id into v_train;

    insert into public.training_attendance (session_id, player_id)
    values (v_train, v_player) returning id into v_att;

    c[i] := jsonb_build_object(
      'uid', v_uid, 'fid', v_fid, 'club', v_club, 'season', v_season, 'comp', v_comp,
      'team', v_team, 'rival', v_rival, 'tm', v_tm, 'inv', v_inv, 'player', v_player,
      'squad', v_squad, 'match', v_match, 'per', v_per, 'msq', v_msq, 'event', v_event,
      'stint', v_stint, 'cov', v_cov, 'sanc', v_sanc, 'train', v_train, 'att', v_att);
  end loop;

  -- -------------------------------------------------------------- comprobaciones
  for me in 1..2 loop
    ot := 3 - me;
    o  := c[me];   -- lo propio
    t  := c[ot];   -- lo ajeno

    perform set_config('request.jwt.claims',
      json_build_object('sub', o->>'uid', 'role', 'authenticated')::text, true);
    set local role authenticated;

    -- 1 · Lecturas: lo ajeno tiene que dar 0 filas; lo propio, más de 0
    for chk in select * from jsonb_array_elements(jsonb_build_array(
      jsonb_build_array('clubs',                   'id = %L',             'club'),
      jsonb_build_array('seasons',                 'id = %L',             'season'),
      jsonb_build_array('competitions',            'id = %L',             'comp'),
      jsonb_build_array('teams',                   'id = %L',             'team'),
      jsonb_build_array('teams',                   'id = %L',             'rival'),
      jsonb_build_array('team_members',            'id = %L',             'tm'),
      jsonb_build_array('team_member_permissions', 'team_member_id = %L', 'tm'),
      jsonb_build_array('team_followers',          'team_id = %L',        'team'),
      jsonb_build_array('invitations',             'id = %L',             'inv'),
      jsonb_build_array('players',                 'id = %L',             'player'),
      jsonb_build_array('squad_memberships',       'id = %L',             'squad'),
      jsonb_build_array('matches',                 'id = %L',             'match'),
      jsonb_build_array('match_periods',           'id = %L',             'per'),
      jsonb_build_array('match_squad',             'id = %L',             'msq'),
      jsonb_build_array('match_events',            'id = %L',             'event'),
      jsonb_build_array('player_match_stints',     'id = %L',             'stint'),
      jsonb_build_array('coverage_declarations',   'id = %L',             'cov'),
      jsonb_build_array('sanctions',               'id = %L',             'sanc'),
      jsonb_build_array('training_sessions',       'id = %L',             'train'),
      jsonb_build_array('training_attendance',     'id = %L',             'att'),
      jsonb_build_array('profiles',                'id = %L',             'uid'),
      jsonb_build_array('profiles',                'id = %L',             'fid'),
      jsonb_build_array('audit_log',               'club_id = %L',        'club')))
    loop
      total := total + 1;
      execute format('select count(*) from public.%I where ' || (chk->>1), chk->>0, t->>(chk->>2)) into n;
      if n <> 0 then
        fails := fails || format('U%s LEE %s.%s del club %s (%s filas)', me, chk->>0, chk->>2, ot, n);
      end if;

      -- Control positivo: si lo propio tampoco se ve, la consulta no prueba nada
      if chk->>2 not in ('fid') then
        execute format('select count(*) from public.%I where ' || (chk->>1), chk->>0, o->>(chk->>2)) into n;
        if n = 0 then
          warns := warns || format('U%s no ve su propio %s.%s', me, chk->>0, chk->>2);
        end if;
      end if;
    end loop;

    -- Club real: nada de Unión Tejina
    if v_real_club is not null then
      total := total + 4;
      select count(*) into n from public.clubs         where id = v_real_club;      if n <> 0 then fails := fails || format('U%s LEE el club real', me); end if;
      select count(*) into n from public.teams         where club_id = v_real_club; if n <> 0 then fails := fails || format('U%s LEE equipos del club real', me); end if;
      select count(*) into n from public.seasons       where club_id = v_real_club; if n <> 0 then fails := fails || format('U%s LEE temporadas del club real', me); end if;
      select count(*) into n from public.team_members  where team_id = v_real_team; if n <> 0 then fails := fails || format('U%s LEE miembros del club real', me); end if;
    end if;

    -- 2 · Escrituras sobre lo ajeno: 0 filas o error, nunca una fila tocada
    for chk in select * from jsonb_array_elements(jsonb_build_array(
      format('update public.clubs set name = name where id = %L', t->>'club'),
      format('update public.teams set name = name where id = %L', t->>'team'),
      format('delete from public.teams where id = %L', t->>'rival'),
      format('insert into public.teams (club_id, name) values (%L, %L)', t->>'club', 'Intruso'),
      format('insert into public.seasons (club_id, name, starts_on, ends_on) values (%L, %L, %L, %L)', t->>'club', 'Intrusa', '2030-01-01', '2030-06-30'),
      format('update public.seasons set name = name where id = %L', t->>'season'),
      format('insert into public.competitions (club_id, season_id, name) values (%L, %L, %L)', t->>'club', t->>'season', 'Intrusa'),
      format('update public.competitions set name = name where id = %L', t->>'comp'),
      format('insert into public.team_members (team_id, user_id, role) values (%L, %L, %L)', t->>'team', o->>'uid', 'coach'),
      format('update public.team_members set is_active = false where id = %L', t->>'tm'),
      format('insert into public.team_member_permissions (team_member_id, permission) values (%L, %L)', o->>'tm', 'team.manage'),
      format('delete from public.team_member_permissions where team_member_id = %L', t->>'tm'),
      format('insert into public.team_followers (team_id, user_id) values (%L, %L)', t->>'team', o->>'uid'),
      format('delete from public.team_followers where team_id = %L', t->>'team'),
      format('insert into public.invitations (team_id, email, token) values (%L, %L, %L)', t->>'team', 'intruso@example.invalid', 'tok-intruso'),
      format('update public.invitations set status = %L where id = %L', 'accepted', t->>'inv'),
      format('insert into public.players (club_id, nickname) values (%L, %L)', t->>'club', 'Intruso'),
      format('update public.players set nickname = nickname where id = %L', t->>'player'),
      format('delete from public.players where id = %L', t->>'player'),
      format('update public.squad_memberships set shirt_number = shirt_number where id = %L', t->>'squad'),
      format('insert into public.matches (club_id, season_id, competition_id, team_id, opponent_team_id, kickoff_at) values (%L, %L, %L, %L, %L, now())', t->>'club', t->>'season', t->>'comp', t->>'team', t->>'rival'),
      format('update public.matches set notes = %L where id = %L', 'intruso', t->>'match'),
      format('update public.matches set status = %L where id = %L', 'closed', t->>'match'),
      format('delete from public.matches where id = %L', t->>'match'),
      format('insert into public.match_periods (match_id, period_number, planned_seconds) values (%L, 2, 2400)', t->>'match'),
      format('update public.match_periods set actual_seconds = 1 where id = %L', t->>'per'),
      format('insert into public.match_squad (match_id, player_id) values (%L, %L)', t->>'match', o->>'player'),
      format('update public.match_squad set call_status = %L where id = %L', 'not_called', t->>'msq'),
      format('insert into public.match_events (client_event_id, match_id, event_type, period, seconds, is_opponent, created_by) values (gen_random_uuid(), %L, %L, 1, 10, true, %L)', t->>'match', 'corner', o->>'uid'),
      format('update public.match_events set status = %L where id = %L', 'approved', t->>'event'),
      format('delete from public.match_events where id = %L', t->>'event'),
      format('insert into public.coverage_declarations (match_id, user_id, covered_event_types, start_period, start_seconds) values (%L, %L, %L, 1, 0)', t->>'match', o->>'uid', '{goal}'),
      format('update public.coverage_declarations set start_seconds = 0 where id = %L', t->>'cov'),
      format('insert into public.sanctions (club_id, player_id, season_id, type, matches_total) values (%L, %L, %L, %L, 1)', t->>'club', t->>'player', t->>'season', 'red_card'),
      format('update public.sanctions set notes = %L where id = %L', 'intruso', t->>'sanc'),
      format('insert into public.training_sessions (team_id, season_id, scheduled_at) values (%L, %L, now())', t->>'team', t->>'season'),
      format('delete from public.training_sessions where id = %L', t->>'train'),
      format('insert into public.training_attendance (session_id, player_id) values (%L, %L)', t->>'train', o->>'player'),
      format('update public.profiles set display_name = %L where id = %L', 'Intruso', t->>'uid')))
    loop
      total := total + 1;
      begin
        execute chk #>> '{}';
        get diagnostics n = row_count;
        raise exception using errcode = 'P0T05', message = '__deshacer__';
      exception
        when sqlstate 'P0T05' then res := 'filas=' || n;
        when others           then res := 'error ' || sqlstate; n := 0;
      end;
      if n <> 0 then
        fails := fails || format('U%s ESCRIBE en el club %s (%s): %s', me, ot, res, left(chk #>> '{}', 90));
      end if;
    end loop;

    -- 3 · Funciones expuestas por RPC, llamadas sobre lo ajeno
    total := total + 1;
    select count(*) into n from unnest(enum_range(null::public.app_permission)) p
     where public.has_team_permission((t->>'team')::uuid, p);
    if n <> 0 then fails := fails || format('U%s tiene %s permisos en el equipo del club %s', me, n, ot); end if;

    total := total + 6;
    if public.can_read_team((t->>'team')::uuid)                               then fails := fails || format('U%s can_read_team ajeno = true', me); end if;
    if public.can_read_club((t->>'club')::uuid)                               then fails := fails || format('U%s can_read_club ajeno = true', me); end if;
    if public.is_club_member((t->>'club')::uuid)                              then fails := fails || format('U%s is_club_member ajeno = true', me); end if;
    if public.is_team_member((t->>'team')::uuid)                              then fails := fails || format('U%s is_team_member ajeno = true', me); end if;
    if public.is_team_follower((t->>'team')::uuid)                            then fails := fails || format('U%s is_team_follower ajeno = true', me); end if;
    if public.has_club_permission((t->>'club')::uuid, 'team.manage')          then fails := fails || format('U%s has_club_permission ajeno = true', me); end if;

    total := total + 1;
    if public.team_of_match((t->>'match')::uuid) is not null then
      warns := warns || format('U%s: team_of_match() devuelve el equipo de un partido ajeno', me);
    end if;

    total := total + 1;
    if public.metric_reliability((t->>'match')::uuid, 'goal', null) <> 0 then
      fails := fails || format('U%s: metric_reliability() calcula sobre un partido ajeno', me);
    end if;

    foreach res in array array['rebuild_match_stints', 'flag_duplicate_candidates'] loop
      total := total + 1;
      begin
        execute format('select public.%I(%L)::text', res, t->>'match') into v_ret;
        raise exception using errcode = 'P0T05', message = '__deshacer__';
      exception
        when sqlstate 'P0T05' then
          fails := fails || format('U%s ejecuta %s() sobre un partido del club %s y devuelve %s', me, res, ot, v_ret);
        when others then null;
      end;
    end loop;

    -- 4 · Referencias cruzadas: filas propias que apuntan a objetos ajenos
    for chk in select * from jsonb_array_elements(jsonb_build_array(
      format('insert into public.squad_memberships (team_id, season_id, player_id) values (%L, %L, %L)', o->>'team', o->>'season', t->>'player'),
      format('insert into public.match_squad (match_id, player_id) values (%L, %L)', o->>'match', t->>'player'),
      format('insert into public.matches (club_id, season_id, competition_id, team_id, opponent_team_id, kickoff_at) values (%L, %L, %L, %L, %L, now())', o->>'club', o->>'season', o->>'comp', o->>'team', t->>'rival'),
      format('insert into public.matches (club_id, season_id, competition_id, team_id, opponent_team_id, kickoff_at) values (%L, %L, %L, %L, %L, now())', o->>'club', t->>'season', t->>'comp', o->>'team', o->>'rival'),
      format('insert into public.sanctions (club_id, player_id, season_id, type, matches_total) values (%L, %L, %L, %L, 1)', o->>'club', t->>'player', o->>'season', 'red_card'),
      format('insert into public.training_attendance (session_id, player_id) values (%L, %L)', o->>'train', t->>'player')))
    loop
      total := total + 1;
      begin
        execute chk #>> '{}';
        raise exception using errcode = 'P0T05', message = '__deshacer__';
      exception
        when sqlstate 'P0T05' then
          warns := warns || format('U%s enlaza lo suyo con lo del club %s: %s', me, ot, left(chk #>> '{}', 110));
        when others then null;
      end;
    end loop;

    reset role;
  end loop;

  -- ----------------------------------------------------------------- informe
  raise exception using
    errcode = 'P0T5B',
    message = format('T-105b %s · %s comprobaciones · %s fallos · %s avisos',
                     case when cardinality(fails) = 0 then 'SUPERADA' else 'FALLIDA' end,
                     total, cardinality(fails), cardinality(warns))
           || ' ##### FALLOS: '  || coalesce(nullif(array_to_string(fails, ' || '), ''), 'ninguno')
           || ' ##### AVISOS: ' || coalesce(nullif(array_to_string(warns, ' || '), ''), 'ninguno');
end;
$$;
