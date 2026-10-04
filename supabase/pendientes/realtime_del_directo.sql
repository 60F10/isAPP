-- =========================================================================
-- DOC 05 §14.9 · Realtime para el directo (T-209b). SIN APLICAR.
--
-- La publicación `supabase_realtime` está vacía. Con estas dos tablas dentro,
-- el directo recibe un aviso cuando otro aparato apunta, borra o cambia algo,
-- y cuando alguien abre o cierra una parte. Realtime respeta la RLS de
-- lectura de cada tabla: no se toca ninguna política.
--
-- El aviso solo dice «algo ha cambiado»: el dato sale de volver a descargar
-- el paquete. Sin esta migración el directo funciona igual, con el refresco
-- de seguridad, que es más lento.
-- =========================================================================

alter publication supabase_realtime add table public.match_events, public.match_periods;
