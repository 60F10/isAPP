// Hooks de la lista de asistencia (T-229): atan `model/` y `api/` a la A15.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@modules/auth';

import { fetchAsistencia, guardarAsistencia } from '../api/asistencia';
import { trainingKeys } from '../api/queryKeys';
import {
  asistenciaTrasGuardar,
  cambiosTrasGuardar,
  filasAGuardar,
  guardarBorrador,
  leerBorrador,
  SIN_CAMBIOS,
} from '../model/lista';

import type { Asistencia, Cambios, LineaDeLista } from '../model/lista';

export function useAsistencia(sesionId: string) {
  return useQuery({
    queryKey: trainingKeys.asistencia(sesionId),
    queryFn: () => fetchAsistencia(sesionId),
  });
}

/** Lo que viaja al guardar: las líneas de la pantalla y lo tocado en ese momento. */
export interface ListaAGuardar {
  lineas: readonly LineaDeLista[];
  enviados: Cambios;
}

/**
 * Guarda la lista: recibe las líneas de la pantalla y manda las que tienen
 * estado.
 *
 * AL SALIR BIEN, LO GUARDADO SE PONE EN LA CACHÉ ANTES DE RELEER. La pantalla
 * vacía lo tocado en ese mismo momento («lo guardado manda»), y si la caché
 * siguiera con lo de antes, la lista volvería un instante a como estaba, o
 * del todo si la relectura falla por cobertura. Después se invalida todo lo de
 * `training`, sin esperar (`CLAUDE.md`, T-210a): la relectura confirma lo que
 * hay en la base, también lo que otro aparato haya guardado entre tanto.
 *
 * EL BORRADOR SE PONE AL DÍA AQUÍ, y no solo en la pantalla. Si se sale de la
 * lista con el guardado en camino, la pantalla ya no está y TanStack Query no
 * llama a su `onSuccess`: el borrador se quedaría con lo que ya está guardado,
 * y al volver saldría «Tienes cambios sin guardar de antes.» sin ser verdad.
 * Se parte del borrador del móvil, que cada toque escribe en el momento, y se
 * le quita lo que viajó (`cambiosTrasGuardar`).
 */
export function useGuardarLista(sesionId: string) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const userId = session === null ? '' : session.user.id;

  return useMutation({
    mutationFn: ({ lineas }: ListaAGuardar) => {
      if (session === null) {
        throw new Error('Sin sesión.');
      }

      return guardarAsistencia(sesionId, session.user.id, filasAGuardar(lineas));
    },
    onSuccess: (_nada, { lineas, enviados }) => {
      queryClient.setQueryData<Asistencia[]>(
        trainingKeys.asistencia(sesionId),
        asistenciaTrasGuardar(lineas),
      );
      guardarBorrador(
        sesionId,
        userId,
        cambiosTrasGuardar(leerBorrador(sesionId, userId) ?? SIN_CAMBIOS, enviados, lineas),
      );
      void queryClient.invalidateQueries({ queryKey: trainingKeys.all });
    },
  });
}
