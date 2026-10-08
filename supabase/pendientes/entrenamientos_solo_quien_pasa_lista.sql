-- =========================================================================
-- DOC 05 §14.10 · Entrenamientos: solo los ve quien pasa lista (T-227).
-- SIN APLICAR. Lo pega Raúl en el SQL Editor, entero y de una vez.
--
-- Decisión de Raúl del 08/10/2026: la asistencia y las observaciones de los
-- entrenamientos solo las ven los entrenadores, es decir, quien tiene
-- `training.manage` en el equipo. Son texto libre sobre menores.
--
-- Hasta hoy cada tabla tiene dos políticas: una de lectura para cualquier
-- miembro del equipo (y, en las sesiones, para el administrador de la
-- plataforma) y otra `for all` con `training.manage`. Se quita la de lectura:
-- queda la `for all`, que ya cubre el SELECT con el mismo permiso.
--
-- La observación global vive en `training_sessions.notes`, así que la sesión
-- entera pasa a verla solo quien pasa lista, también su día y su lugar.
--
-- Va en un solo bloque `do`: o entra todo, también el apunte en el historial
-- de migraciones, o no entra nada. Al aplicarlo, este archivo pasa a
-- `supabase/migrations/20261008190000_entrenamientos_solo_quien_pasa_lista.sql`.
-- =========================================================================

do $migracion$
begin
  drop policy if exists training_sessions_select on public.training_sessions;
  drop policy if exists training_attendance_select on public.training_attendance;

  comment on policy training_sessions_write on public.training_sessions is
    'Leer y escribir: solo training.manage en el equipo. Sin política de lectura aparte (DOC 05 §14.10).';
  comment on policy training_attendance_write on public.training_attendance is
    'Leer y escribir: solo training.manage en el equipo de la sesión. Sin política de lectura aparte (DOC 05 §14.10).';

  insert into supabase_migrations.schema_migrations (version, name, statements)
  values (
    '20261008190000',
    'entrenamientos_solo_quien_pasa_lista',
    array['-- Aplicada a mano desde el SQL Editor. El SQL está en supabase/migrations/20261008190000_entrenamientos_solo_quien_pasa_lista.sql']
  );
end
$migracion$;

-- Comprobación, después de aplicar. Tiene que devolver dos filas, las dos
-- con `cmd` = ALL: training_attendance_write y training_sessions_write.
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('training_sessions', 'training_attendance')
order by tablename, policyname;
