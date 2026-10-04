-- =========================================================================
-- ENSAYO de la migración de personas (DOC 05 §14.8, T-301a).
--
-- Es la migración de `supabase/pendientes/personas_y_solicitudes.sql` más 17
-- comprobaciones, todo dentro de un solo bloque que TERMINA EN ERROR A
-- PROPÓSITO. Al fallar, PostgreSQL deshace el bloque entero: no queda ni la
-- tabla, ni las funciones, ni el usuario de prueba.
--
--   · Si acaba en «ENSAYO_CORRECTO: 17 pruebas, nada aplicado», la migración
--     se puede aplicar.
--   · Si acaba en «Tn falla» o «Tn no falló», esa comprobación no pasa: no se
--     aplica nada y se arregla primero.
--   · Cualquier otro error es de sintaxis o de esquema: igual, se arregla.
--
-- Si cambias la migración, cambia aquí lo mismo.
-- =========================================================================

do $ensayo$
declare
  v_team uuid; v_coach uuid; v_b uuid := gen_random_uuid(); v_inv uuid; v_req uuid; v_n integer;
begin
-- =========================================================================
-- DOC 05 §14.8 · Personas: invitaciones por correo y solicitudes de acceso
-- T-301a. Decisión de Raúl del 04/10/2026 (DOC 03, H5).
--
-- Dos puertas para entrar en un equipo, y las dos pasan por quien tiene
-- members.manage:
--   · INVITACIÓN: quien lleva el equipo apunta un correo. Esa cuenta, al
--     entrar con Google, ve la invitación y la acepta. No se envía ningún
--     correo: la invitación se casa con el correo de la cuenta.
--   · SOLICITUD: quien no tiene equipo ve los equipos que admiten solicitudes,
--     pide seguirlo o pide permisos, y quien lleva el equipo acepta o rechaza.
--
-- Nadie entra solo: seguir a un equipo de menores también se aprueba.
-- Todas las escrituras van por funciones SECURITY DEFINER; las tablas no
-- ganan ninguna política de escritura para quien pide.
-- =========================================================================

-- 1. Cada equipo decide si sale en la lista. Por defecto, no.
alter table public.teams
  add column accepts_requests boolean not null default false;

-- 2. Invitaciones: el token se genera solo, el correo va normalizado, quien
--    invita es quien tiene la sesión y no hay dos pendientes al mismo correo.
alter table public.invitations
  alter column token set default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

create or replace function public.invitations_normalizar()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  new.email := lower(btrim(new.email));

  if tg_op = 'INSERT' and auth.uid() is not null then
    new.created_by := auth.uid();
  end if;

  return new;
end;
$$;

revoke execute on function public.invitations_normalizar() from public, anon, authenticated;

create trigger invitations_a_normalizar
  before insert or update on public.invitations
  for each row execute function public.invitations_normalizar();

alter table public.invitations
  add constraint invitations_email_normalizado check (email = lower(btrim(email)) and email <> '');

create unique index invitations_una_pendiente
  on public.invitations (team_id, email) where status = 'pending';

create index invitations_email_pendiente
  on public.invitations (email) where status = 'pending';

-- 3. Solicitudes de acceso.
create type public.access_request_kind as enum ('follower', 'member');
create type public.access_request_status as enum ('pending', 'approved', 'rejected', 'cancelled');

create table public.access_requests (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  kind        public.access_request_kind not null default 'follower',
  message     text,
  status      public.access_request_status not null default 'pending',
  decided_by  uuid references public.profiles(id),
  decided_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint access_requests_message check (message is null or char_length(message) between 1 and 280),
  constraint access_requests_decided check ((status = 'pending') = (decided_at is null))
);

create unique index access_requests_una_pendiente
  on public.access_requests (team_id, user_id) where status = 'pending';
create index access_requests_team_status on public.access_requests (team_id, status);
create index access_requests_user on public.access_requests (user_id);
create index access_requests_decided_by on public.access_requests (decided_by);

alter table public.access_requests enable row level security;

-- Solo lectura por política: la propia, o las del equipo con members.manage.
create policy access_requests_select on public.access_requests
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.has_team_permission(team_id, 'members.manage')
    or public.is_platform_admin()
  );

revoke insert, update, delete, truncate on public.access_requests from anon, authenticated;

create trigger access_requests_set_updated_at
  before update on public.access_requests
  for each row execute function public.set_updated_at();

create trigger access_requests_audit
  after insert or update or delete on public.access_requests
  for each row execute function public.audit_row();

