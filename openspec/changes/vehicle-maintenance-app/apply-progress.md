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
