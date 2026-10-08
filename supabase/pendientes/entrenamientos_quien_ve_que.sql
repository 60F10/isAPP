-- =========================================================================
-- DOC 05 §14.10 · Entrenamientos: quién ve qué (T-227).
-- SIN APLICAR. Lo pega Raúl en el SQL Editor, entero y de una vez.
--
-- Decisión de Raúl del 08/10/2026:
--   · EL HORARIO de los entrenamientos lo ve todo el club: quien tiene
--     función en cualquiera de sus equipos.
--   · LA ASISTENCIA Y LAS OBSERVACIONES, que son texto libre sobre menores,
--     solo las ve quien tiene `training.manage` en el equipo y el
--     administrador de la plataforma.
--
-- Qué cambia:
--   1. `training_sessions`: la lectura pasa del equipo al club.
--   2. `training_attendance`: la lectura pasa de cualquier miembro del
--      equipo a `training.manage` o administrador de la plataforma.
--   3. `training_sessions.notes` queda sin uso y la base lo garantiza: la
--      fila se ve en todo el club, así que ahí no puede ir una observación.
--      La observación del entrenamiento tendrá su propia tabla (T-233).
--
-- Escribir no cambia: sigue pidiendo `training.manage` en las dos tablas.
-- Las dos tablas están vacías al escribir esto: no cambia ningún dato.
--
-- Va en un solo bloque `do`: o entra todo, también el apunte en el historial
-- de migraciones, o no entra nada. Al aplicarlo, este archivo pasa a
-- `supabase/migrations/20261008190000_entrenamientos_quien_ve_que.sql`.
-- =========================================================================

do $migracion$
begin
  -- 1. El horario lo ve todo el club.
  drop policy if exists training_sessions_select on public.training_sessions;

  create policy training_sessions_select on public.training_sessions
    for select to authenticated
    using (
      public.is_platform_admin()
      or exists (
        select 1
        from public.teams t
        where t.id = training_sessions.team_id
          and public.is_club_member(t.club_id)
      )
    );

  -- 2. La asistencia y sus observaciones: quien pasa lista y el administrador.
  drop policy if exists training_attendance_select on public.training_attendance;

  create policy training_attendance_select on public.training_attendance
    for select to authenticated
    using (
      exists (
        select 1
        from public.training_sessions ts
        where ts.id = training_attendance.session_id
          and (
            public.has_team_permission(ts.team_id, 'training.manage')
            or public.is_platform_admin()
          )
      )
    );

  -- 3. `notes` no se usa: la fila es visible para todo el club.
  alter table public.training_sessions
    add constraint training_sessions_notes_sin_uso check (notes is null);

  comment on column public.training_sessions.notes is
    'Sin uso desde el 08/10/2026: la sesión la ve todo el club. La observación del entrenamiento va en su propia tabla (DOC 05 §14.10).';

  insert into supabase_migrations.schema_migrations (version, name, statements)
  values (
    '20261008190000',
    'entrenamientos_quien_ve_que',
    array['-- Aplicada a mano desde el SQL Editor. El SQL está en supabase/migrations/20261008190000_entrenamientos_quien_ve_que.sql']
  );
end
$migracion$;

-- Comprobación, después de aplicar. Tiene que devolver cuatro filas: dos
-- `_select` con `cmd` = SELECT y dos `_write` con `cmd` = ALL.
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('training_sessions', 'training_attendance')
order by tablename, policyname;