-- 4. El correo de la cuenta, como lo tiene Supabase Auth. Solo para las
--    funciones de abajo: nadie la llama desde fuera.
create or replace function public.correo_actual()
returns text language sql stable security definer set search_path = public
as $$
  select lower(btrim(u.email)) from auth.users u where u.id = auth.uid();
$$;

revoke execute on function public.correo_actual() from public, anon, authenticated;

-- 5. Invitaciones: verlas y aceptarlas.
create or replace function public.mis_invitaciones()
returns table (
  id uuid, team_id uuid, team_name text, club_name text,
  role public.team_role, as_follower boolean, invited_by_name text, expires_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  select i.id, i.team_id, t.name, c.name, i.role, i.as_follower, p.display_name, i.expires_at
    from invitations i
    join teams t on t.id = i.team_id
    join clubs c on c.id = t.club_id
    left join profiles p on p.id = i.created_by
   where i.status = 'pending'
     and i.expires_at > now()
     and i.email = public.correo_actual()
   order by i.created_at;
$$;

revoke execute on function public.mis_invitaciones() from public, anon;
grant execute on function public.mis_invitaciones() to authenticated;

create or replace function public.aceptar_invitacion(p_invitation_id uuid)
returns uuid language plpgsql security definer set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_inv    invitations%rowtype;
  v_member uuid;
begin
  if v_uid is null then
    raise exception insufficient_privilege using message = 'Aceptar una invitación exige sesión';
  end if;

  select * into v_inv from invitations where id = p_invitation_id for update;

  if not found or v_inv.email is distinct from public.correo_actual() then
    raise exception no_data_found using message = 'No hay ninguna invitación así para esta cuenta';
  end if;

  if v_inv.status <> 'pending' or v_inv.expires_at <= now() then
    raise exception check_violation using message = 'La invitación ya no está vigente';
  end if;

  if v_inv.as_follower then
    -- Quien ya es miembro no baja a seguidor: manda la de miembro (DOC 04 §15.3).
    if not exists (
      select 1 from team_members
       where team_id = v_inv.team_id and user_id = v_uid and is_active
    ) then
      insert into team_followers (team_id, user_id, granted_by)
      values (v_inv.team_id, v_uid, v_inv.created_by)
      on conflict (team_id, user_id) do nothing;
    end if;
  else
    insert into team_members (team_id, user_id, role, is_active, invited_by)
    values (v_inv.team_id, v_uid, v_inv.role, true, v_inv.created_by)
    on conflict (team_id, user_id) do update set role = excluded.role, is_active = true
    returning id into v_member;

    insert into team_member_permissions (team_member_id, permission, granted_by)
    select v_member, p, v_inv.created_by from unnest(v_inv.permissions) as p
    on conflict (team_member_id, permission) do nothing;

    delete from team_followers where team_id = v_inv.team_id and user_id = v_uid;
  end if;

  update invitations set status = 'accepted' where id = v_inv.id;

  return v_inv.team_id;
end;
$$;

revoke execute on function public.aceptar_invitacion(uuid) from public, anon;
grant execute on function public.aceptar_invitacion(uuid) to authenticated;

-- 6. Solicitudes: los equipos que las admiten, pedir, cancelar, ver y resolver.
create or replace function public.equipos_que_admiten_solicitudes()
returns table (team_id uuid, team_name text, category text, club_name text)
language sql stable security definer set search_path = public
as $$
  select t.id, t.name, t.category, c.name
    from teams t
    join clubs c on c.id = t.club_id
   where auth.uid() is not null
     and t.kind = 'managed'
     and t.accepts_requests
   order by c.name, t.name;
$$;

revoke execute on function public.equipos_que_admiten_solicitudes() from public, anon;
grant execute on function public.equipos_que_admiten_solicitudes() to authenticated;

create or replace function public.solicitar_acceso(
  p_team_id uuid,
  p_kind public.access_request_kind,
  p_message text default null
)
returns uuid language plpgsql security definer set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_message text := nullif(btrim(coalesce(p_message, '')), '');
  v_id      uuid;
begin
  if v_uid is null then
    raise exception insufficient_privilege using message = 'Pedir acceso exige sesión';
  end if;

  if not exists (
    select 1 from teams where id = p_team_id and kind = 'managed' and accepts_requests
  ) then
    raise exception no_data_found using message = 'Ese equipo no admite solicitudes';
  end if;

  if exists (
    select 1 from team_members where team_id = p_team_id and user_id = v_uid and is_active
  ) then
    raise exception check_violation using message = 'Ya perteneces a ese equipo';
  end if;

  if p_kind = 'follower' and exists (
    select 1 from team_followers where team_id = p_team_id and user_id = v_uid
  ) then
    raise exception check_violation using message = 'Ya sigues a ese equipo';
  end if;

  if exists (
    select 1 from access_requests
     where team_id = p_team_id and user_id = v_uid and status = 'pending'
  ) then
    raise exception unique_violation using message = 'Ya tienes una solicitud pendiente en ese equipo';
  end if;

  -- Freno a la insistencia: tras un rechazo, una semana sin volver a pedir.
  if exists (
    select 1 from access_requests
     where team_id = p_team_id and user_id = v_uid
       and status = 'rejected' and decided_at > now() - interval '7 days'
  ) then
    raise exception check_violation
      using message = 'Ese equipo rechazó tu solicitud hace poco. Podrás volver a pedirlo en unos días';
  end if;

  insert into access_requests (team_id, user_id, kind, message)
  values (p_team_id, v_uid, p_kind, v_message)
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.solicitar_acceso(uuid, public.access_request_kind, text) from public, anon;
grant execute on function public.solicitar_acceso(uuid, public.access_request_kind, text) to authenticated;

create or replace function public.cancelar_solicitud(p_request_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  update access_requests
     set status = 'cancelled', decided_by = auth.uid(), decided_at = now()
   where id = p_request_id and user_id = auth.uid() and status = 'pending';

  if not found then
    raise exception no_data_found using message = 'No tienes ninguna solicitud pendiente así';
  end if;
end;
$$;

revoke execute on function public.cancelar_solicitud(uuid) from public, anon;
grant execute on function public.cancelar_solicitud(uuid) to authenticated;

-- Con el nombre de quien pide: su perfil no lo ve quien lleva el equipo por
-- la política de profiles, que solo enseña a los compañeros.
create or replace function public.solicitudes_del_equipo(p_team_id uuid)
returns table (
  id uuid, user_id uuid, display_name text,
  kind public.access_request_kind, message text, created_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  select r.id, r.user_id, p.display_name, r.kind, r.message, r.created_at
    from access_requests r
    join profiles p on p.id = r.user_id
   where r.team_id = p_team_id
     and r.status = 'pending'
     and public.has_team_permission(p_team_id, 'members.manage')
   order by r.created_at;
$$;

revoke execute on function public.solicitudes_del_equipo(uuid) from public, anon;
grant execute on function public.solicitudes_del_equipo(uuid) to authenticated;

create or replace function public.resolver_solicitud(
  p_request_id uuid,
  p_aprobar boolean,
  p_role public.team_role default 'spectator',
  p_permissions public.app_permission[] default '{}'
)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_req    access_requests%rowtype;
  v_member uuid;
begin
  select * into v_req from access_requests where id = p_request_id for update;

  if not found or not public.has_team_permission(v_req.team_id, 'members.manage') then
    raise exception insufficient_privilege
      using message = 'Resolver solicitudes exige members.manage en el equipo';
  end if;

  if v_req.status <> 'pending' then
    raise exception check_violation using message = 'La solicitud ya está resuelta';
  end if;

  if p_aprobar and v_req.kind = 'follower' then
    if not exists (
      select 1 from team_members
       where team_id = v_req.team_id and user_id = v_req.user_id and is_active
    ) then
      insert into team_followers (team_id, user_id, granted_by)
      values (v_req.team_id, v_req.user_id, v_uid)
      on conflict (team_id, user_id) do nothing;
    end if;
  elsif p_aprobar then
    insert into team_members (team_id, user_id, role, is_active, invited_by)
    values (v_req.team_id, v_req.user_id, p_role, true, v_uid)
    on conflict (team_id, user_id) do update set role = excluded.role, is_active = true
    returning id into v_member;

    insert into team_member_permissions (team_member_id, permission, granted_by)
    select v_member, p, v_uid from unnest(p_permissions) as p
    on conflict (team_member_id, permission) do nothing;

    delete from team_followers where team_id = v_req.team_id and user_id = v_req.user_id;
  end if;

  update access_requests
     set status = case when p_aprobar then 'approved' else 'rejected' end::public.access_request_status,
         decided_by = v_uid,
         decided_at = now()
   where id = v_req.id;
end;
$$;

revoke execute on function public.resolver_solicitud(uuid, boolean, public.team_role, public.app_permission[]) from public, anon;
grant execute on function public.resolver_solicitud(uuid, boolean, public.team_role, public.app_permission[]) to authenticated;

-- 7. Seguidores: verlos con nombre quien lleva el equipo, y dejar de seguir uno mismo.
create or replace function public.seguidores_del_equipo(p_team_id uuid)
returns table (user_id uuid, display_name text, created_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select f.user_id, p.display_name, f.created_at
    from team_followers f
    join profiles p on p.id = f.user_id
   where f.team_id = p_team_id
     and public.has_team_permission(p_team_id, 'members.manage')
   order by p.display_name;
$$;

revoke execute on function public.seguidores_del_equipo(uuid) from public, anon;
grant execute on function public.seguidores_del_equipo(uuid) to authenticated;

create or replace function public.dejar_de_seguir(p_team_id uuid)
returns void language sql security definer set search_path = public
as $$
  delete from team_followers where team_id = p_team_id and user_id = auth.uid();
$$;

revoke execute on function public.dejar_de_seguir(uuid) from public, anon;
grant execute on function public.dejar_de_seguir(uuid) to authenticated;

  -- ===================== PRUEBAS (todo se deshace al final) =====================
  select tm.team_id, tm.user_id into v_team, v_coach
    from team_members tm join team_member_permissions p on p.team_member_id = tm.id
   where p.permission = 'members.manage' and tm.is_active limit 1;

  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
  values (v_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'Prueba.T301@Example.com', '{"full_name":"Prueba T301"}', '{}', now(), now());

  -- T1: invitar normaliza el correo, pone quién invita y genera el token.
  perform set_config('request.jwt.claims', json_build_object('sub', v_coach, 'role', 'authenticated')::text, true);
  insert into invitations (team_id, email, role, permissions)
  values (v_team, '  Prueba.T301@Example.com ', 'delegate', array['match.live.write','stats.view']::app_permission[])
  returning id into v_inv;
  if not (select email = 'prueba.t301@example.com' and created_by = v_coach and length(token) = 64 from invitations where id = v_inv) then
    raise exception 'T1 falla';
  end if;

  -- T2: no hay dos pendientes al mismo correo.
  begin
    insert into invitations (team_id, email) values (v_team, 'prueba.t301@example.com');
    raise exception 'T2 no falló';
  exception when unique_violation then null;
  end;

  -- T3: quien invita no la ve como suya.
  if (select count(*) from mis_invitaciones()) <> 0 then raise exception 'T3 falla'; end if;

  -- T5: ni la puede aceptar.
  begin
    perform aceptar_invitacion(v_inv);
    raise exception 'T5 no falló';
  exception when no_data_found then null;
  end;

  -- T4: la cuenta invitada la ve.
  perform set_config('request.jwt.claims', json_build_object('sub', v_b, 'role', 'authenticated')::text, true);
  if (select count(*) from mis_invitaciones() where team_id = v_team and role = 'delegate' and invited_by_name is not null) <> 1 then
    raise exception 'T4 falla';
  end if;

  -- T6: al aceptar es miembro con sus dos permisos.
  perform aceptar_invitacion(v_inv);
  if not exists (select 1 from team_members where team_id = v_team and user_id = v_b and role = 'delegate' and is_active and invited_by = v_coach)
     or (select count(*) from team_member_permissions p join team_members tm on tm.id = p.team_member_id where tm.user_id = v_b) <> 2
     or (select status from invitations where id = v_inv) <> 'accepted' then
    raise exception 'T6 falla';
  end if;
  if not has_team_permission(v_team, 'match.live.write') or has_team_permission(v_team, 'members.manage') then
    raise exception 'T6b falla';
  end if;

  -- T7: no se acepta dos veces.
  begin
    perform aceptar_invitacion(v_inv);
    raise exception 'T7 no falló';
  exception when check_violation then null;
  end;

  -- T8: con el equipo cerrado a solicitudes, ni sale en la lista ni se puede pedir.
  delete from team_members where user_id = v_b;
  if (select count(*) from equipos_que_admiten_solicitudes()) <> 0 then raise exception 'T8 falla'; end if;
  begin
    perform solicitar_acceso(v_team, 'follower', null);
    raise exception 'T8b no falló';
  exception when no_data_found then null;
  end;

  -- T9: abierto, sale en la lista, se pide una vez y no dos.
  update teams set accepts_requests = true where id = v_team;
  if (select count(*) from equipos_que_admiten_solicitudes() where team_id = v_team and club_name is not null) <> 1 then
    raise exception 'T9 falla';
  end if;
  v_req := solicitar_acceso(v_team, 'follower', '  Soy el padre del 7  ');
  if (select message from access_requests where id = v_req) <> 'Soy el padre del 7' then raise exception 'T9b falla'; end if;
  begin
    perform solicitar_acceso(v_team, 'member', null);
    raise exception 'T9c no falló';
  exception when unique_violation then null;
  end;

  -- T10: quien pide no ve la bandeja del equipo; quien lo lleva, sí, con nombre.
  if (select count(*) from solicitudes_del_equipo(v_team)) <> 0 then raise exception 'T10 falla'; end if;
  begin
    perform resolver_solicitud(v_req, true);
    raise exception 'T11 no falló';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claims', json_build_object('sub', v_coach, 'role', 'authenticated')::text, true);
  if (select count(*) from solicitudes_del_equipo(v_team) where display_name = 'Prueba T301' and kind = 'follower') <> 1 then
    raise exception 'T10b falla';
  end if;

  -- T12: rechazada, no se puede volver a pedir en una semana.
  perform resolver_solicitud(v_req, false);
  if (select status from access_requests where id = v_req) <> 'rejected' then raise exception 'T12 falla'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', v_b, 'role', 'authenticated')::text, true);
  begin
    perform solicitar_acceso(v_team, 'follower', null);
    raise exception 'T12b no falló';
  exception when check_violation then null;
  end;

  -- T13: pasada la semana, pide seguir y se le aprueba: seguidor, y lee el equipo.
  update access_requests set decided_at = now() - interval '8 days' where id = v_req;
  v_req := solicitar_acceso(v_team, 'follower', null);
  perform set_config('request.jwt.claims', json_build_object('sub', v_coach, 'role', 'authenticated')::text, true);
  perform resolver_solicitud(v_req, true);
  if (select count(*) from seguidores_del_equipo(v_team) where user_id = v_b) <> 1 then raise exception 'T13 falla'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', v_b, 'role', 'authenticated')::text, true);
  if not can_read_team(v_team) or has_team_permission(v_team, 'stats.view') then raise exception 'T13b falla'; end if;

  -- T14: siendo seguidor, pide permisos y se le aprueban: miembro, y deja de ser seguidor.
  v_req := solicitar_acceso(v_team, 'member', 'Puedo anotar los sábados');
  perform set_config('request.jwt.claims', json_build_object('sub', v_coach, 'role', 'authenticated')::text, true);
  perform resolver_solicitud(v_req, true, 'scout', array['match.live.write']::app_permission[]);
  if not exists (select 1 from team_members where team_id = v_team and user_id = v_b and role = 'scout' and is_active)
     or exists (select 1 from team_followers where team_id = v_team and user_id = v_b) then
    raise exception 'T14 falla';
  end if;

  -- T15: por RLS, un tercero no ve solicitudes ajenas ni escribe en la tabla.
  perform set_config('request.jwt.claims', json_build_object('sub', v_b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into v_n from access_requests;
  if v_n <> 3 then raise exception 'T15 falla: el dueño ve % y son 3', v_n; end if;
  begin
    insert into access_requests (team_id, user_id) values (v_team, v_b);
    raise exception 'T15b no falló';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
  select count(*) into v_n from access_requests;
  if v_n <> 0 then raise exception 'T15c falla: un tercero ve %', v_n; end if;
  select count(*) into v_n from equipos_que_admiten_solicitudes();
  if v_n <> 1 then raise exception 'T15d falla'; end if;
  execute 'reset role';

  -- T16: anónimo no ejecuta nada.
  if has_function_privilege('anon', 'public.solicitar_acceso(uuid, public.access_request_kind, text)', 'execute')
     or has_function_privilege('anon', 'public.mis_invitaciones()', 'execute')
     or has_function_privilege('anon', 'public.aceptar_invitacion(uuid)', 'execute')
     or has_function_privilege('anon', 'public.resolver_solicitud(uuid, boolean, public.team_role, public.app_permission[])', 'execute')
     or has_function_privilege('authenticated', 'public.correo_actual()', 'execute') then
    raise exception 'T16 falla';
  end if;

  -- T17: cancelar la propia y dejar de seguir.
  perform set_config('request.jwt.claims', json_build_object('sub', v_b, 'role', 'authenticated')::text, true);
  delete from team_members where user_id = v_b;
  v_req := solicitar_acceso(v_team, 'follower', null);
  perform cancelar_solicitud(v_req);
  if (select status from access_requests where id = v_req) <> 'cancelled' then raise exception 'T17 falla'; end if;
  insert into team_followers (team_id, user_id) values (v_team, v_b);
  perform dejar_de_seguir(v_team);
  if exists (select 1 from team_followers where user_id = v_b) then raise exception 'T17b falla'; end if;

  raise exception 'ENSAYO_CORRECTO: 17 pruebas, nada aplicado';

end
$ensayo$;
