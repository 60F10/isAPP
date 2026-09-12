// Lectura y validación de las variables de entorno (DOC 06 §12, decisión D06-21).
//
// Solo las que empiezan por VITE_ llegan al navegador, y todo lo que llega al
// navegador es público. La clave service_role no aparece aquí ni en ningún otro
// archivo del frontend (DOC 10 §3.1).
//
// Aquí no hay valores por defecto a propósito: un despliegue mal configurado
// tiene que romper al arrancar y decir qué le falta, en vez de producir un
// `undefined` que viaja hasta una llamada de red en producción.
//
// El resto de la aplicación importa `env`, nunca `import.meta.env`.

const ENTORNOS = ['development', 'production'] as const;

export type AppEnv = (typeof ENTORNOS)[number];

export interface Env {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_ANON_KEY: string;
  readonly APP_ENV: AppEnv;
}

// Acceso estático a propósito. Vite sustituye `import.meta.env.VITE_X` por su
// valor literal al compilar; el acceso dinámico `import.meta.env[nombre]` no se
// sustituye y llegaría vacío a producción aunque en `npm run dev` funcionase.
const CRUDAS = {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  VITE_APP_ENV: import.meta.env.VITE_APP_ENV,
};

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : '';
}

function esUrlHttps(valor: string): boolean {
  try {
    return new URL(valor).protocol === 'https:';
  } catch {
    return false;
  }
}

function esAppEnv(valor: string): valor is AppEnv {
  return (ENTORNOS as readonly string[]).includes(valor);
}

function validar(): Env {
  const supabaseUrl = texto(CRUDAS.VITE_SUPABASE_URL);
  const supabaseAnonKey = texto(CRUDAS.VITE_SUPABASE_ANON_KEY);
  const appEnv = texto(CRUDAS.VITE_APP_ENV);
  const fallos: string[] = [];

  if (supabaseUrl === '') {
    fallos.push('VITE_SUPABASE_URL: falta o está vacía.');
  } else if (!esUrlHttps(supabaseUrl)) {
    fallos.push(`VITE_SUPABASE_URL: "${supabaseUrl}" no es una URL https válida.`);
  }

  // El valor nunca se imprime: es público, pero no hay motivo para pasearlo.
  if (supabaseAnonKey === '') {
    fallos.push('VITE_SUPABASE_ANON_KEY: falta o está vacía.');
  }

  if (appEnv === '') {
    fallos.push('VITE_APP_ENV: falta o está vacía.');
  } else if (!esAppEnv(appEnv)) {
    fallos.push(`VITE_APP_ENV: "${appEnv}" no vale. Admitidos: ${ENTORNOS.join(', ')}.`);
  }

  if (fallos.length > 0) {
    throw new Error(
      [
        'Configuración de entorno incompleta o incorrecta:',
        ...fallos.map((fallo) => `  · ${fallo}`),
        'En local se copian de .env.example a .env.local; en despliegue van en las variables',
        'de entorno de Netlify (DOC 10 §3).',
      ].join('\n'),
    );
  }

  return {
    SUPABASE_URL: supabaseUrl,
    SUPABASE_ANON_KEY: supabaseAnonKey,
    // Validado justo arriba: si no encajara, `validar` ya habría lanzado.
    APP_ENV: appEnv as AppEnv,
  };
}

export const env: Env = validar();
