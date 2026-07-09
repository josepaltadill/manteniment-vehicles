# Tareas: aplicación de mantenimiento de vehículos

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 1.800–2.800 líneas |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: base técnica + dominio + casos de uso en memoria → PR 2: Supabase servidor + migraciones + contratos transaccionales → PR 3: interfaz mínima Next.js + server actions |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |
| Decision status | Resuelta para apply: ejecutar solo el corte asignado por PR |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

## Decisiones fijadas para implementar

- La matrícula en `mv_vehiculos.matricula` será única globalmente dentro de esta app, incluyendo vehículos inactivos. Esto evita reutilizar matrículas históricas y simplifica integridad en Supabase compartido.
- El MVP puede usar un actor temporal fijo, pero todo acceso a datos de aplicación debe pasar por backend/server actions o adaptadores de servidor.
- No se permite usar claves privilegiadas o `service_role` en código cliente.
- No se permite acceso browser-side directo a Supabase para datos de vehículos/eventos del MVP.
- El registro de evento + actualización de kilometraje debe exponerse como operación atómica/coordinada de aplicación y adaptador: no puede quedar evento guardado sin actualizar kilometraje cuando corresponde.

## Corte recomendado por PR

### PR 1 — Base técnica, dominio y casos de uso en memoria

Estado inicial: repositorio greenfield sin `package.json`.
Estado final: proyecto Next.js/TypeScript/Vitest inicializado, dominio probado y casos de uso funcionando con repositorios en memoria.
Verificación: `npm test` pasa con pruebas de dominio y aplicación.
Rollback: revertir este PR elimina la base sin tocar Supabase ni datos reales.

### PR 2 — Persistencia Supabase segura desde servidor

Estado inicial: PR 1 integrado.
Estado final: migraciones `mv_*`, adaptador Supabase de servidor y contrato atómico para evento + kilometraje.
Verificación: tests de mapeadores/contratos; revisión de que no hay Supabase app-data en cliente ni claves privilegiadas expuestas.
Rollback: revertir migraciones/adaptadores antes de usar datos productivos o aplicar migración inversa documentada.

### PR 3 — Interfaz MVP y server actions

Estado inicial: PR 2 integrado.
Estado final: pantallas mínimas para listar/crear/desactivar vehículos, registrar eventos, corregir kilometraje y ver historial/vencimientos.
Verificación: `npm test` y recorrido manual en desktop/móvil básico.
Rollback: revertir UI/actions sin alterar dominio ni migraciones.

## Tareas ejecutables

### 1. PR 1 — Preparar stack y harness de pruebas

- [x] RED: crear pruebas mínimas de humo en `src/compartido/pruebas/harness.test.ts` que fallen hasta configurar Vitest.
- [x] GREEN: inicializar `package.json`, `tsconfig.json`, `vitest.config.ts`, `next.config.ts`, `postcss.config.js`, `src/app/layout.tsx` y `src/app/page.tsx` con Next.js + TypeScript + Tailwind + Vitest. Nota: Tailwind v4 usa `@tailwindcss/postcss`; no se conserva `tailwind.config.ts` porque no hay personalización necesaria.
- [x] GREEN: configurar script `npm test` en `package.json` usando Vitest.
- [x] REFACTOR: dejar estructura base `src/modulos/vehiculos/` y `src/compartido/` sin lógica duplicada.

### 2. PR 1 — Implementar dominio puro de vehículos

- [x] RED: crear pruebas en `src/modulos/vehiculos/dominio/vehiculo.test.ts` para vehículo válido, kilometraje negativo, baja lógica y corrección manual arriba/abajo.
- [x] GREEN: implementar `src/modulos/vehiculos/dominio/vehiculo.ts`, `errores-dominio.ts` y helpers compartidos en `src/compartido/dominio/`.
- [x] TRIANGULATE: añadir caso de vehículo inactivo que conserva identidad, matrícula y fecha de alta.
- [x] REFACTOR: mantener el dominio sin imports de Next.js, React, Supabase, Zod ni Tailwind.

### 3. PR 1 — Implementar dominio de eventos, vencimientos y roles

- [x] RED: crear pruebas en `src/modulos/vehiculos/dominio/evento-vehiculo.test.ts`, `vencimiento.test.ts` y `rol-usuario.test.ts` para mantenimiento, avería, coste opcional, evento histórico, vencimiento por km, vencimiento por fecha, sin vencimiento y roles `admin`/`editor`.
- [x] GREEN: implementar `evento-vehiculo.ts`, `vencimiento.ts` y `rol-usuario.ts`.
- [x] TRIANGULATE: probar evento con solo vencimiento por km, solo por fecha y ambos.
- [x] REFACTOR: extraer tipos/value objects solo si reducen duplicación real.

### 4. PR 1 — Implementar casos de uso con puertos en memoria

