// Pantalla A12 — Partido en directo, esqueleto (T-207, DOC 02 §4).
//
// Reloj, parte, marcador, quién está en el campo y el banquillo, y los
// controles del partido: empezar y terminar partes, pausar y finalizar.
//
// DESDE LA T-208, EL REGISTRO. La botonera abre el flujo `Acción → Jugador →
// Detalle opcional → Guardado`; tocar a alguien del campo abre su ficha, con
// las acciones que le caben. Lo guardado se confirma en 2 s con vibración y
// sale en «Últimos eventos», donde lo apuntado aquí se puede deshacer. En un
// partido en diferido no hay reloj: cada evento pide su parte y su minuto.
//
// LEE DE LOCAL, NO DE LA RED (D06-11). Al abrir intenta refrescar la precarga;
// sin cobertura, usa la que haya. Cada transición guarda el estado del
// reductor y encola sus filas en una sola transacción: una recarga, un
// bloqueo o un cierre accidental recuperan el partido donde estaba.
//
// Se usa de pie, a una mano y al sol: controles de 72 px, texto a 7:1
// (DOC 07 §2) y confirmación en el mismo sitio para lo que no tiene vuelta
// atrás, terminar una parte y finalizar. Salir es una acción explícita, y
// con anotaciones sin enviar lo dice antes (D06-10b).
//
// DESDE LA T-209a, LA COBERTURA DECLARADA (DOC 04 §10.2, D06-37). Al abrir se
// declara qué sigue quien anota —todo el equipo, si no dice otra cosa—, se
// puede cambiar bajo el marcador y se cierra al salir con el botón y al
// finalizar. Va aparte del reductor, por `api/cobertura`: que falle no impide
// anotar ni salir, y la que se quede abierta la termina el cierre (C-03).

import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { useAuth, useHasPermission } from '@modules/auth';
import { NOMBRES_DE_EVENTO } from '@modules/rules';
import { contarPendientes } from '@modules/sync';
import { useAnnounce } from '@shared/hooks/announceContext';
import { marcarPartidoEnCurso, quitarPartidoEnCurso } from '@shared/lib/partidoEnCurso';
import { Button } from '@shared/ui/Button';
import { Pantalla } from '@shared/ui/Pantalla';
import { Toast } from '@shared/ui/Toast';

import {
  cambiarCobertura,
  cerrarCobertura,
  declararCobertura,
  leerCobertura,
} from '../api/cobertura';
import { aplicarTransicion, cargarDirecto, SIN_PRECARGA } from '../api/directo';
import { useAhora } from '../hooks/useAhora';
import { Botonera } from '../components/Botonera';
import { Cobertura } from '../components/Cobertura';
import { FlujoDeRegistro } from '../components/FlujoDeRegistro';
import { UltimosEventos } from '../components/UltimosEventos';
import { useBloqueoDePantalla } from '../hooks/useBloqueoDePantalla';
import { alcancesOfrecidos, describirCobertura, instanteActual } from '../model/cobertura';
import { describirEvento } from '../model/describir';
import { enCurso, reducir } from '../model/directo';
import { cambiosHechos, marcador } from '../model/eventos';
import {
  aBorrador,
  botonesActivos,
  botonesDeFicha,
  contextoDe,
  minutoDelFlujo,
  resumenDelFlujo,
  siguientePaso,
} from '../model/flujo';
import { formatoReloj, minutoDePresentacion, rangoDeParte, segundosDeParte } from '../model/reloj';

import styles from './LiveMatchPage.module.css';

import type { DirectoCargado } from '../api/directo';
import type { Alcance, CoberturaLocal } from '../model/cobertura';
import type { Accion, EstadoDirecto, Resultado } from '../model/directo';
import type { EventoDelDirecto } from '../model/eventos';
import type { Boton, Flujo } from '../model/flujo';
import type { LineaGuardada } from '@modules/lineup';

const directoKey = (partidoId: string) => ['match', 'directo', partidoId] as const;

function ordinal(numero: number): string {
  return `${numero}ª`;
}

function porDorsal(a: LineaGuardada, b: LineaGuardada): number {
  return (
    (a.shirtNumber ?? 100) - (b.shirtNumber ?? 100) || a.nickname.localeCompare(b.nickname, 'es')
  );
}

function nombre(linea: LineaGuardada): string {
  return linea.shirtNumber === null ? linea.nickname : `${linea.shirtNumber} · ${linea.nickname}`;
}

