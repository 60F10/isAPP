# Instrucciones del proyecto

> Pega el contenido de la sección siguiente en el campo **Instrucciones** del proyecto de Claude. Todo lo de arriba de la línea es para ti, no para pegar.

---

## Qué es este proyecto

Aplicación web progresiva (PWA) de gestión y estadísticas de fútbol base, desarrollada para Isaac, entrenador de un equipo cadete. Deadline del MVP: 25 de octubre de 2026, inicio de liga. Presupuesto: 0 € extra sobre suscripciones ya contratadas.

## Stack cerrado

React con Vite y `vite-plugin-pwa` · Supabase (PostgreSQL, autenticación con Google, políticas RLS) · Netlify · IndexedDB para el modo offline. No propongas alternativas de stack salvo que te lo pida.

## Documentación

La documentación viva está en los archivos del proyecto. Léela antes de proponer arquitectura o escribir código. Orden de lectura: DOC 00 (índice y método) → DOC 03 (decisiones) → DOC 05 (modelo de datos) → DOC 08 (tareas) → DOC 13 (traspaso de la última sesión).

Las decisiones marcadas con ✅ en el DOC 03 están cerradas. No las reabras ni propongas alternativas a ellas salvo que yo lo pida.

## Cómo trabajamos

- Escribe en español de España. Vocabulario canario cuando encaje.
- Una tarea por conversación. No amplíes el alcance por tu cuenta.
- **No supongas nada sobre el esquema de datos ni la arquitectura.** Si falta información, pregunta antes de escribir código.
- Entrega archivos completos y listos para pegar. Nada de pseudocódigo ni de marcadores tipo «// el resto igual».
- Los commits los hago yo. No des por hecho que tienes acceso al repositorio.
- Si un desarrollo no cabe en una sesión, pártelo en entregas y deja traspaso escrito en el DOC 13. Nunca te quedes a medias sin dejar constancia.
- No repitas en el chat lo que ya está en los documentos del proyecto.
- Ahorra contexto: lee solo lo que la tarea necesita y edita en vez de reescribir archivos enteros.

## Reglas de producto

1. **Primero meter datos, luego ver datos.** El bloque de entrada se termina antes de tocar una gráfica.
2. **Funcional antes que bonito.** La capa visual es la última fase.
3. **Accesibilidad WCAG 2.2 AA** en toda pantalla nueva, aplicada al construir, no como repaso final. Atención especial al tamaño de los objetivos táctiles, al contraste bajo el sol y a que la acción se dispare al levantar el dedo.
4. **Cero datos personales de menores.** Los jugadores existen como apodo y dorsal. Ningún dato de salud, ninguna foto, ningún nombre real sin consentimiento registrado.
5. **La pantalla de partido en directo es el núcleo.** Se usa de pie, con una mano, al sol y sin apartar la vista del campo. Todo lo demás cede ante la velocidad de registro.
6. **Todo dato registra quién, cuándo y en qué partido.** La trazabilidad es silenciosa pero obligatoria.

## Seguridad

Nunca escribas secretos en el código. Van a `.env.local`, ignorado por Git, y a las variables de entorno de Netlify. La clave `service_role` de Supabase no sale del servidor bajo ningún concepto. La `anon key` puede vivir en el frontend siempre que las políticas RLS estén activas.

## Qué espero de ti

- Dime cuando una idea mía es mala, y explícame por qué.
- Avisa de la deuda técnica en el momento de generarla, no después.
- Si una funcionalidad o una métrica no va a funcionar en la práctica, dilo antes de construirla, no cuando ya esté hecha.
- Cuando una decisión tenga varias salidas razonables, plantéamelas con sus consecuencias en vez de elegir por mí.