- [x] RED: crear pruebas en `src/modulos/vehiculos/aplicacion/casos-uso/*.test.ts` para registrar/listar vehículo, rechazar matrícula duplicada global, desactivar sin borrar eventos, registrar evento actualizando kilometraje, registrar evento histórico sin bajarlo y corregir kilometraje.
- [x] GREEN: implementar casos de uso en `src/modulos/vehiculos/aplicacion/casos-uso/` y puertos en `src/modulos/vehiculos/aplicacion/puertos/`.
- [x] GREEN: definir en `repositorio-vehiculos.ts` una operación de unicidad global, por ejemplo `existeMatricula(matricula: string): Promise<boolean>`; no usar solo `existeMatriculaActiva`.
- [x] GREEN: definir un puerto/contrato atómico para `registrarEventoYActualizarKilometraje` o unidad de trabajo equivalente, consumido por `registrar-evento-vehiculo.ts`.
- [x] GREEN: crear repositorios en memoria para pruebas en `src/modulos/vehiculos/aplicacion/pruebas/`.
- [x] REFACTOR: asegurar que los casos de uso reciben `ProveedorIdentidad`/actor temporal sin aplicar matriz de permisos real.

### 5. PR 2 — Crear migraciones Supabase `mv_*`

- [ ] RED: documentar/crear prueba de contrato SQL o snapshot en `supabase/migrations/*.test.ts` si el harness lo permite; si no, añadir checklist verificable en `supabase/migrations/README.md` con guardarraíles para Supabase compartido/producción.
- [ ] GREEN: crear migración en `supabase/migrations/` para `mv_vehiculos` y `mv_eventos_vehiculo` con checks, claves foráneas e índices, respetando los guardarraíles documentados.
- [ ] GREEN: imponer unicidad global de `mv_vehiculos.matricula`, incluyendo vehículos inactivos.
- [ ] GREEN: incluir prefijo `mv_` en todos los objetos SQL de esta app.
- [ ] GREEN: dejar las tablas protegidas a nivel Supabase antes de ejecución real: RLS activado sin políticas permisivas por defecto, revocación explícita de `anon`/`authenticated`, o excepción privada documentada y autorizada.
- [ ] REFACTOR: no crear tablas futuras de adjuntos/OCR/manuales; solo reservar nombres en documentación si hace falta.

### 6. PR 2 — Implementar adaptador Supabase solo de servidor

- [ ] RED: crear pruebas de mapeadores en `src/modulos/vehiculos/adaptadores/supabase/mapeadores-supabase.test.ts`.
- [ ] GREEN: implementar `cliente-supabase-servidor.ts`, `repositorio-vehiculos-supabase.ts`, `repositorio-eventos-supabase.ts` y `mapeadores-supabase.ts`.
- [ ] GREEN: validar variables en `src/compartido/infraestructura/entorno.ts` sin exponer claves privilegiadas al cliente.
- [ ] GREEN: asegurar que el cliente Supabase de datos de app se importa solo desde server actions, Server Components o adaptadores de servidor.
- [ ] REFACTOR: buscar y eliminar cualquier acceso browser-side a Supabase para `mv_vehiculos`/`mv_eventos_vehiculo`.

### 7. PR 2 — Garantizar atomicidad evento + kilometraje

- [ ] RED: crear prueba de contrato en `src/modulos/vehiculos/aplicacion/casos-uso/registrar-evento-vehiculo.test.ts` que falle si se guarda evento y falla la actualización de kilometraje requerida.
- [ ] GREEN: implementar el contrato atómico/coordinado definido en el puerto de aplicación.
- [ ] GREEN: en Supabase, resolver la operación con RPC/transacción SQL o mecanismo equivalente de servidor; si se usa coordinación en aplicación, documentar compensación y error de consistencia en `repositorio-eventos-supabase.ts`.
- [ ] TRIANGULATE: probar evento histórico que guarda evento sin actualizar kilometraje.
- [ ] REFACTOR: dejar explícito en comentarios técnicos mínimos por qué no son dos llamadas independientes inseguras.

### 8. PR 2 — Frontera auth/RLS temporal segura

- [ ] RED: crear prueba/checklist en `src/modulos/vehiculos/adaptadores/supabase/seguridad-servidor.test.ts` o documentación verificable que detecte imports cliente indebidos.
- [ ] GREEN: implementar `src/modulos/vehiculos/aplicacion/puertos/proveedor-identidad.ts` y adaptador temporal de actor fijo en servidor.
- [ ] GREEN: documentar en `supabase/migrations/README.md` que auth/RLS real queda diferido y que cualquier política temporal debe ser explícita para entorno privado.
- [ ] GREEN: confirmar que no existe `service_role` ni clave privilegiada en código cliente, `.env.example` público o componentes React.
- [ ] REFACTOR: mantener la autorización futura fuera del dominio y fuera de componentes UI.

### 9. PR 3 — Validación y server actions

- [ ] RED: crear pruebas de esquemas en `src/modulos/vehiculos/interfaz/validacion/esquemas-vehiculo.test.ts` y `esquemas-evento.test.ts` para campos obligatorios, coste opcional/no negativo y próximos vencimientos opcionales.
- [ ] GREEN: implementar esquemas Zod en `src/modulos/vehiculos/interfaz/validacion/`.
- [ ] GREEN: implementar server actions en `src/modulos/vehiculos/interfaz/acciones/acciones-vehiculos.ts` y `acciones-eventos.ts` llamando casos de uso/adaptadores de servidor.
- [ ] GREEN: las actions deben devolver errores de validación comprensibles para alta incompleta y entradas inválidas.
- [ ] REFACTOR: no añadir API REST interna salvo necesidad real.

