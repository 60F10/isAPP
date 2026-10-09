// Comprobación automática de accesibilidad de las pantallas principales
// (T-236): ninguna infracción grave ni crítica de `axe`, y sin desplazamiento
// horizontal, a 360 y a 320 de ancho (criterio 1.4.10).
//
// Con el entrenador, que es quien ve cada pantalla con todo lo que tiene.
// Qué mira `axe` y qué no, y cómo se excluye una regla: `ayudas/accesibilidad.ts`.

import { expect, test } from '@playwright/test';

import { sinDesplazamientoHorizontal, sinInfraccionesGraves } from './ayudas/accesibilidad';
import { EQUIPO } from './ayudas/datos';
import { estadoDe } from './ayudas/personas';

interface Pantalla {
  nombre: string;
  ruta: string;
  titulo: string;
  /** Lo último que pinta la pantalla: con esto a la vista, ya ha cargado. */
  cargada: { rol: 'heading' | 'table' | 'link' | 'button'; nombre: string };
  /** Reglas de `axe` apuntadas en el DOC 13, cada una con su punto. */
  excluir?: readonly string[];
}

const PANTALLAS: readonly Pantalla[] = [
  {
    nombre: 'Inicio',
    ruta: '/',
    titulo: 'Inicio',
    cargada: { rol: 'heading', nombre: 'Avisos pendientes' },
  },
  {
    nombre: 'Calendario',
    ruta: '/calendario',
    titulo: 'Calendario',
    cargada: { rol: 'heading', nombre: 'Jugados' },
  },
  {
    nombre: 'Equipo',
    ruta: '/equipo',
    titulo: EQUIPO.nombre,
    cargada: { rol: 'heading', nombre: 'Gestión' },
  },
  {
    nombre: 'Más',
    ruta: '/mas',
    titulo: 'Más',
    cargada: { rol: 'link', nombre: 'Mis aportaciones' },
  },
  {
    nombre: 'Ajustes',
    ruta: '/ajustes',
    titulo: 'Ajustes',
    cargada: { rol: 'button', nombre: 'Cerrar sesión' },
  },
];

const ANCHOS = [360, 320];

test.use({ storageState: estadoDe('entrenador') });

for (const pantalla of PANTALLAS) {
  for (const ancho of ANCHOS) {
    test(`${pantalla.nombre}, a ${ancho} de ancho`, async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: 740 });
      await page.goto(pantalla.ruta);

      await expect(
        page.getByRole('heading', { level: 1, name: pantalla.titulo, exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole(pantalla.cargada.rol, { name: pantalla.cargada.nombre }),
      ).toBeVisible();
      // Nada a medio cargar: `axe` mira lo que hay en pantalla en ese instante.
      await expect(page.getByText('Cargando…')).toHaveCount(0);

      await sinInfraccionesGraves(page, { excluir: pantalla.excluir });
      await sinDesplazamientoHorizontal(page);
    });
  }
}
