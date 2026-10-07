// Pantalla C05 — Sin permiso
//
// El texto cubre los dos motivos por los que se llega aquí, y lo hace sin
// consultar nada: esta pantalla no puede preguntar al contexto de sesión
// —vive en `app/` y de `app/` no importa ningún módulo, DOC 06 §4.1— y montar
// una consulta propia solo para elegir el párrafo sería pagar un viaje al
// servidor por una frase.
//
// Desde la T-301c, quien no tiene equipo tiene además a dónde ir: «Unirse a un
// equipo». También llega aquí quien solo sigue a un equipo y abre una pantalla
// con guardia; el enlace le sirve igual, para pedir permisos.

import { Link } from 'react-router';

import { Pantalla } from '@shared/ui/Pantalla';

export function ForbiddenPage() {
  return (
    <Pantalla id="C05" titulo="Sin permiso">
      <p>
        Tu cuenta no tiene permiso para abrir esa pantalla. Si crees que es un error, habla con
        quien lleve el equipo: los permisos se dan desde «Personas y permisos».
      </p>
      <p>
        Y si acabas de entrar por primera vez, lo más probable es que todavía no pertenezcas a
        ningún equipo. El alta la da quien lleva el equipo, con una invitación a este mismo correo.
        Mientras tanto, si tu equipo está en la lista, puedes seguirlo o pedirle permisos.
      </p>
      <p>
        <Link to="/unirse">Unirse a un equipo</Link>
      </p>
      <p>
        <Link to="/">Volver al inicio</Link>
      </p>
    </Pantalla>
  );
}
