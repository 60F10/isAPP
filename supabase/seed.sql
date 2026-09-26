-- Siembra mínima de GavetaStats — T-105, 20/09/2026.
--
-- ESTO NO ES UNA MIGRACIÓN y no entra en supabase/migrations: son datos, no
-- esquema. Vive en el repositorio para que la siembra quede en Git y se pueda
-- repetir sobre un proyecto nuevo, que es justo lo que necesita la prueba de
-- restauración del DOC 10 §5.1.
--
-- SE EJECUTA A MANO Y CON PERMISOS DE SERVICIO: el editor SQL del panel de
-- Supabase o `psql`. Nunca desde el navegador con la anon key, porque la RLS
-- no deja crear un equipo a quien todavía no es miembro de ninguno. Ese ciclo
-- —para crear el equipo hace falta `team.manage`, y para tener `team.manage`
-- hace falta el equipo— es lo que esta siembra rompe mientras no existan la
-- pantalla de alta (T-201) ni las invitaciones (T-301).
--
-- Es idempotente: lanzarla dos veces no duplica nada.

begin;

do $$
declare
  -- La única línea que hay que tocar para sembrar otro entorno u otra cuenta.
  v_correo constant text := 'raulpjk97@gmail.com';

  v_user_id   uuid;
  v_club_id   uuid;
  v_season_id uuid;
  v_team_id   uuid;
  v_member_id uuid;
begin
  -- El usuario tiene que existir ya. Lo crea el disparador `handle_new_user`
  -- la primera vez que alguien entra con Google (DOC 05 §5.1); aquí no se
  -- inventa ninguna cuenta ni se toca `auth.users`.
  select id into v_user_id from auth.users where email = v_correo;

  if v_user_id is null then
    raise exception
      'No hay ningún usuario con el correo %. Entra una vez con Google y vuelve a lanzar la siembra.',
      v_correo;
  end if;

  -- Club.
  select id into v_club_id from public.clubs where name = 'Club Deportivo Unión Tejina';

  if v_club_id is null then
    insert into public.clubs (name, short_name, created_by)
         values ('Club Deportivo Unión Tejina', 'U. Tejina', v_user_id)
      returning id into v_club_id;
  end if;

  -- Campo de casa (DOC 05 §14.4), dato de Raúl del 26/09/2026. Solo si falta:
  -- lo que se haya corregido desde la A03 no se pisa.
  update public.clubs
     set home_venue = 'Campo de Fútbol Izquierdo Rodríguez',
         home_venue_address = 'Av. Milán, 27-29, 38260 La Laguna, Santa Cruz de Tenerife'
   where id = v_club_id
     and home_venue is null;

  -- Temporada en curso. Un índice parcial garantiza que solo haya una por
  -- club (DOC 05 §5.3), así que `is_current` aquí es la única verdadera.
  select id into v_season_id
    from public.seasons
   where club_id = v_club_id and name = '2026/27';

  if v_season_id is null then
    insert into public.seasons (club_id, name, starts_on, ends_on, is_current, created_by)
         values (v_club_id, '2026/27', date '2026-09-01', date '2027-06-30', true, v_user_id)
      returning id into v_season_id;
  end if;

  -- Equipo gestionado, el de Isaac. El color sale de la equipación del club
  -- —azul marina y blanco—, y lo consume la variable CSS `--color-team`
  -- (DOC 06 §9.3). El hexadecimal es una aproximación: el club no publica
  -- ninguno, así que se cambia en cuanto haya el bueno.
  select id into v_team_id
    from public.teams
   where club_id = v_club_id and name = 'Cadete A';

  if v_team_id is null then
    insert into public.teams (club_id, name, category, kind, primary_color, created_by)
         values (v_club_id, 'Cadete A', 'Cadete', 'managed', '#0F2E6B', v_user_id)
      returning id into v_team_id;
  end if;

  -- Miembro del equipo. `coach` es la etiqueta; quien manda de verdad son los
  -- permisos, que son filas (decisión C4).
  select id into v_member_id
    from public.team_members
   where team_id = v_team_id and user_id = v_user_id;

  if v_member_id is null then
    insert into public.team_members (team_id, user_id, role, is_active)
         values (v_team_id, v_user_id, 'coach', true)
      returning id into v_member_id;
  else
    update public.team_members set is_active = true where id = v_member_id;
  end if;

  -- Los doce permisos del DOC 05 §4, leídos del propio enumerado en vez de
  -- escritos a mano: el día que se añada uno nuevo, esta siembra lo da sin
  -- que nadie se acuerde de venir a tocarla.
  insert into public.team_member_permissions (team_member_id, permission, granted_by)
  select v_member_id, permiso, v_user_id
    from unnest(enum_range(null::public.app_permission)) as permiso
      on conflict (team_member_id, permission) do nothing;

  raise notice 'Siembra lista. Club %, temporada %, equipo %, miembro %.',
    v_club_id, v_season_id, v_team_id, v_member_id;
end;
$$;

commit;

-- Comprobación, para lanzar después y ver lo que quedó:
--
--   select t.name as equipo, s.name as temporada, tm.role,
--          count(tmp.permission) as permisos
--     from public.team_members tm
--     join public.teams t on t.id = tm.team_id
--     join public.seasons s on s.club_id = t.club_id and s.is_current
--     left join public.team_member_permissions tmp on tmp.team_member_id = tm.id
--    group by t.name, s.name, tm.role;
