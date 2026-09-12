-- =====================================================================
-- GavetaStats — Permiso event.approve
-- Anexo del DOC 05 · 12/09/2026 · T-100b (1 de 2)
--
-- Destino: supabase/migrations/20260912142001_permiso_event_approve.sql
--
-- Va SOLA en su propio archivo a propósito. PostgreSQL admite ALTER TYPE
-- ... ADD VALUE dentro de una transacción desde la 12, pero no deja USAR
-- el valor nuevo en esa misma transacción: las políticas que lo citan
-- viven en la migración siguiente, que se aplica por separado.
--
-- El reparto del día de partido parte match.close en dos (DOC 04 §6.2 y
-- §12): event.approve aprueba, rechaza y edita eventos ajenos;
-- match.close sigue cerrando el partido y confirmando el acta.
-- =====================================================================

-- BEFORE 'match.close' mantiene el orden del DOC 05 §3: el valor queda
-- entre match.live.write y match.close, como está documentado.
alter type public.app_permission
  add value if not exists 'event.approve' before 'match.close';

-- Fin.
