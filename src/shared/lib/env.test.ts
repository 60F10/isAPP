// Pruebas de la validación de entorno (DOC 06 §12, decisión D06-21).
//
// `env.ts` lee `import.meta.env` y lanza desde el cuerpo del módulo, no desde
// una función exportada: el despliegue mal configurado tiene que romper al
// arrancar. Eso condiciona cómo se prueba, y conviene dejarlo escrito antes de
// que alguien «arregle» el módulo para hacerlo más cómodo:
//
//   · El entorno se cambia con `vi.stubEnv`, que escribe a la vez en
//     `process.env` y en `import.meta.env`.
//   · Cada caso llama a `vi.resetModules()` y reimporta con `await import()`.
//     Sin eso, la segunda importación devolvería la copia en caché de la
//     primera y los diecisiete casos medirían exactamente lo mismo.
//   · Las tres variables se fijan siempre, también las que el caso no toca.
//     Así un `.env.local` de la máquina de quien ejecute no cambia el
//     resultado, y la prueba vale igual en local que en el CI.
//
// `unstubEnvs: true` en vite.config.ts deshace los cambios tras cada caso.

import { describe, expect, it, vi } from 'vitest';

// Valor reconocible para comprobar que la clave anónima no se pasea por los
// mensajes de error. No es una clave real y no vale para nada.
const CLAVE_CENTINELA = 'clave-anonima-de-prueba-que-no-debe-salir-en-un-mensaje';

const VALIDAS: Record<string, string> = {
  VITE_SUPABASE_URL: 'https://proyecto.supabase.co',
  VITE_SUPABASE_ANON_KEY: CLAVE_CENTINELA,
  VITE_APP_ENV: 'development',
};

const NOMBRES = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_APP_ENV'];

type Cambios = Record<string, string | undefined>;

// Deja `import.meta.env` con exactamente estas tres variables y reimporta el
// módulo. Pasar `undefined` en un cambio borra la variable, que es lo que
// simula un despliegue al que le falta.
async function importarEnv(cambios: Cambios = {}) {
  const valores: Cambios = { ...VALIDAS, ...cambios };

  for (const nombre of NOMBRES) {
    vi.stubEnv(nombre, valores[nombre]);
  }

  vi.resetModules();
  return await import('@shared/lib/env');
}

// La importación lanza en casi todos los casos, y encadenar `rejects` sobre la
// misma promesa deja avisos de rechazo no gestionado. Se captura una vez y se
// mira el mensaje entero, que además es lo que de verdad se quiere probar.
async function capturarError(cambios: Cambios): Promise<Error> {
  try {
    await importarEnv(cambios);
  } catch (error) {
    return error as Error;
  }

  throw new Error('Se esperaba que importar env.ts lanzara, y no lanzó.');
}

describe('env, con el entorno bien puesto', () => {
  it('devuelve las tres variables ya validadas', async () => {
    const { env } = await importarEnv();

    expect(env.SUPABASE_URL).toBe('https://proyecto.supabase.co');
    expect(env.SUPABASE_ANON_KEY).toBe(CLAVE_CENTINELA);
    expect(env.APP_ENV).toBe('development');
  });

  it('admite production como entorno', async () => {
    const { env } = await importarEnv({ VITE_APP_ENV: 'production' });

    expect(env.APP_ENV).toBe('production');
  });

  it('recorta los espacios de alrededor', async () => {
    const { env } = await importarEnv({ VITE_APP_ENV: '  production  ' });

    expect(env.APP_ENV).toBe('production');
  });
});

describe('env, cuando falta una variable', () => {
  it.each(NOMBRES)('lanza al importar y nombra %s', async (nombre) => {
    const error = await capturarError({ [nombre]: undefined });

    expect(error.message).toContain(`${nombre}: falta o está vacía.`);
  });

  it.each(NOMBRES)('trata %s con solo espacios como que falta', async (nombre) => {
    const error = await capturarError({ [nombre]: '   ' });

    expect(error.message).toContain(`${nombre}: falta o está vacía.`);
  });

  it('dice dónde se ponen las variables en vez de soltar el fallo a secas', async () => {
    const error = await capturarError({ VITE_APP_ENV: undefined });

    expect(error.message).toContain('Configuración de entorno incompleta o incorrecta:');
    expect(error.message).toContain('.env.local');
    expect(error.message).toContain('Netlify');
  });

  it('junta todos los fallos en un solo mensaje', async () => {
    const error = await capturarError({
      VITE_SUPABASE_URL: undefined,
      VITE_SUPABASE_ANON_KEY: '   ',
      VITE_APP_ENV: 'pretemporada',
    });

    expect(error.message).toContain('VITE_SUPABASE_URL: falta o está vacía.');
    expect(error.message).toContain('VITE_SUPABASE_ANON_KEY: falta o está vacía.');
    expect(error.message).toContain('VITE_APP_ENV: "pretemporada" no vale.');
  });
});

describe('env, cuando una variable no vale', () => {
  it('rechaza una URL de Supabase que no es https', async () => {
    const error = await capturarError({ VITE_SUPABASE_URL: 'http://proyecto.supabase.co' });

    expect(error.message).toContain(
      'VITE_SUPABASE_URL: "http://proyecto.supabase.co" no es una URL https válida.',
    );
  });

  it('rechaza una URL de Supabase que ni siquiera es una URL', async () => {
    const error = await capturarError({ VITE_SUPABASE_URL: 'proyecto.supabase.co' });

    expect(error.message).toContain('VITE_SUPABASE_URL: "proyecto.supabase.co"');
    expect(error.message).toContain('no es una URL https válida.');
  });

  it('rechaza un entorno fuera de la lista y dice cuáles valen', async () => {
    const error = await capturarError({ VITE_APP_ENV: 'staging' });

    expect(error.message).toContain(
      'VITE_APP_ENV: "staging" no vale. Admitidos: development, production.',
    );
  });
});

// El mensaje de error acaba en la consola del navegador, en el registro de
// Netlify y, cuando exista la T-106, en una pantalla. La clave anónima es
// pública mientras la RLS esté activa, pero no hay ningún motivo para
// pasearla: `env.ts` la omite a propósito y esto es lo que lo vigila. Es justo
// lo que una refactorización «para que el mensaje sea más útil» rompe sin
// darse cuenta.
const CASOS_SIN_CLAVE: Array<[string, Cambios]> = [
  ['el entorno no vale', { VITE_APP_ENV: 'staging' }],
  ['el entorno falta', { VITE_APP_ENV: undefined }],
  ['la URL no es https', { VITE_SUPABASE_URL: 'http://proyecto.supabase.co' }],
];

describe('env, mensajes de error', () => {
  it.each(CASOS_SIN_CLAVE)('no mete la clave anónima cuando %s', async (_caso, cambios) => {
    const error = await capturarError(cambios);

    expect(error.message).not.toContain(CLAVE_CENTINELA);
  });
});
