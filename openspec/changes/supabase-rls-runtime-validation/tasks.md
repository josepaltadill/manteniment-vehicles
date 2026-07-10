# Tareas: validación runtime local de RLS Supabase

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 500–700 líneas (shell, configuración y SQL de fixtures/assertions; sin contar logs temporales) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2: preflight/guard/runtime/matriz secuencial → concurrencia y gate final |
| Delivery strategy | auto-chain |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

## Resultado y límites

El primer corte debe entregar evidencia útil, pero terminar bloqueado con `BLOCKED: concurrency pending` y código distinto de cero si la concurrencia todavía no está implementada. El segundo corte es obligatorio para autorizar cualquier aplicación real de la migración. No se modifica `supabase/migrations/20260710000000_supabase_persistence_short.sql` en este cambio.

Todos los work units siguientes tienen límites de rollback independientes: eliminar solo los archivos del work unit y, durante una ejecución, limpiar únicamente el workspace/proyecto efímero cuya identidad haya sido demostrada.

## PR 1 — preflight, runtime y matriz secuencial parcial

### WU-1 — Contratos de fallo y preflight no mutante

**Inicio:** no existe runner de validación; solo están disponibles los artefactos del cambio y la migración existente.

- [x] Crear `scripts/validate-supabase-rls.sh` con `set -Eeuo pipefail`, códigos/estados explícitos (`BLOCKED`, `FAIL`, `PASS`) y reporte sin secretos.
- [x] Implementar comprobaciones no mutantes de repositorio, migración, `supabase --version`, `docker --version`, `docker info` y auxiliares realmente usados.
- [x] Validar opciones mediante `supabase --help`/ayuda de la versión instalada, sin iniciar contenedores ni ejecutar SQL durante el preflight.
- [x] Rechazar inmediatamente URLs, project refs, MCP endpoints, claves, contraseñas y valores de entorno aportados externamente; no implementar fallback remoto.
- [x] Añadir pruebas RED/GREEN auxiliares en `scripts/` o `tests/` solo para contratos deterministas del shell (herramienta ausente, destino externo y salida no cero); `npm test` no sustituye la prueba runtime.

**Verificación:** ejecutar el script con CLI/Docker ausentes o simulados y comprobar versiones/motivo, ausencia de mutaciones y código no cero. **Fin:** el preflight bloquea de forma reproducible. **Rollback:** revertir el script y pruebas de este work unit.

### WU-2 — Configuración y creación de workspace efímero

**Inicio:** WU-1 pasa sin mutar.

- [x] Crear `supabase/validation/config.toml` o una plantilla mínima equivalente, sin secretos ni destino externo, y documentar por qué cada servicio queda habilitado/deshabilitado.
- [x] En `scripts/validate-supabase-rls.sh`, crear un workspace `mktemp -d` con permisos restrictivos y un `project_id` aleatorio con prefijo `mv-rls-validation-`.
- [x] Copiar la configuración al workspace y arrancar únicamente el proyecto temporal mediante la interfaz soportada por la CLI detectada.
- [x] Capturar identificadores inmutables de proyecto/contenedor, timestamps y versiones; no imprimir `supabase status` ni claves.
- [x] Añadir limpieza provisional que solo opere tras una comprobación positiva de propiedad y detenga procesos antes de borrar temporales.

**Verificación:** inspeccionar el workspace y salida para confirmar ausencia de secretos; comprobar que una opción/URL externa no altera el destino. **Fin:** existe un runtime local identificable o el harness queda bloqueado. **Rollback:** detener solo el proyecto temporal propio y eliminar el workspace si la identidad sigue inequívoca.

### WU-3 — Guarda fail-closed de localidad y propiedad

**Inicio:** runtime temporal iniciado por WU-2.

- [x] Implementar en `scripts/validate-supabase-rls.sh` la comprobación exacta del `project_id`, contenedor DB único, labels/nombre/red reales de la versión CLI, creación posterior al inicio y puerto loopback/no publicado.
- [x] Resolver los labels mediante la salida verificable de Docker/CLI instalada; no confiar únicamente en nombres.
- [x] Comprobar dentro del contenedor `current_database()`, dirección del servidor y metadatos coherentes con el contenedor capturado.
- [x] Ante candidato múltiple, label ausente, puerto no loopback o cualquier ambigüedad, emitir motivo explícito, no ejecutar SQL y no hacer cleanup destructivo.
- [x] Hacer que todas las operaciones posteriores usen exclusivamente `docker exec` sobre el ID capturado; prohibir `db push`, `db reset`, `migration up`, `drop database/schema` y conexiones por parámetros externos.

