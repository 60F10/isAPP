// La preparación global de las pruebas en navegador (T-236).
//
// Corre una vez, antes de la primera prueba, y deja la base LOCAL lista:
//
//  1. Crea a las tres personas de prueba con `auth.admin.createUser` y la
//     clave de servicio local, con el correo ya confirmado. El disparador
//     `handle_new_user` les crea el perfil, igual que a quien entra con Google.
//  2. Aplica `e2e/siembra.sql` con `psql`: club, temporada, equipos, plantilla,
//     competición, miembros y permisos.
//  3. Inicia la sesión de cada una con `signInWithPassword`, desde Node, con un
//     almacén en memoria que captura lo que escribe `supabase-js`, y lo guarda
//     como `storageState` de Playwright en `e2e/.estado/`.
//
// LAS CONTRASEÑAS SON ALEATORIAS y se generan en cada ejecución. No se
// escriben en ningún archivo: viven en esta función y mueren con ella.
//
// LA PANTALLA DE ACCESO NO CAMBIA. La aplicación solo ofrece Google; aquí la
// sesión se siembra por debajo. Lo que queda sin probar es el botón «Entrar
// con Google» y la vuelta por `/auth/callback`.

import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { clienteAnonimo, clienteDeServicio } from './ayudas/clientes';
import { entorno, URL_DE_LA_APLICACION } from './ayudas/entorno';
import { CARPETA_DE_ESTADOS, CORREOS, estadoDe, PERSONAS } from './ayudas/personas';

import type { Persona } from './ayudas/personas';

const SIEMBRA = fileURLToPath(new URL('./siembra.sql', import.meta.url));

function contrasenaNueva(): string {
  return randomBytes(24).toString('base64url');
}

/**
 * Crea la cuenta o, si ya existe —la preparación se ha lanzado dos veces
 * contra la misma base—, le cambia la contraseña por la de esta ejecución.
 */
async function prepararCuenta(persona: Persona, contrasena: string): Promise<void> {
  const servicio = clienteDeServicio();
  const correo = CORREOS[persona];

  const alta = await servicio.auth.admin.createUser({
    email: correo,
    password: contrasena,
    email_confirm: true,
  });

  if (alta.error === null) {
    return;
  }

  const lista = await servicio.auth.admin.listUsers({ page: 1, perPage: 200 });

  if (lista.error !== null) {
    throw new Error(`No se pudo crear la cuenta de «${persona}»: ${alta.error.message}`);
  }

  const existente = lista.data.users.find((usuario) => usuario.email === correo);

  if (existente === undefined) {
    throw new Error(`No se pudo crear la cuenta de «${persona}»: ${alta.error.message}`);
  }

  const cambio = await servicio.auth.admin.updateUserById(existente.id, { password: contrasena });

  if (cambio.error !== null) {
    throw new Error(`No se pudo preparar la cuenta de «${persona}»: ${cambio.error.message}`);
  }
}

/** Aplica la siembra con `psql`, en una sola pasada y parando al primer error. */
function sembrar(): void {
  try {
    execFileSync('psql', [entorno().dbUrl, '-q', '-v', 'ON_ERROR_STOP=1', '-f', SIEMBRA], {
      stdio: ['ignore', 'inherit', 'pipe'],
      encoding: 'utf8',
    });
  } catch (error) {
    const detalle =
      typeof error === 'object' && error !== null && 'stderr' in error ? String(error.stderr) : '';

    throw new Error(`La siembra de pruebas no ha entrado.\n${detalle}`, { cause: error });
  }
}

/**
 * Inicia la sesión de una persona y la guarda como la guardaría el navegador:
 * la misma clave y el mismo valor que `supabase-js` deja en `localStorage`.
 */
async function guardarSesion(persona: Persona, contrasena: string): Promise<void> {
  const almacen = new Map<string, string>();

  const cliente = clienteAnonimo({
    getItem: (clave) => almacen.get(clave) ?? null,
    setItem: (clave, valor) => {
      almacen.set(clave, valor);
    },
    removeItem: (clave) => {
      almacen.delete(clave);
    },
  });

  const { error } = await cliente.auth.signInWithPassword({
    email: CORREOS[persona],
    password: contrasena,
  });

  if (error !== null) {
    throw new Error(`«${persona}» no ha podido entrar: ${error.message}`);
  }

  if (almacen.size === 0) {
    throw new Error(`La sesión de «${persona}» no se ha guardado: el almacén está vacío.`);
  }

  const estado = {
    cookies: [],
    origins: [
      {
        origin: URL_DE_LA_APLICACION,
        localStorage: [...almacen].map(([name, value]) => ({ name, value })),
      },
    ],
  };

  writeFileSync(estadoDe(persona), JSON.stringify(estado), 'utf8');
}

export default async function preparacion(): Promise<void> {
  // Si falta una variable o no apunta a esta máquina, se para aquí.
  entorno();

  const contrasenas = new Map<Persona, string>();

  for (const persona of PERSONAS) {
    const contrasena = contrasenaNueva();

    contrasenas.set(persona, contrasena);
    await prepararCuenta(persona, contrasena);
  }

  sembrar();

  mkdirSync(CARPETA_DE_ESTADOS, { recursive: true });

  for (const persona of PERSONAS) {
    await guardarSesion(persona, contrasenas.get(persona) ?? '');
  }
}