/** Lo que dice la cabecera bajo el reloj. */
function textoDeFase(estado: EstadoDirecto): string {
  const ultima = estado.partes[estado.partes.length - 1];

  switch (estado.fase) {
    case 'inactivo':
      return 'Sin empezar';
    case 'en_juego':
      return `${ordinal(ultima?.numero ?? 1)} parte`;
    case 'pausado':
      return `${ordinal(ultima?.numero ?? 1)} parte · en pausa`;
    case 'descanso':
      return estado.partes.length < estado.periodos ? 'Descanso' : 'Partes terminadas';
    case 'finalizado':
      return 'Partido terminado';
  }
}

/** La acción de registrar un flujo terminado, con su hora e identificadores. */
function accionDeRegistro(
  terminado: Flujo,
  userId: string,
  aprobado: boolean,
  minuto: { periodo: number; segundos: number } | null,
): Accion {
  return {
    tipo: 'registrar',
    ahora: Date.now(),
    clientEventId: crypto.randomUUID(),
    parteId: crypto.randomUUID(),
    userId,
    aprobado,
    borrador: aBorrador(terminado),
    ...(minuto === null ? {} : { minuto }),
  };
}

interface ConfirmarProps {
  pregunta: string;
  si: string;
  alConfirmar: () => void;
  alCancelar: () => void;
}

/** Confirmación en el mismo sitio, sin ventana emergente. El foco va a la pregunta. */
function Confirmar({ pregunta, si, alConfirmar, alCancelar }: ConfirmarProps) {
  const refPregunta = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    refPregunta.current?.focus();
  }, []);

  return (
    <div className={styles.confirmar}>
      <p ref={refPregunta} className={styles.pregunta} tabIndex={-1}>
        {pregunta}
      </p>
      <div className={styles.controles}>
        <Button variant="primary" className={styles.grande} onClick={alConfirmar}>
          {si}
        </Button>
        <Button variant="secondary" className={styles.grande} onClick={alCancelar}>
          Seguir jugando
        </Button>
      </div>
    </div>
  );
}

/**
 * Cómo acabó un intento de guardar (T-215). `ocupado` es que otro guardado
 * sigue en marcha: no es un error y no hay nada que corregir.
 */
type Intento =
  | { resultado: Resultado }
  | { fallo: 'ocupado' }
  | { fallo: 'regla' | 'dispositivo'; mensaje: string };

const GUARDANDO = 'Guardando…';
const GUARDANDO_LENTO = 'Sigue guardando en este dispositivo. No cierres la pantalla.';
/** Lo que se espera antes de decir que el guardado va lento. */
const ESPERA_DE_GUARDADO_MS = 4_000;

