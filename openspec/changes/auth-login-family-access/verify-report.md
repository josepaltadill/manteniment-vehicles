```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:782e390af8dff0ad69f9f94e95b29ec39312a4469471c2d5a03467ff5247e014
verdict: pass
blockers: 0
critical_findings: 0
requirements: 0/0
scenarios: 0/0
test_command: npm test
test_exit_code: 0
test_output_hash: sha256:bdbd8f8231c9e600f3ff6e44859dce1aa17e6cbcfeba06ea56a8196be112884a
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:a7e1f2880fd5d964224afc40adf75d2d81b83d7c565ef456830fcedb8d0b3444
```

# Informe de verificación — auth-login-family-access (PR 2)

## Estado

**PASS con advertencias no bloqueantes para el alcance PR 2.** La corrección del límite de redirección quedó verificada: `destinoSiguienteSeguro()` acepta únicamente `/vehiculos` y `/vehiculos/...`, y rechaza `/vehiculos-falso`. La advertencia anterior sobre la allowlist por prefijo queda **RESUELTA**.

Este informe verifica exclusivamente PR 2. No autoriza PR 3/PR 4 ni declara el cambio completo listo para archivo.

## Estado estructurado y actionContext

- Cambio activo: `auth-login-family-access`; selección inequívoca.
- Estado nativo previo a esta actualización: `applyState: all_done`, tareas 14/14, `nextRecommended: resolve-review`.
- `actionContext.mode`: `repo-local`.
- `workspaceRoot` y único `allowedEditRoot`: `/home/josep/proyectos/manteniment-vehicles`.
- La implementación y los artefactos inspeccionados pertenecen al workspace autorizado.
- `reviewGate.result`: `invalidated` por múltiples recibos nativos terminales obsoletos. Por instrucción, esta verificación no intenta restaurar ni resetear la autoridad de revisión.
- El envelope mantiene `requirements: 0/0` y `scenarios: 0/0` porque el parser nativo no contabiliza los encabezados localizados `Requisito`/`Escenario`; la cobertura semántica PR 2 se detalla abajo.

## Frontera verificada

Se verificó exclusivamente la unidad encadenada PR 2 (`stacked-to-main`):

- cliente Supabase SSR `server-only` por solicitud y cookies SSR;
- entorno runtime limitado a URL y anon key;
- login con `signInWithPassword`, validación mediante `auth.getUser()` y mensaje no enumerativo;
- logout mediante `auth.signOut()`;
- proxy/matcher para `/` y `/vehiculos/**`, con rechazo temprano de sesión inválida;
- estado `/acceso-no-disponible` sin datos operativos;
- ausencia de autorización mediante `getSession()`, cache global, token temporal, hogar temporal o `service_role` en los archivos runtime/navegación de PR 2;
- allowlist de `next` alineada exactamente con la frontera protegida.

No se verificó como implementado el alcance de PR 3: resolución real de membresía, sustitución de la composición temporal, guardas autoritativas en cada página/action y eliminación final de variables temporales del grafo heredado.

## Cobertura de especificación y diseño para PR 2

| Contrato PR 2 | Evidencia | Resultado |
|---|---|---|
| Cliente SSR por solicitud | `cliente-supabase-ssr.ts` usa `createServerClient` sin singleton | PASS |
| Cookies SSR | El factory recibe `CookieMethodsServer`; el proxy propaga cookies a respuesta y redirección | PASS |
| Identidad autorizativa | Login y proxy usan `auth.getUser()`; no aparece `getSession()` | PASS |
| Login no enumerativo | Cualquier fallo produce el mismo mensaje/redirección genérica | PASS |
| Fallo parcial cerrado | Si `getUser()` falla o no devuelve usuario, se ejecuta `signOut()` | PASS |
| Logout | La Server Action llama a `signOut()` y redirige a `/login` | PASS |
| Ruta privada anónima | Matcher acotado a `/` y `/vehiculos/:path*`; sesión inválida redirige antes del render | PASS |
| Sesión caducada/manipulada | Tests cubren error con usuario obsoleto y JWT inválido | PASS |
| Sin cache entre usuarios | No hay `unstable_cache`, `cache(` ni estado global de sesión/contexto | PASS |
| Allowlist de `next` exacta | `/vehiculos` y `/vehiculos/...` aceptados; `/vehiculos-falso` rechazado | PASS — warning resuelto |
| Mensajes sin enumeración | No exponen cuentas, UUID, membresías ni familias | PASS |

## Estado de tareas

- Casillas de implementación completadas: **14/14** en el artefacto; PR 2: **7/7**.
- Marcadores sin completar que coincidan con `^\s*- \[ \]`: **ninguno**.
- PR 3 y PR 4 son unidades futuras numeradas, no casillas pendientes del corte PR 2.
- El cambio completo no está listo para archivo porque PR 3/PR 4 siguen fuera del corte y el review gate nativo permanece invalidado.

## Strict TDD

