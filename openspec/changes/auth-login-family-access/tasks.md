# Tareas: autenticación y acceso familiar

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 700–1.050 en total; 220–360 por PR |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4, todos contra `main` en orden |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

## Criterios de ejecución

- No implementar todo el cambio en un único PR. Cada PR debe ser una unidad funcional, reversible y revisable en menos de 400 líneas cambiadas.
- Mantener tests y documentación junto con el comportamiento que verifican.
- Strict TDD obligatorio con `npm test`: registrar evidencia RED, GREEN, TRIANGULATE y REFACTOR en el progreso de aplicación.
- No usar `service_role`, `VEHICULOS_ACCESS_TOKEN` ni `SUPABASE_HOUSEHOLD_ID_DESARROLLO` en el grafo runtime.
- El cliente nunca es autoridad para `user_id`, `household_id`, rol familiar o rol de plataforma.
- No crear UI de superadministración, selección de paneles, gestión de familias ni selección multi-familia.

## Orden de PRs y dependencias

```text
PR 1 migración/RLS + bootstrap seguro (inerte y verificable)
  → PR 2 cliente SSR + sesión, login/logout y guardas
    → PR 3a resolución de membresía server-side y contrato de identidad
      → PR 3b composición real y rutas/actions protegidas
        → PR 4 activación productiva, desarrollo local y documentación operativa
```

Cada PR se fusiona en `main` antes de iniciar el siguiente. No se deben mezclar estrategias de ramas. El PR actual de cada corte debe marcarse con `📍` en su diagrama de dependencia. El PR 3 se divide en 3a/3b para mantener cada revisión bajo el presupuesto de 400 líneas sin degradar la cobertura de autorización.

---

## PR 1 — Modelo de plataforma, RLS y bootstrap seguro

**Estado:** apply-ready primero. **Dependencia:** ninguna. **Objetivo de cierre:** la migración es aditiva, RLS queda cerrada y el bootstrap puede inspeccionar/planificar sin mutar datos; el runtime aún no usa la nueva identidad.

**Alcance:** `supabase/migrations/<timestamp>_mv_platform_roles.sql`, `supabase/migrations/README.md`, `src/modulos/vehiculos/adaptadores/supabase/bootstrap-*`, `scripts/bootstrap-admin.ts`, pruebas de migración/bootstrap y `scripts/validate-supabase-rls.sh`/assertions existentes.

### Tareas RED → GREEN → TRIANGULATE → REFACTOR

- [x] **RED — contrato de migración y RLS.** Añadir pruebas/assertions que fallen para la tabla `mv_platform_roles`, su FK a `auth.users`, `rol = 'superadmin'`, RLS habilitada, ausencia de privilegios/policies permisivas para `anon` y `authenticated`, y preservación de las policies actuales de `mv_*`.
- [x] **GREEN — migración aditiva.** Implementar `mv_platform_roles` con constraints, timestamps, RLS y revocaciones requeridas. Actualizar la allowlist de objetos `mv_*` sin tocar tablas ajenas ni modificar datos existentes.
- [x] **TRIANGULATE — verificación de aislamiento.** Ejecutar las assertions con usuario anónimo, usuario autenticado sin membresía y miembros de dos familias; demostrar que la tabla de plataforma no concede acceso familiar y que el acceso cruzado sigue bloqueado.
- [x] **RED — contrato del bootstrap.** Añadir pruebas para `--check`, UUID Auth obligatorio/verificado, nombre exacto, salida de plan sin secretos, no-op idempotente y abortos ante nombre ambiguo, membresía inesperada, duplicados o identidad no verificable.
- [x] **GREEN — preflight y plan no destructivo.** Adaptar `src/modulos/vehiculos/adaptadores/supabase/bootstrap-*` y `scripts/bootstrap-admin.ts` para separar `inspect/check` de `apply`, devolver acciones `noop/create/rename/insert-membership`, exigir confirmación para aplicar y no reasignar, promover, borrar ni sobrescribir datos.
- [x] **TRIANGULATE — escenarios de datos existentes.** Cubrir familia existente con membresía correcta, creación limpia, renombrado explícitamente confirmado conservando UUID, conflicto de destino, varios hogares candidatos y conteos de vehículos/eventos sin cambios.
- [x] **REFACTOR — límites administrativos.** Garantizar que el runner sea `server-only`, que sus credenciales solo se lean desde el comando administrativo, que cualquier conflicto devuelva código distinto de cero sin mutación y que la guía documente backup/recuperación y rollback explícito.

**Verificación de salida:** `npm test`; validación RLS local completa; ejecución de `npm run bootstrap:admin -- --check ...` en entorno seguro; revisión de que el diff no contiene secretos ni cambios destructivos.

**Documentación:** actualizar `supabase/migrations/README.md` con backup, preflight, plan, apply, evidencia y recuperación.

