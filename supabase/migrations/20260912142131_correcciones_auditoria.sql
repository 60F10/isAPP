-- =====================================================================
-- GavetaStats — Correcciones de la auditoría del 12/09
-- Anexo del DOC 05 · 12/09/2026 · T-100b (2 de 2)
--
-- Destino: supabase/migrations/20260912142131_correcciones_auditoria.sql
-- Se ejecuta después de 20260912142001_permiso_event_approve.sql, que
-- añade el valor de enumeración que el bloque 6 de este archivo cita.
--
-- Los cinco cambios del DOC 05 §14.2, más las políticas del permiso
-- nuevo. Se aplica con la base vacía, que es cuando sale gratis.
--
-- REGLA QUE NO SE PUEDE OLVIDAR (endurecimiento del 11/09 §2):
-- PostgreSQL concede EXECUTE a PUBLIC al CREAR una función, y anon
-- hereda de PUBLIC. CREATE OR REPLACE conserva los permisos anteriores;
-- DROP + CREATE los pierde. Toda función que aquí nace o renace entera
-- lleva su revoke de public y anon justo detrás.
-- =====================================================================


-- =====================================================================
-- 1 · EL RELOJ TIENE UN SOLO DUEÑO  (A-01 · DOC 04 §5.1.1)
--
-- match_periods.started_at pasa a ser la fuente de verdad. El evento
-- guarda el instante del dispositivo en occurred_at y los segundos se
-- derivan. Quien anota sin conocer todavía el arranque manda occurred_at
-- con seconds nulo, y lo rellena un disparador.
-- =====================================================================

alter table match_events add column occurred_at timestamptz;

comment on column match_events.occurred_at is
  'Instante en que el dispositivo registró el hecho. Nulo solo en partidos en diferido (DOC 04 §5.1.1).';

alter table match_events alter column seconds drop not null;

comment on column match_events.seconds is
  'Segundos dentro de la parte. Derivado de occurred_at - match_periods.started_at. Nulo mientras no se conozca el arranque.';

-- La restricción match_events_seconds (seconds >= 0) sigue valiendo tal
-- cual: un CHECK con valor nulo da desconocido y pasa. No se toca.

-- Un evento sin ninguna de las dos referencias temporales no es un
-- evento: no se puede ordenar, ni recalcular tramos, ni comparar con
-- nada. En diferido llega seconds; en directo, occurred_at.
alter table match_events add constraint match_events_time_present
  check (occurred_at is not null or seconds is not null);

-- Sostiene el relleno en diferido del bloque 1.2 y el panel que pregunte
-- qué eventos siguen sin cronología.
create index if not exists match_events_pending_seconds_idx
  on match_events (match_id, period)
  where seconds is null and occurred_at is not null;


-- ---------------------------------------------------------------------
-- 1.1 · Relleno al llegar el evento
--
-- Se llama match_events_set_seconds y no match_events_z_algo por un
-- motivo: PostgreSQL dispara los triggers de un mismo evento en orden
-- alfabético, y 'set_seconds' va antes que 'validate', así que la
-- validación ya ve los segundos puestos.
-- ---------------------------------------------------------------------

create or replace function public.set_event_seconds()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_started timestamptz;
begin
  -- Lo que ya trae segundos manda: en diferido se teclean a mano.
  if new.seconds is not null or new.occurred_at is null then
    return new;
  end if;

  select started_at into v_started
    from match_periods
   where match_id = new.match_id and period_number = new.period;

  -- Sin arranque conocido, el evento entra con seconds nulo y espera al
  -- disparador de match_periods.
  if v_started is null then
    return new;
  end if;

  -- greatest(0, ...) absorbe el desvío de reloj de pared entre móviles
  -- que el DOC 04 §5.1.1 da por asumido: un evento anotado dos segundos
  -- antes del arranque es el segundo cero, no un número negativo que
  -- rompa match_events_seconds.
  new.seconds := greatest(
    0,
    floor(extract(epoch from (new.occurred_at - v_started)))::integer
  );

  return new;
end;
$$;