function Panel({ cargado, nuestro }: { cargado: DirectoCargado; nuestro: string }) {
  const { paquete } = cargado;
  const rival = paquete.partido.opponentName;
  const local = paquete.partido.isHome;
  const titulo = local ? `${nuestro} – ${rival}` : `${rival} – ${nuestro}`;
  const { session } = useAuth();
  const anunciar = useAnnounce();
  const navigate = useNavigate();
  const [estado, setEstado] = useState(cargado.estado);
  const [aviso, setAviso] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<'terminar' | 'finalizar' | null>(null);
  const [pendientesAlSalir, setPendientesAlSalir] = useState<number | null>(null);
  const [flujo, setFlujo] = useState<Flujo | null>(null);
  const [fichaDe, setFichaDe] = useState<string | null>(null);
  const [errorDeFlujo, setErrorDeFlujo] = useState<string | null>(null);
  // En diferido, la parte del último evento guardado: el siguiente flujo abre
  // con ella elegida, que al meter un partido entero se va parte a parte (T-218).
  const [ultimaParte, setUltimaParte] = useState('1');
  // Mientras el evento de un flujo se guarda, el flujo lo dice y no deja
  // repetir el toque (T-215).
  const [guardandoFlujo, setGuardandoFlujo] = useState(false);
  const [guardadoLento, setGuardadoLento] = useState(false);
  const esperaDeGuardado = useRef<number | null>(null);
  const [confirmacion, setConfirmacion] = useState<string | null>(null);
  const puedeAprobar = useHasPermission('event.approve') === true;
  // La A13 pide `match.close` (T-210a): el enlace solo sale a quien la abre.
  const puedeCerrar = useHasPermission('match.close') === true;
  const enlaceAlCierre = puedeCerrar ? (
    <>
      {' '}
      <Link to={`/partidos/${estado.partidoId}/cierre`}>Ir al cierre del partido</Link>.
    </>
  ) : null;
  const tituloFicha = useRef<HTMLHeadingElement>(null);
  // Lo que sigue quien anota en este aparato (T-209a). `null` es que no hay
  // ninguna abierta; `coberturaLista`, que ya se ha mirado.
  const [cobertura, setCobertura] = useState<CoberturaLocal | null>(null);
  const [coberturaLista, setCoberturaLista] = useState(false);
  const cambiandoCobertura = useRef(false);
  const userId = session === null ? null : session.user.id;

  const coberturaMirada = useRef(false);

  // Al abrir: si el aparato no tiene una abierta y el partido no ha terminado,
  // se declara «todo el equipo» desde este instante. Una vez por pantalla, con
  // lo que se cargó: la marca lo impide aunque el efecto se repita, y si aun
  // así se llamara dos veces, `declararCobertura` devuelve la que ya hay en
  // vez de abrir otra.
  useEffect(() => {
    if (coberturaMirada.current) {
      return;
    }

    coberturaMirada.current = true;
    const inicial = cargado.estado;

    void (async () => {
      try {
        let abierta = await leerCobertura(inicial.partidoId);

        if (abierta === null && inicial.fase !== 'finalizado' && userId !== null) {
          abierta = await declararCobertura({
            id: crypto.randomUUID(),
            partidoId: inicial.partidoId,
            userId,
            alcance: 'full_team',
            jugador: null,
            tiposActivos: inicial.tiposActivos,
            desde: instanteActual(inicial, Date.now()),
            diferido: inicial.diferido,
          });
        }

        setCobertura(abierta);
      } catch {
        // Sin declarar se anota igual: la línea dice «sin declarar» y deja
        // declararla a mano.
      } finally {
        setCoberturaLista(true);
      }
    })();
  }, [cargado.estado, userId]);

  // La ficha sustituye a la botonera: el foco va a su título (2.4.3).
  useEffect(() => {
    if (fichaDe !== null) {
      tituloFicha.current?.focus();
    }
  }, [fichaDe]);
  const guardando = useRef(false);
  // Las confirmaciones sustituyen al botón que las abre. Al aparecer, el foco
  // va a la pregunta; al cerrarse, vuelve a los controles (2.4.3), para que no
  // se quede en `body` cuando se desmonta lo que lo tenía.
  const zonaControles = useRef<HTMLDivElement>(null);
  const zonaSalida = useRef<HTMLDivElement>(null);
  const avisoSalida = useRef<HTMLParagraphElement>(null);
  const confirmoAntes = useRef(false);
  const avisoAntes = useRef(false);

  useEffect(() => {
    if (confirmando !== null) {
      confirmoAntes.current = true;
    } else if (confirmoAntes.current) {
      confirmoAntes.current = false;
      zonaControles.current?.querySelector('button')?.focus();
    }
  }, [confirmando]);

  useEffect(() => {
    if (pendientesAlSalir !== null) {
      avisoAntes.current = true;
      avisoSalida.current?.focus();
    } else if (avisoAntes.current) {
      avisoAntes.current = false;
      zonaSalida.current?.querySelector('button')?.focus();
    }
  }, [pendientesAlSalir]);

  const corriendo = estado.fase === 'en_juego';
  const ahora = useAhora(corriendo);
  const bloqueo = useBloqueoDePantalla(enCurso(estado));

  // La marca que calla el aviso de versión nueva mientras dure el partido.
  useEffect(() => {
    if (enCurso(estado)) {
      marcarPartidoEnCurso(estado.partidoId, Date.now());
    } else {
      quitarPartidoEnCurso(estado.partidoId);
    }
  }, [estado]);

  // El aviso de lentitud no sobrevive a la pantalla.
  useEffect(
    () => () => {
      if (esperaDeGuardado.current !== null) {
        window.clearTimeout(esperaDeGuardado.current);
      }
    },
    [],
  );

  /**
   * Intenta una acción: la pasa por el reductor, guarda el estado con sus
   * filas y, solo si eso sale bien, cambia la pantalla. Devuelve qué pasó y
   * por qué, sin pintar ningún mensaje ni anunciarlo: eso lo decide quien
   * llama, que sabe dónde está mirando quien anota.
   */
  const intentar = async (accion: Accion): Promise<Intento> => {
    if (guardando.current) {
      return { fallo: 'ocupado' };
    }

    const resultado = reducir(estado, accion);

    if (resultado.error !== null) {
      return { fallo: 'regla', mensaje: resultado.error };
    }

    guardando.current = true;
    setAviso(null);

    try {
      await aplicarTransicion(resultado.estado, resultado.trabajos);
      setEstado(resultado.estado);

      return { resultado };
    } catch {
      return {
        fallo: 'dispositivo',
        mensaje:
          'No se ha podido guardar en este dispositivo. No ha cambiado nada: vuelve a intentarlo.',
      };
    } finally {
      guardando.current = false;
    }
  };

  /**
   * Aplica una acción con `intentar` y dice el resultado arriba, en el aviso
   * del partido. Devuelve si salió bien.
   *
   * @param anuncio lo que se anuncia al salir bien, o `null` para no anunciar
   *   nada (la confirmación del registro ya lleva su región viva).
   */
  const hacer = async (
    accion: Accion,
    anuncio: string | null | ((resultado: Resultado) => string | null),
  ): Promise<Resultado | null> => {
    const intento = await intentar(accion);

    if ('fallo' in intento) {
      if (intento.fallo !== 'ocupado') {
        setAviso(intento.mensaje);
        anunciar(intento.mensaje);
      }

      return null;
    }

    const texto = typeof anuncio === 'function' ? anuncio(intento.resultado) : anuncio;

    if (texto !== null) {
      anunciar(texto);
    }

    return intento.resultado;
  };

  const porId = new Map(paquete.convocatoria.map((linea) => [linea.playerId, linea]));
  const nombreDe = (id: string) => {
    const linea = porId.get(id);

    return linea === undefined ? '—' : nombre(linea);
  };
  const dorsalDe = (id: string) => {
    const numero = porId.get(id)?.shirtNumber;

    return numero === undefined || numero === null ? null : String(numero);
  };
  const describir = (evento: EventoDelDirecto) =>
    describirEvento(evento, nombreDe, estado.minutosDeParte, NOMBRES_DE_EVENTO);

  // En diferido, los candidatos son los del minuto del flujo abierto, no los
  // del final del partido (D06-36). Sin flujo o sin minuto, los de siempre.
  const instante =
    flujo === null || !estado.diferido
      ? undefined
      : (minutoDelFlujo(flujo, estado.minutosDeParte) ?? undefined);
  const contexto = contextoDe(estado, instante);
  // R-04: con los cambios agotados, el botón se desactiva y dice por qué.
  const cambiosAgotados = cambiosHechos(estado.eventos) >= estado.cambiosMax;
  const desactivados = cambiosAgotados
    ? { cambio: `Cambios agotados: ${estado.cambiosMax} de ${estado.cambiosMax}.` }
    : {};
  const paso = flujo === null ? null : siguientePaso(flujo, contexto);
  const resumen = flujo === null ? [] : resumenDelFlujo(flujo, contexto, nombreDe);
  /** El error del minuto, con el rango de la parte elegida (T-218). */
  const errorDeMinuto = (periodo: string | null | undefined) => {
    const numero = Number(periodo);
    const parte = Number.isInteger(numero) && numero >= 1 ? numero : 1;
    const { desde, hasta } = rangoDeParte(parte, estado.minutosDeParte);

    return `Ese minuto no es de la ${parte}.ª parte: va de ${desde} a ${hasta}, o ${hasta}+2 en el descuento.`;
  };
  const puedeApuntar =
    estado.fase !== 'finalizado' && (estado.diferido || estado.fase !== 'inactivo');

  const empezarFlujo = (boton: Boton, respuestas: Flujo['respuestas'] = {}) => {
    setFichaDe(null);
    setErrorDeFlujo(null);
    setFlujo({ boton, respuestas });
  };

  /** Guarda el evento del flujo terminado: confirmación de 2 s y vibración. */
  const guardarFlujo = async (terminado: Flujo) => {
    if (userId === null) {
      setErrorDeFlujo('Sin sesión no se puede apuntar.');
      return;
    }

    const minuto = estado.diferido ? minutoDelFlujo(terminado, estado.minutosDeParte) : null;

    if (estado.diferido && minuto === null) {
      setErrorDeFlujo(errorDeMinuto(terminado.respuestas.periodo));
      setFlujo({ boton: terminado.boton, respuestas: {} });
      return;
    }

    // Otro guardado sigue en marcha: este toque sobra y no es ningún error.
    if (guardando.current) {
      return;
    }

    let intento: Intento;

    setGuardandoFlujo(true);
    esperaDeGuardado.current = window.setTimeout(() => {
      setGuardadoLento(true);
    }, ESPERA_DE_GUARDADO_MS);

    try {
      intento = await intentar(accionDeRegistro(terminado, userId, puedeAprobar, minuto));
    } finally {
      window.clearTimeout(esperaDeGuardado.current);
      esperaDeGuardado.current = null;
      setGuardadoLento(false);
      setGuardandoFlujo(false);
    }

    // Si no se ha guardado, el flujo se queda en su último paso con lo
    // respondido y dice el motivo de verdad: se reintenta sin volver a empezar.
    if ('fallo' in intento) {
      if (intento.fallo !== 'ocupado') {
        setErrorDeFlujo(intento.mensaje);
        anunciar(intento.mensaje);
      }

      return;
    }

    const resultado = intento.resultado;

    setFlujo(null);

    if (minuto !== null) {
      setUltimaParte(String(minuto.periodo));
    }

    const nuevo = resultado.estado.eventos[resultado.estado.eventos.length - 1];

    if (nuevo !== undefined) {
      setConfirmacion(describir(nuevo));
    }

    // Háptica al registrar (DOC 02 §5). iOS no la tiene: la confirmación basta.
    if ('vibrate' in navigator) {
      navigator.vibrate(40);
    }
  };

  const responder = (clave: string, valor: string | null) => {
    if (flujo === null) {
      return;
    }

    setErrorDeFlujo(null);
    const siguiente: Flujo = { ...flujo, respuestas: { ...flujo.respuestas, [clave]: valor } };

    if (siguientePaso(siguiente, contexto) === null) {
      void guardarFlujo(siguiente);
    } else {
      setFlujo(siguiente);
    }
  };

  const atras = () => {
    if (flujo === null) {
      return;
    }

    const claves = Object.keys(flujo.respuestas);
    const ultimaClave = claves[claves.length - 1];

    if (ultimaClave === undefined) {
      setFlujo(null);
      return;
    }

    const respuestas = { ...flujo.respuestas };
    delete respuestas[ultimaClave as keyof Flujo['respuestas']];
    setErrorDeFlujo(null);
    setFlujo({ ...flujo, respuestas });
  };

  const ultima = estado.partes[estado.partes.length - 1];
  const segundos = ultima === undefined ? 0 : segundosDeParte(ultima, ahora);
  const siguiente = estado.partes.length + 1;
  const goles = marcador(estado.eventos);
  const convocados = paquete.convocatoria.filter((linea) => linea.callStatus !== 'not_called');
  const enCampo = convocados
    .filter((linea) => estado.enCampo.includes(linea.playerId))
    .sort(porDorsal);
  const banquillo = convocados
    .filter((linea) => !estado.enCampo.includes(linea.playerId))
    .sort(porDorsal);
  const faltanTitulares =
    !estado.diferido &&
    estado.fase === 'inactivo' &&
    estado.titulares.length !== estado.titularesPedidos;

  /**
   * Cierra la cobertura de este aparato en el instante de `hasta`. En diferido
   * no hay instante que valga: se queda abierta y la termina el cierre, en el
   * final del partido (DOC 04 §10.6). Si no se puede guardar, también.
   *
   * La hora entra como argumento, como en el reductor: la pone quien pulsa.
   */
  const terminarCobertura = async (hasta: EstadoDirecto, ahora: number) => {
    if (cobertura === null || hasta.diferido) {
      return;
    }

    try {
      setCobertura(await cerrarCobertura(hasta.partidoId, cobertura, instanteActual(hasta, ahora)));
    } catch {
      // Se queda abierta: la termina el cierre del partido (C-03).
    }
  };

  /** Lo que hace «Cambiar»: cierra la que hay y abre otra desde este instante. */
  const cambiarLoQueSigue = async (alcance: Alcance, jugador: string | null) => {
    if (userId === null || cambiandoCobertura.current) {
      return;
    }

    cambiandoCobertura.current = true;
    setAviso(null);

    try {
      const nueva = await cambiarCobertura(cobertura, {
        id: crypto.randomUUID(),
        partidoId: estado.partidoId,
        userId,
        alcance,
        jugador,
        tiposActivos: estado.tiposActivos,
        desde: instanteActual(estado, Date.now()),
        diferido: estado.diferido,
      });

      setCobertura(nueva);
      anunciar(`Ahora sigues: ${describirCobertura(nueva, nombreDe)}`);
    } catch {
      const mensaje =
        'No se ha podido guardar lo que sigues en este dispositivo. Sigue como estaba.';

      setAviso(mensaje);
      anunciar(mensaje);
    } finally {
      cambiandoCobertura.current = false;
    }
  };

  /** Finaliza el partido y, si sale bien, deja de seguir: ya no hay nada que seguir. */
  const finalizar = async (ahora: number) => {
    const resultado = await hacer({ tipo: 'finalizar', ahora }, 'Partido finalizado');

    if (resultado !== null) {
      await terminarCobertura(resultado.estado, ahora);
    }
  };

  /** Salir de verdad: se cierra la cobertura y se va al calendario. */
  const irse = async () => {
    await terminarCobertura(estado, Date.now());
    void navigate('/calendario');
  };

  const salir = async () => {
    if (userId !== null && pendientesAlSalir === null) {
      try {
        const cuantos = await contarPendientes(userId);

        if (cuantos > 0) {
          setPendientesAlSalir(cuantos);
          anunciar(
            `Hay ${cuantos === 1 ? '1 anotación' : `${cuantos} anotaciones`} sin enviar en este dispositivo`,
          );
          return;
        }
      } catch {
        // Sin cola legible se sale sin preguntar: bloquear la salida sería peor.
      }
    }

    // La cobertura se cierra después de contar: su cierre también va a la
    // cola, y contado antes saldría siempre como una anotación sin enviar.
    await irse();
  };

  const controles = () => {
    if (estado.diferido && estado.fase !== 'finalizado') {
      return (
        <p className={styles.nota}>
          Partido en diferido: sin reloj. Cada evento pide su parte y su minuto. Se termina desde el
          cierre del partido.{enlaceAlCierre}
        </p>
      );
    }

    if (confirmando === 'terminar') {
      return (
        <Confirmar
          pregunta={`¿Terminar la ${ordinal(ultima?.numero ?? 1)} parte en el ${formatoReloj(segundos)}?`}
          si="Sí, terminar la parte"
          alConfirmar={() => {
            setConfirmando(null);
            void hacer(
              { tipo: 'terminar_parte', ahora: Date.now() },
              `${ordinal(ultima?.numero ?? 1)} parte terminada`,
            );
          }}
          alCancelar={() => {
            setConfirmando(null);
          }}
        />
      );
    }

    if (confirmando === 'finalizar') {
      return (
        <Confirmar
          pregunta="¿Finalizar el partido? Después solo se puede corregir desde el cierre."
          si="Sí, finalizar"
          alConfirmar={() => {
            setConfirmando(null);
            void finalizar(Date.now());
          }}
          alCancelar={() => {
            setConfirmando(null);
          }}
        />
      );
    }

    switch (estado.fase) {
      case 'inactivo':
      case 'descanso':
        if (estado.partes.length >= estado.periodos) {
          return (
            <div className={styles.controles}>
              <Button
                variant="primary"
                className={styles.grande}
                onClick={() => {
                  setConfirmando('finalizar');
                }}
              >
                Finalizar el partido
              </Button>
            </div>
          );
        }

        return (
          <div className={styles.controles}>
            <Button
              variant="primary"
              className={styles.grande}
              disabled={faltanTitulares}
              onClick={() => {
                void hacer(
                  { tipo: 'empezar_parte', ahora: Date.now(), parteId: crypto.randomUUID() },
                  `${ordinal(siguiente)} parte en juego`,
                );
              }}
            >
              Empezar la {ordinal(siguiente)} parte
            </Button>
          </div>
        );
      case 'en_juego':
      case 'pausado':
        return (
          <div className={styles.controles}>
            {estado.fase === 'en_juego' ? (
              <Button
                variant="secondary"
                className={styles.grande}
                onClick={() => {
                  void hacer({ tipo: 'pausar', ahora: Date.now() }, 'Reloj en pausa');
                }}
              >
                Pausar el reloj
              </Button>
            ) : (
              <Button
                variant="primary"
                className={styles.grande}
                onClick={() => {
                  void hacer({ tipo: 'reanudar', ahora: Date.now() }, 'Reloj en marcha');
                }}
              >
                Reanudar el reloj
              </Button>
            )}
            <Button
              variant="secondary"
              className={styles.grande}
              onClick={() => {
                setConfirmando('terminar');
              }}
            >
              Terminar la {ordinal(ultima?.numero ?? 1)} parte
            </Button>
          </div>
        );
      case 'finalizado':
        return (
          <p className={styles.nota}>
            El partido ha terminado. Los datos entran en las estadísticas cuando se cierre.
            {enlaceAlCierre}
          </p>
        );
    }
  };

  return (
    <Pantalla id="A12" titulo={titulo}>
      <div ref={zonaSalida} className={styles.salida}>
        {/* 48 px y no 72 a propósito: salir es la acción secundaria de la
            pantalla y conviene que no se roce sin querer (DOC 02 §3.1). */}
        {pendientesAlSalir === null ? (
          <Button
            variant="ghost"
            onClick={() => {
              void salir();
            }}
          >
            Salir del directo
          </Button>
        ) : (
          <div className={styles.confirmar}>
            <p ref={avisoSalida} className={styles.pregunta} tabIndex={-1}>
              Hay{' '}
              {pendientesAlSalir === 1
                ? '1 anotación sin enviar'
                : `${pendientesAlSalir} anotaciones sin enviar`}
              . Se quedan en este dispositivo y se envían solas con cobertura, también si sales.
            </p>
            <div className={styles.controles}>
              <Button
                variant="primary"
                className={styles.grande}
                onClick={() => {
                  setPendientesAlSalir(null);
                }}
              >
                Seguir en el directo
              </Button>
              <Button
                variant="secondary"
                className={styles.grande}
                onClick={() => {
                  void irse();
                }}
              >
                Salir igualmente
              </Button>
            </div>
          </div>
        )}
      </div>

      <section className={styles.cabecera} aria-label="Reloj y marcador">
        {/* Sin región viva: el reloj cambia cuatro veces por segundo. Los
            cambios de fase se anuncian por la región única del marco. */}
        <p className={styles.reloj}>
          <span className={styles.cifras}>{formatoReloj(segundos)}</span>
          <span className={styles.fase}>
            {textoDeFase(estado)}
            {ultima !== undefined && (estado.fase === 'en_juego' || estado.fase === 'pausado')
              ? ` · minuto ${minutoDePresentacion(segundos, ultima.numero, estado.minutosDeParte)}`
              : ''}
          </span>
        </p>
        <p className={styles.marcador}>
          {local ? nuestro : rival}{' '}
          <span className={styles.cifras}>
            {local ? goles.aFavor : goles.enContra} – {local ? goles.enContra : goles.aFavor}
          </span>{' '}
          {local ? rival : nuestro}
        </p>
        {goles.pendientes > 0 ? (
          <p className={styles.nota}>
            Incluye{' '}
            {goles.pendientes === 1 ? '1 gol sin aprobar' : `${goles.pendientes} goles sin aprobar`}
            .
          </p>
        ) : null}
      </section>

      {/* Lo que sigue quien anota (T-209a). En diferido es una sola y no se
          elige; con el partido terminado ya no se sigue nada. */}
      {coberturaLista && estado.fase !== 'finalizado' ? (
        <Cobertura
          cobertura={cobertura}
          alcances={estado.diferido ? [] : alcancesOfrecidos(estado.tiposActivos)}
          convocados={[...convocados].sort(porDorsal).map((linea) => linea.playerId)}
          nombre={nombreDe}
          dorsal={dorsalDe}
          alElegir={(alcance, jugador) => {
            void cambiarLoQueSigue(alcance, jugador);
          }}
        />
      ) : null}

      {aviso === null ? null : <p className={styles.aviso}>{aviso}</p>}
      {faltanTitulares ? (
        <p className={styles.aviso}>
          Tienen que salir {estado.titularesPedidos} titulares y la convocatoria tiene{' '}
          {estado.titulares.length}.{' '}
          <Link to={`/partidos/${estado.partidoId}/convocatoria`}>Revisa la convocatoria</Link>.
        </p>
      ) : null}

      <div ref={zonaControles}>{controles()}</div>

      {/* Por encima de la botonera (DOC 07 §9). Lleva su propia región viva. */}
      <Toast
        open={confirmacion !== null}
        message={confirmacion ?? ''}
        onClose={() => {
          setConfirmacion(null);
        }}
      />

      {puedeApuntar && flujo !== null && paso !== null ? (
        <FlujoDeRegistro
          paso={paso}
          titulo={
            botonesActivos(estado.tiposActivos).find((b) => b.boton === flujo.boton)?.nombre ?? ''
          }
          nombre={nombreDe}
          dorsal={dorsalDe}
          error={errorDeFlujo}
          ocupado={guardandoFlujo}
          estado={guardandoFlujo ? (guardadoLento ? GUARDANDO_LENTO : GUARDANDO) : null}
          resumen={resumen}
          periodoInicial={ultimaParte}
          alResponder={responder}
          alResponderMinuto={(periodo, minuto) => {
            const probado: Flujo = {
              ...flujo,
              respuestas: { ...flujo.respuestas, periodo, minuto },
            };

            if (minutoDelFlujo(probado, estado.minutosDeParte) === null) {
              setErrorDeFlujo(errorDeMinuto(periodo));
              return;
            }

            setErrorDeFlujo(null);

            if (siguientePaso(probado, contexto) === null) {
              void guardarFlujo(probado);
            } else {
              setFlujo(probado);
            }
          }}
          alAtras={Object.keys(flujo.respuestas).length === 0 ? null : atras}
          alCancelar={() => {
            setFlujo(null);
            setErrorDeFlujo(null);
          }}
        />
      ) : null}

      {puedeApuntar && flujo === null && fichaDe !== null ? (
        <section className={styles.ficha} aria-labelledby="ficha">
          <h2 ref={tituloFicha} id="ficha" className={styles.subtitulo} tabIndex={-1}>
            {nombreDe(fichaDe)}: ¿qué ha hecho?
          </h2>
          <Botonera
            botones={botonesDeFicha(estado.tiposActivos)}
            desactivados={desactivados}
            alElegir={(boton) => {
              empezarFlujo(
                boton,
                boton === 'gol' || boton === 'gol_en_propia' || boton === 'tarjeta'
                  ? { lado: 'nuestro', jugador: fichaDe }
                  : { jugador: fichaDe },
              );
            }}
          />
          <div className={styles.controles}>
            <Button
              variant="ghost"
              className={styles.grande}
              onClick={() => {
                setFichaDe(null);
              }}
            >
              Cancelar
            </Button>
          </div>
        </section>
      ) : null}

      {puedeApuntar && flujo === null && fichaDe === null ? (
        <Botonera
          botones={botonesActivos(estado.tiposActivos)}
          desactivados={desactivados}
          alElegir={(boton) => {
            empezarFlujo(boton);
          }}
        />
      ) : null}

      <UltimosEventos
        eventos={estado.eventos}
        describir={describir}
        alDeshacer={
          puedeApuntar
            ? (evento) => {
                void hacer(
                  { tipo: 'deshacer', clientEventId: evento.clientEventId },
                  `Deshecho: ${describir(evento)}`,
                );
              }
            : null
        }
      />

      {bloqueo === 'activo' ? (
        <p className={styles.nota}>Pantalla encendida mientras dure el partido. Gasta batería.</p>
      ) : null}
      {bloqueo === 'no_disponible' || bloqueo === 'denegado' ? (
        <p className={styles.nota}>
          Este navegador no puede mantener la pantalla encendida: se apagará sola como siempre.
        </p>
      ) : null}
      {cargado.refrescado ? null : (
        <p className={styles.nota}>
          Sin conexión: el partido sale de lo guardado en este dispositivo. Lo que hagas se envía al
          volver la cobertura.
        </p>
      )}

      <div className={styles.listas}>
        <section className={styles.lista} aria-labelledby="en-campo">
          <h2 id="en-campo" className={styles.subtitulo}>
            En el campo ({enCampo.length})
          </h2>
          <ul>
            {enCampo.map((linea) => (
              <li key={linea.playerId}>
                {/* Tocar a un jugador abre su ficha: la acción y lo demás. */}
                {puedeApuntar && flujo === null ? (
                  <button
                    type="button"
                    className={styles.jugador}
                    aria-label={`Ficha de ${nombre(linea)}`}
                    onClick={() => {
                      setFichaDe(linea.playerId);
                    }}
                  >
                    {nombre(linea)}
                  </button>
                ) : (
                  nombre(linea)
                )}
              </li>
            ))}
          </ul>
        </section>
        <section className={styles.lista} aria-labelledby="banquillo">
          <h2 id="banquillo" className={styles.subtitulo}>
            Banquillo ({banquillo.length})
          </h2>
          {banquillo.length === 0 ? (
            <p className={styles.nota}>Nadie.</p>
          ) : (
            <ul>
              {banquillo.map((linea) => (
                <li key={linea.playerId}>{nombre(linea)}</li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Pantalla>
  );
}

export function LiveMatchPage() {
  const { id: partidoId = '' } = useParams();
  const { teams } = useAuth();
  const carga = useQuery({
    queryKey: directoKey(partidoId),
    queryFn: () => cargarDirecto(partidoId),
    // El directo manda sobre lo que tiene en memoria: no se vuelve a cargar
    // solo, ni al volver a la pestaña. Se carga al entrar y ya.
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  });

  if (carga.isPending) {
    return (
      <Pantalla id="A12" titulo="Partido en directo">
        <p className={styles.nota}>Cargando el partido…</p>
      </Pantalla>
    );
  }

  if (carga.isError) {
    return (
      <Pantalla id="A12" titulo="Partido en directo">
        <p className={styles.aviso}>
          {carga.error.message === SIN_PRECARGA
            ? 'Este partido no está preparado para jugar sin conexión, y ahora no hay cobertura. Ábrelo con cobertura antes de ir al campo: basta con entrar en su convocatoria.'
            : 'No se ha podido abrir el partido en este dispositivo.'}
        </p>
        <p>
          <Link to="/calendario">Volver al calendario</Link>
        </p>
      </Pantalla>
    );
  }

  const { teamId } = carga.data.paquete.partido;
  const equipo =
    teams === null ? undefined : teams.find((membresia) => membresia.team.id === teamId);

  return (
    <Panel
      key={partidoId}
      cargado={carga.data}
      nuestro={equipo === undefined ? 'Nosotros' : equipo.team.name}
    />
  );
}
