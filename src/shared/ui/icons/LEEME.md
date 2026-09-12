# Iconos de GavetaStats

Contrato en el DOC 07 §8.1: lienzo de 24, trazo de 2, `currentColor`, `fill="none"`,
`aria-hidden="true"`. El nombre accesible lo pone el control que lleva el icono.

## Dónde van

    src/shared/ui/icons/*.svg      los 21 iconos
    src/assets/logo.svg            marca provisional (DOC 03 F2)

Se importan como componentes con SVGR y se consumen por un único `<Icon name="goal" />`.

## De evento (11)

Uno por cada tipo activo en el MVP (DOC 04 §7.1): goal, own_goal, yellow_card,
second_yellow, red_card, foul_committed, foul_received, corner, substitution,
position_change, note.

## De interfaz (10)

check, close, clock, reliability, sync, chevron, plus, settings, user, team.

`chevron` apunta a la derecha. Las otras tres direcciones salen rotándolo por CSS,
no dibujando iconos nuevos.

## Notas de dibujo

- `reliability` es un medidor de aguja, no barras: tres barras chocarían con el logo.
- `foul_committed` y `foul_received` comparten silbato y se distinguen por la flecha,
  que entra o sale. A 24 px la diferencia es sutil; el texto del botón manda,
  como exige la regla de que el color y la forma nunca van solos.
- El logo lleva `fill="currentColor"` porque es marca, no icono. De él salen los
  iconos de la PWA en la T-102, con el margen de seguridad del recorte circular.