### 10. PR 3 — Pantallas mínimas de vehículos

- [ ] RED: crear pruebas de componentes o validaciones de render mínimas en `src/modulos/vehiculos/interfaz/componentes/*.test.tsx` si el setup elegido soporta React Testing Library; si no, registrar verificación manual reproducible.
- [ ] GREEN: implementar `src/app/vehiculos/page.tsx`, `src/app/vehiculos/nuevo/page.tsx`, `formulario-vehiculo.tsx` y `lista-vehiculos.tsx`.
- [ ] GREEN: mostrar matrícula, marca, modelo, estado y kilometraje actual, distinguiendo activos/inactivos.
- [ ] GREEN: permitir alta de vehículo y desactivación lógica desde server action.
- [ ] REFACTOR: mantener componentes presentacionales pequeños; la lógica de negocio no vive en React.

### 11. PR 3 — Historial, eventos, corrección de kilometraje y vencimientos

- [ ] RED: cubrir con pruebas de caso de uso o verificación manual los flujos de registrar mantenimiento, registrar avería, evento con km mayor, evento histórico, corrección manual y vencimiento por km/fecha.
- [ ] GREEN: implementar `src/app/vehiculos/[vehiculoId]/page.tsx`, `src/app/vehiculos/[vehiculoId]/eventos/nuevo/page.tsx`, `formulario-evento.tsx` y `historial-eventos.tsx`.
- [ ] GREEN: mostrar histórico de eventos de vehículos activos e inactivos.
- [ ] GREEN: permitir registrar mantenimiento/avería con próximos vencimientos opcionales.
- [ ] GREEN: permitir corrección manual de kilometraje hacia arriba o hacia abajo.
- [ ] GREEN: mostrar estado calculado de vencimiento sin persistir estado derivado.
- [ ] REFACTOR: evitar dashboard avanzado; mantener solo lo necesario del MVP.

### 12. Verificación final del MVP

- [ ] Ejecutar `npm test` y guardar evidencia en el reporte de aplicación/verificación.
- [ ] Revisar que el dominio no importa Next.js, React, Supabase, Zod ni Tailwind.
- [ ] Revisar que todas las tablas/artefactos SQL usan prefijo `mv_`.
- [ ] Revisar que `mv_vehiculos.matricula` es única globalmente.
- [ ] Revisar que evento + actualización de kilometraje usa contrato atómico/coordinado.
- [ ] Revisar que no hay acceso inseguro desde navegador a Supabase para datos de app.
- [ ] Revisar que no hay claves privilegiadas en cliente.
- [ ] Confirmar que OCR, IA, adjuntos, notificaciones y dashboard avanzado no se implementaron.

## Mapa de cobertura de aceptación

| Criterio de spec/diseño | Tareas que lo cubren |
|---|---|
| Alta de vehículo con datos obligatorios | 2, 4, 9, 10 |
| Rechazo de alta incompleta | 2, 9, 10 |
| Listado de flota con activos/inactivos | 4, 10 |
| Desactivación lógica sin perder histórico | 2, 4, 10, 11 |
| Registro de mantenimiento y avería | 3, 4, 9, 11 |
| Evento con km mayor actualiza kilometraje | 3, 4, 7, 11 |
| Evento histórico no reduce kilometraje | 3, 4, 7, 11 |
| Corrección manual arriba/abajo | 2, 4, 11 |
| Vencimiento por km o fecha, lo primero | 3, 4, 11 |
| Roles `admin`/`editor` como concepto de dominio | 3, 4, 8 |
| Supabase compartido con prefijo `mv_` | 5, 6, 12 |
| Backend/server actions como frontera de datos | 6, 8, 9, 12 |
| Sin `service_role` ni Supabase app-data en cliente | 6, 8, 12 |
| Matrícula única global incluyendo inactivos | 4, 5, 12 |
| Fuera de alcance: OCR/IA/adjuntos/notificaciones/dashboard | 5, 11, 12 |

## Riesgos y controles

- Riesgo: el cambio completo supera ampliamente 400 líneas. Control: aplicar en PRs encadenados y no iniciar `sdd-apply` hasta elegir `Chain strategy`.
- Riesgo: Supabase compartido sin auth/RLS real puede inducir accesos inseguros. Control: acceso a app-data solo desde servidor y actor temporal explícito.
- Riesgo: inconsistencia entre evento y kilometraje. Control: contrato atómico/coordinado obligatorio y prueba de fallo parcial.
- Riesgo: la regla de matrícula cambia en producto. Control: se fija unicidad global para MVP; cambiarla requerirá migración y nueva decisión SDD.
- Riesgo: `npm test` está configurado pero el repo es greenfield. Control: PR 1 crea runner antes de implementar lógica.
