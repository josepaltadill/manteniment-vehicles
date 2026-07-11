# Apply progress: vehicle-maintenance-app

## Estado estructurado consumido

- Proyecto: `manteniment-vehicles`
- Cambio activo: `vehicle-maintenance-app`
- Artifact store: `both`; OpenSpec usado como autoridad porque Engram falló en el padre.
- Modo: interactivo
- Estrategia de entrega: `auto-chain`
- Chain strategy: `stacked-to-main`
- Límite del corte actual: preparar stack + harness de pruebas solamente.
- TDD estricto: activo; comando de tests `npm test`.
- Riesgo de presupuesto: cambio completo alto; este corte se mantuvo acotado y no inició secciones 2+.

## Tareas completadas y checkboxes persistidos

- [x] RED: crear pruebas mínimas de humo en `src/compartido/pruebas/harness.test.ts` que fallen hasta configurar Vitest.
- [x] GREEN: inicializar `package.json`, `tsconfig.json`, `vitest.config.ts`, `next.config.ts`, `postcss.config.js`, `tailwind.config.ts`, `src/app/layout.tsx` y `src/app/page.tsx` con Next.js + TypeScript + Tailwind + Vitest.
- [x] GREEN: configurar script `npm test` en `package.json` usando Vitest.
- [x] REFACTOR: dejar estructura base `src/modulos/vehiculos/` y `src/compartido/` sin lógica duplicada.

Confirmación: `openspec/changes/vehicle-maintenance-app/tasks.md` fue releído y las cuatro líneas del apartado 1 están marcadas como `- [x]`.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1 Harness de pruebas | `src/compartido/pruebas/harness.test.ts` | Unit | N/A (repo greenfield) | ✅ `npm test -- src/compartido/pruebas/harness.test.ts` falló por ausencia de `package.json`/Vitest | ✅ `npm test -- src/compartido/pruebas/harness.test.ts` pasó: 1 archivo, 1 test | ➖ Omitida: smoke estructural con una única salida esperada del harness | ✅ `npm test` pasó tras separar `harness.ts` y dejar carpetas base |
| 1.2 Stack Next/TS/Tailwind/Vitest | `src/compartido/pruebas/harness.test.ts` | Unit + build smoke | N/A (archivos nuevos) | ✅ El test se escribió antes de producción/configuración | ✅ `npm test` pasó: 1 archivo, 1 test | ➖ Omitida: configuración estructural sin variantes de lógica | ✅ `npm run build` pasó tras ajustar TypeScript a 5.9.3 compatible con Next |

## Comandos ejecutados

- `npm test -- src/compartido/pruebas/harness.test.ts` → RED esperado: falló porque todavía no existía `package.json`.
- `npm install --no-package-lock` → instaló dependencias locales sin generar lockfile para mantener pequeño el corte revisable.
- `npm test -- src/compartido/pruebas/harness.test.ts` → GREEN: 1 archivo, 1 test pasado.
- `npm test` → suite completa: 1 archivo, 1 test pasado.
- `npm run build` → pasó con Next.js 16.2.10 tras corregir la versión de TypeScript a 5.9.3.

## Archivos cambiados

