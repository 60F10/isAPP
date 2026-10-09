# Traspaso T-239 — Arreglos de lo que destapen las pruebas en navegador

> **Modelo y esfuerzo:** Opus, medio · **Rama:** `fix/platform-arreglos-de-las-pruebas-en-navegador` · **Depende de:** T-237 fusionada · **Sin migración**
> Preparado el 09/10/2026, antes de que corrieran la T-236, la T-237 y la T-238: no se sabe todavía qué van a destapar.

## Qué falta

Las pruebas en navegador (T-236 a T-238) no arreglan nada: cada fallo de la aplicación que encuentran queda como un punto numerado en el DOC 13 y una prueba en `test.fixme`. El sábado 17 es la prueba de campo. Esta tarea arregla, de esos fallos, los que tienen arreglo claro.

## Qué hay que conseguir

1. Cada `test.fixme` de `e2e/` que apunte a un fallo de arreglo claro, arreglado, con su prueba ya sin el `fixme` y en verde.
2. Los que pidan una decisión de Raúl, intactos, con una línea más en su punto del DOC 13 que diga qué hay que decidir.

## Reglas de esta sesión

- Lee `e2e/README.md`, las secciones del DOC 13 de la T-236, la T-237 y la T-238, y los puntos que abrieron. Busca los `test.fixme` con `grep -rn "test.fixme" e2e/`.
- **Si no hay ningún `test.fixme` ni ningún punto nuevo, no hay tarea**: informa «T-239 HECHA: las pruebas no destaparon nada» sin abrir rama ni PR, y termina. La fila del DOC 08 se queda como está.
- Va primero lo que toque al día de partido: alta, convocatoria, directo y cierre.
- **Como mucho ocho arreglos.** Si hay más, los ocho más graves, y el resto se queda en `test.fixme`.
- Cada arreglo lleva también su prueba de Vitest, que falla antes del arreglo: la prueba en navegador no basta, porque aquí no se puede lanzar.
- Aquí no hay Docker. Quita el `test.fixme` de cada fallo arreglado y comprueba el flujo `e2e` en GitHub Actions. **Un solo commit**, enmendado. Como mucho **ocho subidas**; si a la octava no está en verde, vuelve a poner en `test.fixme` lo que siga fallando, déjalo dicho y fusiona lo que sí pasa.
- **Sin migración ni SQL**, y nunca contra producción.
- Haz el ciclo completo. **Nunca toques `release`.** `gh pr create` falla: la PR se abre con `gh api repos/60F10/isAPP/pulls`.

## Qué se arregla aquí y qué no

| Se arregla en esta tarea                                                                        | Se queda en `test.fixme`, con su punto                                         |
| :---------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------- |
| La pantalla no hace lo que su traspaso o el DOC 04 dicen que hace                               | El fallo está en la base: una política, un disparador, una función             |
| Un dato que no se guarda, un mensaje que no sale, un foco que se pierde                         | Arreglarlo pide una ruta, una guardia o un permiso distintos                   |
| Una infracción de `axe` excluida por su identificador, si el arreglo es de marcado o de estilos | Tiene dos salidas razonables, o cambia algo que Raúl ya decidió                |
| Una prueba que fallaba por la propia prueba, no por la aplicación                               | Toca la cola de sincronización o el reductor del directo, salvo fallo evidente |

## Documentación: edita, no reescribas

| Documento            | Edición                                                                                                                                                   |
| :------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/08_TAREAS.md`  | La fila de la T-239 pasa a ✅. Un párrafo de cuatro líneas en el §6b. Sube la versión un decimal                                                          |
| `docs/13_HANDOFF.md` | **No lo reescribas.** Sección corta encima de la primera «## Sesión»: una tabla con cada punto, si quedó arreglado o por qué no. En cada punto, una línea |

## Cierre

- Commit y título de la PR: `fix(platform): fix what the browser tests uncovered`
- Al terminar, di: número de la PR, cuántos fallos había, cuántos quedan arreglados, cuáles siguen en `test.fixme` y qué tiene que decidir Raúl en cada uno, y si quedó fusionada.
- **Lo que arregles no está en producción hasta que Raúl publique.** Dilo en el informe.

## Fuera de esta tarea

Escribir pruebas en navegador nuevas, cambiar la base, y cualquier fallo que no venga de un `test.fixme` o de un punto abierto por la T-236, la T-237 o la T-238.
