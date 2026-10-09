-- =====================================================================
-- GavetaStats — Endurecimiento de permisos sobre funciones
-- Anexo del DOC 05 · 19/09/2026 · deuda arrastrada de la T-100b
--
-- Sin número de tarea del DOC 08: son los puntos 3 y 4 de «lo que sigue
-- abierto» del DOC 13, abiertos desde la T-100b.
--
-- El nombre del archivo y la versión registrada en el historial remoto
-- coinciden, como exige el DOC 05 §14.
--
-- Esta migración solo toca permisos: no crea ni redefine ninguna
-- función, ninguna política ni ninguna columna. REVOKE trabaja sobre la
-- firma, no sobre el cuerpo, y por eso el punto 3 se cierra sin meter en
-- el repositorio una función que gestiona Supabase, que era la pega que
-- lo tenía parado desde el 12/09.
-- =====================================================================


-- =====================================================================
-- 1 · public.rls_auto_enable() DEJA DE SER LLAMABLE DESDE LA API
--
-- Es la función del disparador de eventos `ensure_rls`, que Supabase
-- instala para activar la RLS en cada tabla nueva de `public`. La
-- gestiona la plataforma, no el proyecto, y el auditor la marca dos
-- veces: 0028 porque la ejecuta `anon` y 0029 porque la ejecuta
-- `authenticated`, las dos por ser SECURITY DEFINER y vivir en el
-- esquema expuesto.
--
-- OJO CON EL REVOKE, que aquí está lo que importa: el permiso de `anon`
-- no era una concesión suya, era la de PUBLIC. La ACL de la función era
-- «=X/postgres | postgres=X/postgres | authenticated=X/postgres |
-- service_role=X/postgres», y ese «=X» sin nombre delante es PUBLIC.
-- Revocar solo de `anon` no habría cambiado nada y el aviso habría
-- seguido ahí. Es la misma regla que dejó el endurecimiento del 11/09
-- (DOC 05 §14.1): revocar de una función se hace siempre de `public`
-- además de `anon`.
--
-- Se revoca también de `authenticated`, que sí tenía concesión propia.
-- A una función de disparador de eventos no la llama nadie por RPC: la
-- invoca el motor al final de cada DDL, y esa invocación no comprueba
-- EXECUTE. `postgres` y `service_role` conservan el suyo.
--
-- RETOCADA EL 09/10/2026, EN LA T-236 Y POR DECISIÓN DE RAÚL. El revoke
-- va ahora dentro de un bloque que solo lo lanza si la función existe,
-- para que esta migración se repita en un Supabase limpio: allí la
-- plataforma no instala `ensure_rls` y la sentencia sin condición
-- fallaba con 42883. Producción aplicó el 19/09 la versión sin
-- condición y allí el efecto es el mismo, porque la función existe.
-- Nada de esto se vuelve a aplicar a producción.
-- =====================================================================

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end
$$;


-- =====================================================================
-- 2 · LAS SIETE FUNCIONES DE DISPARADOR PIERDEN EL EXECUTE DE
--     `authenticated`, QUE NO LES HACE FALTA
--
-- PostgreSQL comprueba EXECUTE al CREAR el disparador, no al dispararlo:
-- de ahí en adelante la llamada la hace el motor y no consulta la ACL.
-- Revocar no rompe ningún disparador. Lo único que quita es poder
-- llamarlas a mano por /rest/v1/rpc, que es justo lo que no se quiere de
-- siete funciones SECURITY DEFINER que escriben saltándose la RLS.
--
-- Comprobado antes de aplicar, no supuesto: en una prueba aparte se creó
-- una tabla con un disparador BEFORE INSERT cuya función no tenía
-- EXECUTE ni para PUBLIC ni para `authenticated`, se insertó con `set
-- local role authenticated` y el disparador saltó igual (el valor entró
-- como 2 en vez de como 1). Los objetos de la prueba se borraron al
-- terminar.
--
-- `service_role` conserva el suyo a propósito: es la llave del servidor.
-- =====================================================================

revoke execute on function public.audit_row() from authenticated;
revoke execute on function public.backfill_event_seconds() from authenticated;
revoke execute on function public.enforce_match_changes() from authenticated;
revoke execute on function public.handle_new_user() from authenticated;
revoke execute on function public.set_event_seconds() from authenticated;
revoke execute on function public.set_match_club_id() from authenticated;
revoke execute on function public.validate_match_event() from authenticated;


-- =====================================================================
-- 3 · LO QUE NO SE TOCA, Y POR QUÉ
--
-- `public.set_updated_at()` es la octava función de disparador y arrastra
-- el mismo EXECUTE de `authenticated` que sobra. No entra aquí porque el
-- auditor no la marca —es SECURITY INVOKER, así que llamarla a mano no
-- salta la RLS— y porque el alcance de esta migración son los puntos 3 y
-- 4 del DOC 13, que hablan de siete funciones. Queda anotada como deuda
-- de una línea.
--
-- Las once funciones auxiliares y de RPC que el aviso 0029 sigue
-- marcando —`has_team_permission`, `is_club_member`, `team_of_match`,
-- `rebuild_match_stints`, `flag_duplicate_candidates` y compañía— sí
-- necesitan ese EXECUTE: las llaman las políticas RLS y el cliente. Ahí
-- el aviso es informativo y se queda.
-- =====================================================================

-- Fin del endurecimiento de permisos.
