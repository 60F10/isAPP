// Quién ve qué al entrar (T-236).
//
// Las tres personas de prueba, cada una con su sesión, y nadie: lo que le
// toca ver a cada una y a dónde va a parar lo que no le toca. Aquí manda la
// pantalla; lo que decide la base está en `base.spec.ts`.

import { expect, test } from '@playwright/test';

import { EQUIPO } from './ayudas/datos';
import { estadoDe, SIN_SESION } from './ayudas/personas';

import type { Page } from '@playwright/test';

function titulo(page: Page, nombre: string) {
  return page.getByRole('heading', { level: 1, name: nombre, exact: true });
}

function barra(page: Page) {
  return page.getByRole('navigation', { name: 'Principal' });
}

test.describe('quien lleva el equipo', () => {
  test.use({ storageState: estadoDe('entrenador') });

  // DOC 13, punto 92: Inicio no le dice su equipo a quien tiene función en
  // él. Solo lo nombra la tarjeta de quien sigue al equipo y la del próximo
  // partido, cuando lo hay. Sin partidos, el entrenador abre Inicio y no lee
  // en ningún sitio con qué equipo está.
  test.fixme('abre Inicio y lee el nombre de su equipo', async ({ page }) => {
    await page.goto('/');

    await expect(titulo(page, 'Inicio')).toBeVisible();
    await expect(page.getByText(EQUIPO.nombre)).toBeVisible();
  });

  test('recorre los cinco destinos de la barra y ninguno acaba en /403', async ({ page }) => {
    // Cada destino, con la dirección en la que tiene que quedarse y el título
    // que se lee al llegar. El nombre del equipo es el título de «Equipo».
    const destinos = [
      { enlace: 'Equipo', ruta: '/equipo', titulo: EQUIPO.nombre },
      { enlace: 'Agenda', ruta: '/calendario', titulo: 'Calendario' },
      { enlace: 'Datos', ruta: '/estadisticas', titulo: 'Estadísticas' },
      { enlace: 'Más', ruta: '/mas', titulo: 'Más' },
      { enlace: 'Inicio', ruta: '/', titulo: 'Inicio' },
    ];

    await page.goto('/');
    await expect(titulo(page, 'Inicio')).toBeVisible();

    for (const destino of destinos) {
      await barra(page).getByRole('link', { name: destino.enlace, exact: true }).click();

      await expect(titulo(page, destino.titulo)).toBeVisible();
      expect(new URL(page.url()).pathname).toBe(destino.ruta);
    }
  });

  test('ve la tarjeta «Gestión» en «Equipo», con sus cuatro enlaces', async ({ page }) => {
    await page.goto('/equipo');

    await expect(titulo(page, EQUIPO.nombre)).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Gestión' })).toBeVisible();

    for (const enlace of [
      'Editar la plantilla',
      'Personas y permisos',
      'Club',
      'Equipos del club',
    ]) {
      await expect(page.getByRole('link', { name: enlace, exact: true })).toBeVisible();
    }
  });

  // El control de «quien solo sigue al equipo ve el calendario»: estos dos
  // enlaces existen y salen a quien le tocan.
  test('ve «Nuevo partido» y «Todos los entrenamientos» en el calendario', async ({ page }) => {
    await page.goto('/calendario');

    await expect(titulo(page, 'Calendario')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Nuevo partido' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Todos los entrenamientos' })).toBeVisible();
  });
});

test.describe('quien solo anota', () => {
  test.use({ storageState: estadoDe('anotador') });

  test('abre «Equipo» y no ve la tarjeta «Gestión»', async ({ page }) => {
    // Primero «Más»: «Mis aportaciones» solo sale cuando los permisos ya han
    // llegado. Sin esperar a eso, que no esté «Gestión» no probaría nada: la
    // tarjeta tampoco sale mientras los permisos cargan.
    await page.goto('/mas');
    await expect(page.getByRole('link', { name: 'Mis aportaciones' })).toBeVisible();

    await barra(page).getByRole('link', { name: 'Equipo', exact: true }).click();

    await expect(titulo(page, EQUIPO.nombre)).toBeVisible();
    await expect(page.getByRole('table', { name: `Plantilla de ${EQUIPO.nombre}` })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Gestión' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Equipos del club' })).toHaveCount(0);
  });

  test('si escribe /equipos, acaba en la pantalla de sin permiso', async ({ page }) => {
    await page.goto('/equipos');

    await expect(titulo(page, 'Sin permiso')).toBeVisible();
    expect(new URL(page.url()).pathname).toBe('/403');
  });
});

test.describe('quien solo sigue al equipo', () => {
  test.use({ storageState: estadoDe('seguidor') });

  test('ve el calendario', async ({ page }) => {
    await page.goto('/calendario');

    await expect(titulo(page, 'Calendario')).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Por jugar' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Jugados' })).toBeVisible();
    // Sin función en el equipo, ni programa partidos ni ve los entrenamientos.
    // Que no estén solo dice algo porque al entrenador sí le salen, arriba.
    await expect(page.getByRole('link', { name: 'Nuevo partido' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Todos los entrenamientos' })).toHaveCount(0);
  });

  test('lee en «Equipo» que sigue al equipo', async ({ page }) => {
    await page.goto('/equipo');

    await expect(titulo(page, EQUIPO.nombre)).toBeVisible();
    await expect(page.getByText('Sigues a este equipo: puedes verlo, no cambiarlo.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Gestión' })).toHaveCount(0);
  });
});

test.describe('sin sesión', () => {
  test.use({ storageState: SIN_SESION });

  for (const ruta of ['/', '/equipo', '/calendario', '/partidos/nuevo', '/mas', '/ajustes']) {
    test(`${ruta} lleva al acceso`, async ({ page }) => {
      await page.goto(ruta);

      await expect(titulo(page, 'Entrar')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Entrar con Google' })).toBeVisible();
      expect(new URL(page.url()).pathname).toBe('/login');
    });
  }
});
