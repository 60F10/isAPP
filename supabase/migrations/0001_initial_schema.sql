-- =====================================================================
-- GavetaStats — Esquema inicial
-- Anexo del DOC 05 · versión 1.0 — 11/09/2026
--
-- Destino: supabase/migrations/0001_initial_schema.sql
-- Se ejecuta entero y de una sola vez sobre un proyecto vacío.
--
-- Convenciones: DOC 05 §2 · Reglas de negocio: DOC 04
-- =====================================================================

-- =====================================================================
-- 1 · EXTENSIONES
-- =====================================================================

-- btree_gist permite combinar igualdad e intervalos en una restricción
-- de exclusión. Es lo que impide dos tramos solapados del mismo jugador.
create extension if not exists btree_gist;


-- =====================================================================
-- 2 · ENUMERACIONES
-- =====================================================================

create type team_kind           as enum ('managed', 'reference');
create type team_role           as enum ('coach', 'delegate', 'scout', 'spectator');

create type app_permission      as enum (
  'team.manage', 'roster.manage', 'competition.manage', 'schedule.manage',
  'lineup.manage', 'match.live.write', 'match.close', 'discipline.manage',
  'training.manage', 'stats.view', 'members.manage'
);

create type competition_kind    as enum ('league', 'cup', 'friendly');
create type clock_mode          as enum ('running', 'stopped');
create type substitution_type   as enum ('fixed', 'rolling');
create type match_status        as enum ('scheduled', 'called', 'live', 'suspended', 'finished', 'closed');
create type call_status         as enum ('starter', 'substitute', 'not_called');
create type position_code       as enum ('GK', 'DF', 'MF', 'FW');

-- Todos los tipos de evento nacen declarados. Los que no entran en el MVP
-- quedan apagados en competitions.enabled_event_types (DOC 04 §7.1).
create type event_type          as enum (
  'goal', 'own_goal', 'yellow_card', 'second_yellow', 'red_card',
  'foul_committed', 'foul_received', 'corner', 'substitution',
  'position_change', 'note',
  'pass', 'key_pass', 'shot_on_target', 'shot_off_target', 'offside',
  'recovery', 'turnover', 'player_rating'
);

create type event_status        as enum ('pending', 'approved', 'rejected');
create type stint_boundary      as enum ('period_start', 'period_end', 'substitution', 'sent_off', 'match_end', 'suspended');
create type substitution_reason as enum ('tactical', 'fatigue', 'other');
create type coverage_scope      as enum ('full_team', 'single_player', 'goals_cards', 'custom');
create type availability_status as enum ('available', 'unavailable', 'sanctioned');
create type sanction_type       as enum ('yellow_accumulation', 'red_card', 'club_decision');
create type sanction_status     as enum ('proposed', 'active', 'served', 'cancelled');
create type attendance_status   as enum ('present', 'absent', 'late');
create type invitation_status   as enum ('pending', 'accepted', 'revoked', 'expired');


-- =====================================================================
-- 3 · IDENTIDAD Y ORGANIZACIÓN
-- =====================================================================

create table profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  display_name      text,
  avatar_url        text,
  is_platform_admin boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table clubs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  short_name  text,
  crest_url   text,
  created_by  uuid references profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table seasons (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid not null references clubs(id) on delete cascade,
  name       text not null,
  starts_on  date not null,
  ends_on    date not null,
  is_current boolean not null default false,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seasons_name_unique  unique (club_id, name),
  constraint seasons_dates_order  check (ends_on > starts_on)
);

-- Una sola temporada en curso por club.
create unique index seasons_one_current on seasons (club_id) where is_current;

create table teams (
  id            uuid primary key default gen_random_uuid(),
  club_id       uuid not null references clubs(id) on delete cascade,
  name          text not null,
  category      text,
  kind          team_kind not null default 'managed',
  crest_url     text,
  primary_color text,
  created_by    uuid references profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint teams_name_unique  unique (club_id, name),
  constraint teams_color_format check (primary_color is null or primary_color ~ '^#[0-9A-Fa-f]{6}$')
);

