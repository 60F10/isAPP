// Pantalla A03 — Club (T-201, E2-01).
//
// Enseña y edita el club del equipo activo: nombre y nombre corto.
//
// LO QUE FALTA, Y POR QUÉ (detalle en el DOC 13):
//
//   · El ESCUDO. Vive en el cubo `crests` de Storage, que no existe todavía.
//   · El ALTA de un club nuevo. La RLS deja insertarlo, pero nadie podría
//     leerlo después: `clubs_select` pide ser miembro de algún equipo del
//     club, y en un club recién creado no hay equipos ni miembros. Construir
//     el formulario sería fabricar clubes huérfanos e invisibles.
//   · El BORRADO. `clubs` no tiene política de borrado.
//
// Llega aquí quien tiene `team.manage` en el equipo activo, que es también lo
// que `clubs_update` pide para guardar.

import { useState } from 'react';

import { useAnnounce } from '@shared/hooks/announceContext';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { Field } from '@shared/ui/Field';
import { Pantalla } from '@shared/ui/Pantalla';

import { Cargando, ErrorDeCarga } from '../components/EstadoDeCarga';
import { useActualizarClub, useClub, useClubActivo } from '../hooks/useClubYEquipos';
import {
  LARGO_NOMBRE_CLUB,
  LARGO_NOMBRE_CORTO,
  mensajeDeErrorAlGuardar,
  validarClub,
} from '../model/clubYEquipos';

import styles from './ClubPage.module.css';

import type { Club, ResultadoClub } from '../model/clubYEquipos';

interface FormularioClubProps {
  club: Club;
}

function FormularioClub({ club }: FormularioClubProps) {
  const anunciar = useAnnounce();
  const guardar = useActualizarClub(club.id);
  const [nombre, setNombre] = useState(club.name);
  const [nombreCorto, setNombreCorto] = useState(club.shortName ?? '');
  const [errores, setErrores] = useState<ResultadoClub['errores']>({});
  const [falloAlGuardar, setFalloAlGuardar] = useState<string | null>(null);

  return (
    <form
      className={styles.formulario}
      noValidate
      onSubmit={(evento) => {
        evento.preventDefault();
        setFalloAlGuardar(null);

        const resultado = validarClub({ nombre, nombreCorto });
        setErrores(resultado.errores);

        if (resultado.valores === null) {
          anunciar('Revisa los campos marcados');
          return;
        }

        guardar.mutate(resultado.valores, {
          onSuccess: (guardado) => {
            setNombre(guardado.name);
            setNombreCorto(guardado.shortName ?? '');
            anunciar('Club guardado');
          },
          onError: (error) => {
            const mensaje = mensajeDeErrorAlGuardar(error);
            setFalloAlGuardar(mensaje);
            anunciar(mensaje);
          },
        });
      }}
    >
      <Field
        label="Nombre"
        required
        maxLength={LARGO_NOMBRE_CLUB}
        autoComplete="organization"
        value={nombre}
        error={errores.nombre}
        onChange={(evento) => {
          setNombre(evento.target.value);
        }}
      />
      <Field
        label="Nombre corto"
        hint="Para cabeceras estrechas, como «U. Tejina». Si lo dejas vacío, se usa el nombre."
        maxLength={LARGO_NOMBRE_CORTO}
        autoComplete="off"
        value={nombreCorto}
        error={errores.nombreCorto}
        onChange={(evento) => {
          setNombreCorto(evento.target.value);
        }}
      />

      {falloAlGuardar === null ? null : <p className={styles.fallo}>{falloAlGuardar}</p>}

      <div>
        <Button type="submit" variant="primary" disabled={guardar.isPending}>
          {guardar.isPending ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  );
}

export function ClubPage() {
  const clubId = useClubActivo();
  const club = useClub(clubId);

  return (
    <Pantalla id="A03" titulo="Club">
      <Card title="Datos del club" headingLevel={2}>
        {clubId === null ? (
          // Una consulta apagada no sale nunca de «pendiente»: sin este caso,
          // la pantalla se quedaría en «Cargando…» para siempre.
          <p className={styles.nota}>
            No hay equipo activo, así que no se sabe de qué club se trata.
          </p>
        ) : club.isPending ? (
          <Cargando />
        ) : club.isError ? (
          <ErrorDeCarga
            que="el club"
            onReintentar={() => {
              void club.refetch();
            }}
          />
        ) : club.data === null ? (
          <p className={styles.nota}>No se encuentra el club de tu equipo activo.</p>
        ) : (
          // La clave vuelve a montar el formulario si cambia el club activo:
          // si no, se quedaría con los valores del club anterior.
          <FormularioClub key={club.data.id} club={club.data} />
        )}
      </Card>

      <Card title="Escudo" headingLevel={2}>
        <p className={styles.nota}>
          Todavía no se puede subir. Llegará cuando exista el almacén de escudos.
        </p>
      </Card>
    </Pantalla>
  );
}