revoke all on function public.set_event_seconds() from public, anon;
grant execute on function public.set_event_seconds() to authenticated;

create trigger match_events_set_seconds
  before insert or update of occurred_at, period, seconds on match_events
  for each row execute function public.set_event_seconds();


-- ---------------------------------------------------------------------
-- 1.2 · Relleno en diferido, al sincronizar el arranque de la parte
--
-- Va más allá de la letra del §14.2 y entra a propósito. El §14.2 pide
-- el disparador «al llegar», y ese solo resuelve la mitad: si el evento
-- llega ANTES de que se sincronice started_at, no hay de dónde calcular
-- y el evento se queda sin segundos para siempre. Es justo el escenario
-- del anotador sin cobertura durante el arranque, que es para quien
-- existe toda la capa offline.
-- ---------------------------------------------------------------------

create or replace function public.backfill_event_seconds()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.started_at is null then
    return new;
  end if;

  -- OLD no está asignado en un disparador de INSERT: se comprueba tg_op
  -- antes de mirarlo, o plpgsql aborta.
  if tg_op = 'UPDATE' and new.started_at is not distinct from old.started_at then
    return new;
  end if;

  update match_events
     set seconds = greatest(
           0,
           floor(extract(epoch from (occurred_at - new.started_at)))::integer
         )
   where match_id    = new.match_id
     and period      = new.period_number
     and seconds is null
     and occurred_at is not null;

  return new;
end;
$$;

revoke all on function public.backfill_event_seconds() from public, anon;
grant execute on function public.backfill_event_seconds() to authenticated;

create trigger match_periods_backfill_seconds
  after insert or update of started_at on match_periods
  for each row execute function public.backfill_event_seconds();


-- =====================================================================
-- 2 · EL RECÁLCULO DE TRAMOS SE VUELVE TOLERANTE  (A-03 · DOC 04 §6.3)
--
-- Con reparto blando, dos personas apuntan el mismo cambio con quince
-- segundos de diferencia y quien tiene event.approve los anota ya
-- aprobados. Sin comprobación, el recálculo abría dos tramos solapados
-- del jugador que entra, la restricción stints_no_overlap los rechazaba
-- y la función fallaba entera: el partido se quedaba sin minutos.
--
-- La restricción sigue vigilando I-03. Lo que cambia es que el recálculo
-- deja de depender de que nadie se equivoque.
--
-- CAMBIO DE FIRMA: el retorno pasa de integer a jsonb para poder
-- devolver qué sustituciones se ignoraron. Obliga a DROP + CREATE, y por
-- eso lleva su revoke detrás. Hoy no la llama nadie —src/ sigue siendo
-- la plantilla de Vite—, así que romper la firma sale gratis ahora y
-- caro en noviembre.
-- =====================================================================

drop function if exists public.rebuild_match_stints(uuid);