**Rollback:** revertir la migración solo con procedimiento SQL revisado; preferir dejar la tabla aditiva inerte. El bootstrap `--check` no requiere rollback; cualquier rename aplicado solo se revierte mediante transacción explícita usando el estado registrado.

**No objetivos:** no cambiar la identidad runtime, no crear superadmin automáticamente, no migrar datos de vehículos/eventos, no habilitar panel de plataforma.

---

## PR 2 — Cliente SSR, sesión, login/logout y navegación protegida

**Estado:** apply-ready; PR 1 completado y publicado en `main`. **Objetivo de cierre:** existe sesión Supabase SSR por solicitud, login/logout no enumerativos y fronteras de navegación sin carga de datos anónimos.

**Alcance:** `package.json`/lockfile, `src/compartido/infraestructura/supabase/*`, `src/proxy.ts`, `src/app/login/*`, `src/app/acceso-no-disponible/page.tsx` y sus pruebas.

### Tareas RED → GREEN → TRIANGULATE → REFACTOR

- [x] **RED — cliente SSR y entorno.** Añadir pruebas que fallen si no se crea un cliente por solicitud con `@supabase/ssr`, cookies SSR y solo `SUPABASE_URL`/`SUPABASE_ANON_KEY`; prohibir secretos de bootstrap en módulos runtime.
- [x] **GREEN — infraestructura SSR.** Añadir `@supabase/ssr`, fábrica server-only por solicitud y separación de configuración runtime/bootstrap en `src/compartido/infraestructura/entorno.ts`.
- [x] **RED — login/logout y `next`.** Probar credenciales inválidas con mensaje único, ausencia de contexto parcial, allowlist de destinos relativos y logout que invalida cookies/contexto.
- [x] **GREEN — flujo de autenticación.** Implementar página y Server Actions de login/logout con `signInWithPassword`, `auth.getUser()` posterior, cierre de sesión ante fallo de resolución y redirecciones seguras.
- [x] **RED — frontera web.** Probar matcher acotado para `/`, `/vehiculos/**` y subrutas; anónimo no debe ejecutar repositorios ni recibir datos `mv_*`.
- [x] **GREEN — proxy y estado no disponible.** Implementar refresco de cookies/redirección temprana en `src/proxy.ts`, página de `/acceso-no-disponible` y ruta raíz protegida sin seleccionar familia.
- [x] **TRIANGULATE/REFACTOR — sesiones inválidas.** Cubrir token caducado, cookie manipulada y cierre de sesión; revisar que no exista cache global, `getSession()` no autorice y los mensajes no enumeren cuentas/familias.

**Verificación de salida:** `npm test`; `npm run build`; inspección estática de imports server-only y ausencia de `service_role`, header temporal y variables de hogar en runtime.

**Documentación:** documentar variables runtime frente a variables del bootstrap y el flujo de login/logout en la guía operativa existente.

**Rollback:** revertir código y mantener la migración de PR 1 inerte; no restaurar el header/token como bypass público.

**No objetivos:** no resolver membresías reales todavía, no habilitar acceso a datos, no añadir selección de familia/panel.

---

## PR 3 — Resolución server-side de membresía y sustitución de identidad temporal

**Estado:** dividido en PR 3a/3b por presupuesto de revisión. **Objetivo de cierre:** toda solicitud/acción familiar obtiene un único `ContextoAplicacion` desde `auth.getUser()` y membresías bajo RLS, o falla cerrado.

**Split de revisión:**
- **PR 3a:** resolver/proveedor de membresía server-side y contrato de identidad. Conserva temporalmente `householdIdDesarrollo` porque la composición histórica todavía lo consume. Presupuesto exacto código/tests: 198 líneas.
- **PR 3b:** composición real, reutilización de contexto único en páginas/actions privadas, inventario de entradas protegidas y limpieza coordinada de `entorno*`/fixtures temporales cuando desaparece su último consumidor. Presupuesto exacto código/tests: 272 líneas.

**Alcance:** `src/modulos/vehiculos/adaptadores/supabase/proveedor-identidad-supabase-servidor.ts`, `src/modulos/vehiculos/interfaz/composicion/dependencias-servidor.ts`, servicio/puerto de resolución de acceso, `src/compartido/infraestructura/entorno*`, el fixture relacionado de `cliente-supabase-servidor.test.ts`, `src/app/page.tsx`, `src/app/vehiculos/**` y pruebas unitarias/integración.

### Tareas RED → GREEN → TRIANGULATE → REFACTOR

