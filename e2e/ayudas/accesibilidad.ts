// La comprobación automática de accesibilidad (T-236).
//
// `axe` con las reglas de WCAG 2.2 AA, que es la referencia del proyecto
// (DOC 02 §5). Solo hacen fallar la prueba las infracciones graves y
// críticas: las demás salen en el informe y no paran a nadie.
//
// LO QUE `axe` NO VE. Un programa encuentra más o menos un tercio de los
// fallos de accesibilidad: contraste, nombres, roles y estructura. No sabe si
// el orden del foco tiene sentido ni si un texto se entiende. Esto es una
// red, no la verificación por pantalla del DOC 02 §5.
//
// EXCLUIR UNA REGLA. Si `axe` encuentra una infracción en una pantalla que ya
// existe, no se arregla en la tarea de pruebas: se apunta en el DOC 13 como
// punto nuevo y se excluye POR SU IDENTIFICADOR Y SOLO EN ESA PANTALLA, con el
// número del punto al lado. Nunca se apaga `axe` entero ni una pantalla
// entera.

import { AxeBuilder } from '@axe-core/playwright';
import { expect } from '@playwright/test';

import type { Page } from '@playwright/test';

const ETIQUETAS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const GRAVES = ['serious', 'critical'];

interface Opciones {
  /**
   * Identificadores de reglas de `axe` que esta pantalla incumple y que ya
   * están apuntadas en el DOC 13. Cada una, con su número de punto al lado.
   */
  excluir?: readonly string[];
}

/** Ninguna infracción grave ni crítica de `axe` en lo que hay en pantalla. */
export async function sinInfraccionesGraves(
  page: Page,
  { excluir = [] }: Opciones = {},
): Promise<void> {
  const resultado = await new AxeBuilder({ page })
    .withTags(ETIQUETAS)
    .disableRules([...excluir])
    .analyze();

  const graves = resultado.violations
    .filter((infraccion) => GRAVES.includes(infraccion.impact ?? ''))
    .map((infraccion) => ({
      regla: infraccion.id,
      impacto: infraccion.impact,
      ayuda: infraccion.help,
      donde: infraccion.nodes.map((nodo) => nodo.target.join(' ')),
    }));

  expect(graves, 'Infracciones graves o críticas de axe').toEqual([]);
}

/**
 * A este ancho, nada se desplaza de lado (criterio 1.4.10).
 *
 * NO BASTA CON MIRAR EL DOCUMENTO. El marco de la aplicación no deja crecer
 * la página: lo que se desplaza es la caja del contenido, que tiene su propio
 * `overflow`. Algo más ancho que la pantalla no ensancha el documento, le
 * pone una barra horizontal a esa caja. Por eso se miran el documento y todas
 * las cajas que pueden desplazarse de lado.
 */
export async function sinDesplazamientoHorizontal(page: Page): Promise<void> {
  const desbordadas = await page.evaluate(() => {
    const raiz = document.documentElement;
    const cajas: string[] = [];

    for (const caja of [raiz, ...document.body.querySelectorAll('*')]) {
      const desplazable =
        caja === raiz || ['auto', 'scroll'].includes(getComputedStyle(caja).overflowX);

      if (desplazable && caja.scrollWidth > caja.clientWidth) {
        const clase = typeof caja.className === 'string' ? caja.className : '';

        cajas.push(
          `<${caja.tagName.toLowerCase()} class="${clase}"> mide ${caja.scrollWidth} y caben ${caja.clientWidth}`,
        );
      }
    }

    return cajas;
  });

  expect(desbordadas, 'Hay contenido que se sale de la pantalla por un lado').toEqual([]);
}
