# Iconos de GavetaStats

Contrato en el DOC 07 §8.1: lienzo de 24, trazo de 2, `currentColor`, `fill="none"`,
`aria-hidden="true"`. El nombre accesible lo pone el control que lleva el icono.

## Dónde van

    src/shared/ui/icons/*.svg      los 21 iconos
    src/assets/logo.svg            marca provisional (DOC 03 F2)

Se consumen por un único `<Icon name="goal" />`. Cada archivo entra como texto
con el sufijo `?raw` de Vite y el componente lo inyecta tal cual, sin SVGR y sin
dependencia nueva: el envoltorio, el trazo y el `aria-hidden` siguen viviendo en
el propio `.svg`. El registro está en `registry.ts`, y añadir un icono es dejar
el archivo aquí y sumar su línea allí.

Por eso los archivos **no llevan `width` ni `height`**: el tamaño lo pone el
componente con `--icon-sm`, `--icon-md` o `--icon-lg`. Un icono con medidas
propias dentro se saltaría esos tokens.

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