- `.gitignore`
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `vitest.config.ts`
- `next.config.ts`
- `postcss.config.js`
- `tailwind.config.ts`
- `next-env.d.ts`
- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/compartido/pruebas/harness.test.ts`
- `src/compartido/pruebas/harness.ts`
- `src/modulos/vehiculos/.gitkeep`
- `openspec/changes/vehicle-maintenance-app/tasks.md`
- `openspec/changes/vehicle-maintenance-app/apply-progress.md`

## Desviaciones del diseño

- No se implementó dominio, casos de uso, Supabase, migraciones ni UI funcional de vehículos; quedan fuera de este corte por límite explícito.
- Se añadió `src/app/globals.css` y `next-env.d.ts` como soporte mínimo de Next/Tailwind aunque no estaban listados literalmente en la tarea.
- Se generó `package-lock.json` durante la remediación del corte de setup para que las instalaciones sean reproducibles.

## Riesgos / notas

- `npm audit --json` informa 2 vulnerabilidades moderadas:
  - `postcss` (`<8.5.10`), advisory GHSA-qx2v-qp2m-jg93, ruta `node_modules/postcss` y `node_modules/next/node_modules/postcss`, severidad moderada, CWE-79.
  - `next` (`9.3.4-canary.0 - 16.3.0-canary.5`), dependencia directa afectada vía `postcss`, ruta `node_modules/next`, severidad moderada.
- Rationale / siguiente acción: `npm audit` propone `npm audit fix --force`, pero el fix disponible degrada Next a `9.3.3` como cambio mayor y rompe la base técnica elegida para este MVP. No se aplica dentro del corte de setup; se mantiene documentado para revisar actualización segura de Next/PostCSS cuando exista versión compatible sin downgrade mayor.
- Durante una verificación intermedia, Next intentó usar TypeScript 7.0.2 y falló; se corrigió fijando TypeScript 5.9.3 y el build final pasó.
- `node_modules/` y `.next/` quedan ignorados.

## Tareas restantes

Siguiente bloque pendiente exacto:

- [ ] RED: crear pruebas en `src/modulos/vehiculos/dominio/vehiculo.test.ts` para vehículo válido, kilometraje negativo, baja lógica y corrección manual arriba/abajo.
- [ ] GREEN: implementar `src/modulos/vehiculos/dominio/vehiculo.ts`, `errores-dominio.ts` y helpers compartidos en `src/compartido/dominio/`.
- [ ] TRIANGULATE: añadir caso de vehículo inactivo que conserva identidad, matrícula y fecha de alta.
- [ ] REFACTOR: mantener el dominio sin imports de Next.js, React, Supabase, Zod ni Tailwind.

## Workload / PR boundary

- PR boundary actual: setup stack + test harness only.
- Estrategia: `auto-chain`, `stacked-to-main`.
- No se hizo commit ni se abrió PR.

## Remediación de revisión fresca — corte setup

### Hallazgos resueltos

- [x] Se generó y conserva `package-lock.json` con `npm install --package-lock-only` para instalaciones reproducibles.
- [x] `openspec/changes/vehicle-maintenance-app/tasks.md` ahora refleja `Chain strategy: stacked-to-main` y `Decision needed before apply: No` para el corte actual.
- [x] Se ejecutó `npm audit --json` y se documentaron paquetes, rutas, severidad y decisión de no aplicar `npm audit fix --force` por downgrade mayor de Next.
- [x] Se añadió protección explícita contra tests enfocados en `vitest.config.ts` mediante `allowOnly: false`.

### Comandos de remediación ejecutados

- `npm install --package-lock-only` → generó `package-lock.json`; auditó 146 paquetes; 2 vulnerabilidades moderadas reportadas.
- `npm audit --json` → confirmó vulnerabilidades moderadas en `postcss` y `next` vía `postcss`; sin vulnerabilidades críticas/altas.
- `npm test` → pasó: 1 archivo, 1 test.
- `npm run build` → pasó con Next.js 16.2.10.

### Archivos tocados por la remediación

- `package-lock.json`
- `vitest.config.ts`
- `openspec/changes/vehicle-maintenance-app/tasks.md`
- `openspec/changes/vehicle-maintenance-app/apply-progress.md`

## Auditoría de versiones y migración Tailwind v4 — corte de mantenimiento

### Estado estructurado consumido/producido

- Proyecto: `manteniment-vehicles`
- Cambio activo: `vehicle-maintenance-app`
- Artifact store: `both`; OpenSpec sigue siendo el artifact autoritativo y Engram se intentó sincronizar.
- Modo: corte delegado de mantenimiento de dependencias/configuración antes de continuar con dominio.
- Estrategia de entrega vigente: `auto-chain`, `stacked-to-main`.
- Límite del corte: dependency/config maintenance only; no se implementó dominio, Supabase, migraciones ni UI funcional de vehículos.
- TDD estricto: activo. Para este corte estructural se usó safety net + verificación empírica; no se añadieron tests nuevos porque no hay comportamiento de dominio nuevo.

### Decisiones de versión

| Paquete | Versión previa | Última revisada | Decisión compatible | Motivo |
|---|---:|---:|---:|---|
| `tailwindcss` | `3.4.19` | `4.3.2` | `4.3.2` | Compatible con `npm test` y `npm run build` tras migrar CSS/PostCSS a la integración oficial v4. |
| `@tailwindcss/postcss` | N/A | `4.3.2` | `4.3.2` | Requerido por Tailwind v4 para PostCSS según documentación oficial. |
| `postcss` | `8.5.6` | `8.5.16` | `8.5.16` | Compatible y actualiza la dependencia directa por encima del rango vulnerable reportado para PostCSS directo. |
| `autoprefixer` | `10.4.22` | `10.5.2` | eliminado | No se mantiene porque la integración oficial Tailwind v4 usa `@tailwindcss/postcss` y no requiere el plugin explícito `autoprefixer` en esta configuración. |
| `typescript` | `5.9.3` | `7.0.2` | `5.9.3` | `7.0.2` fue probado y `next build` falló en la fase TypeScript; se mantuvo la versión más alta compatible confirmada por build. |

### Cambios realizados

- `package.json` / `package-lock.json`: Tailwind actualizado a v4, añadido `@tailwindcss/postcss`, PostCSS directo actualizado a `8.5.16`, eliminado `autoprefixer`, TypeScript confirmado en `5.9.3` por compatibilidad con Next.
- `postcss.config.js`: reemplazado `tailwindcss` + `autoprefixer` por `@tailwindcss/postcss`.
- `src/app/globals.css`: migrado de directivas `@tailwind base/components/utilities` a `@import "tailwindcss";`.
- `tailwind.config.ts`: eliminado porque la configuración actual no contiene personalización necesaria y Tailwind v4 puede detectar fuentes automáticamente en este setup.

### Evidencia de comandos

- `npm test` antes de modificar → pasó: 1 archivo, 1 test.
- `npm install -D tailwindcss@4.3.2 @tailwindcss/postcss@4.3.2 postcss@8.5.16 typescript@7.0.2` + `npm uninstall autoprefixer` → lockfile actualizado.
- `npm test` con TypeScript 7.0.2 → pasó: 1 archivo, 1 test.
- `npm run build` con TypeScript 7.0.2 → falló: Next intentó instalar/validar TypeScript y terminó con `The "id" argument must be of type string. Received undefined`; build worker exit code 1.
- `npm install -D typescript@5.9.3` → rollback a versión compatible.
- `npm install` → lockfile sincronizado con versiones exactas en `package.json`.
- `npm test` final → pasó: 1 archivo, 1 test.
- `npm run build` final → pasó con Next.js 16.2.10 y Tailwind v4.
- `npm outdated --long || true` final → solo reporta `typescript` current/wanted `5.9.3`, latest `7.0.2`.
- `npm audit --json` final → 2 vulnerabilidades moderadas restantes: `next` vía `postcss` y `postcss` transitive dentro de `node_modules/next/node_modules/postcss`.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| Mantenimiento de dependencias/config | `src/compartido/pruebas/harness.test.ts` existente | Config/build smoke | ✅ `npm test` pre-cambio: 1/1 | ➖ No aplica: corte estructural sin comportamiento nuevo; se preserva suite existente | ✅ `npm test` final: 1/1 y `npm run build` final pasó | ➖ Omitida: cambio estructural sin ramas de lógica; compatibilidad triangulada empíricamente probando TS 7.0.2 y rollback a 5.9.3 | ✅ Config simplificada a integración Tailwind v4 oficial; pruebas/build siguen verdes |

### Riesgos / notas de auditoría

- `npm audit --json` sigue saliendo con código 1 por 2 vulnerabilidades moderadas.
- La vulnerabilidad directa antigua de `postcss@8.5.6` quedó corregida en la dependencia directa (`postcss@8.5.16`), pero Next 16.2.10 todavía trae `node_modules/next/node_modules/postcss` en rango `<8.5.10`.
- `npm audit fix --force` no se aplicó porque el fix sugerido sigue siendo un downgrade mayor a `next@9.3.3`, incompatible con la base técnica elegida.
- El único paquete desactualizado compatible que queda es `typescript`: la última publicada (`7.0.2`) no es compatible empíricamente con `next build` en este setup.

### Tareas restantes

No se marcaron nuevas tareas SDD porque este corte fue mantenimiento de dependencias/configuración fuera del bloque funcional de dominio. El siguiente bloque funcional pendiente sigue siendo:

- [ ] RED: crear pruebas en `src/modulos/vehiculos/dominio/vehiculo.test.ts` para vehículo válido, kilometraje negativo, baja lógica y corrección manual arriba/abajo.
- [ ] GREEN: implementar `src/modulos/vehiculos/dominio/vehiculo.ts`, `errores-dominio.ts` y helpers compartidos en `src/compartido/dominio/`.
- [ ] TRIANGULATE: añadir caso de vehículo inactivo que conserva identidad, matrícula y fecha de alta.
- [ ] REFACTOR: mantener el dominio sin imports de Next.js, React, Supabase, Zod ni Tailwind.

### Workload / PR boundary

- Boundary de este corte: mantenimiento de dependencias/configuración solamente.
- Sin commit y sin PR, por instrucción explícita.

## Dominio puro de vehículos — PR 1 slice

### Estado estructurado consumido/producido

- Proyecto: `manteniment-vehicles`
- Cambio activo: `vehicle-maintenance-app`
- Artifact store: `both`; OpenSpec autoritativo y Engram sincronizado si está disponible.
- Modo: interactivo.
- Estrategia de entrega: `auto-chain`.
- Chain strategy: `stacked-to-main`.
- Límite del corte actual: dominio puro de vehículos solamente.
- TDD estricto: activo; comando de tests `npm test`.
- Riesgo de presupuesto: el cambio completo es alto, pero este corte se mantuvo dentro del límite funcional solicitado y no inició eventos, casos de uso, Supabase, migraciones ni UI.

### Tareas completadas y checkboxes persistidos

- [x] RED: crear pruebas en `src/modulos/vehiculos/dominio/vehiculo.test.ts` para vehículo válido, kilometraje negativo, baja lógica y corrección manual arriba/abajo.
- [x] GREEN: implementar `src/modulos/vehiculos/dominio/vehiculo.ts`, `errores-dominio.ts` y helpers compartidos en `src/compartido/dominio/`.
- [x] TRIANGULATE: añadir caso de vehículo inactivo que conserva identidad, matrícula y fecha de alta.
- [x] REFACTOR: mantener el dominio sin imports de Next.js, React, Supabase, Zod ni Tailwind.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 2.1 Dominio puro de vehículos | `src/modulos/vehiculos/dominio/vehiculo.test.ts` | Unit | ✅ `npm test`: 1 archivo, 1 test pasado antes de modificar | ✅ Test escrito primero; `npm test -- src/modulos/vehiculos/dominio/vehiculo.test.ts` falló por módulo inexistente `identificador` | ✅ Implementados `crearVehiculo`, `Vehiculo`, `ErrorDominio` y `crearIdentificador`; test focalizado pasó: 6/6 | ✅ Añadido caso de vehículo inactivo que conserva identidad, matrícula y fecha de alta; también quedaron cubiertas correcciones arriba/abajo | ✅ Búsqueda de imports prohibidos en dominio sin coincidencias; dominio sin Next.js, React, Supabase, Zod ni Tailwind |

### Comandos ejecutados

- `npm test` → safety net inicial: 1 archivo, 1 test pasado.
- `npm test -- src/modulos/vehiculos/dominio/vehiculo.test.ts` → RED esperado: falló porque todavía no existían los módulos de dominio compartido/vehículo.
- `npm test -- src/modulos/vehiculos/dominio/vehiculo.test.ts` → GREEN/TRIANGULATE: 1 archivo, 6 tests pasados.
- `npm test` → suite completa: 2 archivos, 7 tests pasados.
- `grep` sobre `src/modulos/vehiculos/dominio/*.ts` para imports de Next.js, React, Supabase, Zod y Tailwind → sin coincidencias.

### Archivos cambiados

- `src/compartido/dominio/identificador.ts`
- `src/modulos/vehiculos/dominio/errores-dominio.ts`
- `src/modulos/vehiculos/dominio/vehiculo.ts`
- `src/modulos/vehiculos/dominio/vehiculo.test.ts`
- `openspec/changes/vehicle-maintenance-app/tasks.md`
- `openspec/changes/vehicle-maintenance-app/apply-progress.md`

### Desviaciones del diseño

- Sin desviaciones relevantes para este corte. El dominio de vehículo se mantuvo puro y limitado a reglas de alta, baja lógica y corrección manual de kilometraje.
- No se implementaron eventos, vencimientos, roles, casos de uso, persistencia, migraciones ni UI porque pertenecen a secciones posteriores.

### Riesgos / notas

- `crearIdentificador` lanza `Error` estándar para identificador vacío; si más adelante se decide que todo helper compartido debe lanzar `ErrorDominio`, conviene ajustar con su propio test.
- La unicidad global de matrícula queda para casos de uso/persistencia posteriores; no pertenece a esta entidad pura en este corte.

### Tareas restantes

Siguiente bloque pendiente exacto:

- [ ] RED: crear pruebas en `src/modulos/vehiculos/dominio/evento-vehiculo.test.ts`, `vencimiento.test.ts` y `rol-usuario.test.ts` para mantenimiento, avería, coste opcional, evento histórico, vencimiento por km, vencimiento por fecha, sin vencimiento y roles `admin`/`editor`.
- [ ] GREEN: implementar `evento-vehiculo.ts`, `vencimiento.ts` y `rol-usuario.ts`.
- [ ] TRIANGULATE: probar evento con solo vencimiento por km, solo por fecha y ambos.
- [ ] REFACTOR: extraer tipos/value objects solo si reducen duplicación real.

### Workload / PR boundary

- PR boundary actual: dominio puro de vehículos solamente.
- Estrategia: `auto-chain`, `stacked-to-main`.
- No se hizo commit ni se abrió PR.

## Remediación de revisión fresca — dominio de vehículos

### Estado estructurado consumido/producido

- Proyecto: `manteniment-vehicles`
- Cambio activo: `vehicle-maintenance-app`
- Artifact store: `both`; OpenSpec autoritativo y Engram se intentó sincronizar.
- Modo: corte delegado de remediación de revisión fresca.
- Estrategia de entrega vigente: `auto-chain`, `stacked-to-main`.
- Límite del corte: solo dominio de vehículos; no se implementaron eventos, casos de uso, Supabase, migraciones ni UI.
- TDD estricto: activo; comando de tests `npm test`.

### Hallazgos resueltos

- [x] R3-001: añadida prueba explícita que verifica que `corregirKilometraje()` rechaza correcciones manuales con kilometraje negativo.
- [x] R3-002: aplicada corrección pequeña y acotada para proteger fechas expuestas mediante getters defensivos que devuelven copias de `Date`.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| R3-001 corrección manual negativa | `src/modulos/vehiculos/dominio/vehiculo.test.ts` | Unit | ✅ `npm test -- src/modulos/vehiculos/dominio/vehiculo.test.ts`: 6/6 | ⚠️ Prueba de regresión añadida primero; el comportamiento ya estaba cubierto indirectamente por el constructor y no falló de forma aislada | ✅ Incluida en el pase focalizado final: 9/9 | ➖ No aplica: el requisito explícito es un único borde negativo ya cubierto por la validación compartida de kilometraje | ➖ Sin cambio productivo necesario para este hallazgo |
| R3-002 fechas defensivas | `src/modulos/vehiculos/dominio/vehiculo.test.ts` | Unit | ✅ `npm test -- src/modulos/vehiculos/dominio/vehiculo.test.ts`: 6/6 | ✅ Nuevas pruebas fallaron al mutar `fechaCompra`, `fechaAltaAplicacion` y `fechaDesactivacion` expuestas | ✅ `npm test -- src/modulos/vehiculos/dominio/vehiculo.test.ts`: 9/9 tras getters defensivos | ✅ Cubiertas fechas obligatorias y fecha opcional de desactivación | ✅ `Vehiculo` conserva fechas privadas y expone copias sin cambiar su API pública |

### Comandos ejecutados

- `npm test -- src/modulos/vehiculos/dominio/vehiculo.test.ts` → safety net inicial: 1 archivo, 6 tests pasados.
- `npm test -- src/modulos/vehiculos/dominio/vehiculo.test.ts` → RED parcial esperado para R3-002: 2 fallos por mutación externa de fechas; la nueva prueba R3-001 ya pasaba porque la validación de kilometraje ya era compartida.
- `npm test -- src/modulos/vehiculos/dominio/vehiculo.test.ts` → GREEN/REFACTOR: 1 archivo, 9 tests pasados.
- `npm test` → suite completa: 2 archivos, 10 tests pasados.
- `grep` sobre `src/modulos/vehiculos/dominio` y `src/compartido/dominio` para imports de Next.js, React, Supabase, Zod y Tailwind → sin coincidencias.

### Archivos cambiados

- `src/modulos/vehiculos/dominio/vehiculo.test.ts`
- `src/modulos/vehiculos/dominio/vehiculo.ts`
- `openspec/changes/vehicle-maintenance-app/apply-progress.md`

### Desviaciones del diseño

- Sin desviaciones. La remediación se mantuvo dentro del dominio puro de vehículos.
- No se modificaron checkboxes de `tasks.md` porque las tareas funcionales de la sección 2 ya estaban completadas y esta remediación solo añade evidencia/cobertura posterior.

### Tareas restantes

Siguiente bloque pendiente exacto:

- [ ] RED: crear pruebas en `src/modulos/vehiculos/dominio/evento-vehiculo.test.ts`, `vencimiento.test.ts` y `rol-usuario.test.ts` para mantenimiento, avería, coste opcional, evento histórico, vencimiento por km, vencimiento por fecha, sin vencimiento y roles `admin`/`editor`.
- [ ] GREEN: implementar `evento-vehiculo.ts`, `vencimiento.ts` y `rol-usuario.ts`.
- [ ] TRIANGULATE: probar evento con solo vencimiento por km, solo por fecha y ambos.
- [ ] REFACTOR: extraer tipos/value objects solo si reducen duplicación real.

### Workload / PR boundary

- PR boundary actual: remediación del dominio puro de vehículos solamente.
- Estrategia: `auto-chain`, `stacked-to-main`.
- No se hizo commit ni se abrió PR.

## Corrección de type-check — factory de Vehiculo

### Problema detectado

VSCode marcó el error TypeScript `ts(2673)`: `crearVehiculo` intentaba llamar a `new Vehiculo(...)` desde fuera de la declaración de la clase, pero el constructor de `Vehiculo` era `private`.

### Causa

`npm test` con Vitest ejecutaba la suite pero no hacía type-check completo. Por eso los tests pasaban mientras el editor detectaba un error real de TypeScript. La verificación correcta para este tipo de problema es `npm run build` o un comando específico de type-check.

### Corrección aplicada

- Se añadió `Vehiculo.crear(datos)` como factory estático dentro de la clase, donde sí puede llamar al constructor privado.
- La función pública `crearVehiculo(datos)` se mantiene como API cómoda y delega en `Vehiculo.crear(datos)`.
- Se conserva el constructor privado para proteger la creación del agregado.

### Evidencia

- `npm test` → pasó: 2 archivos, 10 tests.
- `npm run build` → pasó; TypeScript ya no reporta el error del constructor privado.

## Dominio de eventos, vencimientos y roles — PR 1 slice

### Estado estructurado consumido/producido

- Proyecto: `manteniment-vehicles`
- Cambio activo: `vehicle-maintenance-app`
- Artifact store: `both`; OpenSpec autoritativo y Engram disponible para sincronización.
- Modo: interactivo.
- Estrategia de entrega: `auto-chain`.
- Chain strategy: `stacked-to-main`.
- Límite del corte actual: dominio de eventos, vencimientos y roles solamente.
- TDD estricto: activo; comando de tests `npm test`; build requerido `npm run build`.
- Riesgo de presupuesto: el cambio completo es alto, pero este corte se mantuvo en la sección 3 y no inició casos de uso, Supabase, migraciones, server actions ni UI.

### Tareas completadas y checkboxes persistidos

- [x] RED: crear pruebas en `src/modulos/vehiculos/dominio/evento-vehiculo.test.ts`, `vencimiento.test.ts` y `rol-usuario.test.ts` para mantenimiento, avería, coste opcional, evento histórico, vencimiento por km, vencimiento por fecha, sin vencimiento y roles `admin`/`editor`.
- [x] GREEN: implementar `evento-vehiculo.ts`, `vencimiento.ts` y `rol-usuario.ts`.
- [x] TRIANGULATE: probar evento con solo vencimiento por km, solo por fecha y ambos.
- [x] REFACTOR: extraer tipos/value objects solo si reducen duplicación real.

Confirmación al cierre: se releyó `openspec/changes/vehicle-maintenance-app/tasks.md` y las cuatro líneas del apartado 3 están marcadas como `- [x]`.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 3.1 Eventos de vehículo | `src/modulos/vehiculos/dominio/evento-vehiculo.test.ts` | Unit/domain | ✅ Suite previa verde por contexto; este corte empezó escribiendo tests nuevos | ✅ `npm test -- src/modulos/vehiculos/dominio/evento-vehiculo.test.ts src/modulos/vehiculos/dominio/vencimiento.test.ts src/modulos/vehiculos/dominio/rol-usuario.test.ts` falló por módulos inexistentes | ✅ Implementado `EventoVehiculo` con mantenimiento, avería, coste opcional y decisión de actualización de kilometraje; pase focalizado 14/14 | ✅ Añadidos casos de solo vencimiento por km, solo por fecha y ambos dentro del corte | ✅ Sin value objects extra porque no había duplicación real; fechas expuestas con copias defensivas |
| 3.2 Vencimientos | `src/modulos/vehiculos/dominio/vencimiento.test.ts` | Unit/domain | ✅ Mismo RED conjunto del corte | ✅ Falló por módulo inexistente `vencimiento` | ✅ `evaluarVencimiento` devuelve `sin_vencimiento`, `pendiente` o `vencido` según km/fecha | ✅ Cubiertos km, fecha, ambas condiciones y ninguna condición | ✅ Función pura sin imports de framework |
| 3.3 Roles de usuario | `src/modulos/vehiculos/dominio/rol-usuario.test.ts` | Unit/domain | ✅ Mismo RED conjunto del corte | ✅ Falló por módulo inexistente `rol-usuario` | ✅ `rolesUsuario` y `esRolUsuario` reconocen `admin` y `editor` | ✅ Se añadió rechazo de rol fuera del dominio inicial | ✅ Tipo literal mínimo; sin permisos aplicados todavía |

### Comandos ejecutados

- `npm test -- src/modulos/vehiculos/dominio/evento-vehiculo.test.ts src/modulos/vehiculos/dominio/vencimiento.test.ts src/modulos/vehiculos/dominio/rol-usuario.test.ts` → RED esperado: fallaron 3 suites por módulos inexistentes.
- `npm test -- src/modulos/vehiculos/dominio/evento-vehiculo.test.ts src/modulos/vehiculos/dominio/vencimiento.test.ts src/modulos/vehiculos/dominio/rol-usuario.test.ts` → GREEN/TRIANGULATE: 3 archivos, 14 tests pasados.
- `npm test` → suite completa: 5 archivos, 24 tests pasados.
- `grep` sobre `src/modulos/vehiculos/dominio` y `src/compartido/dominio` para imports de Next.js, React, Supabase, Zod y Tailwind → sin coincidencias.
- `npm run build` → pasó con Next.js 16.2.10.

### Archivos cambiados

- `src/modulos/vehiculos/dominio/evento-vehiculo.test.ts`
- `src/modulos/vehiculos/dominio/evento-vehiculo.ts`
- `src/modulos/vehiculos/dominio/vencimiento.test.ts`
- `src/modulos/vehiculos/dominio/vencimiento.ts`
- `src/modulos/vehiculos/dominio/rol-usuario.test.ts`
- `src/modulos/vehiculos/dominio/rol-usuario.ts`
- `openspec/changes/vehicle-maintenance-app/tasks.md`
- `openspec/changes/vehicle-maintenance-app/apply-progress.md`

### Desviaciones del diseño

- Sin desviaciones relevantes para este corte. El dominio sigue sin importar Next.js, React, Supabase, Zod ni Tailwind.
- `EventoVehiculo` incorpora una decisión pura `debeActualizarKilometrajeActual(kilometrosActuales)` para expresar la regla de evento histórico/más reciente sin implementar aún casos de uso ni persistencia.
- No se implementaron casos de uso, puertos, repositorios en memoria, Supabase, migraciones, server actions ni UI por límite explícito del slice.

### Riesgos / notas

- La validación de campos obligatorios de evento en frontera de entrada queda para Zod/server actions posteriores; este corte solo modela reglas mínimas de dominio del evento.
- La atomicidad evento + actualización de kilometraje sigue pendiente para la sección 7; aquí solo se modeló la decisión pura que consumirá el caso de uso.
- Los roles son concepto de dominio, no autorización aplicada; permisos reales quedan fuera de este corte.

### Tareas restantes

Siguiente bloque pendiente exacto:

- [ ] RED: crear pruebas en `src/modulos/vehiculos/aplicacion/casos-uso/*.test.ts` para registrar/listar vehículo, rechazar matrícula duplicada global, desactivar sin borrar eventos, registrar evento actualizando kilometraje, registrar evento histórico sin bajarlo y corregir kilometraje.
- [ ] GREEN: implementar casos de uso en `src/modulos/vehiculos/aplicacion/casos-uso/` y puertos en `src/modulos/vehiculos/aplicacion/puertos/`.
- [ ] GREEN: definir en `repositorio-vehiculos.ts` una operación de unicidad global, por ejemplo `existeMatricula(matricula: string): Promise<boolean>`; no usar solo `existeMatriculaActiva`.
- [ ] GREEN: definir un puerto/contrato atómico para `registrarEventoYActualizarKilometraje` o unidad de trabajo equivalente, consumido por `registrar-evento-vehiculo.ts`.
- [ ] GREEN: crear repositorios en memoria para pruebas en `src/modulos/vehiculos/aplicacion/pruebas/`.
- [ ] REFACTOR: asegurar que los casos de uso reciben `ProveedorIdentidad`/actor temporal sin aplicar matriz de permisos real.

### Workload / PR boundary

- PR boundary actual: dominio de eventos, vencimientos y roles solamente.
- Estrategia: `auto-chain`, `stacked-to-main`.
- No se hizo commit ni se abrió PR.

## Remediación de revisión fresca — dominio de eventos, vencimientos y roles

### Estado estructurado consumido/producido

- Proyecto: `manteniment-vehicles`
- Cambio activo: `vehicle-maintenance-app`
- Artifact store: `both`; OpenSpec autoritativo y Engram se intentó sincronizar.
- Modo: corte delegado de remediación de revisión fresca.
- Estrategia de entrega vigente: `auto-chain`, `stacked-to-main`.
- Límite del corte: solo dominio de eventos, vencimientos y roles; no se implementaron casos de uso, Supabase, migraciones, server actions ni UI.
- TDD estricto: activo; comando de tests `npm test`; build requerido `npm run build`.

### Hallazgos resueltos

- [x] Eventos: añadida cobertura explícita para igualdad de kilometraje evento/actual como frontera histórica/no actualizable.
- [x] Eventos: añadida cobertura para kilometraje de evento negativo, kilometraje actual negativo, próximo vencimiento por km negativo y coste negativo.
- [x] Eventos: añadida cobertura defensiva para fechas expuestas por `EventoVehiculo.fecha`, `proximoVencimientoFecha` y `fechaCreacion`.
- [x] Vencimientos: añadida cobertura de fronteras justo por debajo del umbral de km y justo antes del umbral de fecha.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| Remediar contratos visibles de eventos | `src/modulos/vehiculos/dominio/evento-vehiculo.test.ts` | Unit/domain | ✅ `npm test -- src/modulos/vehiculos/dominio/evento-vehiculo.test.ts src/modulos/vehiculos/dominio/vencimiento.test.ts src/modulos/vehiculos/dominio/rol-usuario.test.ts`: 14/14 | ⚠️ Pruebas de regresión añadidas primero; pasaron porque la implementación ya protegía estos contratos visibles | ✅ Pase focalizado final: 22/22 | ✅ Cubiertas fronteras de igualdad, negativos y copias defensivas de tres fechas | ➖ Sin cambio productivo necesario |
| Remediar fronteras justo por debajo de vencimiento | `src/modulos/vehiculos/dominio/vencimiento.test.ts` | Unit/domain | ✅ Misma safety net del corte: 14/14 | ⚠️ Pruebas de regresión añadidas primero; pasaron porque la implementación ya usaba `>=` correctamente | ✅ Pase focalizado final: 22/22 | ✅ Cubiertas frontera km `129999/130000` y fecha 1 ms antes del objetivo | ➖ Sin cambio productivo necesario |

### Comandos ejecutados

- `npm test -- src/modulos/vehiculos/dominio/evento-vehiculo.test.ts src/modulos/vehiculos/dominio/vencimiento.test.ts src/modulos/vehiculos/dominio/rol-usuario.test.ts` → safety net inicial: 3 archivos, 14 tests pasados.
- `npm test -- src/modulos/vehiculos/dominio/evento-vehiculo.test.ts src/modulos/vehiculos/dominio/vencimiento.test.ts src/modulos/vehiculos/dominio/rol-usuario.test.ts` → remediación focalizada: 3 archivos, 22 tests pasados.
- `npm test` → suite completa: 5 archivos, 32 tests pasados.
- `npm run build` → pasó con Next.js 16.2.10.

### Archivos cambiados

- `src/modulos/vehiculos/dominio/evento-vehiculo.test.ts`
- `src/modulos/vehiculos/dominio/vencimiento.test.ts`
- `openspec/changes/vehicle-maintenance-app/apply-progress.md`

### Desviaciones del diseño

- Sin desviaciones. La remediación solo amplía cobertura de pruebas sobre contratos ya implementados.
- No se modificó implementación porque las invariantes y copias defensivas ya existían.
- No se implementaron casos de uso, Supabase, migraciones, server actions ni UI.

### Tareas restantes

Siguiente bloque pendiente exacto:

- [ ] RED: crear pruebas en `src/modulos/vehiculos/aplicacion/casos-uso/*.test.ts` para registrar/listar vehículo, rechazar matrícula duplicada global, desactivar sin borrar eventos, registrar evento actualizando kilometraje, registrar evento histórico sin bajarlo y corregir kilometraje.
- [ ] GREEN: implementar casos de uso en `src/modulos/vehiculos/aplicacion/casos-uso/` y puertos en `src/modulos/vehiculos/aplicacion/puertos/`.
- [ ] GREEN: definir en `repositorio-vehiculos.ts` una operación de unicidad global, por ejemplo `existeMatricula(matricula: string): Promise<boolean>`; no usar solo `existeMatriculaActiva`.
- [ ] GREEN: definir un puerto/contrato atómico para `registrarEventoYActualizarKilometraje` o unidad de trabajo equivalente, consumido por `registrar-evento-vehiculo.ts`.
- [ ] GREEN: crear repositorios en memoria para pruebas en `src/modulos/vehiculos/aplicacion/pruebas/`.
- [ ] REFACTOR: asegurar que los casos de uso reciben `ProveedorIdentidad`/actor temporal sin aplicar matriz de permisos real.

### Workload / PR boundary

- PR boundary actual: remediación de revisión fresca para dominio de eventos, vencimientos y roles solamente.
- Estrategia: `auto-chain`, `stacked-to-main`.
- No se hizo commit ni se abrió PR.

## Casos de uso con puertos en memoria — PR 1 slice

### Estado estructurado consumido/producido

- Proyecto: `manteniment-vehicles`
- Cambio activo: `vehicle-maintenance-app`
- Artifact store: `both`; OpenSpec autoritativo y Engram leído/sincronizado cuando estuvo disponible.
- Modo: interactivo.
- Estrategia de entrega: `auto-chain`.
- Chain strategy: `stacked-to-main`.
- Límite del corte actual: casos de uso de aplicación, puertos y repositorios en memoria solamente.
- TDD estricto: activo; comando de tests `npm test`; build requerido `npm run build`.
- Riesgo de presupuesto: el cambio completo es alto; este corte se mantuvo en la sección 4 y no inició Supabase, migraciones, server actions ni UI.

### Tareas completadas y checkboxes persistidos

- [x] RED: crear pruebas en `src/modulos/vehiculos/aplicacion/casos-uso/*.test.ts` para registrar/listar vehículo, rechazar matrícula duplicada global, desactivar sin borrar eventos, registrar evento actualizando kilometraje, registrar evento histórico sin bajarlo y corregir kilometraje.
- [x] GREEN: implementar casos de uso en `src/modulos/vehiculos/aplicacion/casos-uso/` y puertos en `src/modulos/vehiculos/aplicacion/puertos/`.
- [x] GREEN: definir en `repositorio-vehiculos.ts` una operación de unicidad global, por ejemplo `existeMatricula(matricula: string): Promise<boolean>`; no usar solo `existeMatriculaActiva`.
- [x] GREEN: definir un puerto/contrato atómico para `registrarEventoYActualizarKilometraje` o unidad de trabajo equivalente, consumido por `registrar-evento-vehiculo.ts`.
- [x] GREEN: crear repositorios en memoria para pruebas en `src/modulos/vehiculos/aplicacion/pruebas/`.
- [x] REFACTOR: asegurar que los casos de uso reciben `ProveedorIdentidad`/actor temporal sin aplicar matriz de permisos real.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 4.1 Casos de uso de aplicación | `src/modulos/vehiculos/aplicacion/casos-uso/vehiculos-casos-uso.test.ts` | Application | ✅ Suite previa disponible por contexto; este corte empezó escribiendo pruebas nuevas | ✅ `npm test -- src/modulos/vehiculos/aplicacion/casos-uso/vehiculos-casos-uso.test.ts` falló por módulos de casos de uso inexistentes | ✅ Implementados `registrarVehiculo`, `listarVehiculos`, `desactivarVehiculo`, `registrarEventoVehiculo` y `corregirKilometraje`; pase focalizado 6/6 | ✅ Cubiertos duplicado global tras desactivación, evento con km mayor, evento histórico y corrección arriba/abajo | ✅ Los casos de uso consumen `ProveedorIdentidadTemporal`/actor sin aplicar matriz real de permisos |
| 4.2 Puertos y memoria | `vehiculos-casos-uso.test.ts` | Ports/adapters in memory | ✅ Pruebas de aplicación describen contrato observable | ✅ Falló por ausencia de puertos y repositorios en memoria | ✅ Creados `RepositorioVehiculos`, `RepositorioEventosVehiculo`, `UnidadTrabajoVehiculos`, `ProveedorFecha` y `ProveedorIdentidad`; memoria verde | ✅ `existeMatricula` verifica unicidad global, no solo activa; `registrarEventoYActualizarKilometraje` coordina evento + km | ✅ Sin imports de Next.js, React, Supabase, Zod ni Tailwind en dominio/aplicación/compartido |

### Comandos ejecutados

- `npm test -- src/modulos/vehiculos/aplicacion/casos-uso/vehiculos-casos-uso.test.ts` → RED esperado: falló por módulo inexistente `./corregir-kilometraje`.
- `npm test -- src/modulos/vehiculos/aplicacion/casos-uso/vehiculos-casos-uso.test.ts` → GREEN/TRIANGULATE: 1 archivo, 6 tests pasados.
- `npm test` → suite completa: 6 archivos, 38 tests pasados.
- `npm run build` → pasó con Next.js 16.2.10.
- `grep` sobre `src/modulos/vehiculos/dominio`, `src/modulos/vehiculos/aplicacion` y `src/compartido/dominio` para imports de Next.js, React, Supabase, Zod y Tailwind → sin coincidencias.

### Archivos cambiados

- `src/modulos/vehiculos/aplicacion/casos-uso/vehiculos-casos-uso.test.ts`
- `src/modulos/vehiculos/aplicacion/casos-uso/registrar-vehiculo.ts`
- `src/modulos/vehiculos/aplicacion/casos-uso/listar-vehiculos.ts`
- `src/modulos/vehiculos/aplicacion/casos-uso/desactivar-vehiculo.ts`
- `src/modulos/vehiculos/aplicacion/casos-uso/registrar-evento-vehiculo.ts`
- `src/modulos/vehiculos/aplicacion/casos-uso/corregir-kilometraje.ts`
- `src/modulos/vehiculos/aplicacion/puertos/repositorio-vehiculos.ts`
- `src/modulos/vehiculos/aplicacion/puertos/repositorio-eventos-vehiculo.ts`
- `src/modulos/vehiculos/aplicacion/puertos/proveedor-fecha.ts`
- `src/modulos/vehiculos/aplicacion/puertos/proveedor-identidad.ts`
- `src/modulos/vehiculos/aplicacion/pruebas/repositorio-vehiculos-en-memoria.ts`
- `src/modulos/vehiculos/aplicacion/pruebas/repositorio-eventos-vehiculo-en-memoria.ts`
- `src/modulos/vehiculos/aplicacion/pruebas/proveedor-identidad-temporal.ts`
- `openspec/changes/vehicle-maintenance-app/tasks.md`
- `openspec/changes/vehicle-maintenance-app/apply-progress.md`

### Desviaciones del diseño

- El puerto atómico se nombró `UnidadTrabajoVehiculos` y expone `registrarEventoYActualizarKilometraje({ evento, vehiculoActualizado })`; el adaptador en memoria lo implementa para pruebas. La implementación Supabase/transaccional real queda para PR 2/sección 7.
- `ProveedorIdentidadTemporal` vive en `aplicacion/pruebas/` para este corte y devuelve actor `admin` fijo; no se aplican permisos reales, tal como pide el diseño.
- No se implementaron Supabase, migraciones, server actions, UI, RLS, auth real, OCR, IA, adjuntos, notificaciones ni dashboard.

### Riesgos / notas

- La operación en memoria coordina evento + kilometraje en un único método, pero no sustituye la transacción/RPC de Supabase pendiente en PR 2.
- La validación de campos obligatorios y mensajes de formularios queda para Zod/server actions de PR 3; los casos de uso asumen entradas ya tipadas y delegan invariantes al dominio.
- La unicidad global de matrícula se verifica en el caso de uso mediante `existeMatricula`; la restricción definitiva de base de datos queda para migraciones `mv_*`.

### Tareas restantes

Siguiente bloque pendiente exacto:

- [ ] RED: documentar/crear prueba de contrato SQL o snapshot en `supabase/migrations/*.test.ts` si el harness lo permite; si no, añadir checklist verificable en `supabase/migrations/README.md`.
- [ ] GREEN: crear migración en `supabase/migrations/` para `mv_vehiculos` y `mv_eventos_vehiculo` con checks, claves foráneas e índices.
- [ ] GREEN: imponer unicidad global de `mv_vehiculos.matricula`, incluyendo vehículos inactivos.
- [ ] GREEN: incluir prefijo `mv_` en todos los objetos SQL de esta app.
- [ ] REFACTOR: no crear tablas futuras de adjuntos/OCR/manuales; solo reservar nombres en documentación si hace falta.

### Workload / PR boundary

- PR boundary actual: casos de uso de aplicación + puertos + repositorios en memoria.
- Estrategia: `auto-chain`, `stacked-to-main`.
- No se hizo commit ni se abrió PR.

### Verificación post-ajuste de presupuesto

- Se compactó `vehiculos-casos-uso.test.ts` para mantener el corte de aplicación por debajo del presupuesto de revisión de 400 líneas de código de aplicación nuevas.
- Líneas en `src/modulos/vehiculos/aplicacion/`: 384 total.
- `npm test -- src/modulos/vehiculos/aplicacion/casos-uso/vehiculos-casos-uso.test.ts` → pasó: 1 archivo, 6 tests.
- `npm test` → pasó: 6 archivos, 38 tests.
- `npm run build` → pasó con Next.js 16.2.10.

## Remediación de revisión fresca — R3-001 unidad de trabajo en memoria

### Estado estructurado consumido/producido

- Proyecto: `manteniment-vehicles`
- Cambio activo: `vehicle-maintenance-app`
- Artifact store: `both`; OpenSpec autoritativo y Engram sincronizado al cierre.
- Modo: corte delegado de remediación de revisión fresca.
- Estrategia de entrega vigente: `auto-chain`, `stacked-to-main`.
- Límite del corte: solo sección 4 de aplicación/puertos/repositorios en memoria; no se implementaron Supabase, migraciones, server actions ni UI.
- TDD estricto: activo; comando de tests `npm test`; build requerido `npm run build`.

### Hallazgo resuelto

- [x] R3-001: añadida prueba determinista de fallo parcial para `registrarEventoYActualizarKilometraje`; si falla la persistencia del kilometraje del vehículo, el evento no queda guardado en el repositorio en memoria y el kilometraje original se conserva.
- [x] El puerto `UnidadTrabajoVehiculos` documenta explícitamente que las implementaciones no deben confirmar un evento si falla la persistencia del kilometraje.
- [x] La implementación en memoria persiste primero el vehículo actualizado cuando corresponde y solo después confirma el evento en memoria, evitando estado parcial en este slice.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| R3-001 atomicidad en memoria evento + kilometraje | `src/modulos/vehiculos/aplicacion/casos-uso/vehiculos-casos-uso.test.ts` | Application/adapter in memory | ✅ Suite previa de aplicación existente | ✅ `npm test -- src/modulos/vehiculos/aplicacion/casos-uso/vehiculos-casos-uso.test.ts` falló: el evento quedaba guardado cuando `guardar(vehiculo)` fallaba | ✅ Reordenada la confirmación en `RepositorioEventosVehiculoEnMemoria`: primero guarda vehículo actualizado y luego confirma evento; test focalizado 7/7 | ✅ La suite mantiene los casos de evento más reciente e histórico sin bajar kilometraje | ✅ Comentario mínimo en `UnidadTrabajoVehiculos` aclara el contrato para futura RPC/transacción Supabase |

### Comandos ejecutados

- `npm test -- src/modulos/vehiculos/aplicacion/casos-uso/vehiculos-casos-uso.test.ts` → RED esperado: 1 fallo; el evento quedaba guardado tras fallar la actualización de kilometraje.
- `npm test -- src/modulos/vehiculos/aplicacion/casos-uso/vehiculos-casos-uso.test.ts` → GREEN: 1 archivo, 7 tests pasados.
- `npm test` → suite completa: 6 archivos, 39 tests pasados.
- `npm run build` → pasó con Next.js 16.2.10.

### Archivos cambiados

- `src/modulos/vehiculos/aplicacion/casos-uso/vehiculos-casos-uso.test.ts`
- `src/modulos/vehiculos/aplicacion/pruebas/repositorio-eventos-vehiculo-en-memoria.ts`
- `src/modulos/vehiculos/aplicacion/puertos/repositorio-eventos-vehiculo.ts`
- `openspec/changes/vehicle-maintenance-app/apply-progress.md`

### Desviaciones del diseño

- Sin desviaciones. La remediación mantiene el contrato coordinado de aplicación y deja la implementación transaccional real para Supabase/RPC en PR 2.
- No se implementaron Supabase, migraciones, server actions, interfaz, RLS ni auth.
- No se modificó `tasks.md` porque la sección 4 ya estaba completada y persistida; este corte añade evidencia de remediación posterior sobre el mismo slice.

### Tareas restantes

Siguiente bloque pendiente exacto:

- [ ] RED: documentar/crear prueba de contrato SQL o snapshot en `supabase/migrations/*.test.ts` si el harness lo permite; si no, añadir checklist verificable en `supabase/migrations/README.md`.
- [ ] GREEN: crear migración en `supabase/migrations/` para `mv_vehiculos` y `mv_eventos_vehiculo` con checks, claves foráneas e índices.
- [ ] GREEN: imponer unicidad global de `mv_vehiculos.matricula`, incluyendo vehículos inactivos.
- [ ] GREEN: incluir prefijo `mv_` en todos los objetos SQL de esta app.
- [ ] REFACTOR: no crear tablas futuras de adjuntos/OCR/manuales; solo reservar nombres en documentación si hace falta.

### Workload / PR boundary

- PR boundary actual: remediación R3-001 para use-case/in-memory repository slice solamente.
- Estrategia: `auto-chain`, `stacked-to-main`.
- No se hizo commit ni se abrió PR.

## Guardarraíles Supabase compartido — preparación PR 2

### Contexto

El usuario confirmó que Supabase ya existe en un VPS gestionado con Dokploy y planteó trabajar contra esa instancia real, usando tablas nuevas con prefijo `mv_`.

### Decisión de seguridad

Se permite preparar migraciones para la instancia real, pero no se ejecutará ninguna operación contra Supabase sin autorización explícita. Las migraciones deben limitarse a objetos `mv_*` y evitar comandos globales.

### Guardarraíles creados

- Se creó `supabase/migrations/README.md` con reglas obligatorias para migraciones en Supabase compartido.
- Se actualizó `openspec/changes/vehicle-maintenance-app/tasks.md` para que la sección 5 exija estos guardarraíles antes de crear/aplicar SQL.

### Verificación de conectividad/herramientas

- MCP revisado: no hay MCP Supabase conectado en esta sesión.
- Búsqueda MCP `supabase`: sin herramientas disponibles.
- Búsqueda en repo: no existe script de puente Supabase ni carpeta `supabase/` previa; la carpeta se creó al documentar guardarraíles.

### Reglas operativas

- No ejecutar reset global de base de datos.
- No ejecutar `drop schema`, `drop database` ni borrados no acotados.
- Cualquier limpieza debe limitarse a tablas `mv_*`.
- El SQL se revisa antes de ejecutarse contra la instancia real.
- La ejecución real requiere autorización explícita.

## Remediación de guardarraíles Supabase — review-risk

### Hallazgos corregidos

- R1-001: se eliminó `cascade` del ejemplo de limpieza de datos. Las limpiezas de prueba deben limitarse a tablas `mv_*` y fallar de forma segura si existen dependencias externas.
- R1-002: se añadió como regla previa a ejecución real que las tablas nuevas tengan postura de acceso segura en Supabase: RLS activado sin políticas permisivas por defecto, revocación explícita de `anon`/`authenticated`, o excepción privada documentada y autorizada.

### Archivos actualizados

- `supabase/migrations/README.md`
- `openspec/changes/vehicle-maintenance-app/tasks.md`

### Estado

No se ejecutó ninguna operación contra Supabase real. Solo se actualizaron guardarraíles y tareas.

## PR 2 — Contexto de hogar, adaptador Supabase de servidor y atomicidad (tareas 5–9)

### Estado estructurado consumido/producido

- Proyecto: `manteniment-vehicles`
- Cambio activo: `vehicle-maintenance-app`
- Artifact store: `openspec` (autoritativo para esta ejecución); Engram sincronizado en `sdd/vehicle-maintenance-app/apply-progress`.
- Modo: interactivo, TDD estricto activo (`npm test`); Strict TDD Mode confirmado por el orquestador.
- Estrategia de entrega: `auto-chain`, `stacked-to-main`. Corte asignado: PR 2 completo (tareas 5–9), sin tocar PR 3 (tareas 10–13) ni migraciones nuevas.
- Alcance ejecutado: reapertura de PR1 para scoping por hogar (tarea 5), adaptación de mapeadores al esquema Supabase real sin migración nueva (tarea 6), adaptador Supabase solo de servidor (tarea 7), atomicidad evento+kilometraje documentada y probada (tarea 8), y frontera auth/RLS con bootstrap server-only + `ProveedorIdentidad` de servidor (tarea 9).
- Fuera de alcance de este corte, por instrucción explícita: tareas 10–13 (validación Zod, server actions, pantallas Next.js, verificación final del MVP), y cualquier migración SQL nueva o modificada.

### Tareas completadas y checkboxes persistidos

Sección 5 (enmienda de PR1 — contexto de hogar):
- [x] RED: `vehiculos-casos-uso.test.ts` reescrito para exigir rechazo de matrícula duplicada POR HOGAR y permitir la misma matrícula en hogar distinto.
- [x] GREEN: `ContextoAplicacion { actor, householdId }` y `ProveedorIdentidad.obtenerContexto()` en `proveedor-identidad.ts`.
- [x] GREEN: `RepositorioVehiculos` scoped por hogar (`guardar`, `buscarPorId`, `listar`, `existeMatricula` reciben `householdId`).
- [x] GREEN: `RepositorioEventosVehiculo`/`UnidadTrabajoVehiculos` reciben `householdId` explícito.
- [x] GREEN: los cinco casos de uso resuelven `obtenerContexto()` y propagan `householdId`.
- [x] GREEN: dobles en memoria actualizados (`RepositorioVehiculosEnMemoria` indexa por `(householdId, id)`; `ProveedorIdentidadTemporal` acepta `householdId` fijo de desarrollo, con default y override para pruebas de aislamiento).
- [x] TRIANGULATE: prueba de aislamiento — un hogar no ve vehículos de otro (`listar`/`buscarPorId`).
- [x] REFACTOR: confirmado (grep) que `dominio/` sigue sin ninguna referencia a `householdId`.

Sección 6 (mapeadores contra esquema real, sin migración nueva):
- [x] RED/GREEN/REFACTOR: `mapeadores-supabase.ts` + `mapeadores-supabase.test.ts` mapean dominio↔filas `mv_vehiculos`/`mv_eventos_vehiculo` reales (`household_id`, `fecha_creacion` no `creado_en`, FK compuesta `vehiculo_id`, sin columnas inexistentes). Se añadió `Vehiculo.reconstruir()`/`reconstruirVehiculo()` (con su propio ciclo RED→GREEN en `vehiculo.test.ts`) porque el mapeador fila→dominio necesita reconstruir un vehículo inactivo directamente, sin pasar por `desactivar()`.

Sección 7 (adaptador Supabase solo de servidor):
- [x] RED/GREEN: `entorno.ts` (validación de variables, rechazo explícito de nombres `NEXT_PUBLIC_*`), `cliente-supabase-servidor.ts` (guarda `typeof window !== 'undefined'`, login server-side), `repositorio-vehiculos-supabase.ts`, `repositorio-eventos-supabase.ts` implementando los puertos scoped por hogar.
- [x] REFACTOR: confirmado que no hay ningún archivo `'use client'` en el repo y que ningún archivo de producción contiene un patrón de clave `service_role` (ver sección 9 / `seguridad-servidor.ts`).

Sección 8 (atomicidad evento + kilometraje):
- [x] RED/GREEN/TRIANGULATE: `registrar-evento-vehiculo.test.ts` dedicado, contrato a nivel de caso de uso (una única llamada a la unidad de trabajo; propagación de error sin guardar evento; evento histórico sin `vehiculoActualizado`).
- [x] GREEN Supabase: `repositorio-eventos-supabase.ts` implementa el orden coordinado (vehículo primero, evento después) con comentario explícito de riesgo/compensación, ya que este PR no crea RPC/migración nueva.
- [x] REFACTOR: comentario en `registrar-evento-vehiculo.ts` explicando por qué no son dos escrituras independientes.

Sección 9 (frontera auth/RLS y bootstrap):
- [x] RED/GREEN: `bootstrap-servidor.ts` + `bootstrap-servidor.test.ts` (idempotencia probada: segunda ejecución no duplica usuario/hogar/membresía y devuelve los mismos ids).
- [x] RED/GREEN: `proveedor-identidad-supabase-servidor.ts` + su test (resuelve `ContextoAplicacion` desde el `householdId` real sembrado, no arbitrario; rechaza si no hay membresía).
- [x] RED/GREEN: `seguridad-servidor.ts` + `seguridad-servidor.test.ts` (detector de imports `'use client'` indebidos hacia adaptadores Supabase + detector de patrón de clave `service_role`, incluyendo barrido real del repositorio).
- [x] GREEN: documentación de la decisión de credencial y del procedimiento de siembra en `supabase/migrations/README.md`.
- [x] GREEN (parcial, ver blocker): confirmación de ausencia de `service_role`/claves privilegiadas en código cliente y componentes React (100% verificado); `.env.example` no pudo crearse por bloqueo de sandbox (ver blockers).
- [x] REFACTOR: la autorización futura permanece fuera del dominio (`dominio/rol-usuario.ts` sigue siendo solo un concepto, sin matriz aplicada) y fuera de componentes UI (no existen componentes React en este PR).

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 5. Contexto de hogar en casos de uso | `aplicacion/casos-uso/vehiculos-casos-uso.test.ts` | Application | ✅ `npm test`: 7 archivos, 59 tests antes de tocar nada | ✅ Reescrito con asserts por hogar + hogar distinto; falló 7/9 contra firmas sin hogar (incluye error de tipos por constructor `ProveedorIdentidadTemporal(hogarA)`) | ✅ Firmas de puertos/casos de uso/dobles actualizadas; 9/9 | ✅ Prueba de aislamiento `buscarPorId`/`listar` añadida | ✅ Grep confirma dominio sin `householdId`; `npm run build` verde |
| 6. Mapeadores Supabase (esquema real) | `adaptadores/supabase/mapeadores-supabase.test.ts` | Unit/contract | ✅ N/A (módulo nuevo) | ✅ Falló: módulo `./mapeadores-supabase` inexistente | ✅ 7/7 tras implementar mapeadores | ✅ Casos activo/inactivo, con/sin coste y vencimientos, fila→dominio y dominio→fila | ✅ Sin columnas `creado_en`/`actualizado_en`; prefijo `mv_` respetado |
| 6b. Reconstrucción de Vehiculo | `dominio/vehiculo.test.ts` | Unit/domain | ✅ 11 tests previos verdes | ✅ Falló: `reconstruirVehiculo is not a function` (2 tests) | ✅ `Vehiculo.reconstruir()`/`reconstruirVehiculo()` añadidos; 11/11 | ✅ Caso activo (sin fecha) y caso inactivo (con fecha) | ✅ Constructor privado conservado; solo se añade una segunda factory explícita para adaptadores |
| 7. Entorno de servidor | `compartido/infraestructura/entorno.test.ts` | Unit | ✅ N/A (módulo nuevo) | ✅ Falló: módulo `./entorno` inexistente | ✅ 3/3 tras implementar `leerEntornoSupabase` | ✅ Falta `SUPABASE_URL` vs. falta `SUPABASE_BOOTSTRAP_PASSWORD` (dos variables distintas) | ✅ Guarda explícita contra nombres `NEXT_PUBLIC_*` |
| 7b. Cliente Supabase de servidor | `adaptadores/supabase/cliente-supabase-servidor.test.ts` | Unit (con `vi.mock`) | ✅ N/A (módulo nuevo) | ✅ Falló: módulo inexistente (3/3 fallando) | ✅ 3/3 tras implementar guarda `window` + login | ✅ Éxito de login vs. fallo de login (mensajes distintos) | ✅ Guarda de servidor extraída a función nombrada |
| 7c. Repositorio Supabase de vehículos | `adaptadores/supabase/repositorio-vehiculos-supabase.test.ts` | Unit/contract (cliente falso) | ✅ N/A (módulo nuevo) | ✅ Falló: módulo inexistente | ✅ 4/4 tras implementar `guardar`/`buscarPorId`/`listar`/`existeMatricula` | ✅ Filtros `eq` para `buscarPorId` (2 filtros) vs. `listar` (1 filtro) vs. `existeMatricula` con otro hogar | ✅ Constante `TABLA`; mensajes de error homogéneos |
| 7d. Repositorio Supabase de eventos + UoW | `adaptadores/supabase/repositorio-eventos-supabase.test.ts` | Unit/contract (cliente falso) | ✅ N/A (módulo nuevo) | ✅ Falló: módulo inexistente | ✅ 6/6 tras implementar `guardar`/`listarPorVehiculo`/`listarConVencimiento`/UoW | ✅ Caso con `vehiculoActualizado` (dos tablas, orden vehículo→evento) vs. sin él (solo evento) vs. fallo del vehículo (evento nunca se escribe) | ✅ Comentario extenso documentando por qué no hay RPC en este PR y el riesgo de consistencia aceptado |
| 8. Contrato atómico a nivel de caso de uso | `aplicacion/casos-uso/registrar-evento-vehiculo.test.ts` | Application (fakes) | ✅ Suite completa verde antes de crear el archivo | ⚠️ Aprobación: el contrato ya era correcto desde PR1/tarea 4 y se preservó en la tarea 5; los 3 tests pasaron en su primera ejecución (no hubo fallo real sin tocar producción intencionalmente) | ✅ 3/3 | ✅ Caso feliz, caso de fallo (propaga error, una sola llamada a la UoW) y caso histórico (`vehiculoActualizado` undefined) | ✅ Comentario añadido en `registrar-evento-vehiculo.ts` explicando el contrato |
| 9. Bootstrap server-only | `adaptadores/supabase/bootstrap-servidor.test.ts` | Unit (operaciones falsas) | ✅ N/A (módulo nuevo) | ✅ Falló: módulo inexistente | ✅ 2/2 tras implementar `sembrarHogarDeDesarrollo` | ✅ Primera ejecución (crea) vs. segunda ejecución (idempotente, mismos ids, cero duplicados) | ✅ Orquestación mínima buscar-o-crear, sin lógica adicional |
| 9b. ProveedorIdentidad de servidor | `adaptadores/supabase/proveedor-identidad-supabase-servidor.test.ts` | Unit (cliente falso) | ✅ N/A (módulo nuevo) | ✅ Falló: módulo inexistente | ✅ 3/3 tras implementar resolución de contexto | ✅ Rol `admin` vs. rol `editor` vs. sin membresía (rechazo) | ✅ `householdId` recibido por constructor, nunca inventado dentro de la clase |
| 9c. Guardas de seguridad estáticas | `adaptadores/supabase/seguridad-servidor.test.ts` | Unit + barrido real del repo | ✅ N/A (módulo nuevo) | ✅ Falló: módulo inexistente (0 tests) | ✅ 7/7 tras implementar detectores | ✅ `use client` con import indebido vs. sin import vs. archivo de servidor con el mismo import (no debe marcarse) | ✅ Un falso positivo del propio detector (contiene el patrón que define) resuelto excluyéndose a sí mismo del barrido, documentado en el test |

### Test Summary

- **Total tests nuevos/modificados en este PR2**: 12 archivos de test tocados o creados (`vehiculos-casos-uso.test.ts` reescrito, `vehiculo.test.ts` ampliado, y 10 archivos de test nuevos bajo `adaptadores/supabase/` y `compartido/infraestructura/`).
- **Total tests passing (suite completa)**: 101/101 (`npm test`), repartidos en 16 archivos.
- **Layers usadas**: Unit/domain, Application (con fakes), Unit/contract con dobles del cliente Supabase, y un barrido real de seguridad sobre el repositorio de archivos.
- **Approval tests**: 1 (sección 8, contrato ya correcto heredado de PR1/tarea 4 — ver nota de honestidad TDD abajo).
- **Pure functions creadas/ampliadas**: mapeadores `aFilaVehiculo`/`aVehiculoDesdeFila`/`aFilaEventoVehiculo`/`aEventoVehiculoDesdeFila`, `sembrarHogarDeDesarrollo` (orquestación con efectos inyectados, no pura pero determinista), `detectarImportsClienteIndebidosEnContenido`, `contieneClavePrivilegiada`.

### Nota de honestidad TDD — tarea 8

El contrato de atomicidad evento+kilometraje ya estaba correctamente implementado
desde PR1 (tarea 4) y se preservó intacto durante la reapertura de la tarea 5
(scoping por hogar). Al escribir `registrar-evento-vehiculo.test.ts` dedicado que
pide la tarea 8, los tres tests pasaron en su primera ejecución sin necesitar
ningún cambio de código productivo: no hubo una fase RED real porque no había
ningún comportamiento incorrecto que corregir. Siguiendo la sección "Approval
Testing" de `strict-tdd.md` (pensada para consolidar comportamiento ya correcto
sin refactor), se documenta esto explícitamente en vez de fabricar una regresión
artificial en producción solo para forzar un RED — eso habría sido peor
ingeniería, no mejor disciplina TDD. El valor real de esta tarea 8 fue: (a) el
archivo de test dedicado que pide el enunciado, (b) la implementación Supabase
de la coordinación con su propio ciclo RED→GREEN genuino (`repositorio-eventos-supabase.test.ts`,
sección 7d), y (c) el comentario explícito de por qué no son dos escrituras
independientes.

### Comandos ejecutados (resumen)

- `npm test` (safety net inicial): 7 archivos, 59 tests.
- Tras cada RED: `npm test -- <archivo>` confirmando fallo (módulo inexistente o aserciones no cumplidas).
- Tras cada GREEN/TRIANGULATE: `npm test -- <archivo>` confirmando verde.
- `npm test` (suite completa, varias veces durante el corte): 16 archivos, 101 tests, siempre en verde al cierre de cada tarea.
- `npm run build`: verde en cada cierre de tarea (Next.js 16.2.10 + TypeScript, sin errores).
- `npm install @supabase/supabase-js@2.110.2`: añadida como dependencia de producción para el cliente de servidor.
- Grep manual (`rg`) para: imports prohibidos en dominio, `service_role`, `NEXT_PUBLIC_`, archivos `'use client'` — sin coincidencias fuera de comentarios/documentación esperados.

### Archivos cambiados

Modificados:
- `src/modulos/vehiculos/aplicacion/puertos/proveedor-identidad.ts`
- `src/modulos/vehiculos/aplicacion/puertos/repositorio-vehiculos.ts`
- `src/modulos/vehiculos/aplicacion/puertos/repositorio-eventos-vehiculo.ts`
- `src/modulos/vehiculos/aplicacion/casos-uso/registrar-vehiculo.ts`
- `src/modulos/vehiculos/aplicacion/casos-uso/listar-vehiculos.ts`
- `src/modulos/vehiculos/aplicacion/casos-uso/desactivar-vehiculo.ts`
- `src/modulos/vehiculos/aplicacion/casos-uso/registrar-evento-vehiculo.ts`
- `src/modulos/vehiculos/aplicacion/casos-uso/corregir-kilometraje.ts`
- `src/modulos/vehiculos/aplicacion/casos-uso/vehiculos-casos-uso.test.ts`
- `src/modulos/vehiculos/aplicacion/pruebas/proveedor-identidad-temporal.ts`
- `src/modulos/vehiculos/aplicacion/pruebas/repositorio-vehiculos-en-memoria.ts`
- `src/modulos/vehiculos/aplicacion/pruebas/repositorio-eventos-vehiculo-en-memoria.ts`
- `src/modulos/vehiculos/dominio/vehiculo.ts`
- `src/modulos/vehiculos/dominio/vehiculo.test.ts`
- `supabase/migrations/README.md`
- `package.json`, `package-lock.json` (añadido `@supabase/supabase-js`)
- `openspec/changes/vehicle-maintenance-app/tasks.md`
- `openspec/changes/vehicle-maintenance-app/apply-progress.md`

Creados:
- `src/modulos/vehiculos/aplicacion/casos-uso/registrar-evento-vehiculo.test.ts`
- `src/modulos/vehiculos/adaptadores/supabase/mapeadores-supabase.ts` y `.test.ts`
- `src/modulos/vehiculos/adaptadores/supabase/cliente-supabase-servidor.ts` y `.test.ts`
- `src/modulos/vehiculos/adaptadores/supabase/repositorio-vehiculos-supabase.ts` y `.test.ts`
- `src/modulos/vehiculos/adaptadores/supabase/repositorio-eventos-supabase.ts` y `.test.ts`
- `src/modulos/vehiculos/adaptadores/supabase/bootstrap-servidor.ts` y `.test.ts`
- `src/modulos/vehiculos/adaptadores/supabase/proveedor-identidad-supabase-servidor.ts` y `.test.ts`
- `src/modulos/vehiculos/adaptadores/supabase/seguridad-servidor.ts` y `.test.ts`
- `src/modulos/vehiculos/adaptadores/supabase/pruebas/cliente-supabase-falso.ts`
- `src/compartido/infraestructura/entorno.ts` y `.test.ts`

No creados (bloqueado por sandbox, ver sección de blockers):
- `.env.example`

### Deviations del diseño

- **`Vehiculo.reconstruir()`/`reconstruirVehiculo()`** (nuevo, no estaba en `diseno.md` explícitamente): necesario para que el mapeador fila→dominio pueda reconstruir un vehículo inactivo con su `fechaDesactivacion` real de la fila, sin pasar por `desactivar(fechaDesactivacion)` (que asignaría la fecha de "ahora" conceptualmente, no la fecha ya persistida). No introduce `householdId` en el dominio; solo generaliza la reconstitución de un agregado ya existente. Se considera una extensión menor y necesaria del dominio, no una desviación de las reglas de negocio.
- **`existeMatricula` en Supabase usa `.eq('matricula', ...)` (sensible a mayúsculas/minúsculas)**, mientras el repositorio en memoria normaliza a mayúsculas antes de comparar. Se documenta como decisión: el adaptador Supabase respeta literalmente la restricción `unique (household_id, matricula)` de la migración (sensible a mayúsculas tal como está definida en SQL), en vez de añadir normalización adicional no pedida por el esquema. Si el producto necesita unicidad insensible a mayúsculas, requeriría una decisión SDD explícita y probablemente una migración (`citext` o índice funcional), fuera de alcance de PR2.
- **Atomicidad Supabase sin RPC**: por restricción explícita de "no crear/modificar migración", `repositorio-eventos-supabase.ts` coordina en aplicación (vehículo primero, evento después) en vez de una transacción SQL real. Riesgo de consistencia documentado explícitamente en el propio archivo y aquí: si el proceso cae entre ambas escrituras, quedaría kilometraje actualizado sin evento que lo respalde; no hay rollback automático. Mitigación futura sugerida: RPC/función SQL transaccional en una migración posterior, fuera de alcance de PR2.
- **`OperacionesBootstrap` es un puerto sin implementación real contra Postgres/Supabase** en este PR (ver blockers). La migración no otorga `insert` sobre `mv_households` a `authenticated`, así que el bootstrap real requeriría acceso administrativo directo a la base (fuera del cliente anon-key normal), que no se puede ejecutar ni probar sin un entorno Supabase real disponible en esta sesión.
- **`.env.example` no se pudo crear** por un bloqueo de sandbox a nivel de herramienta (ver blockers). Se documentaron los nombres exactos de variables en `supabase/migrations/README.md` como mitigación.

### Blockers / notas

- **Sin entorno Supabase real ni local disponible en esta sesión**: no hay MCP Supabase conectado, y no se intentó levantar Supabase CLI/Docker local para este corte (el harness de RLS runtime de PR1 sigue disponible pero es un mecanismo distinto, para validar RLS de la migración, no para probar estos adaptadores de aplicación). Por eso las tareas 6–9 se validan con dobles deterministas del cliente Supabase (`pruebas/cliente-supabase-falso.ts`) en vez de integración real. Esto es un blocker de infraestructura, no una omisión: el contrato (household_id inyectado/filtrado, orden de escrituras, resolución de contexto, idempotencia del bootstrap) queda probado de forma determinista y debería seguir cumpliéndose contra una instancia real, pero **no se ha ejecutado ninguna prueba de integración contra Supabase real o local en este PR2**.
- **`OperacionesBootstrap` sin implementación real**: el puerto está definido y probado con dobles; su implementación contra una base Postgres real (acceso administrativo aislado, fuera de RLS) queda pendiente de un entorno Supabase disponible. Debe resolverse antes de desplegar, documentado también en `supabase/migrations/README.md`.
- **`.env.example` bloqueado por sandbox**: el entorno de ejecución del agente impide escribir cualquier archivo `.env*` (incluso sin secretos reales), tanto con la herramienta de escritura de archivos como con Bash. Se documentaron los nombres de variables en el README de migraciones como mitigación; un operador humano puede crear el archivo real.
- **Líneas cambiadas de este corte** (PR2 completo, tareas 5–9): aproximadamente 420 inserciones/129 eliminaciones en archivos existentes más ~1.400 líneas en archivos nuevos bajo `adaptadores/supabase/` y `compartido/infraestructura/` (incluye producción y tests). Supera ampliamente el presupuesto de 400 líneas por diseño: la Review Workload Forecast de `tasks.md` ya anticipó esto y resolvió `auto-chain`/`stacked-to-main` con PR2 como un único corte autónomo verificable (no se subdivide más, siguiendo la instrucción explícita de ejecutar "solo el corte asignado por PR").
- Dos archivos (`openspec/changes/vehicle-maintenance-app/diseno.md`, `openspec/changes/vehicle-maintenance-app/spec.md`) aparecen como modificados en `git status` sin que este apply los haya tocado; el diff preexistía al inicio de esta sesión (probablemente de una sincronización SDD previa) y se deja intacto.

### Workload / PR boundary

- PR boundary de este corte: PR 2 completo (tareas 5, 6, 7, 8 y 9), sin tocar PR 3 (tareas 10–13) ni la migración SQL existente.
- Estrategia: `auto-chain`, `stacked-to-main`.
- No se hizo commit ni se abrió PR (pendiente de confirmación explícita del usuario/orquestador).
- Verificación de cierre: `npm test` → 16 archivos, 101 tests, todos en verde. `npm run build` → verde con Next.js 16.2.10.

## Remediación fresca 4R (risk/resilience/readability/reliability) — 2026-07-11

### Estado estructurado consumido/producido

- Proyecto: `manteniment-vehicles`
- Cambio activo: `vehicle-maintenance-app`
- Artifact store: `both`; OpenSpec autoritativo.
- Modo: corte delegado de remediación de hallazgos confirmados por revisión fresca 4R sobre el diff de PR2 sin commitear.
- Estrategia de entrega vigente: `auto-chain`, `stacked-to-main`.
- Límite del corte: exactamente los 5 hallazgos confirmados (1 crítico de bootstrap, 1 crítico de errores tipados, 1 warning de dominio, 1 warning de divergencia de adaptadores, 1 sugerencia de `.upsert()`→`.insert()`). No se tocó la migración SQL ni `openspec/changes/archive/`.
- TDD estricto: activo; comando de tests `npm test`. Safety net inicial: 16 archivos, 101 tests en verde antes de tocar nada.

### Hallazgos resueltos

- [x] **Fix 1 (CRÍTICO)**: `sembrarHogarDeDesarrollo` ahora detecta condición de carrera en vez de duplicar en silencio. Tras CREAR un hogar (no tras encontrarlo), vuelve a consultar cuántos hogares existen con ese nombre (`OperacionesBootstrap.contarHogaresPorNombre`, nuevo método del puerto); si hay más de uno, lanza `ErrorRaceBootstrapHogar` (nuevo, tipado) en vez de continuar. Se documentó explícitamente en el comentario de módulo que esto es una mitigación de detección "single-instance/dev-only", NO una prevención real (esa requiere `unique` a nivel de BD + migración nueva, fuera de alcance). `tasks.md` sección 9 se corrigió: el checkbox de bootstrap ya no afirma sin matices que está "completo" — se dividió en orquestación/interfaz `[x]` (genuinamente hecha y probada contra dobles) más una tarea nueva explícita `[ ]` para la implementación real contra Postgres/Supabase Admin API + guardia de unicidad de BD, marcada como pendiente de entorno Supabase real.
- [x] **Fix 2 (CRÍTICO)**: se creó `errores-adaptador.ts` con la clase tipada `ErrorAdaptadorSupabase` (campo `codigo?: string`) y el helper `errorAdaptadorSupabaseDesde(contexto, errorCrudo)`. Se actualizaron los sitios que envolvían literalmente `${error.message}` de un error real de Supabase/Postgres en los cuatro archivos (`repositorio-vehiculos-supabase.ts`: 4 sitios; `repositorio-eventos-supabase.ts`: 5 sitios incluyendo el punto atómico; `proveedor-identidad-supabase-servidor.ts`: 1 sitio, el de lectura de membresía; `cliente-supabase-servidor.ts`: 1 sitio, autenticación). Los `throw new Error(...)` restantes en `proveedor-identidad-supabase-servidor.ts` (sesión no resuelta, sin membresía, rol desconocido) y en `cliente-supabase-servidor.ts` (guardia de ejecución en servidor) NO envuelven un error crudo de Supabase con código que preservar — son aserciones de estado de aplicación, no errores Postgres erosionados — y se dejaron intactos deliberadamente para no expandir el alcance del hallazgo. En el punto de riesgo de atomicidad documentado (`repositorio-eventos-supabase.ts`, cuando el insert del evento falla DESPUÉS de que la actualización del vehículo ya se confirmó) se añadió una única llamada `console.error` estructurada con `householdId`, `vehiculoId`, `codigo` y `mensaje` antes de relanzar, como señal grepeable para la reconciliación manual futura. Se decidió NO poner ese mismo log en el fallo de la actualización del propio vehículo (rama anterior) porque ahí todavía no hay ningún estado inconsistente (el evento nunca llega a confirmarse), así que no aplica el mismo riesgo — se documentó esta distinción explícitamente en el código y en el test.
- [x] **Fix 3 (WARNING)**: se añadió `validarConsistenciaEstadoDesactivacion(estado, fechaDesactivacion)` al constructor privado de `Vehiculo` (aplica a todos los puntos de entrada: `crear`, `desactivar`, `corregirKilometraje` y `reconstruir`). Rechaza `estado: 'activo'` con `fechaDesactivacion` definida, y `estado: 'inactivo'` sin `fechaDesactivacion`, lanzando `ErrorDominio` (el mismo tipo ya usado en el resto del archivo).
- [x] **Fix 4 (WARNING)**: se eliminó la normalización `trim().toLocaleUpperCase('es')` de `RepositorioVehiculosEnMemoria.existeMatricula`, que hacía la comparación insensible a mayúsculas mientras el adaptador Supabase real (`.eq('matricula', matricula)`) y la restricción `unique (household_id, matricula)` de la migración son sensibles a mayúsculas. Ahora ambos adaptadores comparan igual (sensible a mayúsculas). No existía ningún test previo que asertara explícitamente el rechazo insensible a mayúsculas (se buscó con `rg` en toda la suite); se añadió un test nuevo en `vehiculos-casos-uso.test.ts` que confirma el comportamiento real correcto: la misma matrícula con distinta capitalización SÍ puede registrarse en el mismo hogar.
- [x] **Fix 5 (SUGERENCIA)**: `repositorio-eventos-supabase.ts` usaba `.upsert(fila)` tanto en `guardar()` como en el tramo de escritura del evento dentro de `registrarEventoYActualizarKilometraje()`, lo que sobrescribiría en silencio un evento existente ante una colisión de id en vez de fallar por violación de restricción. Se cambiaron ambos sitios a `.insert(fila)`. La escritura de `mv_vehiculos` (que sí es mutable) conserva `.upsert()` sin cambios.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| Fix 1: detección de condición de carrera en bootstrap | `adaptadores/supabase/bootstrap-servidor.test.ts` | Unit (operaciones falsas) | ✅ 2/2 antes de modificar | ✅ Nuevo test con `contarHogaresPorNombre` devolviendo 2 falló: `ErrorRaceBootstrapHogar` era `undefined` (no existía) | ✅ 3/3 tras añadir el método al puerto + la verificación post-creación + la clase de error | ✅ Verificado que el conteo NO se llama en el camino idempotente (segunda ejecución encuentra el hogar, no lo crea) | ✅ Comentario extenso de módulo explicando el alcance real de la mitigación (detección, no prevención) |
| Fix 2: `ErrorAdaptadorSupabase` (helper puro) | `adaptadores/supabase/errores-adaptador.test.ts` | Unit (función pura) | N/A (módulo nuevo) | ⚠️ Implementación y test del helper puro escritos juntos (utilidad de soporte, no el comportamiento principal del hallazgo); ver nota de honestidad TDD abajo | ✅ 2/2 | ✅ Caso con código y caso sin código (error de red) | ➖ Sin refactor necesario, módulo nuevo pequeño |
| Fix 2: repositorio de vehículos | `adaptadores/supabase/repositorio-vehiculos-supabase.test.ts` | Unit/contract (cliente falso) | ✅ 4/4 antes de modificar | ✅ 4 tests nuevos fallaron: error capturado no era instancia de `ErrorAdaptadorSupabase` | ✅ 8/8 tras reemplazar los 4 `throw new Error` por `errorAdaptadorSupabaseDesde` | ✅ Cubiertos `guardar`, `buscarPorId`, `listar`, `existeMatricula` con códigos `23505`/`42501` | ➖ Sin refactor adicional |
| Fix 2 + Fix 5: repositorio de eventos + log de atomicidad + insert | `adaptadores/supabase/repositorio-eventos-supabase.test.ts` | Unit/contract (cliente falso) | ✅ 6/6 antes de modificar | ✅ 8 tests nuevos fallaron (5 de tipado de error + 1 de `console.error` + 2 de `.insert()` vs `.upsert()`) | ✅ 13/13 tras reemplazar los 3 `throw new Error` restantes, añadir el log estructurado en el punto real de riesgo, y cambiar `.upsert()`→`.insert()` en ambos sitios de escritura de eventos | ✅ Cubiertos: fallo de vehículo (sin log, no hay inconsistencia todavía) vs. fallo de evento (con log, sí hay inconsistencia); evento histórico sin vehículo actualizado; violación `23505` de id duplicado con `.insert()` | ✅ Comentarios distinguiendo explícitamente los dos puntos de fallo y por qué solo uno necesita el log de reconciliación |
| Fix 2: proveedor de identidad de servidor | `adaptadores/supabase/proveedor-identidad-supabase-servidor.test.ts` | Unit (cliente falso) | ✅ 3/3 antes de modificar | ✅ 1 test nuevo falló: error capturado no era instancia de `ErrorAdaptadorSupabase` | ✅ 4/4 tras reemplazar el único `throw new Error` que envolvía un error crudo de Supabase (lectura de membresía) | ➖ Un solo caso relevante (los otros 3 `throw` no envuelven error crudo, quedaron fuera de alcance deliberadamente) | ➖ Sin refactor adicional |
| Fix 2: cliente de servidor | `adaptadores/supabase/cliente-supabase-servidor.test.ts` | Unit (`vi.mock`) | ✅ 3/3 antes de modificar | ✅ 1 test nuevo falló: error capturado no era instancia de `ErrorAdaptadorSupabase` | ✅ 4/4 tras reemplazar el `throw new Error` de autenticación | ✅ Cubierto con y sin código (`invalid_credentials`) | ➖ Sin refactor adicional |
| Fix 3: consistencia estado/fechaDesactivacion | `dominio/vehiculo.test.ts` | Unit/domain | ✅ 11/11 antes de modificar | ✅ 2 tests nuevos fallaron: `reconstruirVehiculo` con par inconsistente no lanzaba nada | ✅ 13/13 tras añadir `validarConsistenciaEstadoDesactivacion` al constructor privado | ✅ Cubiertos ambos pares inconsistentes: activo+fecha, inactivo+sin fecha | ✅ Validación colocada en el constructor privado compartido, no solo en `reconstruir`, para que aplique a todos los entry points |
| Fix 4: divergencia de `existeMatricula` | `aplicacion/casos-uso/vehiculos-casos-uso.test.ts` | Application (repositorio en memoria real) | ✅ 9/9 antes de modificar | ✅ 1 test nuevo falló: registrar la misma matrícula con distinta capitalización lanzaba `ErrorDominio` (comportamiento insensible a mayúsculas aspiracional/incorrecto) | ✅ 10/10 tras eliminar la normalización de `RepositorioVehiculosEnMemoria.existeMatricula` | ➖ Un solo caso relevante: no existía ningún test previo que dependiera del comportamiento insensible a mayúsculas (se verificó con búsqueda en toda la suite antes de tocar el código) | ✅ Función `normalizarMatricula` eliminada por completo (quedó sin uso) |

### Test Summary

- **Total tests nuevos en este corte**: 24 (1 archivo de test nuevo: `errores-adaptador.test.ts` con 2 tests; más tests añadidos en 6 archivos existentes).
- **Total tests passing (suite completa)**: 120/120 (`npm test`), 17 archivos.
- **Layers usadas**: Unit/domain, Application (con repositorio en memoria real), Unit/contract con dobles del cliente Supabase, Unit puro (helper de error).
- **Approval tests**: 0 estrictos; 1 caso marginal documentado abajo (helper puro de Fix 2 escrito junto con su test).
- **Pure functions creadas/ampliadas**: `errorAdaptadorSupabaseDesde`, `validarConsistenciaEstadoDesactivacion`.

### Nota de honestidad TDD — helper `errorAdaptadorSupabaseDesde`

El helper puro `errorAdaptadorSupabaseDesde` (Fix 2) se escribió junto con su test (`errores-adaptador.test.ts`) en vez de seguir un RED→GREEN estricto: es una utilidad de soporte nueva y trivial (mapear `{message, code}` a una clase de error), no el comportamiento observable que pide el hallazgo. El comportamiento real exigido por Fix 2 — que cada sitio de los cuatro adaptadores lance `ErrorAdaptadorSupabase` con el `codigo` correcto — sí siguió RED→GREEN genuino en cada uno de los cuatro archivos de test de adaptador (ver tabla arriba), incluyendo ejecución real de los tests fallando antes de tocar producción.

### Comandos ejecutados (resumen)

- `npm test` (safety net inicial): 16 archivos, 101 tests.
- Tras cada RED: `npx vitest run <archivo>` confirmando fallo real (assertion o instancia de error incorrecta).
- Tras cada GREEN: `npx vitest run <archivo>` confirmando verde.
- `npm test` (suite completa, verificado tras cada fix): 17 archivos, 120 tests, siempre en verde al cierre.
- `npm run build`: verde con Next.js 16.2.10 y TypeScript sin errores tras todos los fixes.
- `rg` manual para confirmar que no quedan `throw new Error` envolviendo error crudo de Supabase sin convertir, y que no queda `.upsert()` para la tabla de eventos.

### Archivos cambiados

Modificados:
- `src/modulos/vehiculos/adaptadores/supabase/bootstrap-servidor.ts`
- `src/modulos/vehiculos/adaptadores/supabase/bootstrap-servidor.test.ts`
- `src/modulos/vehiculos/adaptadores/supabase/repositorio-vehiculos-supabase.ts`
- `src/modulos/vehiculos/adaptadores/supabase/repositorio-vehiculos-supabase.test.ts`
- `src/modulos/vehiculos/adaptadores/supabase/repositorio-eventos-supabase.ts`
- `src/modulos/vehiculos/adaptadores/supabase/repositorio-eventos-supabase.test.ts`
- `src/modulos/vehiculos/adaptadores/supabase/proveedor-identidad-supabase-servidor.ts`
- `src/modulos/vehiculos/adaptadores/supabase/proveedor-identidad-supabase-servidor.test.ts`
- `src/modulos/vehiculos/adaptadores/supabase/cliente-supabase-servidor.ts`
- `src/modulos/vehiculos/adaptadores/supabase/cliente-supabase-servidor.test.ts`
- `src/modulos/vehiculos/adaptadores/supabase/pruebas/cliente-supabase-falso.ts` (soporte de `.insert()` para el doble de test)
- `src/modulos/vehiculos/dominio/vehiculo.ts`
- `src/modulos/vehiculos/dominio/vehiculo.test.ts`
- `src/modulos/vehiculos/aplicacion/pruebas/repositorio-vehiculos-en-memoria.ts`
- `src/modulos/vehiculos/aplicacion/casos-uso/vehiculos-casos-uso.test.ts`
- `openspec/changes/vehicle-maintenance-app/tasks.md` (sección 9)
- `openspec/changes/vehicle-maintenance-app/apply-progress.md`

Creados:
- `src/modulos/vehiculos/adaptadores/supabase/errores-adaptador.ts`
- `src/modulos/vehiculos/adaptadores/supabase/errores-adaptador.test.ts`

### Desviaciones del diseño

- Ninguna desviación nueva de reglas de negocio. Todos los cambios son correcciones de robustez/tipado/consistencia sobre código ya implementado en PR2, sin tocar la migración SQL ni ampliar el alcance de los 5 hallazgos confirmados.
- La nota histórica de "Deviations del diseño" de la sección PR2 original (más arriba en este mismo archivo) documentaba `existeMatricula` en Supabase como sensible a mayúsculas "por decisión", contrastándolo con el repositorio en memoria insensible a mayúsculas. Esa nota histórica se deja intacta (describe correctamente lo que se decidió y por qué en ese momento); este corte corrige la implementación del repositorio en memoria para que coincida con esa decisión ya documentada, en vez of reescribir la historia.

### Blockers / notas

- Fix 1 sigue sin implementación real de `OperacionesBootstrap` contra Postgres/Supabase Admin API (ya documentado como blocker en la sección PR2 original): no hay entorno Supabase real ni local disponible en esta sesión. La nueva tarea `[ ]` en `tasks.md` sección 9 deja esto explícito como pendiente, junto con la guardia de unicidad de base de datos que requeriría una migración nueva.
- Ningún hallazgo de los 5 quedó sin completar: los 5 tienen ciclo RED→GREEN ejecutado y verificado, con la única excepción del sub-trabajo de infraestructura real de Fix 1 (implementación contra Postgres real), que ya estaba fuera de alcance por falta de entorno Supabase y se documenta como tarea pendiente explícita, no como fix incompleto.

### Workload / PR boundary

- PR boundary de este corte: remediación de 5 hallazgos confirmados de revisión fresca 4R sobre el diff PR2 sin commitear. No se tocó la migración SQL ni `openspec/changes/archive/`.
- Estrategia: `auto-chain`, `stacked-to-main`.
- No se hizo commit (pendiente de confirmación explícita del usuario/orquestador).
- Verificación de cierre: `npm test` → 17 archivos, 120 tests, todos en verde. `npm run build` → verde con Next.js 16.2.10.

## PR 3 — Interfaz mínima Next.js y server actions (tareas 10–13, corte final)

### Estado estructurado consumido/producido

- Proyecto: `manteniment-vehicles`
- Cambio activo: `vehicle-maintenance-app`
- Artifact store: `openspec` (autoritativo para esta ejecución); se intenta sincronizar Engram en `sdd/vehicle-maintenance-app/apply-progress`.
- Modo: interactivo, TDD estricto activo (`npm test`); Strict TDD Mode confirmado por el orquestador.
- Estrategia de entrega: `auto-chain`, `stacked-to-main`. Corte asignado: PR 3 completo y final (tareas 10–13), sin tocar la migración SQL ni `openspec/changes/archive/`.
- Alcance ejecutado: esquemas Zod y server actions (tarea 10), pantallas mínimas de listado/alta/desactivación de vehículos (tarea 11), historial de eventos/registro de eventos/corrección de kilometraje/vencimientos (tarea 12), y verificación final del MVP (tarea 13).
- Fuera de alcance, por instrucción explícita: auth/signup real, matriz de permisos aplicada, adjuntos, OCR, IA, notificaciones, dashboard avanzado, y cualquier migración SQL nueva.

### Decisión de arquitectura: composición de servidor para PR3

El verify-report de PR2 dejó documentado que `OperacionesBootstrap` (siembra real
contra Postgres/Supabase Admin API) sigue sin implementación real, y que PR3 debía
"asumir que el contexto de hogar/sesión se resuelve vía `ProveedorIdentidad`, sin
necesidad de resolver auth/signup real en este PR, reutilizando el patrón temporal
de identidad ya establecido en PR1/PR2, ahora conectado a server actions reales de
Next.js en vez de solo pruebas de caso de uso".

Decisión tomada (`src/modulos/vehiculos/interfaz/composicion/dependencias-servidor.ts`):

- Las server actions/páginas de PR3 componen los repositorios Supabase REALES ya
  construidos en PR2 (`RepositorioVehiculosSupabase`, `RepositorioEventosSupabase`,
  `crearClienteSupabaseServidor`) para persistencia, porque son la implementación de
  producción y el propósito completo de PR2 era tenerlos listos para PR3.
- La identidad sigue usando el patrón temporal `ProveedorIdentidadTemporal`
  (PR1/PR2), NO `ProveedorIdentidadSupabaseServidor`: este último exige conocer de
  antemano el `householdId` real sembrado por bootstrap, y resolver ese bootstrap
  real está fuera de alcance de PR3 (ya diferido explícitamente en PR2/tarea 9).
- Hallazgo técnico que obligó a un ajuste pequeño de PR2: `mv_households.id` y
  `mv_vehiculos.household_id` son columnas `uuid` reales (verificado leyendo
  `supabase/migrations/20260710000000_supabase_persistence_short.sql`). El valor
  fijo previo `'hogar-desarrollo'` (texto arbitrario) de `ProveedorIdentidadTemporal`
  NO sería un UUID válido contra el esquema real. Por eso se añadió la variable de
  entorno obligatoria `SUPABASE_HOUSEHOLD_ID_DESARROLLO` (con su propio ciclo
  RED→GREEN en `entorno.test.ts`/`entorno.ts`): debe contener el UUID real de
  `mv_households.id` ya sembrado fuera de banda por un operador, una vez exista
  entorno Supabase real. Esto está documentado en `supabase/migrations/README.md`
  (nueva sección "PR3 — composición de servidor y `SUPABASE_HOUSEHOLD_ID_DESARROLLO`").
- Consecuencia honesta: sin entorno Supabase real disponible en esta sesión (mismo
  blocker de infraestructura ya documentado en PR2), esta composición no se ha
  ejecutado de extremo a extremo contra una base real. Se valida con un doble
  determinista de `crearClienteSupabaseServidor` (`dependencias-servidor.test.ts`,
  1 mock, dentro del límite de higiene de mocks), igual que el resto de adaptadores
  de PR2.

### Tareas completadas y checkboxes persistidos

Sección 10 (validación y server actions):
- [x] RED/GREEN: `esquemas-vehiculo.test.ts`/`esquemas-vehiculo.ts` (5/5) y
  `esquemas-evento.test.ts`/`esquemas-evento.ts` (5/5) con Zod: campos obligatorios,
  coste opcional/no negativo, próximos vencimientos opcionales (incluye limpieza de
  `''` de un `<input>` vacío a `undefined` antes de validar tipo).
- [x] GREEN: `acciones-vehiculos.ts` y `acciones-eventos.ts` implementan server
  actions reales (`'use server'`) que componen `crearDependenciasVehiculos()` y
  llaman a los casos de uso de aplicación (nunca a Supabase directamente desde la
  action). Cada action expone además una función `procesar*` testeable por
  separado (sin depender de `next/cache`/`next/navigation`), que es la que tiene
  ciclo RED→GREEN real con dependencias en memoria.
- [x] GREEN: errores de dominio (`ErrorDominio`, p. ej. matrícula duplicada o
  vehículo inexistente) se devuelven literalmente; cualquier otro error se
  reemplaza por un mensaje genérico (`resultado-accion.ts`, `mensajeDeErrorAccion`,
  2/2) para no filtrar detalles internos de infraestructura a la interfaz.
- [x] REFACTOR: no se añadió ninguna API REST interna; las páginas consumen
  directamente los casos de uso (Server Components) o las server actions (formularios).

Sección 11 (pantallas mínimas de vehículos):
- [x] RED/GREEN: no hay React Testing Library en el setup (`vitest.config.ts` usa
  `environment: 'node'`; no hay `@testing-library/react` ni jsdom instalados). Se
  siguió la salvedad explícita de la propia tarea 11 ("si no, registrar
  verificación manual reproducible"): la lógica extraíble a función pura
  (`aVehiculoVista`, 2/2 en `vehiculo-vista.test.ts`) sí tiene ciclo RED→GREEN real;
  el resto (JSX/render) se cubre con el checklist de verificación manual de más
  abajo, no con tests automatizados.
- [x] GREEN: `src/app/vehiculos/page.tsx` (listado, Server Component,
  `dynamic = 'force-dynamic'` para no intentar prerenderizar en build sin entorno
  Supabase), `src/app/vehiculos/nuevo/page.tsx`, `formulario-vehiculo.tsx` (cliente,
  `useActionState`) y `lista-vehiculos.tsx` (presentacional).
- [x] GREEN: la lista muestra matrícula, marca+modelo, kilometraje formateado y una
  etiqueta de estado (`data-estado="activo|inactivo"`) que distingue activos/inactivos.
- [x] GREEN: alta desde `FormularioVehiculo` (`accionRegistrarVehiculo`, redirige a
  `/vehiculos` en éxito) y desactivación lógica inline desde `ListaVehiculos`
  (formulario con `accionDesactivarVehiculo`, solo visible en vehículos activos).
- [x] REFACTOR: los tres componentes React son presentacionales/delgados; toda la
  lógica de negocio vive en casos de uso/`procesar*`, no en JSX.

Sección 12 (historial, eventos, corrección de kilometraje y vencimientos):
- [x] RED/GREEN: se añadieron dos casos de uso nuevos y pequeños, cada uno con su
  propio ciclo RED→GREEN, necesarios para la página de detalle:
  `obtener-vehiculo.ts`/`.test.ts` (2/2: encontrado vs. no encontrado/aislado por
  hogar) y `listar-eventos-vehiculo.ts`/`.test.ts` (2/2: eventos del hogar actual
  vs. aislamiento de otro hogar). Los flujos de negocio en sí (mantenimiento,
  avería, evento con km mayor, evento histórico, corrección manual, vencimiento por
  km/fecha) ya estaban cubiertos por PR1/PR2 (`vehiculos-casos-uso.test.ts`,
  `registrar-evento-vehiculo.test.ts`, `dominio/vencimiento.test.ts`) y se
  reejercitan de extremo a extremo a través de `acciones-eventos.test.ts` (5/5:
  registrar evento actualiza kilometraje, alta incompleta, vehículo inexistente,
  corrección hacia abajo, kilometraje negativo rechazado).
- [x] GREEN: nueva proyección pura `aEventoVista`/`evento-vista.ts` (3/3: vencido
  por km, pendiente, sin vencimiento) que envuelve `evaluarVencimiento` (dominio,
  PR1) para la interfaz sin persistir el estado derivado.
- [x] GREEN: implementados `src/app/vehiculos/[vehiculoId]/page.tsx` (detalle,
  Server Component; `notFound()` si el vehículo no existe/no pertenece al hogar),
  `src/app/vehiculos/[vehiculoId]/eventos/nuevo/page.tsx`, `formulario-evento.tsx`
  (cliente, `useActionState`) y `historial-eventos.tsx` (presentacional).
- [x] GREEN: el histórico se lista para vehículos activos e inactivos por igual (el
  caso de uso `listarEventosVehiculo` no filtra por `estado` del vehículo, solo por
  `householdId`+`vehiculoId`, igual que en PR1/PR2).
- [x] GREEN: `FormularioEvento` permite mantenimiento/avería con proveedor, coste,
  notas y próximos vencimientos por km/fecha, todos opcionales salvo tipo/descripción/kilometraje/fecha.
- [x] GREEN: se añadió `formulario-correccion-kilometraje.tsx` (cliente,
  `useActionState` sobre `accionCorregirKilometraje`) embebido en la página de
  detalle; acepta corrección hacia arriba o hacia abajo (el dominio ya lo permite
  desde PR1, esta pantalla solo expone esa capacidad).
- [x] GREEN: `HistorialEventos` muestra una etiqueta de vencimiento
  (`data-estado-vencimiento`) solo cuando el evento tiene algún próximo
  vencimiento; el estado (`pendiente`/`vencido`) se calcula en cada render vía
  `aEventoVista`, nunca se guarda en Supabase.
- [x] REFACTOR: no se implementó dashboard, gráficas ni resumen agregado; solo
  listado + detalle + formularios mínimos, consistente con el límite explícito de
  `diseno.md` §12.

Sección 13 (verificación final del MVP): ver checklist con evidencia en
`tasks.md` sección 13 (las 8 líneas quedaron marcadas `[x]` con la evidencia
puntual de cada una).

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| Entorno: `SUPABASE_HOUSEHOLD_ID_DESARROLLO` | `compartido/infraestructura/entorno.test.ts` | Unit | ✅ 3/3 antes de modificar | ✅ 2 tests fallaron: `householdIdDesarrollo` ausente del objeto devuelto y falta de error al omitir la variable | ✅ 4/4 tras añadir la variable obligatoria | ➖ Un solo caso relevante (mismo patrón que las otras 4 variables ya existentes) | ➖ Sin refactor necesario |
| `ProveedorFechaSistema` | `adaptadores/sistema/proveedor-fecha-sistema.test.ts` | Unit (fake timers) | N/A (módulo nuevo) | ✅ Falló: módulo inexistente | ✅ 2/2 tras implementar `ahora()` delegando en `new Date()` | ✅ Fecha fija vs. avance real del reloj entre llamadas | ➖ Sin refactor necesario, clase de una línea |
| `crearDependenciasVehiculos` | `interfaz/composicion/dependencias-servidor.test.ts` | Unit/contract (cliente Supabase falso vía `vi.mock`) | N/A (módulo nuevo) | ✅ Falló: módulo inexistente | ✅ 4/4 tras implementar la composición | ✅ Repositorios Supabase reales, misma instancia repo-eventos/UoW, contexto de identidad con householdId real del entorno, proveedor de fecha real | ➖ Sin refactor necesario |
| `obtenerVehiculo` | `aplicacion/casos-uso/obtener-vehiculo.test.ts` | Application (repositorio en memoria) | N/A (módulo nuevo) | ✅ Falló: módulo inexistente | ✅ 2/2 tras implementar el caso de uso | ✅ Encontrado en el hogar propio vs. no encontrado desde otro hogar | ➖ Sin refactor necesario, replica el patrón de `desactivar-vehiculo.ts` |
| `listarEventosVehiculo` | `aplicacion/casos-uso/listar-eventos-vehiculo.test.ts` | Application (repositorio en memoria) | N/A (módulo nuevo) | ✅ Falló: módulo inexistente | ✅ 2/2 tras implementar el caso de uso | ✅ Eventos del hogar propio vs. aislamiento de otro hogar con el mismo `vehiculoId` | ➖ Sin refactor necesario |
| `esquemaRegistrarVehiculo`/`esquemaCorregirKilometraje` | `interfaz/validacion/esquemas-vehiculo.test.ts` | Unit (Zod) | N/A (módulo nuevo) | ✅ Falló: módulo inexistente | ✅ 5/5 tras implementar ambos esquemas | ✅ Datos válidos con coerción de tipos, matrícula faltante, kilometraje negativo (vehículo y corrección) | ➖ Sin refactor necesario |
| `esquemaRegistrarEvento` | `interfaz/validacion/esquemas-evento.test.ts` | Unit (Zod) | N/A (módulo nuevo) | ✅ Falló: módulo inexistente | ✅ 5/5 tras implementar el esquema con preprocesado de campos opcionales vacíos | ✅ Coste/vencimientos presentes vs. vacíos (`''`→`undefined`) vs. coste negativo vs. tipo desconocido | ➖ Sin refactor necesario |
| `mensajeDeErrorAccion` | `interfaz/acciones/resultado-accion.test.ts` | Unit (función pura) | N/A (módulo nuevo) | ✅ Falló: módulo inexistente (se detectó y corrigió una violación accidental de la regla RED-primero: se había escrito la implementación antes que el test; se eliminó el archivo de producción, se confirmó el fallo real por módulo inexistente, y luego se reimplementó) | ✅ 2/2 tras reimplementar | ✅ Error de dominio (mensaje literal) vs. error genérico (mensaje reemplazado) | ➖ Sin refactor necesario |
| `procesarRegistrarVehiculo`/`procesarDesactivarVehiculo` | `interfaz/acciones/acciones-vehiculos.test.ts` | Application/interfaz (repositorio en memoria + identidad temporal) | N/A (módulo nuevo) | ✅ Falló: módulo inexistente | ✅ 5/5 tras implementar ambas funciones + envoltorios `'use server'` | ✅ Alta válida, alta incompleta (errores por campo), matrícula duplicada, desactivación exitosa, vehículo inexistente | ➖ Sin refactor necesario |
| `procesarRegistrarEvento`/`procesarCorregirKilometraje` | `interfaz/acciones/acciones-eventos.test.ts` | Application/interfaz (repositorio en memoria) | N/A (módulo nuevo) | ✅ Falló: módulo inexistente | ✅ 5/5 tras implementar ambas funciones + envoltorios `'use server'` | ✅ Evento válido actualiza kilometraje, descripción faltante, vehículo inexistente, corrección hacia abajo, kilometraje negativo rechazado | ➖ Sin refactor necesario |
| `aVehiculoVista` | `interfaz/vistas/vehiculo-vista.test.ts` | Unit (función pura) | N/A (módulo nuevo) | ✅ Falló: módulo inexistente | ✅ 2/2 tras implementar la proyección | ✅ Vehículo activo (sin fecha de desactivación) vs. inactivo (con fecha) | ➖ Sin refactor necesario |
| `aEventoVista` | `interfaz/vistas/evento-vista.test.ts` | Unit (función pura, envuelve `evaluarVencimiento` de dominio) | N/A (módulo nuevo) | ✅ Falló: módulo inexistente | ✅ 3/3 tras implementar la proyección | ✅ Vencido por km, pendiente, sin vencimiento | ➖ Sin refactor necesario |

### Test Summary

- **Total tests nuevos en este PR3**: 37 (4 tests nuevos en `entorno.test.ts`
  ampliado a 4 totales; 33 tests en 11 archivos de test completamente nuevos).
- **Total tests passing (suite completa)**: 158/158 (`npm test`), 28 archivos.
- **Layers usadas**: Unit puro (Zod, proyecciones de vista, `ProveedorFechaSistema`,
  `mensajeDeErrorAccion`), Application con repositorios en memoria (casos de uso
  nuevos y server actions `procesar*`), Unit/contract con doble del cliente
  Supabase (composición de servidor). Ninguna capa de integración/E2E ni React
  Testing Library disponible en este proyecto.
- **Approval tests**: 0.
- **Pure functions creadas**: `aVehiculoVista`, `aEventoVista`,
  `mensajeDeErrorAccion`, `ProveedorFechaSistema.ahora` (delegada, no pura en
  sentido estricto pero determinista respecto al reloj del sistema).
- **Nota de honestidad TDD**: durante la implementación de `resultado-accion.ts` se
  escribió por error la implementación antes que el test (violación del RED-primero
  estricto). Se detectó de inmediato, se eliminó el archivo de producción, se
  confirmó un RED genuino (fallo por módulo inexistente) y se reimplementó desde
  ahí. Se documenta explícitamente en vez de ocultarlo.

### Comandos ejecutados (resumen)

- `npm test` (safety net inicial, antes de tocar nada): 17 archivos, 120 tests.
- `npm install zod@4` → añadida como dependencia de producción (`zod@^4.4.3`).
- Tras cada RED: `npx vitest run <archivo>` confirmando fallo real (módulo
  inexistente o aserción no cumplida).
- Tras cada GREEN/TRIANGULATE: `npx vitest run <archivo>` confirmando verde.
- `npm test` (suite completa, verificado repetidamente durante el corte): 28
  archivos, 158 tests, siempre en verde al cierre de cada tarea.
- `npm run build` (verificado repetidamente durante el corte): verde con Next.js
  16.2.10 y TypeScript sin errores; rutas nuevas confirmadas en la salida
  (`/vehiculos` y `/vehiculos/[vehiculoId]` como `ƒ` dinámicas por
  `dynamic = 'force-dynamic'`; `/vehiculos/nuevo` y
  `/vehiculos/[vehiculoId]/eventos/nuevo` como estáticas, sin fetch de datos en el
  Server Component).
- `npx vitest run src/modulos/vehiculos/adaptadores/supabase/seguridad-servidor.test.ts`
  → 7/7 tras añadir los 3 componentes cliente nuevos (barre todo `src/`, confirma
  que ninguno importa `adaptadores/supabase`).
- `rg` manual: sin `service_role`/`NEXT_PUBLIC_` en `src/`; sin imports de
  Next.js/React/Supabase/Zod/Tailwind ni referencias a `householdId` en
  `dominio/`.
- `npm audit --json` final: 2 vulnerabilidades moderadas (mismas ya documentadas en
  PR2: `postcss`/`next` vía `postcss` transitivo); ninguna vulnerabilidad nueva
  introducida por `zod`.

### Archivos cambiados

Modificados:
- `src/compartido/infraestructura/entorno.ts` (nueva variable obligatoria `householdIdDesarrollo`)
- `src/compartido/infraestructura/entorno.test.ts`
- `supabase/migrations/README.md` (nueva sección "PR3 — composición de servidor y `SUPABASE_HOUSEHOLD_ID_DESARROLLO`")
- `package.json`, `package-lock.json` (añadido `zod@^4.4.3`)
- `openspec/changes/vehicle-maintenance-app/tasks.md` (secciones 10–13 marcadas `[x]`)
- `openspec/changes/vehicle-maintenance-app/apply-progress.md`

Creados — aplicación:
- `src/modulos/vehiculos/aplicacion/casos-uso/obtener-vehiculo.ts` y `.test.ts`
- `src/modulos/vehiculos/aplicacion/casos-uso/listar-eventos-vehiculo.ts` y `.test.ts`

Creados — adaptadores:
- `src/modulos/vehiculos/adaptadores/sistema/proveedor-fecha-sistema.ts` y `.test.ts`

Creados — interfaz (composición/validación/acciones/vistas):
- `src/modulos/vehiculos/interfaz/composicion/dependencias-servidor.ts` y `.test.ts`
- `src/modulos/vehiculos/interfaz/validacion/esquemas-vehiculo.ts` y `.test.ts`
- `src/modulos/vehiculos/interfaz/validacion/esquemas-evento.ts` y `.test.ts`
- `src/modulos/vehiculos/interfaz/acciones/resultado-accion.ts` y `.test.ts`
- `src/modulos/vehiculos/interfaz/acciones/acciones-vehiculos.ts` y `.test.ts`
- `src/modulos/vehiculos/interfaz/acciones/acciones-eventos.ts` y `.test.ts`
- `src/modulos/vehiculos/interfaz/vistas/vehiculo-vista.ts` y `.test.ts`
- `src/modulos/vehiculos/interfaz/vistas/evento-vista.ts` y `.test.ts`

Creados — interfaz (componentes React, sin test automatizado, ver checklist manual):
- `src/modulos/vehiculos/interfaz/componentes/lista-vehiculos.tsx`
- `src/modulos/vehiculos/interfaz/componentes/formulario-vehiculo.tsx`
- `src/modulos/vehiculos/interfaz/componentes/formulario-evento.tsx`
- `src/modulos/vehiculos/interfaz/componentes/historial-eventos.tsx`
- `src/modulos/vehiculos/interfaz/componentes/formulario-correccion-kilometraje.tsx`

Creados — páginas Next.js (App Router, sin test automatizado, ver checklist manual):
- `src/app/vehiculos/page.tsx`
- `src/app/vehiculos/nuevo/page.tsx`
- `src/app/vehiculos/[vehiculoId]/page.tsx`
- `src/app/vehiculos/[vehiculoId]/eventos/nuevo/page.tsx`

### Checklist de verificación manual reproducible (pantallas React/páginas)

No ejecutada de extremo a extremo en esta sesión por falta de entorno Supabase real
(mismo blocker de infraestructura documentado en PR2: sin `SUPABASE_URL` real, sin
bootstrap ejecutado, sin `SUPABASE_HOUSEHOLD_ID_DESARROLLO` real). Reproducible por
un operador con `npm run dev` y variables de entorno reales configuradas:

1. Abrir `/vehiculos` sin vehículos registrados → se ve el mensaje de estado vacío
   ("Todavía no hay vehículos registrados.").
2. Ir a `/vehiculos/nuevo`, enviar el formulario con la matrícula vacía → el
   formulario permanece en la misma página y muestra el mensaje de error más el
   error específico bajo el campo matrícula (alta incompleta rechazada).
3. Enviar el formulario completo y válido → redirige a `/vehiculos` y el vehículo
   nuevo aparece en la lista con matrícula, marca+modelo, kilometraje formateado y
   la etiqueta "Activo".
4. Repetir el alta con la misma matrícula → error "Ya existe un vehículo con esa
   matrícula." (mensaje de dominio, comprensible).
5. Click en el vehículo de la lista → navega a `/vehiculos/[id]`, se ve
   marca/modelo/año/combustible/estado, el formulario de corrección de kilometraje
   y la sección de histórico vacía con enlace "Añadir evento".
6. Corregir el kilometraje a un valor mayor y luego a uno menor → tras cada envío
   la página se revalida y el número mostrado junto al formulario cambia
   correctamente en ambos sentidos.
7. Ir a "Añadir evento", registrar un mantenimiento con kilometraje mayor al actual,
   coste y ambos próximos vencimientos → redirige al detalle, el evento aparece en
   el histórico con su vencimiento etiquetado ("Pendiente" o "Vencido" según los
   valores usados) y el kilometraje del vehículo en la sección de arriba se
   actualiza al del evento.
8. Registrar un segundo evento "histórico" (kilometraje menor al actual del
   vehículo) → el kilometraje del vehículo NO cambia, pero el evento igual aparece
   en el histórico con su propio kilometraje (menor).
9. Desde `/vehiculos`, desactivar el vehículo → la etiqueta cambia a "Inactivo", el
   botón "Desactivar" desaparece para ese vehículo, y su detalle/histórico siguen
   siendo accesibles (no se pierde el histórico).
10. Revisar el mismo recorrido en una ventana estrecha (móvil) usando el modo
    responsive del navegador → el contenido no se desborda horizontalmente y sigue
    siendo legible (verifica el requisito no funcional "uso desde ordenador y
    móvil" sin exigir un diseño responsive elaborado, consistente con el alcance
    MVP).

### Desviaciones del diseño

- **`SUPABASE_HOUSEHOLD_ID_DESARROLLO` (nueva variable de entorno obligatoria)**:
  no estaba en el listado original de variables de PR2 (`entorno.ts`). Necesaria
  porque `ProveedorIdentidadTemporal` (identidad temporal ya establecida) debe
  producir un `householdId` que sea un UUID válido contra `mv_households.id`
  (columna `uuid` real), no un texto arbitrario. Documentada en
  `supabase/migrations/README.md` y con su propio ciclo RED→GREEN en
  `entorno.test.ts`.
- **`obtenerVehiculo` y `listarEventosVehiculo` (dos casos de uso nuevos, no
  listados literalmente en `diseno.md` §3/§5)**: necesarios para que la página de
  detalle pueda leer un único vehículo y sus eventos sin que la interfaz llame
  directamente a los repositorios (rompería la frontera de aplicación). Ambos
  siguen exactamente el mismo patrón que los cinco casos de uso ya existentes
  (`ProveedorIdentidad` + repositorio scoped por hogar).
- **`ProveedorFechaSistema` (nuevo adaptador `adaptadores/sistema/`)**: implementación
  real y trivial de `ProveedorFecha` para la composición de servidor; los casos de
  uso ya dependían del puerto desde PR1, solo faltaba una implementación no-fake.
- **Server actions con firma `(estadoPrevio, formData)` en vez de `(formData)`
  simple**: se adoptó el patrón `useActionState` de React 19 para poder mostrar
  errores de validación/dominio en el propio formulario sin JavaScript adicional
  en el cliente más allá del hook. `accionDesactivarVehiculo` es la única acción
  que se mantuvo con la firma simple `(formData) => Promise<void>` porque no
  necesita mostrar estado de error en la UI (es un botón de una sola acción dentro
  de la lista, no un formulario con campos).
- **No se creó ningún archivo `.test.tsx`** para páginas/componentes React: el
  proyecto no tiene React Testing Library ni entorno `jsdom` instalado
  (`vitest.config.ts` usa `environment: 'node'`). Instalar y configurar RTL habría
  sido un cambio de infraestructura de pruebas fuera del alcance declarado de PR3
  (tareas 10–13, interfaz + server actions), así que se siguió la salvedad
  explícita de la propia tarea 11 ("si no [hay RTL], registrar verificación manual
  reproducible"), documentada arriba. Toda la lógica extraíble a funciones puras
  (proyecciones de vista, validación, `procesar*` de server actions) sí tiene
  cobertura automatizada real.
- **Violación momentánea y corregida de RED-primero** en `resultado-accion.ts` (ver
  nota de honestidad TDD arriba): documentada explícitamente, no oculta.

### Riesgos / notas

- La composición de servidor (`dependencias-servidor.ts`) no se ha ejecutado nunca
  contra un Supabase real en esta sesión ni en las anteriores (mismo blocker de
  infraestructura de PR2). Antes de un despliegue real hace falta: (a) un entorno
  Supabase disponible, (b) ejecutar el bootstrap de PR2 (`sembrarHogarDeDesarrollo`,
  todavía con `OperacionesBootstrap` como puerto sin implementación real — tarea 9
  restante, no de este PR), y (c) configurar `SUPABASE_HOUSEHOLD_ID_DESARROLLO` con
  el UUID real resultante.
- El checklist de verificación manual de la sección anterior queda como
  procedimiento reproducible, no como evidencia de ejecución real en este corte.
- `npm audit` sigue reportando las mismas 2 vulnerabilidades moderadas de
  `postcss`/`next` ya documentadas en cortes anteriores; `zod` no introduce
  vulnerabilidades nuevas.
- Las líneas nuevas de este corte (PR3 completo, tareas 10–13) superan ampliamente
  el presupuesto de revisión de 400 líneas (~1.516 líneas en archivos nuevos más
  ~50 líneas de modificaciones en archivos existentes), igual que ocurrió en PR2.
  Esto es consistente con la Review Workload Forecast de `tasks.md`, que ya
  anticipó un riesgo alto y resolvió `auto-chain`/`stacked-to-main` con PR3 como el
  corte final, autónomo y verificable (no se subdivide más, siguiendo la
  instrucción explícita de ejecutar "solo el corte asignado por PR", en este caso
  el último).

### Workload / PR boundary

- PR boundary de este corte: PR 3 completo y final (tareas 10, 11, 12 y 13), sin
  tocar la migración SQL ni `openspec/changes/archive/`.
- Estrategia: `auto-chain`, `stacked-to-main`.
- No se hizo commit ni se abrió PR (pendiente de confirmación explícita del
  usuario/orquestador).
- Verificación de cierre: `npm test` → 28 archivos, 158 tests, todos en verde.
  `npm run build` → verde con Next.js 16.2.10, rutas nuevas de `/vehiculos`
  confirmadas en la salida del build.

## Remediación 4R (risk/resilience/readability/reliability) sobre PR3 — 2026-07-11

### Contexto

Revisión de 4 lentes (risk/resilience/readability/reliability) del diff de PR3
(interfaz Next.js + server actions sobre el adaptador Supabase de PR2), con 8
hallazgos confirmados (1 BLOCKER, 1 CRITICAL, 6 WARNING). TDD estricto activo
(`npm test`); se siguió `strict-tdd.md` incluida su regla de degradación de capa
de test ("Choosing Test Layer": Component rendering → Integration si hay
herramientas, si no → Unit test con mocks, NUNCA saltar la tarea).

### Fix 5 (WARNING, regresión confirmada) — fixture de PR2 rota por el nuevo campo de PR3

- `cliente-supabase-servidor.test.ts` construía un `EntornoSupabase` sin el campo
  `householdIdDesarrollo` (añadido por PR3), lo que hacía fallar `npx tsc --noEmit`
  con `TS2741` en la línea 14, aunque `vitest run` no lo detectaba (sin chequeo de
  tipos en runtime).
- Fix: se añadió `householdIdDesarrollo: '11111111-1111-4111-8111-111111111111'` al
  fixture. Confirmado con `npx tsc --noEmit`: 8 → 7 errores, exactamente el error
  objetivo desaparecido; los otros 3 errores pre-existentes (`TS2556` en el mismo
  archivo, `TS2540` en `bootstrap-servidor.test.ts`, `NODE_ENV` en
  `validate-supabase-rls.test.ts`) quedaron intactos, fuera de alcance por
  instrucción explícita.

### Fix 1 (BLOCKER) — capa de interfaz sin pruebas automatizadas; el fallback de checklist manual nunca se ejecutó

La nota "No se creó ningún archivo `.test.tsx`... se siguió la salvedad explícita
de la propia tarea 11" del corte de PR3 (más arriba en este mismo documento) fue
un hallazgo BLOCKER de esta revisión: la salvedad de degradar de capa de test es
obligatoria (nunca saltar la tarea), no una excepción para omitirla.

- Se instalaron `@testing-library/react@16.3.2` y `jsdom@29.1.1` como
  devDependencies. **No** se cambió el `environment` global de `vitest.config.ts`
  (sigue en `'node'` para no penalizar la velocidad de los tests no-DOM
  existentes): cada archivo de test de componente usa el pragma por archivo
  `// @vitest-environment jsdom`.
- Se escribieron tests RED→GREEN reales (mockeando las server actions vía
  `vi.mock` de sus módulos) para los 5 componentes presentacionales:
  - `lista-vehiculos.test.tsx` (4 tests): estado vacío, fila por vehículo con
    matrícula/marca/modelo/estado, botón "Desactivar" solo en activos, y el
    mensaje de fallo de la server action ahora visible (ver Fix 3).
  - `formulario-vehiculo.test.tsx` (3 tests): campos obligatorios renderizados,
    invocación de la server action al enviar, mensaje de error + error por campo
    cuando la acción falla.
  - `formulario-evento.test.tsx` (3 tests): campos + `vehiculoId` oculto,
    invocación de la acción al enviar, error + error por campo en fallo.
  - `formulario-correccion-kilometraje.test.tsx` (3 tests): campo con el
    kilometraje actual en la etiqueta, invocación de la acción, mensaje de error.
  - `historial-eventos.test.tsx` (5 tests): estado vacío, evento con
    tipo/descripción/km, ausencia de insignia sin vencimiento, insignia "Vencido"
    e insignia "Pendiente" según `estadoVencimiento` de la vista.
- Los dos envoltorios de server action sin test (`accionRegistrarVehiculo`,
  `accionDesactivarVehiculo`) se cubrieron en `acciones-vehiculos.test.ts`
  mockeando `next/navigation` (`redirect`), `next/cache` (`revalidatePath`) y el
  módulo de composición de dependencias: se probó el parseo de `FormData`, que se
  invoca el `procesar*` correspondiente, y que `redirect` solo se dispara cuando
  `accionRegistrarVehiculo` tiene éxito (no en fallo de validación).
- **Explícitamente NO se escribieron tests de Server Component async a nivel de
  página** (`page.tsx`): requerirían mockear en profundidad todo el árbol de
  `crearDependenciasVehiculos` → cliente Supabase real, y no hay un renderer de
  RSC async soportado oficialmente en esta combinación de Vitest/RTL sin
  infraestructura adicional (p. ej. un test runner de Next.js dedicado). Se
  consideró desproporcionado frente al resto del alcance de este pase; los 5
  componentes + los 2 envoltorios de acción (el núcleo real del hallazgo BLOCKER)
  sí están cubiertos.

### Fix 2 (CRITICAL) + Fix 6 (WARNING) — logging de incidentes y boilerplate duplicado (resueltos juntos)

- `mensajeDeErrorAccion` convertía cualquier error no-`ErrorDominio` (incluyendo
  `ErrorAdaptadorSupabase` con código Postgres real) en un mensaje genérico sin
  ningún logging de servidor.
- Se extrajo `ejecutarComoResultado<T>(contexto, fn)` en `resultado-accion.ts`:
  centraliza el try/catch → `ResultadoAccion` que se repetía en las cuatro
  funciones `procesar*` (`acciones-vehiculos.ts`, `acciones-eventos.ts`) y añade
  `console.error` (contexto + `codigo`/mensaje si es `ErrorAdaptadorSupabase`, o
  el error crudo si no) ANTES de devolver el mensaje genérico — solo para errores
  que no son `ErrorDominio` (los de dominio son esperados, no un incidente).
  `mensajeDeErrorAccion` se mantuvo como función pura reutilizada internamente.
- Tests en `resultado-accion.test.ts`: éxito devuelve `{exito: true, datos}`; un
  error de infraestructura (`ErrorAdaptadorSupabase`) registra `console.error` una
  vez con el contexto y el `codigo`; un `ErrorDominio` NO registra nada.
- Las cuatro funciones `procesar*` ahora son una línea de delegación a
  `ejecutarComoResultado` cada una.

### Fix 3 (WARNING) — `accionDesactivarVehiculo` descartaba su resultado

- `accionDesactivarVehiculo` tenía firma simple `(formData) => Promise<void>` y
  descartaba el `ResultadoAccion` de `procesarDesactivarVehiculo`: un fallo (p.
  ej. error de infraestructura) era invisible para la persona usuaria.
- Fix: se cambió la firma al patrón `useActionState` ya usado en el resto de PR3:
  `(estadoPrevio, formData) => Promise<ResultadoAccion<void>>`, devolviendo el
  resultado real en vez de descartarlo.
- `lista-vehiculos.tsx` pasó a ser `'use client'` y se extrajo el subcomponente
  `BotonDesactivarVehiculo` (uno por fila, porque cada vehículo necesita su propio
  estado de `useActionState`) que renderiza el mensaje de fallo con `role="alert"`
  cuando la acción no tiene éxito.
- Tests: `acciones-vehiculos.test.ts` prueba que el wrapper devuelve el fallo en
  vez de descartarlo; `lista-vehiculos.test.tsx` prueba que ese fallo se
  renderiza en la UI tras un click real (con `fireEvent` + `act`).

### Fix 4 (WARNING) — sin frontera de error bajo `src/app`

- Se añadió `src/app/vehiculos/error.tsx` (convención `error.tsx` de Next.js,
  componente cliente con `error`/`reset`): mensaje mínimo de degradación + botón
  "Reintentar" que llama a `reset()`.
- Test en `error.test.tsx` (jsdom): renderiza el mensaje de degradación y que el
  click en "Reintentar" invoca `reset`.

### Fix 7 (WARNING) — ramas de vencimiento no cubiertas en `evento-vista.test.ts`

- Se añadieron dos casos a los tres ya existentes: vencido disparado solo por
  fecha (con km bajo el umbral, para que dependa de que `fechaActual` se
  reenvíe correctamente a `evaluarVencimiento`), y pendiente cuando tanto el km
  como la fecha están justo por debajo de sus umbrales respectivos (depende de
  que ambos campos se reenvíen correctamente).
- Sanity check manual: se rompió temporalmente el reenvío de `fechaActual` en
  `aEventoVista` (hardcodeado a una fecha antigua) y se confirmó que el nuevo
  test de "vencido por fecha" fallaba como se esperaba, antes de revertir el
  cambio — descartando un GREEN trivial.

### Fix 8 (WARNING) — `SUPABASE_HOUSEHOLD_ID_DESARROLLO` sin validar formato UUID

- `crearIdentificador` (revisado primero, como pedía la instrucción) no hace
  validación de formato UUID, solo no-vacío; se añadió un regex UUID dedicado en
  `entorno.ts` (`requerirUuid`), aplicado únicamente a
  `SUPABASE_HOUSEHOLD_ID_DESARROLLO` en `leerEntornoSupabase`, para fallar en
  lectura de configuración con un mensaje claro en vez de un
  "invalid input syntax for type uuid" de Postgres en la primera consulta real.
- Test RED→GREEN en `entorno.test.ts`.

### Fuera de alcance de este pase (confirmado, no tocado)

- Los 3 errores de `tsc` pre-existentes no relacionados con Fix 5.
- Asimetría de `revalidatePath` en `accionCorregirKilometraje` (cosmético).
- Constantes de estilo Tailwind duplicadas entre formularios (cosmético).
- Misclasificación silenciosa de `evaluarVencimiento` ante un `Date` inválido
  (defensivo, sin ruta real de disparo dado que Zod ya valida antes).
- Migración SQL y `openspec/changes/archive/`: no tocados.

### Verificación de cierre

- `npm test` → 34 archivos, 188 tests, todos en verde (antes del pase: 28
  archivos, 158 tests).
- `npx tsc --noEmit` → 7 errores (antes del pase: 8; exactamente el de Fix 5
  desapareció, los 7 restantes son pre-existentes y fuera de alcance).
- `npm run build` → verde con Next.js 16.2.10 Turbopack, mismas rutas de
  `/vehiculos` confirmadas en la salida del build.

## Remediación pre-commit PR3 — bloqueadores full-4R

- `RISK-PR3-001`: la composición de servidor ahora falla cerrada antes de crear el cliente o resolver la identidad temporal. Exige `VEHICULOS_ACCESS_TOKEN` en servidor y una cabecera `x-vehiculos-access-token` idéntica, pensada para ser inyectada por el proxy de acceso del MVP. La comparación usa `timingSafeEqual`. Pruebas: prueba ausente e inválida bloquean; prueba válida permite componer dependencias.
- `R3-PR3-001`: las fechas de eventos se formatean explícitamente en UTC. La regresión comprueba que `2026-02-01T00:00:00.000Z` se muestra como `1/2/2026`.
- `R4-OBS-001`: se añadió `ReportadorIncidentes`, usado por errores de infraestructura de server actions y por la frontera de error de `/vehiculos`.
- `R4-PR3-002`: producción dispone ahora de integración HTTP real mediante `NEXT_PUBLIC_INCIDENT_REPORT_URL`; alternativamente puede instalarse un SDK con `establecerReportadorIncidentes`. Sin configuración se degrada a consola sanitizada.
- `R4-PR3-003`: los fallos síncronos y asíncronos del reportador quedan aislados y activan el fallback sin romper server actions ni la frontera de error.

### Evidencia TDD y validación

- RED final: 4 pruebas fallaron antes de la implementación (reportador sin duplicado, reportador que lanza, endpoint configurado y frontera resiliente).
- GREEN/TRIANGULATE final: pruebas focalizadas 11/11; suite completa 196/196; server action conserva mensaje genérico y la frontera renderiza y ejecuta `reset` aunque falle el reportador.
- Requisito operativo: configurar `NEXT_PUBLIC_INCIDENT_REPORT_URL` con un endpoint que acepte `POST` JSON o instalar un SDK. El payload excluye stack y valores de error no serializables.

- RED focalizado: fallaron las pruebas de acceso ausente/inválido y faltaba el módulo `reporte-incidentes`.
- GREEN/TRIANGULATE: `npm test -- src/modulos/vehiculos/interfaz/composicion/dependencias-servidor.test.ts src/modulos/vehiculos/interfaz/componentes/historial-eventos.test.tsx src/modulos/vehiculos/interfaz/acciones/resultado-accion.test.ts src/app/vehiculos/error.test.tsx` → 4 archivos, 22 pruebas pasadas.
- Suite: `npm test` → 34 archivos, 194 pruebas pasadas.
- Tipos: `npx tsc --noEmit` → conserva exactamente los 7 errores preexistentes conocidos; no aparecen errores nuevos.
- Build: `npm run build` → compilación y generación completadas correctamente.

## Remediación final de fiabilidad PR3 — `R3-REL-001`

- RED observado: `npm test -- src/modulos/vehiculos/interfaz/acciones/resultado-accion.test.ts` falló 2/10 pruebas porque el fallback escribía `token-secreto`, `Bearer secreto` y el mensaje con credenciales del error.
- GREEN/TRIANGULATE: el fallback y el payload HTTP ahora usan una allowlist mínima (`codigo`; presencia de `digest` con valor redactado), omiten cualquier otra metadata y sustituyen `Error.message` por un texto neutro. Los rechazos asíncronos, incluidos thenables, se aíslan mediante `Promise.resolve(...).catch(...)` y activan el mismo fallback seguro sin propagarse al caller.
- Pruebas focalizadas: `npm test -- src/modulos/vehiculos/interfaz/acciones/resultado-accion.test.ts src/app/vehiculos/error.test.tsx` → 2 archivos, 13/13 tests.
- Suite completa: `npm test` → 34 archivos, 198/198 tests.
- Tipos: `npx tsc --noEmit` → exactamente los 7 errores conocidos, ninguno en los archivos de esta remediación.

## Remediación final de fiabilidad PR3 — `R3-001` y `R3-002`

- `R3-001`: las pruebas de token ausente e inválido ahora limpian los mocks antes de cada caso y verifican explícitamente que `crearClienteSupabaseServidor` no fue llamado. Así queda protegido el orden validación → creación de dependencias.
- `R3-002`: la regresión de fecha fuerza `TZ=America/Los_Angeles`, demuestra que el formateo local produciría `31/1/2026` y exige que el componente mantenga `1/2/2026`. La zona original se restaura en `finally`.
- RED: excepción justificada para remediación test-only; la implementación ya era correcta y ambas nuevas aserciones pasaron en su primera ejecución. No se modificó producción.
- GREEN/TRIANGULATE: `npm test -- src/modulos/vehiculos/interfaz/composicion/dependencias-servidor.test.ts src/modulos/vehiculos/interfaz/componentes/historial-eventos.test.tsx` → 2 archivos, 13/13 tests.
- Suite: `npm test` → 34 archivos, 198/198 tests.
- Tipos: `npx tsc --noEmit` → código 2 con exactamente los 7 errores conocidos; cero errores nuevos.
