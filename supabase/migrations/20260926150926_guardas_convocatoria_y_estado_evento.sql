-- DOC 05 §14.5 (hallazgos de la T-205) y §14.6 (hallazgo de la T-208).
-- La pieza 5c (dorsal repetido entre convocados) queda fuera: es opcional y
-- una exclusión diferible no se puede probar contra la A11 sin navegador.

-- 5a. Pasar el partido a convocado con lineup.manage (L-07), sin abrir
--     matches_update. Devuelve true si cambió el partido y false si ya había
--     empezado o no existe, para que el cliente conserve su contrato
--     (SIN_FILAS) sin distinguir un error de otro por el texto.
create or replace function public.marcar_convocado(p_match_id uuid)
returns boolean language plpgsql security definer set search_path = public
as $$
begin
  if not public.has_team_permission(public.team_of_match(p_match_id), 'lineup.manage') then
    raise exception insufficient_privilege
      using message = 'Convocar exige el permiso lineup.manage';
  end if;

  update public.matches set status = 'called'
   where id = p_match_id and status in ('scheduled', 'called');

  return found;
end;
$$;

revoke execute on function public.marcar_convocado(uuid) from public, anon;
grant execute on function public.marcar_convocado(uuid) to authenticated;

-- 5b. R-01 en la base: el máximo de convocados se cuenta al terminar la
--     sentencia, no por fila, para que un cambio de uno por otro con la
--     convocatoria llena no se rechace a medias.
create or replace function public.check_squad_max()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_fuera record;
begin
  select s.match_id, c.squad_max, count(*) as convocados
    into v_fuera
    from public.match_squad s
    join public.matches m      on m.id = s.match_id
    join public.competitions c on c.id = m.competition_id
   where s.match_id in (select match_id from nuevas)
     and s.call_status <> 'not_called'
   group by s.match_id, c.squad_max
  having count(*) > c.squad_max
   limit 1;

  if found then
    raise exception 'La convocatoria supera los % convocados permitidos', v_fuera.squad_max
      using errcode = 'check_violation';
  end if;

  return null;
end;
$$;

create trigger match_squad_max_insert
  after insert on public.match_squad
  referencing new table as nuevas
  for each statement execute function public.check_squad_max();

create trigger match_squad_max_update
  after update on public.match_squad
  referencing new table as nuevas
  for each statement execute function public.check_squad_max();

revoke execute on function public.check_squad_max() from public, anon, authenticated;

-- 6. El estado del evento lo pone la base según event.approve (DOC 04 §8.3),
--    sin mirar lo que llega. Sin sesión es el servidor: se respeta lo que llega.
create or replace function public.set_event_status()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  new.status := case
    when public.has_team_permission(public.team_of_match(new.match_id), 'event.approve')
      then 'approved'::public.event_status
    else 'pending'::public.event_status
  end;

  return new;
end;
$$;

-- Con «a_» delante para correr antes que set_seconds y validate: los
-- disparadores de un mismo momento van en orden alfabético.
create trigger match_events_a_set_status
  before insert on public.match_events
  for each row execute function public.set_event_status();

revoke execute on function public.set_event_status() from public, anon, authenticated;