**Verificación:** probar cada guardia con fixtures/mocks de salida y, cuando haya herramientas, una ejecución real; demostrar que una guardia fallida no deja comandos mutantes posteriores. **Fin:** solo un destino demostrado habilita SQL. **Rollback:** revertir guardas sin tocar recursos no demostrados.

### WU-4 — Aplicación limpia y fixtures privilegiados

**Inicio:** WU-3 autoriza el contenedor.

- [x] Añadir `supabase/validation/fixtures.sql` para crear como `postgres` usuarios Auth deterministas (`admin_a`, `admin_a2`, `editor_a`, `admin_b`, `editor_b`, `non_member`), hogares A/B y datos válidos.
- [x] Aplicar únicamente `supabase/migrations/20260710000000_supabase_persistence_short.sql` con `psql -X -v ON_ERROR_STOP=1` dentro del contenedor, después de la guarda.
- [x] Verificar tablas `mv_*` esperadas, RLS activo y ausencia de objetos funcionales inesperados; separar claramente preparación privilegiada de assertions de aplicación.
- [x] Evitar service keys, credenciales reales y seeds permanentes; mantener SQL temporal y determinista.

**Verificación:** ejecutar desde un repositorio limpio y comprobar que la migración permanece byte-identical; revisar que los fixtures no se usan para inferir permisos. **Fin:** runtime vacío aplicado y estado inicial reproducible. **Rollback:** destruir exclusivamente el runtime efímero propio.

### WU-5 — Helpers y matriz RLS/integridad secuencial (TDD)

**Inicio:** WU-4 produce fixtures válidos.

- [x] Crear `supabase/validation/assertions.sql` con helpers que establezcan por transacción `role`, `auth.uid()` y claims esperados para `anon` y `authenticated`, verificando `current_user`/identidad antes de cada caso.
- [x] Emitir líneas estables `CASE|id|expected|observed|PASS|FAIL`; usar `ON_ERROR_STOP=1` y relanzar SQLSTATE inesperados, sin `WHEN OTHERS THEN NULL`.
- [x] Implementar RED/GREEN para `anon`, no miembro, `editor_a`, `admin_a` y espejo mínimo `admin_b` sobre las cuatro tablas `mv_*`, incluyendo lecturas, inserciones, actualizaciones y borrados.
- [x] Cubrir aislamiento A/B y `using`/`with check`, incluyendo inserción/traslado de vehículo, evento y membresía hacia el hogar ajeno.
- [x] Cubrir FK compuesta evento/vehículo, checks definidos (textos, año, kilómetros, coste, estado/fecha/tipo) y matrícula duplicada por hogar; distinguir SQLSTATE de permisos frente a integridad.
- [x] Cubrir último admin secuencial: borrar/degradar/trasladar el único admin rechazado; aceptar la operación con otro admin; comprobar el borrado explícito del hogar y su cascade permitido. La migración usa cascada hogar→vehículos→eventos; la ejecución local/efímera confirmó cero hijos restantes.
- [x] Verificar tras cada caso negativo que no quedó estado cruzado o inválido; revertir mutaciones de casos salvo fixtures intencionados.

**Verificación TRIANGULATE:** validar cada caso con resultado de la sesión, conteo/estado privilegiado posterior y SQLSTATE esperado. **Fin:** matriz secuencial completa, pero sin declarar gate de despliegue si falta concurrencia. **Rollback:** eliminar `assertions.sql` y cambios de integración de este work unit.

### WU-6 — Reporte, código de salida y documentación del primer corte

**Inicio:** WU-1 a WU-5 pasan individualmente; el corte sigue bloqueado únicamente por la concurrencia pendiente de WU-7/WU-8.

