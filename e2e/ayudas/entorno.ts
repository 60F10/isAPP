// El entorno de las pruebas en navegador (T-236).
//
// Cuatro variables, y las cuatro las pone el flujo E2E con lo que devuelve
// `supabase status -o env`: son las de una base que nace y muere en cada
// ejecución. Aquí no hay valores por defecto a propósito, igual que en
// `src/shared/lib/env.ts`: si falta una, la preparación para y lo dice.
//
// NUNCA CONTRA PRODUCCIÓN. La URL tiene que ser de esta misma máquina. Si
// alguien apunta las pruebas a un proyecto de verdad, no arrancan: crean
// cuentas, siembran datos y escriben con la clave de servicio.

const LOCALES = ['127.0.0.1', 'localhost', '[::1]'];

function variable(nombre: string): string {
  const valor = (process.env[nombre] ?? '').trim();

  if (valor === '') {
    throw new Error(
      `Falta la variable ${nombre}. Las pruebas en navegador corren en GitHub Actions, ` +
        'contra un Supabase local: mira e2e/README.md.',
    );
  }

  return valor;
}

function soloLocal(nombre: string, direccion: string): string {
  const { hostname } = new URL(direccion);

  if (!LOCALES.includes(hostname)) {
    throw new Error(
      `${nombre} apunta a «${hostname}», que no es esta máquina. ` +
        'Las pruebas en navegador solo corren contra un Supabase local.',
    );
  }

  return direccion;
}

/** Dónde sirve Playwright la aplicación compilada (`vite preview`). */
export const URL_DE_LA_APLICACION = 'http://127.0.0.1:4173';

export interface Entorno {
  /** La API del Supabase local, por HTTPS: la aplicación no admite otra cosa. */
  readonly supabaseUrl: string;
  readonly anonKey: string;
  /** Clave de servicio LOCAL. Se salta la RLS: solo para preparar y comprobar. */
  readonly serviceRoleKey: string;
  /** Conexión directa a la base local, para `psql`. */
  readonly dbUrl: string;
}

export function entorno(): Entorno {
  return {
    supabaseUrl: soloLocal('E2E_SUPABASE_URL', variable('E2E_SUPABASE_URL')),
    anonKey: variable('E2E_ANON_KEY'),
    serviceRoleKey: variable('E2E_SERVICE_ROLE_KEY'),
    dbUrl: soloLocal('E2E_DB_URL', variable('E2E_DB_URL')),
  };
}
