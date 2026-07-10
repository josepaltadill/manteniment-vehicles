# Propuesta: validación runtime local de RLS Supabase

## Decisión

Crear un harness reproducible que aplique la migración existente y valide su comportamiento **solo en una instancia Supabase local o efímera**. El primer corte no se limitará a detectar herramientas: incluirá guardas de seguridad, preparación mínima del entorno y una matriz runtime mínima útil. Si Supabase CLI o Docker no están disponibles, el harness deberá terminar como bloqueado, sin conectarse a ningún destino alternativo.

## Problema

La migración `20260710000000_supabase_persistence_short.sql` tiene validación estática, pero todavía no existe evidencia runtime de RLS, integridad ni preservación del último administrador. El repositorio tampoco contiene `supabase/config.toml`, runner PostgreSQL ni configuración local. Sin un harness aislado y reproducible, probar contra Supabase real sería inseguro y el despliegue debe permanecer bloqueado.

## Objetivos

- Detectar de forma no mutante la disponibilidad y versión de Supabase CLI y Docker antes de fijar el runner definitivo.
- Levantar o usar exclusivamente una instancia local/efímera identificable y aplicar allí la migración existente.
- Fallar cerrado ante URLs, claves o proyectos que no puedan demostrarse locales/efímeros.
- Generar fixtures desechables para dos hogares y actores `anon`, no miembro, `editor` y `admin`.
- Registrar resultados reproducibles de la matriz actor/operación, versiones y fallos.
- Convertir la prueba runtime satisfactoria en requisito previo a cualquier aplicación real.

## Primer corte

El primer corte incluirá:

1. Preflight no mutante de Supabase CLI y Docker.
2. Guardas anti-producción y rechazo explícito de MCP, credenciales compartidas, hosts remotos y destinos ambiguos.
3. Configuración local mínima, solo después de confirmar las herramientas disponibles.
4. Aplicación de la migración en un entorno desechable.
5. Matriz runtime mínima:
   - `anon` sin acceso a tablas `mv_*`;
   - no miembro sin lectura ni escritura en hogares ajenos;
   - `editor` con lectura y alta/modificación operativa, pero sin administrar hogar/membresías ni borrar datos;
   - `admin` con operaciones permitidas;
   - aislamiento entre dos hogares, incluido `with check` en `insert`/`update`;
   - rechazo de FK compuesta, checks y matrícula duplicada por hogar;
   - rechazo de borrar, degradar o trasladar al último admin, y aceptación cuando queda otro admin.

La concurrencia real del último admin requiere dos sesiones. Se incluirá en este corte solo si cabe sin superar el presupuesto de revisión; de lo contrario será el segundo corte explícito y el despliegue seguirá bloqueado hasta completarlo.

Si la solución completa supera 400 líneas cambiadas, se dividirá: primero preflight, guardas y matriz mínima; después concurrencia y ampliación de evidencia. Un corte que solo detecte herramientas no aporta evidencia suficiente y no desbloquea la migración.

## Reglas de seguridad

- No ejecutar contra Supabase real, compartido o persistente.
- No usar el endpoint MCP ni credenciales compartidas como destino de validación.
- No aceptar una URL por defecto o aportada por entorno sin demostrar que apunta al runtime efímero creado por el harness.
- No ejecutar `db push`, `migration up`, `db reset`, `psql` ni limpieza contra destinos ambiguos.
- No almacenar `service_role`, contraseñas o claves reales en el repositorio o en evidencias.
- Limpiar únicamente recursos creados por el propio harness; ante duda, detenerse sin borrar.
- Registrar la versión exacta del runtime porque roles, Auth, grants y `security definer` pueden variar entre imágenes.

## Fuera de alcance