`apply-progress.md` contiene la tabla obligatoria **TDD Cycle Evidence**. Los archivos de test reportados existen y la suite permanece GREEN.

| Comprobación | Resultado | Evidencia |
|---|---|---|
| Tabla TDD presente | PASS | RED/GREEN/TRIANGULATE/REFACTOR documentados |
| Tests conductuales PR 2 | PASS | Entorno/SSR, login/logout y frontera/sesión |
| GREEN enfocado actual | PASS | 22/22 tests en `acciones.test.ts` y `rutas-protegidas.test.ts` |
| GREEN completo actual | PASS | 309 tests pasaron; 15 omitidos |
| Triangulación del bugfix | PASS | acepta `/vehiculos` y subrutas; rechaza `/vehiculos-falso` |
| Build/TypeScript | PASS | Next.js 16.2.10 compiló y TypeScript pasó |

### Calidad de assertions

Se revisaron los tests del bugfix y los tests PR 2 declarados. Las assertions llaman a código de producción y verifican destinos, decisiones de autorización, errores y efectos observables. No se observaron tautologías, bucles fantasma, assertions solo de tipos, smoke-only ni assertions CSS.

**Resultado:** PASS; 0 CRITICAL, 0 WARNING de calidad de assertions.

## Comandos ejecutados

| Comando exacto | Resultado |
|---|---|
| `npm test -- src/app/login/acciones.test.ts src/compartido/infraestructura/supabase/rutas-protegidas.test.ts` | Exit 0; 2 archivos, 22 tests pasaron. |
| `npm test` | Exit 0; 44 archivos pasaron, 1 omitido; 309 tests pasaron, 15 omitidos. |
| `npm run build` | Exit 0; Next.js 16.2.10 compiló, TypeScript pasó y se generaron 6/6 páginas estáticas. |
| `rg -n "getSession\\(|unstable_cache|\\bcache\\(|VEHICULOS_ACCESS_TOKEN|SUPABASE_HOUSEHOLD_ID_DESARROLLO|service_role" src/app/login src/app/acceso-no-disponible src/compartido/infraestructura/supabase src/proxy.ts` | Sin coincidencias. |
| `rg -n "^import 'server-only';|createServerClient|auth\\.getUser\\(|auth\\.signOut\\(|signInWithPassword|matcher" src/app/login src/app/acceso-no-disponible src/compartido/infraestructura/supabase src/proxy.ts` | Inspección de fronteras SSR/auth completada; resultados coherentes con PR 2. |
| `rg -n "vehiculos-falso|next === '/vehiculos'|startsWith\\('/vehiculos/'\\)" src/app/login/acciones.ts src/app/login/acciones.test.ts src/compartido/infraestructura/supabase/rutas-protegidas.ts src/compartido/infraestructura/supabase/rutas-protegidas.test.ts` | Implementación y tests del límite exacto presentes. |
| `git diff --check` | Exit 0; sin errores de whitespace. |
| `rg -n '^\s*- \[ \]' openspec/changes/auth-login-family-access/tasks.md` | Sin coincidencias. |

## Review workload y límite de PR

- Estrategia respetada: `auto-chain`, `stacked-to-main`.
- Frontera respetada: únicamente PR 2; no se implementó PR 3/PR 4.
- No se registró `size:exception`.
- Inventario actual de código, tests, dependencias y lockfile PR 2: **395 líneas cambiadas** (371 adiciones + 24 eliminaciones), dentro del presupuesto de 400 pero en su límite.
- Los artefactos OpenSpec aumentan el diff total del workspace. Si la política de revisión los contabiliza, deben tratarse como evidencia del mismo work unit o aceptarse explícitamente antes de preparar el PR.

## Hallazgos y riesgos

### RESUELTO — allowlist de `next` por prefijo

La implementación anterior aceptaba `/vehiculos-falso`. Ahora exige igualdad con `/vehiculos` o prefijo `/vehiculos/`, y el caso regresivo está cubierto en `acciones.test.ts`. La frontera coincide con `esRutaProtegida()` y con el matcher del proxy.

### WARNING — evidencia solo unitaria para cookies/redirect runtime

Las pruebas verifican adaptadores y decisiones, pero no ejecutan una solicitud real de Next para confirmar propagación de cookies y redirect. El build reduce el riesgo de integración, pero no sustituye una prueba App Router/runtime.

### WARNING — margen de revisión mínimo

El código, tests, dependencias y lockfile suman 395 líneas cambiadas. No hay scope creep, pero cualquier cambio funcional adicional debería pasar al siguiente work unit o exigir replanificación.

## Blockers

- **Implementación PR 2:** ninguno.
- **Archivo del cambio completo:** PR 3 y PR 4 no están implementados.
- **Transición nativa/archive:** bloqueada por `reviewGate: invalidated` debido a múltiples recibos terminales nativos obsoletos. La restauración de autoridad de revisión queda fuera de esta verificación.
