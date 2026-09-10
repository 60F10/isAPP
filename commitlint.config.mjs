/**
 * Reglas de mensajes de commit del proyecto SASI.
 * Convención: Conventional Commits en inglés, con ámbito obligatorio.
 *
 *   <tipo>(<ámbito>): <asunto en imperativo, minúscula, sin punto final>
 *   feat(match): add internal running clock
 *
 * Los ámbitos son los módulos del proyecto (CLAUDE.md § Arquitectura).
 * Si necesitas uno nuevo, se añade aquí y a docs/15_Convenciones_Git.md.
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', // funcionalidad nueva visible para el usuario
        'fix', // corrección de un fallo
        'docs', // documentación, sin tocar código
        'style', // formato: espacios, comas, sin cambio de comportamiento
        'refactor', // reescritura sin cambiar comportamiento
        'perf', // mejora de rendimiento
        'test', // pruebas
        'build', // build, dependencias, Vite, PWA
        'ci', // GitHub Actions, Netlify
        'chore', // tareas de mantenimiento sin efecto en producción
        'revert', // deshacer un commit anterior
      ],
    ],
    'scope-empty': [2, 'never'],
    'scope-enum': [
      2,
      'always',
      [
        // --- Módulos de la aplicación ---
        'auth', // login con Google, sesión, permisos de acceso
        'core', // Club / Equipo / Jugador
        'rules', // competición y reglamento configurable
        'agenda', // calendario y eventos
        'training', // entrenamientos
        'discipline', // sanciones y disciplina
        'lineup', // convocatoria y alineación
        'match', // MatchEngine: partido en directo
        'sync', // concurrencia, offline, cola de sincronización
        'review', // post-partido y resolución de discordancias
        'stats', // estadísticas, cobertura y fiabilidad
        'logging', // error_logs y observabilidad
        'platform', // PWA, service worker, IndexedDB
        'design', // capa visual, tokens, componentes base
        // --- Transversales ---
        'db', // migraciones de Supabase, esquema, RLS
        'docs', // documentos de /docs
        'deps', // dependencias
        'ci', // integración continua y despliegue
        'repo', // configuración del repositorio y tooling
      ],
    ],
    'subject-case': [2, 'always', 'lower-case'],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 72],
    'body-max-line-length': [2, 'always', 100],
  },
};