create function public.rebuild_match_stints(p_match_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_period   record;
  v_event    record;
  v_on_pitch uuid[];
  v_dur      integer;
  v_at       integer;
  v_count    integer;
  v_skipped  uuid[] := '{}'::uuid[];
begin
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

    -- Abre un tramo por cada jugador que empieza la parte en el campo.
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
       -- NULLS LAST explícito: con seconds ya opcional, un evento sin
       -- cronología se aplica al final de la parte en vez de al
       -- principio, que es el mal menor mientras no lo rellene el
       -- disparador del bloque 1.
       order by seconds nulls last, created_at
    loop
      v_at := least(coalesce(v_event.seconds, v_dur), v_dur);

      if v_event.event_type = 'substitution' then

        -- Estar en v_on_pitch es exactamente tener un tramo abierto en
        -- esta parte. Si el que entra ya está dentro, la sustitución
        -- sobra: se ignora y se anota el descarte.
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
$$;

comment on function public.rebuild_match_stints(uuid) is
  'Reconstruye los tramos del partido. Devuelve {"stints": n, "skipped": [ids de sustituciones ignoradas]} (DOC 04 §6.3).';

revoke all on function public.rebuild_match_stints(uuid) from public, anon;
grant execute on function public.rebuild_match_stints(uuid) to authenticated;


-- =====================================================================
-- 3 · EL SEGUIDOR LEE A LOS JUGADORES DE SU EQUIPO  (A-05 · DOC 05 §12.3)
--
-- can_read_club daba a cualquier seguidor de cualquier equipo del club
-- la plantilla entera del club. El §12.3 corregido pide otra cosa:
-- «miembros del club y seguidores de un equipo donde el jugador esté
-- inscrito». Se afina, no se amplía.
-- =====================================================================

drop policy players_select on players;

create policy players_select on players for select to authenticated
  using (
    -- is_club_member ya incluye al administrador de plataforma.
    public.is_club_member(club_id)
    or exists (
      select 1
        from squad_memberships sm
        join team_followers tf on tf.team_id = sm.team_id
       where sm.player_id = players.id
         and tf.user_id = (select auth.uid())
    )
  );

-- Los índices que sostienen el EXISTS ya están: squad_player_idx del
-- endurecimiento y team_followers_user_idx del esquema inicial.


-- =====================================================================
-- 4 · LA FIABILIDAD DEJA DE PRESENTAR UN 95 % COMO UN 100 %
--    (A-07 · DOC 04 §10.3)
--
-- Antes:  mínimo(1; C1/T + 0,10 × C2/T)
-- Ahora:  C1/T + 0,10 × (C2/T) × (1 − C1/T)
--
-- La corroboración suma sobre lo que NO está cubierto, nunca sobre el
-- total, así que el 100 % queda reservado a la cobertura completa. En un
-- índice que existe para no afirmar lo que no se sabe, un 100 % falso es
-- peor que no tener índice.
--
-- Solo se reescribe metric_reliability: player_metric_reliability se
-- limita a delegar en ella y hereda la fórmula sin tocarla.
--
-- CREATE OR REPLACE con la misma firma conserva los permisos del
-- endurecimiento. No hace falta revoke.
-- =====================================================================

create or replace function public.metric_reliability(
  p_match_id   uuid,
  p_event_type event_type,
  p_player_id  uuid default null
)
returns numeric
language sql stable security invoker set search_path = public
as $$
with periods as (
  select period_number, coalesce(actual_seconds, planned_seconds) as dur
    from match_periods
   where match_id = p_match_id
),
total as (
  select nullif(sum(dur), 0)::numeric as t from periods
),
decl as (
  select
    p.period_number,
    greatest(
      case
        when cd.start_period < p.period_number then 0
        when cd.start_period = p.period_number then cd.start_seconds
        else p.dur
      end, 0) as s,
    least(
      case
        when cd.end_period is null or cd.end_period > p.period_number then p.dur
        when cd.end_period = p.period_number then cd.end_seconds
        else 0
      end, p.dur) as e
  from coverage_declarations cd
  cross join periods p
  where cd.match_id = p_match_id
    and p_event_type = any (cd.covered_event_types)
    and (
      p_player_id is null
      or cd.scope <> 'single_player'
      or cd.target_player_id = p_player_id
    )
),
pts as (
  select period_number, s as x,  1 as d from decl where e > s
  union all
  select period_number, e as x, -1 as d from decl where e > s
),
swept as (
  select
    x,
    lead(x) over (partition by period_number order by x, d desc) as nx,
    sum(d) over (partition by period_number order by x, d desc
                 rows between unbounded preceding and current row) as active
  from pts
),
covered as (
  select
    coalesce(sum(case when active >= 1 then nx - x else 0 end), 0)::numeric as c1,
    coalesce(sum(case when active >= 2 then nx - x else 0 end), 0)::numeric as c2
  from swept
  where nx is not null
),
ratios as (
  select
    least(1, (select c1 from covered) / (select t from total)) as r1,
    least(1, (select c2 from covered) / (select t from total)) as r2
)
select case
         when (select t from total) is null then 0
         else greatest(0, least(1, round(
                (select r1 from ratios)
              + 0.10 * (select r2 from ratios) * (1 - (select r1 from ratios)),
              4)))
       end;
$$;

comment on function public.metric_reliability(uuid, event_type, uuid) is
  'Fiabilidad de una métrica: C1/T + 0,10 × (C2/T) × (1 − C1/T). DOC 04 §10.3.';


-- =====================================================================
-- 5 · LA VENTANA DE DUPLICADOS DEPENDE DEL TIPO DE EVENTO
--    (A-08 · DOC 04 §9.2)
--
-- Una ventana única de 30 s marcaba como sospechosos dos córners
-- seguidos, que en fútbol son rutina: se saca, se despeja y se vuelve a
-- sacar. No corrompía nada, porque nada se fusiona solo, pero llenaba de
-- ruido el panel de cierre, y un panel ruidoso se despacha a manotazos.
--
-- Las cifras son una conjetura hasta el primer amistoso: viven en
-- app_settings justo para poder tocarlas sin desplegar.
-- =====================================================================

update app_settings
   set value = jsonb_build_object(
         'default', 30,
         'by_type', jsonb_build_object(
           'goal',           30,
           'own_goal',       30,
           'yellow_card',    30,
           'second_yellow',  30,
           'red_card',       30,
           'corner',         10,
           'foul_committed', 10,
           'foul_received',  10
         )
       ),
       updated_at = now()
 where key = 'duplicate_window_seconds';

-- Por si la fila no existiera (base recreada desde cero sin el seed).
insert into app_settings (key, value)
select 'duplicate_window_seconds',
       jsonb_build_object(
         'default', 30,
         'by_type', jsonb_build_object(
           'goal',           30,
           'own_goal',       30,
           'yellow_card',    30,
           'second_yellow',  30,
           'red_card',       30,
           'corner',         10,
           'foul_committed', 10,
           'foul_received',  10
         )
       )
 where not exists (select 1 from app_settings where key = 'duplicate_window_seconds');

-- CREATE OR REPLACE con la misma firma (uuid → integer): los permisos
-- del endurecimiento se conservan.
create or replace function public.flag_duplicate_candidates(p_match_id uuid)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_cfg     jsonb;
  v_default integer;
  v_count   integer;
begin
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
       -- La ventana sale del mapa por tipo; si el tipo no está listado,
       -- manda el valor por defecto.
       and abs(a.seconds - b.seconds) <= coalesce(
             (v_cfg->'by_type'->>(a.event_type::text))::integer,
             v_default)
     where a.match_id = p_match_id
       -- Sin segundos no hay ventana que comparar. Quedan fuera hasta
       -- que el disparador del bloque 1 los rellene.
       and a.seconds is not null
       and b.seconds is not null
  ),
  members as (
    select id_a as id, id_a as anchor from pairs
    union
    select id_b, id_a from pairs
  ),
  grouped as (
    -- min() no acepta uuid; se ordena y se toma el primero.
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
$$;


-- =====================================================================
-- 6 · EDITAR Y BORRAR EVENTOS AJENOS PASA A event.approve
--    (Reparto del día de partido · DOC 05 §12.3)
--
-- Con un solo permiso para aprobar y para cerrar, o el entrenador dejaba
-- de dirigir para anotar, o todo lo del anotador principal nacía
-- pendiente y el cierre se convertía en repasar ciento y pico eventos.
--
-- match.close se queda con lo suyo: cerrar el partido y confirmar el
-- acta. Eso vive en enforce_match_changes y en matches_update, y no se
-- toca aquí.
-- =====================================================================

drop policy match_events_update on match_events;

create policy match_events_update on match_events for update to authenticated
  using (
    (created_by = (select auth.uid()) and status = 'pending')
    or public.has_team_permission(public.team_of_match(match_id), 'event.approve')
  )
  with check (
    (created_by = (select auth.uid()) and status = 'pending')
    or public.has_team_permission(public.team_of_match(match_id), 'event.approve')
  );

drop policy match_events_delete on match_events;

create policy match_events_delete on match_events for delete to authenticated
  using (
    (created_by = (select auth.uid()) and status = 'pending')
    or public.has_team_permission(public.team_of_match(match_id), 'event.approve')
  );

-- Fin de las correcciones de la auditoría.
