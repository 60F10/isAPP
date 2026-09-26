// Caché de datos de servidor (DOC 06 §8). Un solo QueryClient para toda la
// aplicación: crearlo dentro del componente lo tiraría y lo volvería a crear
// en cada render, y con él toda la caché.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { esErrorDefinitivo } from '@shared/lib/guardado';

import type { ReactNode } from 'react';

/**
 * Un error del dato o del permiso no se reintenta nunca: la petición está mal
 * o la RLS ha dicho que no, y el segundo intento va a fallar igual.
 * Reintentar solo gasta batería y datos justo cuando la cobertura del campo es
 * la que es. Los fallos del servidor y los cortes de red, que sí son
 * pasajeros, se reintentan hasta dos veces.
 *
 * Qué es definitivo lo decide `esErrorDefinitivo`: hasta la T-206 solo se
 * miraba el estado HTTP, y el error de Supabase no lo trae (DOC 06 §10.1).
 */

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cinco minutos de dato fresco: en un partido nada de lo que se consulta
      // cambia más rápido que eso, y lo que sí cambia lo escribe esta misma
      // aplicación y se invalida a mano.
      staleTime: 5 * 60 * 1000,
      // Un día en caché. El móvil se bloquea y se desbloquea toda la tarde: al
      // volver, lo que ya se descargó sigue ahí en vez de pedirse otra vez.
      gcTime: 24 * 60 * 60 * 1000,
      // Apagado a propósito. En el campo la pantalla se bloquea y se desbloquea
      // cada dos minutos, y cada vuelta al foco dispararía una ráfaga de
      // peticiones justo cuando peor va la cobertura.
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => !esErrorDefinitivo(error) && failureCount < 2,
    },
  },
});

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
