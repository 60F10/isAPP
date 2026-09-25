// Error de configuración del despliegue (DOC 06 §12, decisión D06-21).
//
// Vive aparte de `env.ts` por un motivo que no se ve: `env.ts` lanza al
// importarse. Quien necesite reconocer este error —el arranque de `main.tsx`,
// para pintar una pantalla en vez de dejarla en blanco— no puede importar
// `env.ts` para comparar con su clase sin reventar él también. Este archivo
// no tiene efectos al cargarse, así que se importa sin riesgo desde donde sea.

export class ErrorDeEntorno extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorDeEntorno';
  }
}