create table team_members (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references teams(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  role       team_role not null default 'spectator',
  is_active  boolean not null default true,
  invited_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_members_unique unique (team_id, user_id)
);

create table team_member_permissions (
  team_member_id uuid not null references team_members(id) on delete cascade,
  permission     app_permission not null,
  granted_by     uuid references profiles(id),
  granted_at     timestamptz not null default now(),
  primary key (team_member_id, permission)
);

-- Seguidores: solo consultan. Decisión H4 del DOC 04 §2.
create table team_followers (
  team_id    uuid not null references teams(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  granted_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create table invitations (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references teams(id) on delete cascade,
  email       text not null,
  role        team_role not null default 'spectator',
  permissions app_permission[] not null default '{}',
  as_follower boolean not null default false,
  token       text not null unique,
  status      invitation_status not null default 'pending',
  expires_at  timestamptz not null default (now() + interval '14 days'),
  created_by  uuid references profiles(id),
  created_at  timestamptz not null default now()
);


-- =====================================================================
-- 4 · PLANTILLA
-- =====================================================================

create table players (
  id                uuid primary key default gen_random_uuid(),
  club_id           uuid not null references clubs(id) on delete cascade,
  nickname          text not null,
  full_name         text,
  name_consent_at   timestamptz,
  name_consent_note text,
  is_active         boolean not null default true,
  created_by        uuid references profiles(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- El nombre real no se guarda sin consentimiento registrado (DOC 04 I-10).
  constraint players_name_consent check (full_name is null or name_consent_at is not null)
);

create table squad_memberships (
  id               uuid primary key default gen_random_uuid(),
  team_id          uuid not null references teams(id) on delete cascade,
  season_id        uuid not null references seasons(id) on delete cascade,
  player_id        uuid not null references players(id) on delete cascade,
  shirt_number     smallint,
  default_position position_code,
  availability     availability_status not null default 'available',
  joined_on        date not null default current_date,
  left_on          date,
  created_by       uuid references profiles(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint squad_unique        unique (team_id, season_id, player_id),
  constraint squad_shirt_range   check (shirt_number is null or shirt_number between 1 and 99),
  constraint squad_dates_order   check (left_on is null or left_on >= joined_on)
);

-- Un dorsal no se repite entre los jugadores activos del equipo (I-05).
create unique index squad_shirt_unique
  on squad_memberships (team_id, season_id, shirt_number)
  where left_on is null and shirt_number is not null;


-- =====================================================================
-- 5 · COMPETICIÓN
-- =====================================================================

create table competitions (
  id                    uuid primary key default gen_random_uuid(),
  club_id               uuid not null references clubs(id) on delete cascade,
  season_id             uuid not null references seasons(id) on delete cascade,
  name                  text not null,
  kind                  competition_kind not null default 'league',

  -- Reglamento configurable (DOC 04 §4.1)
  periods_count         smallint not null default 2,
  period_minutes        smallint not null default 45,
  halftime_minutes      smallint not null default 15,
  clock_mode            clock_mode not null default 'running',
  substitution_type     substitution_type not null default 'fixed',
  substitutions_max     smallint not null default 5,
  squad_max             smallint not null default 18,
  players_on_pitch      smallint not null default 11,
  yellow_cards_for_ban  smallint not null default 5,
  red_card_default_bans smallint not null default 1,
  enabled_event_types   event_type[] not null default array[
    'goal','own_goal','yellow_card','second_yellow','red_card',
    'foul_committed','foul_received','corner','substitution',
    'position_change','note'
  ]::event_type[],

  created_by            uuid references profiles(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint competitions_periods    check (periods_count between 1 and 4),
  constraint competitions_minutes    check (period_minutes between 10 and 60),
  constraint competitions_halftime   check (halftime_minutes between 0 and 30),
  constraint competitions_subs       check (substitutions_max between 0 and 99),
  constraint competitions_squad      check (squad_max between 5 and 30),
  constraint competitions_pitch      check (players_on_pitch between 5 and 11),
  constraint competitions_yellows    check (yellow_cards_for_ban between 0 and 20),
  constraint competitions_red_bans   check (red_card_default_bans between 0 and 10)
);


-- =====================================================================
-- 6 · PARTIDO
-- =====================================================================

create table matches (
  id                      uuid primary key default gen_random_uuid(),
  club_id                 uuid not null references clubs(id) on delete cascade,
  season_id               uuid not null references seasons(id) on delete cascade,
  competition_id          uuid not null references competitions(id) on delete restrict,
  team_id                 uuid not null references teams(id) on delete cascade,
  opponent_team_id        uuid not null references teams(id) on delete restrict,
  is_home                 boolean not null default true,
  kickoff_at              timestamptz not null,
  venue                   text,
  status                  match_status not null default 'scheduled',
  is_retroactive          boolean not null default false,
  suspended_period        smallint,
  suspended_seconds       integer,
  confirmed_goals_for     smallint,
  confirmed_goals_against smallint,
  notes                   text,
  closed_at               timestamptz,
  closed_by               uuid references profiles(id),
  created_by              uuid references profiles(id),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  constraint matches_teams_differ  check (team_id <> opponent_team_id),
  constraint matches_suspension    check (
    (status <> 'suspended') or (suspended_period is not null and suspended_seconds is not null)
  ),
  constraint matches_scores        check (
    (confirmed_goals_for is null or confirmed_goals_for >= 0) and
    (confirmed_goals_against is null or confirmed_goals_against >= 0)
  )
);

create table match_periods (
  id              uuid primary key default gen_random_uuid(),
  match_id        uuid not null references matches(id) on delete cascade,
  period_number   smallint not null,
  planned_seconds integer not null,
  actual_seconds  integer,
  started_at      timestamptz,
  ended_at        timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint match_periods_unique  unique (match_id, period_number),
  constraint match_periods_number  check (period_number between 1 and 4),
  constraint match_periods_planned check (planned_seconds > 0),
  constraint match_periods_actual  check (actual_seconds is null or actual_seconds >= 0)
);

create table match_squad (
  id           uuid primary key default gen_random_uuid(),
  match_id     uuid not null references matches(id) on delete cascade,
  player_id    uuid not null references players(id) on delete restrict,
  call_status  call_status not null default 'not_called',
  shirt_number smallint,
  position     position_code,
  created_by   uuid references profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint match_squad_unique unique (match_id, player_id),
  constraint match_squad_shirt  check (shirt_number is null or shirt_number between 1 and 99)
);

create table match_events (
  id                  uuid primary key default gen_random_uuid(),
  -- Identificador generado en el dispositivo antes de enviar: reenviar
  -- un evento ya guardado no lo duplica (DOC 04 I-08).
  client_event_id     uuid not null unique,
  match_id            uuid not null references matches(id) on delete cascade,
  event_type          event_type not null,
  period              smallint not null,
  seconds             integer not null,
  is_opponent         boolean not null default false,
  player_id           uuid references players(id) on delete restrict,
  secondary_player_id uuid references players(id) on delete restrict,
  details             jsonb not null default '{}'::jsonb,
  status              event_status not null default 'pending',
  duplicate_group_id  uuid,
  created_by          uuid not null references profiles(id),
  created_at          timestamptz not null default now(),
  reviewed_by         uuid references profiles(id),
  reviewed_at         timestamptz,
  updated_at          timestamptz not null default now(),

  constraint match_events_period  check (period between 1 and 4),
  constraint match_events_seconds check (seconds >= 0),

  -- El rival no tiene jugadores (decisión B3).
  constraint match_events_opponent check (not is_opponent or player_id is null),

  -- Tipos que exigen jugador propio.
  constraint match_events_player_required check (
    is_opponent
    or event_type not in (
      'goal','own_goal','yellow_card','second_yellow','red_card','foul_committed',
      'substitution','position_change','pass','key_pass','shot_on_target',
      'shot_off_target','offside','recovery','turnover','player_rating'
    )
    or player_id is not null
  ),

  -- La sustitución necesita quien sale y quien entra, y no son el mismo.
  constraint match_events_substitution check (
    event_type <> 'substitution'
    or (player_id is not null and secondary_player_id is not null and player_id <> secondary_player_id)
  ),

  -- Solo participa quien está convocado (I-04). Con MATCH SIMPLE, una
  -- referencia con columna nula no se comprueba: los eventos del rival pasan.
  constraint match_events_player_called foreign key (match_id, player_id)
    references match_squad (match_id, player_id) on delete restrict,
  constraint match_events_secondary_called foreign key (match_id, secondary_player_id)
    references match_squad (match_id, player_id) on delete restrict
);

-- Tabla derivada: la escribe rebuild_match_stints, nadie más (DOC 05 §12.3).
create table player_match_stints (
  id            uuid primary key default gen_random_uuid(),
  match_id      uuid not null references matches(id) on delete cascade,
  player_id     uuid not null references players(id) on delete cascade,
  period        smallint not null,
  start_seconds integer not null,
  end_seconds   integer not null,
  start_reason  stint_boundary not null,
  end_reason    stint_boundary not null,
  created_at    timestamptz not null default now(),
  constraint stints_bounds check (end_seconds >= start_seconds and start_seconds >= 0),
  constraint stints_period check (period between 1 and 4),
  -- Ningún jugador en dos sitios a la vez dentro de la misma parte (I-03).
  constraint stints_no_overlap exclude using gist (
    match_id  with =,
    player_id with =,
    period    with =,
    int4range(start_seconds, end_seconds) with &&
  )
);

create table coverage_declarations (
  id                  uuid primary key default gen_random_uuid(),
  match_id            uuid not null references matches(id) on delete cascade,
  user_id             uuid not null references profiles(id) on delete cascade,
  scope               coverage_scope not null default 'full_team',
  target_player_id    uuid references players(id) on delete cascade,
  covered_event_types event_type[] not null,
  start_period        smallint not null default 1,
  start_seconds       integer not null default 0,
  end_period          smallint,
  end_seconds         integer,
  is_retroactive      boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint coverage_target check (scope <> 'single_player' or target_player_id is not null),
  constraint coverage_types  check (array_length(covered_event_types, 1) > 0),
  constraint coverage_start  check (start_period between 1 and 4 and start_seconds >= 0),
  constraint coverage_end    check (
    (end_period is null and end_seconds is null)
    or (end_period between 1 and 4 and end_seconds >= 0)
  )
);


-- =====================================================================
-- 7 · DISCIPLINA
-- =====================================================================

create table sanctions (
  id                   uuid primary key default gen_random_uuid(),
  club_id              uuid not null references clubs(id) on delete cascade,
  player_id            uuid not null references players(id) on delete cascade,
  season_id            uuid not null references seasons(id) on delete cascade,
  competition_id       uuid references competitions(id) on delete set null,
  type                 sanction_type not null,
  matches_total        smallint,
  matches_served       smallint not null default 0,
  starts_on            date,
  ends_on              date,
  status               sanction_status not null default 'proposed',
  origin_event_id      uuid references match_events(id) on delete set null,
  starts_after_match_id uuid references matches(id) on delete set null,
  notes                text,
  created_by           uuid references profiles(id),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  -- O se mide en partidos, o se mide en fechas, pero se mide.
  constraint sanctions_measure check (
    (matches_total is not null and matches_total > 0)
    or (starts_on is not null and ends_on is not null and ends_on >= starts_on)
  ),
  constraint sanctions_served check (
    matches_total is null or (matches_served >= 0 and matches_served <= matches_total)
  )
);


-- =====================================================================
-- 8 · ENTRENAMIENTOS
-- =====================================================================

create table training_sessions (
  id           uuid primary key default gen_random_uuid(),
  team_id      uuid not null references teams(id) on delete cascade,
  season_id    uuid not null references seasons(id) on delete cascade,
  scheduled_at timestamptz not null,
  location     text,
  focus        text,
  notes        text,
  created_by   uuid references profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table training_attendance (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references training_sessions(id) on delete cascade,
  player_id  uuid not null references players(id) on delete cascade,
  status     attendance_status not null default 'present',
  notes      text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint training_attendance_unique unique (session_id, player_id)
);


-- =====================================================================
-- 9 · SISTEMA
-- =====================================================================

create table app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

insert into app_settings (key, value) values
  ('duplicate_window_seconds', '{"seconds": 30}'::jsonb);

create table audit_log (
  id          bigserial primary key,
  table_name  text not null,
  record_id   uuid,
  action      text not null,
  diff        jsonb,
  actor_id    uuid,
  club_id     uuid,
  created_at  timestamptz not null default now()
);

create table error_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references profiles(id) on delete set null,
  club_id     uuid references clubs(id) on delete set null,
  route       text,
  message     text not null,
  stack       text,
  device      jsonb,
  app_version text,
  created_at  timestamptz not null default now()
);


-- =====================================================================
-- 10 · ÍNDICES
-- =====================================================================

create index match_events_timeline_idx   on match_events (match_id, period, seconds);
create index match_events_status_idx     on match_events (match_id, status);
create index match_events_player_idx     on match_events (player_id, event_type) where status = 'approved';
create index match_events_secondary_idx  on match_events (secondary_player_id) where secondary_player_id is not null;
create index match_events_duplicate_idx  on match_events (duplicate_group_id) where duplicate_group_id is not null;

create index matches_team_season_idx     on matches (team_id, season_id, status);
create index matches_club_kickoff_idx    on matches (club_id, kickoff_at);
create index matches_competition_idx     on matches (competition_id);

create index match_squad_match_idx       on match_squad (match_id, call_status);
create index match_periods_match_idx     on match_periods (match_id);
create index stints_match_player_idx     on player_match_stints (match_id, player_id);
create index coverage_match_idx          on coverage_declarations (match_id);

-- Índices que sostienen las políticas RLS. Sin ellos se nota en todas las pantallas.
create index team_members_user_idx       on team_members (user_id) where is_active;
create index team_members_team_idx       on team_members (team_id) where is_active;
create index team_permissions_idx        on team_member_permissions (team_member_id, permission);
create index team_followers_user_idx     on team_followers (user_id);

create index squad_team_season_idx       on squad_memberships (team_id, season_id);
create index players_club_idx            on players (club_id) where is_active;
create index teams_club_idx              on teams (club_id);
create index sanctions_player_idx        on sanctions (player_id, status);
create index training_sessions_team_idx  on training_sessions (team_id, scheduled_at);
create index audit_log_record_idx        on audit_log (table_name, record_id);
create index error_logs_created_idx      on error_logs (created_at desc);


-- =====================================================================
-- 11 · FUNCIONES AUXILIARES DE SEGURIDAD
--
-- Son SECURITY DEFINER a propósito: si consultaran team_members bajo RLS,
-- la política de team_members se llamaría a sí misma y PostgreSQL abortaría
-- por recursión. STABLE permite evaluarlas una vez por consulta, no por fila.
-- =====================================================================

create or replace function public.is_platform_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select is_platform_admin from profiles where id = auth.uid()), false);
$$;

create or replace function public.is_team_member(p_team_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from team_members
    where team_id = p_team_id and user_id = auth.uid() and is_active
  );
$$;

create or replace function public.has_team_permission(p_team_id uuid, p_permission app_permission)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from team_members tm
    join team_member_permissions tmp on tmp.team_member_id = tm.id
    where tm.team_id = p_team_id
      and tm.user_id = auth.uid()
      and tm.is_active
      and tmp.permission = p_permission
  );
$$;

create or replace function public.is_team_follower(p_team_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from team_followers where team_id = p_team_id and user_id = auth.uid()
  );
$$;

create or replace function public.can_read_team(p_team_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_team_member(p_team_id)
      or public.is_team_follower(p_team_id)
      or public.is_platform_admin();
$$;

create or replace function public.is_club_member(p_club_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from team_members tm
    join teams t on t.id = tm.team_id
    where t.club_id = p_club_id and tm.user_id = auth.uid() and tm.is_active
  ) or public.is_platform_admin();
$$;

create or replace function public.can_read_club(p_club_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_club_member(p_club_id)
      or exists (
        select 1 from team_followers tf
        join teams t on t.id = tf.team_id
        where t.club_id = p_club_id and tf.user_id = auth.uid()
      );
$$;

create or replace function public.has_club_permission(p_club_id uuid, p_permission app_permission)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from team_members tm
    join teams t on t.id = tm.team_id
    join team_member_permissions tmp on tmp.team_member_id = tm.id
    where t.club_id = p_club_id
      and tm.user_id = auth.uid()
      and tm.is_active
      and tmp.permission = p_permission
  );
$$;

create or replace function public.team_of_match(p_match_id uuid)
returns uuid
language sql stable security definer set search_path = public
as $$
  select team_id from matches where id = p_match_id;
$$;


-- =====================================================================
-- 12 · DISPARADORES DE MANTENIMIENTO
-- =====================================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','clubs','seasons','teams','team_members','players','squad_memberships',
    'competitions','matches','match_periods','match_squad','match_events',
    'coverage_declarations','sanctions','training_sessions','training_attendance'
  ]
  loop
    execute format(
      'create trigger %I_set_updated_at before update on %I
       for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- Alta de perfil al crear la cuenta de Google.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- club_id de matches se deriva del equipo: evita que una fila mienta.
create or replace function public.set_match_club_id()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  select club_id into new.club_id from teams where id = new.team_id;
  return new;
end;
$$;

create trigger matches_set_club_id
  before insert or update of team_id on matches
  for each row execute function public.set_match_club_id();

-- Auditoría genérica (E9-02).
create or replace function public.audit_row()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_diff jsonb;
  v_id   uuid;
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
    v_id := (to_jsonb(new)->>'id')::uuid;
  elsif tg_op = 'INSERT' then
    v_diff := to_jsonb(new);
    v_id   := (to_jsonb(new)->>'id')::uuid;
  else
    v_diff := to_jsonb(old);
    v_id   := (to_jsonb(old)->>'id')::uuid;
  end if;

  insert into audit_log (table_name, record_id, action, diff, actor_id)
  values (tg_table_name, v_id, lower(tg_op), v_diff, auth.uid());

  return coalesce(new, old);
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'match_events','match_squad','matches','sanctions','team_member_permissions','team_members'
  ]
  loop
    execute format(
      'create trigger %I_audit after insert or update or delete on %I
       for each row execute function public.audit_row()', t, t);
  end loop;
end $$;


-- =====================================================================
-- 13 · VALIDACIÓN DE EVENTOS  (DOC 04 §4.3)
-- =====================================================================

create or replace function public.validate_match_event()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_match     matches%rowtype;
  v_comp      competitions%rowtype;
  v_call      call_status;
  v_subs      integer;
begin
  select * into v_match from matches where id = new.match_id;
  select * into v_comp  from competitions where id = v_match.competition_id;

  -- R-08 · la parte existe en esta competición
  if new.period > v_comp.periods_count then
    raise exception 'La parte % no existe en esta competición (máximo %)',
      new.period, v_comp.periods_count;
  end if;

  -- R-09 · el tipo de evento está activo
  if not (new.event_type = any (v_comp.enabled_event_types)) then
    raise exception 'El tipo de evento % está desactivado en esta competición', new.event_type;
  end if;

  -- El partido admite eventos
  if tg_op = 'INSERT' and v_match.status = 'scheduled' and not v_match.is_retroactive then
    raise exception 'No se pueden registrar eventos en un partido que no ha empezado';
  end if;

  -- R-06 · solo participa quien está convocado
  if new.player_id is not null then
    select call_status into v_call from match_squad
     where match_id = new.match_id and player_id = new.player_id;
    if v_call = 'not_called' then
      raise exception 'El jugador no está convocado en este partido';
    end if;
  end if;

  if new.secondary_player_id is not null then
    select call_status into v_call from match_squad
     where match_id = new.match_id and player_id = new.secondary_player_id;
    if v_call = 'not_called' then
      raise exception 'El jugador que entra no está convocado en este partido';
    end if;
  end if;

  if tg_op = 'INSERT' and new.event_type = 'substitution' then
    -- R-04 · límite de sustituciones
    select count(*) into v_subs from match_events
     where match_id = new.match_id and event_type = 'substitution' and status <> 'rejected';
    if v_subs >= v_comp.substitutions_max then
      raise exception 'Este partido ya ha agotado las % sustituciones permitidas',
        v_comp.substitutions_max;
    end if;

    -- R-05 · con cambios fijos no hay reentrada
    if v_comp.substitution_type = 'fixed' and exists (
      select 1 from match_events
       where match_id = new.match_id
         and event_type = 'substitution'
         and player_id = new.secondary_player_id
         and status <> 'rejected'
    ) then
      raise exception 'Con cambios fijos, un jugador sustituido no vuelve a entrar';
    end if;

    -- R-07 · el expulsado no vuelve nunca
    if exists (
      select 1 from match_events
       where match_id = new.match_id
         and event_type in ('red_card','second_yellow')
         and player_id = new.secondary_player_id
         and status <> 'rejected'
    ) then
      raise exception 'Un jugador expulsado no puede volver al campo';
    end if;
  end if;

  return new;
end;
$$;

create trigger match_events_validate
  before insert or update on match_events
  for each row execute function public.validate_match_event();


-- ---------------------------------------------------------------------
-- Transiciones de estado del partido.
--
-- La política RLS de matches no basta: en UPDATE, USING solo ve la fila
-- vieja y WITH CHECK solo la nueva, así que no puede distinguir "pasar a
-- en juego" de "cerrar el partido". Quien anota podría cerrarlo. Este
-- disparador compara ambas y exige el permiso que corresponde a cada cambio.
-- ---------------------------------------------------------------------

create or replace function public.enforce_match_changes()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  -- Sin sesión iniciada es un proceso del servidor (migración o función interna).
  if auth.uid() is null then
    return new;
  end if;

  -- Cerrar o reabrir exige match.close (DOC 04 §8.4)
  if (new.status = 'closed') is distinct from (old.status = 'closed')
     and not public.has_team_permission(new.team_id, 'match.close') then
    raise exception insufficient_privilege
      using message = 'Cerrar o reabrir un partido exige el permiso match.close';
  end if;

  -- Confirmar el resultado del acta exige match.close
  if (new.confirmed_goals_for     is distinct from old.confirmed_goals_for
   or new.confirmed_goals_against is distinct from old.confirmed_goals_against)
     and not public.has_team_permission(new.team_id, 'match.close') then
    raise exception insufficient_privilege
      using message = 'Confirmar el resultado exige el permiso match.close';
  end if;

  -- Reprogramar el partido exige schedule.manage
  if (new.kickoff_at       is distinct from old.kickoff_at
   or new.venue            is distinct from old.venue
   or new.competition_id   is distinct from old.competition_id
   or new.opponent_team_id is distinct from old.opponent_team_id
   or new.team_id          is distinct from old.team_id
   or new.season_id        is distinct from old.season_id
   or new.is_home          is distinct from old.is_home)
     and not public.has_team_permission(new.team_id, 'schedule.manage') then
    raise exception insufficient_privilege
      using message = 'Cambiar los datos del partido exige el permiso schedule.manage';
  end if;

  -- Llevar el partido (empezar, suspender, terminar) exige match.live.write
  if new.status is distinct from old.status
     and new.status in ('live','suspended','finished')
     and not (public.has_team_permission(new.team_id, 'match.live.write')
           or public.has_team_permission(new.team_id, 'match.close')) then
    raise exception insufficient_privilege
      using message = 'Llevar el partido exige el permiso match.live.write';
  end if;

  return new;
end;
$$;

create trigger matches_enforce_changes
  before update on matches
  for each row execute function public.enforce_match_changes();


-- =====================================================================
-- 14 · RECÁLCULO DE TRAMOS  (DOC 04 §6.3)
-- =====================================================================

create or replace function public.rebuild_match_stints(p_match_id uuid)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_period   record;
  v_event    record;
  v_on_pitch uuid[];
  v_dur      integer;
  v_at       integer;
  v_count    integer;
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
      select event_type, seconds, player_id, secondary_player_id, created_at
        from match_events
       where match_id = p_match_id
         and status = 'approved'
         and period = v_period.period_number
         and event_type in ('substitution','red_card','second_yellow')
       order by seconds, created_at
    loop
      v_at := least(v_event.seconds, v_dur);

      if v_event.event_type = 'substitution' then
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
  return v_count;
end;
$$;


-- =====================================================================
-- 15 · CANDIDATOS A DUPLICADO  (DOC 04 §9.2)
-- =====================================================================

create or replace function public.flag_duplicate_candidates(p_match_id uuid)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_window integer;
  v_count  integer;
begin
  select coalesce((value->>'seconds')::integer, 30) into v_window
    from app_settings where key = 'duplicate_window_seconds';

  update match_events set duplicate_group_id = null where match_id = p_match_id;

  with pairs as (
    select a.id as id_a, b.id as id_b
      from match_events a
      join match_events b
        on b.match_id = a.match_id
       and a.id < b.id
       and a.event_type = b.event_type
       and a.is_opponent = b.is_opponent
       and a.period = b.period
       and abs(a.seconds - b.seconds) <= v_window
       and a.created_by <> b.created_by
       and a.status <> 'rejected'
       and b.status <> 'rejected'
     where a.match_id = p_match_id
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
-- 16 · ÍNDICE DE FIABILIDAD  (DOC 04 §10.3)
--
-- Barrido temporal: se recortan las coberturas a cada parte, se ordenan
-- sus extremos y se suman los segmentos con una o más coberturas activas,
-- y los que tienen dos o más.
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
)
select case
         when (select t from total) is null then 0
         else least(1, round(
           (select c1 from covered) / (select t from total)
           + 0.10 * (select c2 from covered) / (select t from total), 4))
       end;
$$;

create or replace function public.player_metric_reliability(
  p_match_id   uuid,
  p_event_type event_type,
  p_player_id  uuid
)
returns numeric
language sql stable security invoker set search_path = public
as $$
  select public.metric_reliability(p_match_id, p_event_type, p_player_id);
$$;


-- =====================================================================
-- 17 · LA ÚNICA PUERTA DE LECTURA  (DOC 05 §11)
--
-- security_invoker = true es obligatorio: sin él, la vista se ejecuta con
-- los permisos de quien la creó y se salta la RLS de quien la consulta.
-- =====================================================================

create view v_match_scores with (security_invoker = true) as
select
  m.id as match_id,
  m.team_id,
  m.season_id,
  m.competition_id,
  m.status,
  count(*) filter (where e.event_type = 'goal'     and not e.is_opponent) +
  count(*) filter (where e.event_type = 'own_goal' and     e.is_opponent) as goals_for,
  count(*) filter (where e.event_type = 'goal'     and     e.is_opponent) +
  count(*) filter (where e.event_type = 'own_goal' and not e.is_opponent) as goals_against,
  m.confirmed_goals_for,
  m.confirmed_goals_against
from matches m
left join match_events e
  on e.match_id = m.id and e.status = 'approved'
group by m.id;

create view v_player_match_minutes with (security_invoker = true) as
select
  s.match_id,
  s.player_id,
  m.team_id,
  m.season_id,
  sum(s.end_seconds - s.start_seconds)                    as seconds_played,
  round(sum(s.end_seconds - s.start_seconds) / 60.0)::int  as minutes_played,
  bool_or(ms.call_status = 'starter')                      as was_starter
from player_match_stints s
join matches m     on m.id = s.match_id
join match_squad ms on ms.match_id = s.match_id and ms.player_id = s.player_id
group by s.match_id, s.player_id, m.team_id, m.season_id;

create view v_player_match_stats with (security_invoker = true) as
select
  ms.match_id,
  ms.player_id,
  m.team_id,
  m.season_id,
  m.competition_id,
  ms.call_status,
  coalesce(mm.minutes_played, 0)                                          as minutes_played,
  count(e.id) filter (where e.event_type = 'goal')                        as goals,
  count(e.id) filter (where e.event_type = 'own_goal')                    as own_goals,
  count(a.id) filter (where a.event_type = 'goal')                        as assists,
  count(e.id) filter (where e.event_type = 'yellow_card')                 as yellow_cards,
  count(e.id) filter (where e.event_type in ('red_card','second_yellow')) as red_cards,
  count(e.id) filter (where e.event_type = 'foul_committed')              as fouls_committed,
  count(e.id) filter (where e.event_type = 'foul_received')               as fouls_received
from match_squad ms
join matches m on m.id = ms.match_id
left join v_player_match_minutes mm
       on mm.match_id = ms.match_id and mm.player_id = ms.player_id
left join match_events e
       on e.match_id = ms.match_id and e.player_id = ms.player_id and e.status = 'approved'
left join match_events a
       on a.match_id = ms.match_id and a.secondary_player_id = ms.player_id and a.status = 'approved'
group by ms.match_id, ms.player_id, m.team_id, m.season_id, m.competition_id,
         ms.call_status, mm.minutes_played;

-- Solo partidos cerrados (DOC 04 §14.1). Los suspendidos se marcan aparte
-- para poder excluirlos de las medias.
create view v_player_season_stats with (security_invoker = true) as
select
  s.player_id,
  s.team_id,
  s.season_id,
  count(*) filter (where s.call_status <> 'not_called')      as matches_called,
  count(*) filter (where s.minutes_played > 0)               as matches_played,
  count(*) filter (where s.call_status = 'starter')          as matches_started,
  sum(s.minutes_played)                                      as minutes_played,
  sum(s.goals)                                               as goals,
  sum(s.assists)                                             as assists,
  sum(s.own_goals)                                           as own_goals,
  sum(s.yellow_cards)                                        as yellow_cards,
  sum(s.red_cards)                                           as red_cards,
  sum(s.fouls_committed)                                     as fouls_committed,
  sum(s.fouls_received)                                      as fouls_received
from v_player_match_stats s
join matches m on m.id = s.match_id
where m.status = 'closed'
group by s.player_id, s.team_id, s.season_id;

create view v_team_season_stats with (security_invoker = true) as
select
  m.team_id,
  m.season_id,
  m.competition_id,
  count(*)                                                            as matches,
  count(*) filter (where sc.goals_for >  sc.goals_against)             as wins,
  count(*) filter (where sc.goals_for =  sc.goals_against)             as draws,
  count(*) filter (where sc.goals_for <  sc.goals_against)             as losses,
  sum(sc.goals_for)                                                    as goals_for,
  sum(sc.goals_against)                                                as goals_against
from matches m
join v_match_scores sc on sc.match_id = m.id
where m.status = 'closed'
group by m.team_id, m.season_id, m.competition_id;


-- =====================================================================
-- 18 · SEGURIDAD A NIVEL DE FILA
-- =====================================================================

alter table profiles                enable row level security;
alter table clubs                   enable row level security;
alter table seasons                 enable row level security;
alter table teams                   enable row level security;
alter table team_members            enable row level security;
alter table team_member_permissions enable row level security;
alter table team_followers          enable row level security;
alter table invitations             enable row level security;
alter table players                 enable row level security;
alter table squad_memberships       enable row level security;
alter table competitions            enable row level security;
alter table matches                 enable row level security;
alter table match_periods           enable row level security;
alter table match_squad             enable row level security;
alter table match_events            enable row level security;
alter table player_match_stints     enable row level security;
alter table coverage_declarations   enable row level security;
alter table sanctions               enable row level security;
alter table training_sessions       enable row level security;
alter table training_attendance     enable row level security;
alter table app_settings            enable row level security;
alter table audit_log               enable row level security;
alter table error_logs              enable row level security;

-- ---------- profiles ----------
create policy profiles_select on profiles for select to authenticated
  using (
    id = auth.uid()
    or public.is_platform_admin()
    or exists (
      select 1 from team_members me
      join team_members other on other.team_id = me.team_id
      where me.user_id = auth.uid() and me.is_active and other.user_id = profiles.id
    )
  );
create policy profiles_update on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ---------- clubs ----------
create policy clubs_select on clubs for select to authenticated
  using (public.can_read_club(id));
create policy clubs_insert on clubs for insert to authenticated
  with check (created_by = auth.uid());
create policy clubs_update on clubs for update to authenticated
  using (public.has_club_permission(id, 'team.manage'))
  with check (public.has_club_permission(id, 'team.manage'));

-- ---------- seasons ----------
create policy seasons_select on seasons for select to authenticated
  using (public.can_read_club(club_id));
create policy seasons_write on seasons for all to authenticated
  using (public.has_club_permission(club_id, 'competition.manage'))
  with check (public.has_club_permission(club_id, 'competition.manage'));

-- ---------- teams ----------
create policy teams_select on teams for select to authenticated
  using (public.can_read_team(id) or public.can_read_club(club_id));
create policy teams_insert on teams for insert to authenticated
  with check (public.is_club_member(club_id));
create policy teams_update on teams for update to authenticated
  using (public.has_team_permission(id, 'team.manage')
      or public.has_club_permission(club_id, 'team.manage'))
  with check (public.has_team_permission(id, 'team.manage')
      or public.has_club_permission(club_id, 'team.manage'));

-- ---------- team_members ----------
create policy team_members_select on team_members for select to authenticated
  using (user_id = auth.uid() or public.is_team_member(team_id));
create policy team_members_write on team_members for all to authenticated
  using (public.has_team_permission(team_id, 'members.manage'))
  with check (public.has_team_permission(team_id, 'members.manage'));

-- ---------- team_member_permissions ----------
create policy team_permissions_select on team_member_permissions for select to authenticated
  using (exists (
    select 1 from team_members tm
    where tm.id = team_member_id
      and (tm.user_id = auth.uid() or public.is_team_member(tm.team_id))
  ));
create policy team_permissions_write on team_member_permissions for all to authenticated
  using (exists (
    select 1 from team_members tm
    where tm.id = team_member_id and public.has_team_permission(tm.team_id, 'members.manage')
  ))
  with check (exists (
    select 1 from team_members tm
    where tm.id = team_member_id and public.has_team_permission(tm.team_id, 'members.manage')
  ));

-- ---------- team_followers ----------
create policy team_followers_select on team_followers for select to authenticated
  using (user_id = auth.uid() or public.has_team_permission(team_id, 'members.manage'));
create policy team_followers_write on team_followers for all to authenticated
  using (public.has_team_permission(team_id, 'members.manage'))
  with check (public.has_team_permission(team_id, 'members.manage'));

-- ---------- invitations ----------
create policy invitations_all on invitations for all to authenticated
  using (public.has_team_permission(team_id, 'members.manage'))
  with check (public.has_team_permission(team_id, 'members.manage'));

-- ---------- players ----------
create policy players_select on players for select to authenticated
  using (public.can_read_club(club_id));
create policy players_write on players for all to authenticated
  using (public.has_club_permission(club_id, 'roster.manage'))
  with check (public.has_club_permission(club_id, 'roster.manage'));

-- ---------- squad_memberships ----------
create policy squad_select on squad_memberships for select to authenticated
  using (public.can_read_team(team_id));
create policy squad_write on squad_memberships for all to authenticated
  using (public.has_team_permission(team_id, 'roster.manage'))
  with check (public.has_team_permission(team_id, 'roster.manage'));

-- ---------- competitions ----------
create policy competitions_select on competitions for select to authenticated
  using (public.can_read_club(club_id));
create policy competitions_write on competitions for all to authenticated
  using (public.has_club_permission(club_id, 'competition.manage'))
  with check (public.has_club_permission(club_id, 'competition.manage'));

-- ---------- matches ----------
create policy matches_select on matches for select to authenticated
  using (public.can_read_team(team_id));
create policy matches_insert on matches for insert to authenticated
  with check (public.has_team_permission(team_id, 'schedule.manage'));
create policy matches_update on matches for update to authenticated
  using (public.has_team_permission(team_id, 'schedule.manage')
      or public.has_team_permission(team_id, 'match.live.write')
      or public.has_team_permission(team_id, 'match.close'))
  with check (public.has_team_permission(team_id, 'schedule.manage')
      or public.has_team_permission(team_id, 'match.live.write')
      or public.has_team_permission(team_id, 'match.close'));
create policy matches_delete on matches for delete to authenticated
  using (public.has_team_permission(team_id, 'schedule.manage'));

-- ---------- match_periods ----------
create policy match_periods_select on match_periods for select to authenticated
  using (public.can_read_team(public.team_of_match(match_id)));
create policy match_periods_write on match_periods for all to authenticated
  using (public.has_team_permission(public.team_of_match(match_id), 'match.live.write'))
  with check (public.has_team_permission(public.team_of_match(match_id), 'match.live.write'));

-- ---------- match_squad ----------
create policy match_squad_select on match_squad for select to authenticated
  using (public.can_read_team(public.team_of_match(match_id)));
create policy match_squad_write on match_squad for all to authenticated
  using (public.has_team_permission(public.team_of_match(match_id), 'lineup.manage'))
  with check (public.has_team_permission(public.team_of_match(match_id), 'lineup.manage'));

-- ---------- match_events ----------
-- El miembro ve todo; el seguidor, solo lo aprobado (DOC 05 §12.3).
create policy match_events_select on match_events for select to authenticated
  using (
    public.is_team_member(public.team_of_match(match_id))
    or public.is_platform_admin()
    or (public.is_team_follower(public.team_of_match(match_id)) and status = 'approved')
  );

create policy match_events_insert on match_events for insert to authenticated
  with check (
    created_by = auth.uid()
    and public.has_team_permission(public.team_of_match(match_id), 'match.live.write')
  );

-- El autor corrige lo suyo mientras siga pendiente; el validador, cualquier cosa.
create policy match_events_update on match_events for update to authenticated
  using (
    (created_by = auth.uid() and status = 'pending')
    or public.has_team_permission(public.team_of_match(match_id), 'match.close')
  )
  with check (
    (created_by = auth.uid() and status = 'pending')
    or public.has_team_permission(public.team_of_match(match_id), 'match.close')
  );

create policy match_events_delete on match_events for delete to authenticated
  using (
    (created_by = auth.uid() and status = 'pending')
    or public.has_team_permission(public.team_of_match(match_id), 'match.close')
  );

-- ---------- player_match_stints ----------
-- Solo escribe rebuild_match_stints, que es SECURITY DEFINER.
create policy stints_select on player_match_stints for select to authenticated
  using (public.can_read_team(public.team_of_match(match_id)));

-- ---------- coverage_declarations ----------
create policy coverage_select on coverage_declarations for select to authenticated
  using (public.is_team_member(public.team_of_match(match_id)) or public.is_platform_admin());
create policy coverage_insert on coverage_declarations for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.has_team_permission(public.team_of_match(match_id), 'match.live.write')
  );
create policy coverage_update on coverage_declarations for update to authenticated
  using (user_id = auth.uid()
      or public.has_team_permission(public.team_of_match(match_id), 'match.close'))
  with check (user_id = auth.uid()
      or public.has_team_permission(public.team_of_match(match_id), 'match.close'));

-- ---------- sanctions ----------
create policy sanctions_select on sanctions for select to authenticated
  using (public.is_club_member(club_id));
create policy sanctions_write on sanctions for all to authenticated
  using (public.has_club_permission(club_id, 'discipline.manage'))
  with check (public.has_club_permission(club_id, 'discipline.manage'));

-- ---------- training ----------
create policy training_sessions_select on training_sessions for select to authenticated
  using (public.is_team_member(team_id) or public.is_platform_admin());
create policy training_sessions_write on training_sessions for all to authenticated
  using (public.has_team_permission(team_id, 'training.manage'))
  with check (public.has_team_permission(team_id, 'training.manage'));

create policy training_attendance_select on training_attendance for select to authenticated
  using (exists (
    select 1 from training_sessions ts
    where ts.id = session_id and public.is_team_member(ts.team_id)
  ));
create policy training_attendance_write on training_attendance for all to authenticated
  using (exists (
    select 1 from training_sessions ts
    where ts.id = session_id and public.has_team_permission(ts.team_id, 'training.manage')
  ))
  with check (exists (
    select 1 from training_sessions ts
    where ts.id = session_id and public.has_team_permission(ts.team_id, 'training.manage')
  ));

-- ---------- sistema ----------
create policy app_settings_select on app_settings for select to authenticated using (true);
create policy app_settings_write  on app_settings for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy audit_log_select on audit_log for select to authenticated
  using (public.is_platform_admin() or (club_id is not null and public.has_club_permission(club_id, 'members.manage')));

create policy error_logs_insert on error_logs for insert to authenticated
  with check (user_id = auth.uid() or user_id is null);
create policy error_logs_select on error_logs for select to authenticated
  using (public.is_platform_admin());


-- =====================================================================
-- 19 · PERMISOS DE ESQUEMA
--
-- La aplicación exige sesión iniciada: el rol anónimo no necesita nada.
-- La RLS protege, pero no conceder de más es la primera barrera.
-- =====================================================================

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

revoke all on all tables in schema public from anon;
revoke all on all functions in schema public from anon;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant execute on functions to authenticated;

-- Fin del esquema inicial.