- [x] **RED — unión discriminada.** Probar `anonimo`, `sin-acceso/sin-membresia`, `sin-acceso/multiples-membresias` y `concedido`, incluyendo error de DB, UUID/rol inválido y consulta limitada a dos filas.
- [x] **GREEN — resolver y proveedor.** Implementar `resolverAccesoFamiliar`/`exigirContextoFamiliar` y adaptar el proveedor para usar `getUser()`, consultar membresías propias bajo RLS y exigir cardinalidad exactamente uno.
- [x] **RED — composición real.** Probar que se elimina el usuario técnico, el header `x-vehiculos-access-token` y el hogar sembrado; el mismo cliente autenticado por solicitud llega al resolver y repositorios.
- [x] **GREEN — composición y contexto.** Rehacer `dependencias-servidor.ts`; conservar `householdId` explícito en casos de uso/repositorios y aplicar la guarda antes de cada página y Server Action privada.
- [x] **RED/GREEN — rutas y aislamiento.** Cubrir miembro válido de `Familia Altadill`, usuario sin familia, múltiples membresías, sesión caducada y manipulación de URL/form/cookie/header; verificar que nunca se usa un `household_id` del cliente.
- [x] **TRIANGULATE — RLS A/B.** Ejecutar lecturas/escrituras con usuarios de familias distintas y confirmar doble defensa: filtro explícito por contexto y RLS bloqueando cruces.
- [x] **REFACTOR — inventario de entradas.** Auditar todas las rutas y actions bajo `src/app/vehiculos/**`, eliminar restos de identidad temporal y normalizar errores/observabilidad sin email, nombres familiares ni UUID completos.

**Verificación de salida:** `npm test`; `npm run build`; pruebas de integración App Router y assertions RLS con JWTs reales/locales.

**Documentación:** registrar el contrato de estados, la regla de múltiples membresías y el inventario de fronteras protegidas.

**Rollback:** revertir la composición/guardas manteniendo el acceso cerrado; no reintroducir credenciales bootstrap ni bypass de header.

**No objetivos:** no implementar panel general, cambio de familia ni promoción de roles.

---

## PR 4 — Activación productiva, desarrollo local y documentación de operación

**Estado:** bloqueado hasta PR 3 fusionado. **Objetivo de cierre:** el despliegue separa preparación, despliegue y activación; el entorno local usa login manual y la activación de `Familia Altadill` es verificable y reversible.

**Alcance:** `scripts/dev-local.sh`, `scripts/bootstrap-admin.ts` y adaptadores si requieren integración final, `supabase/migrations/README.md`, documentación de despliegue/rollback, smoke tests y validaciones estáticas finales.

### Tareas RED → GREEN → TRIANGULATE → REFACTOR

1. **RED — contrato de entorno local.** Probar que `dev-local.sh` no exporta `SUPABASE_HOUSEHOLD_ID_DESARROLLO` ni `VEHICULOS_ACCESS_TOKEN`, no inyecta headers y conserva credenciales solo para sembrar login local.
2. **GREEN — arranque local seguro.** Actualizar el script para arrancar Next directamente en loopback, imprimir URL/email de login sin contraseña por defecto y separar bootstrap de runtime.
3. **RED/GREEN — procedimiento productivo.** Documentar y automatizar solo las comprobaciones necesarias para backup, `--check`, aplicación autorizada, verificación de UUID/conteos, despliegue cerrado, smoke y activación.
4. **TRIANGULATE — fallo y recuperación.** Simular conflicto de preflight, fallo de despliegue y rollback; comprobar que no se amplía acceso, no se borran/reasignan datos y las membresías válidas no se eliminan automáticamente.
5. **REFACTOR — gate de seguridad.** Añadir búsquedas/tests que fallen ante secretos administrativos o nombres temporales en el grafo runtime y validar allowlist de imports bootstrap server-only.
6. **Gate final.** Ejecutar `npm test`, `npm run build`, validación RLS local completa y smoke manual de login/logout; conservar evidencia de backup, plan, UUID y conteos antes/después.

**Documentación:** completar procedimiento de despliegue, activación, observabilidad, congelación/revocación de sesiones ante sospecha de cruce y rollback; dejar explícita la separación futura entre plataforma y familia.

**Rollback:** desactivar la entrada o revertir código sin borrar datos; congelar escrituras/revocar sesiones ante exposición y aplicar fix-forward o rollback verificado.

**No objetivos:** no crear gestión de familias, recuperación de contraseña, invitaciones, alta pública ni UI de superadministración.

---

## Primer lote exacto para `sdd-apply`

Aplicar únicamente **PR 1**, en este orden:

1. Crear las pruebas RED de migración/RLS para `mv_platform_roles` y ejecutar `npm test` para demostrar el fallo.
2. Implementar la migración aditiva con RLS, constraints y revocaciones.
3. Ejecutar TRIANGULATE sobre anon, autenticado sin membresía y miembros A/B.
4. Crear las pruebas RED del contrato `bootstrap --check` y abortos por conflicto.
5. Implementar preflight/plan no destructivo, sin modificar datos automáticamente.
6. Ejecutar pruebas de idempotencia, creación limpia, renombrado confirmado y conflictos.
7. Actualizar `supabase/migrations/README.md`, ejecutar `npm test` y validar el diff contra el límite de 400 líneas.

**Criterio para iniciar PR 2:** PR 1 fusionado en `main`, CI verde, RLS verificada y procedimiento bootstrap `--check` reproducible sin secretos.