- Aplicar, revertir o inspeccionar una instancia Supabase real.
- Cambiar el esquema funcional o añadir una migración de producto salvo defecto imprescindible descubierto y tratado en otro cambio.
- Crear adaptadores TypeScript, UI, bootstrap productivo, seeds permanentes o RPC evento-kilometraje.
- Validar monitorización, backup o recuperación de producción.
- Usar Vitest como sustituto de PostgreSQL/Supabase runtime; podrá usarse solo para contratos auxiliares del harness.

## Áreas afectadas

- Configuración local de Supabase, si el preflight confirma CLI y Docker.
- Scripts o SQL de fixtures y assertions runtime.
- Documentación del comando reproducible y evidencia de resultados.
- No se modifica la migración existente en este cambio salvo que la validación revele un defecto, que requerirá decisión y alcance separados.

## Criterios de aceptación

- [ ] El preflight informa versiones y falla de forma clara si faltan CLI o Docker.
- [ ] Ningún comando mutante se ejecuta antes de validar que el destino es local/efímero.
- [ ] El harness rechaza MCP, hosts remotos, credenciales compartidas y destinos ambiguos.
- [ ] La migración se aplica desde cero en un runtime desechable y no toca Supabase real.
- [ ] La matriz mínima cubre `anon`, no miembro, `editor`, `admin`, dos hogares, permisos positivos y denegaciones.
- [ ] Se ejercitan `using` y `with check`, FK compuesta, checks y unicidad de matrícula por hogar.
- [ ] Se validan las transiciones del último admin y se documenta el estado de la prueba concurrente.
- [ ] El resultado contiene entorno, casos, esperado/obtenido y salida no cero ante cualquier fallo.
- [ ] La ejecución es repetible desde un repositorio limpio y limpia solo sus propios recursos.
- [ ] La aplicación real permanece bloqueada hasta que la matriz completa, incluida concurrencia, pase.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
| --- | --- |
| Contaminar una base persistente | Identidad explícita del runtime, allowlist local y fallo cerrado antes de mutar. |
| Diferencias entre PostgreSQL genérico y Supabase | Preferir Supabase CLI + Docker; registrar versiones y no simular Auth sin documentarlo. |
| Harness demasiado grande | Mantener el primer corte bajo 400 líneas y separar concurrencia si es necesario. |
| Falso positivo por privilegios elevados | Ejecutar casos con roles/JWT equivalentes a `anon` y `authenticated`, no solo como `postgres`. |
| Limpieza destructiva | Eliminar únicamente recursos creados y etiquetados por el harness. |

## Rollback

Eliminar la configuración y scripts locales añadidos y destruir únicamente el runtime efímero creado por el harness. No hay rollback de datos reales porque esta propuesta prohíbe conectarse o aplicar cambios a Supabase real.

## Éxito

El equipo dispone de un comando seguro y reproducible que demuestra la matriz RLS e invariantes sobre una instancia desechable, produce evidencia revisable y falla antes de cualquier mutación cuando no puede probar que el destino es local/efímero.

## Ronda de preguntas de propuesta

Estas preguntas quedan para revisión del producto antes de cerrar especificación; buscan evitar reglas implícitas y sobrealcance:

1. ¿La concurrencia del último admin debe bloquear este primer corte aunque fuerce una segunda entrega, o puede quedar como segundo corte bloqueante para producción?
2. ¿La evidencia debe conservarse como archivo versionado/resumen CI o basta una salida reproducible no versionada?
3. ¿Qué plataformas de desarrollo deben soportarse inicialmente además del entorno Linux actual?
4. ¿Existe alguna política interna adicional para descargar imágenes Docker o fijar versiones del CLI?

Supuestos actuales: Linux es la plataforma inicial; no se reutiliza infraestructura compartida; la evidencia completa, incluida concurrencia, bloquea producción; y las versiones se fijarán en diseño después del preflight.

## Siguiente fase recomendada

`spec`: definir el contrato observable del preflight, las guardas de destino, la matriz exacta de operaciones y el formato de evidencia sin elegir todavía un runner no verificado.
