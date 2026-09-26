-- DOC 05 §14.4 · Decidida por Raúl el 26/09/2026 (puntos 33, 34, 37, 27 y 4 del DOC 13).
-- Cuatro piezas, ninguna destructiva.

-- 1. Categoría de la competición en columnas propias. Texto libre y nulable:
--    los niveles cambian de una federación a otra y de un año a otro.
alter table public.competitions
  add column category    text,
  add column level       text,
  add column scope       text,
  add column group_label text;

comment on column public.competitions.category    is 'Categoría de edad: Cadete, Infantil…';
comment on column public.competitions.level       is 'Nivel de la liga: Primera, Preferente…';
comment on column public.competitions.scope       is 'Ámbito: Tenerife, Canarias…';
comment on column public.competitions.group_label is 'Grupo dentro del nivel: G1, G2…';

-- 2. Nombre único por club y temporada, sin distinguir mayúsculas (igual que la A08).
create unique index competitions_name_unique
  on public.competitions (club_id, season_id, lower(name));

-- 3. Campo de casa del club. El valor va aparte, como dato.
alter table public.clubs
  add column home_venue         text,
  add column home_venue_address text;

comment on column public.clubs.home_venue         is 'Nombre del campo donde el club juega en casa';
comment on column public.clubs.home_venue_address is 'Dirección postal del campo de casa';

-- 4a. Crear equipos exige team.manage en el club (hasta ahora bastaba con ser miembro).
drop policy teams_insert on public.teams;
create policy teams_insert on public.teams for insert to authenticated
  with check (public.has_club_permission(club_id, 'team.manage'));

-- 4b. set_updated_at() es de disparador: nadie la llama a mano.
--     Regla del §14.1: se revoca siempre también de public y anon.
revoke execute on function public.set_updated_at() from public, anon, authenticated;