- [x] Integrar en `scripts/validate-supabase-rls.sh` el resumen de comando exacto, versiones CLI/Docker/runtime, identidad no secreta, casos, esperado/obtenido, fallos, limpieza y código de salida.
- [x] Garantizar que cualquier caso fallido, omitido, timeout, guardia incierta o concurrencia pendiente termina distinto de cero.
- [x] Registrar temporalmente stdout/stderr sin volcar secretos y eliminar logs volátiles al finalizar cuando la propiedad sea inequívoca.
- [x] Actualizar `supabase/migrations/README.md` con el comando reproducible, requisitos, alcance, no-mutación, modo bloqueado del primer corte y criterio de desbloqueo.
- [x] Ejecutar `npm test` para contratos auxiliares y documentar por qué no valida RLS runtime; hacer TRIANGULATE con una ejecución local completa si CLI/Docker están disponibles.

**Fin de PR 1:** se entregan preflight, guardas, runtime, fixtures y matriz secuencial completa. El corte permanece bloqueado y distinto de cero por `BLOCKED: concurrency pending` hasta completar WU-7/WU-8; no autoriza despliegue. **Rollback:** revertir documentación, integración y scripts de PR 1; no tocar ninguna instancia real.

## PR 2 — concurrencia y gate final

### WU-7 — Retirada concurrente del último admin

**Inicio:** PR 1 pasa su matriz secuencial y conserva el bloqueo explícito.

- [ ] Crear `supabase/validation/concurrency/session-a.sql` y `session-b.sql` (o equivalente claramente separado) para retirar administradores del mismo hogar en dos sesiones reales.
- [ ] Añadir barrera determinista, `timeout` acotado, captura de stdout/stderr y códigos de ambos procesos en `scripts/validate-supabase-rls.sh`.
- [ ] Esperar ambos procesos sin ocultar el primer fallo, rechazar deadlock/timeout y comprobar como `postgres` que el estado final conserva al menos un admin.
- [ ] Verificar que como máximo una operación puede producir la pérdida de validez y que el resultado no se reporta como éxito parcial.
- [ ] No iniciar cleanup hasta confirmar que ambas sesiones terminaron; ante proceso vivo o identidad ambigua, detenerse sin borrar.

**Verificación:** repetir la prueba varias veces desde runtime limpio y registrar determinismo, códigos y estado final. **Fin:** concurrencia pasa como requisito obligatorio o mantiene bloqueo. **Rollback:** eliminar los SQL de concurrencia y la integración sin afectar la matriz secuencial.

### WU-8 — Gate completo, TRIANGULATE y documentación final

**Inicio:** WU-7 pasa y todos los casos secuenciales siguen verdes.

- [ ] Integrar concurrencia en `scripts/validate-supabase-rls.sh` y permitir código `0` únicamente cuando pasen preflight, guardas, aplicación, matriz completa, concurrencia, evidencia sin secretos y cleanup seguro.
- [ ] Actualizar `supabase/migrations/README.md` para retirar el bloqueo solo bajo la evidencia completa, incluida concurrencia; mantener explícito que no autoriza por sí mismo una aplicación real.
- [ ] Ejecutar desde repositorio limpio el comando exacto y conservar en `apply-progress` solo un resumen manual con versiones, totales, fallos y bloqueos, sin output volátil ni secretos.
- [ ] Ejecutar `npm test` y una ejecución runtime completa; comparar esperado/obtenido, código de salida y ausencia de mutación fuera del workspace propio.
- [ ] TRIANGULATE con revisión de archivos modificados, diff de la migración sin cambios funcionales y comprobación de que el cleanup no alcanza recursos externos.
- [ ] REFACTOR solo después de evidencia verde: simplificar duplicación sin ampliar alcance y repetir todas las verificaciones.

**Fin:** gate runtime completo reproducible; si cualquier requisito no pasa, el despliegue permanece bloqueado. **Rollback:** revertir únicamente la integración/documentación de PR 2 y conservar la evidencia del bloqueo.

## Criterios de cierre

- [ ] `git diff` confirma que la migración funcional no fue modificada y no se añadieron adaptador TypeScript, UI, MCP, credenciales o seeds permanentes.
- [ ] Cada work unit tiene evidencia de inicio, finalización, verificación y rollback.
- [ ] La ejecución nunca muta antes del preflight y la guarda de destino.
- [ ] PR 1 no se considera autorización de despliegue; PR 2 debe pasar concurrencia antes de código cero.
- [ ] Cualquier defecto de esquema descubierto abre una decisión/cambio separado; no se corrige silenciosamente en este harness.
