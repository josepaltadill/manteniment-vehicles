# Especificación: persistencia Supabase corta

Este documento es el compañero legible para revisión humana. La especificación normativa de requisitos y escenarios es `specs/supabase-persistence/spec.md`; ante cualquier divergencia, prevalece esa especificación de capacidad.

Este cambio DEBE dejar definido un primer corte revisable de persistencia Supabase para vehículos y eventos, limitado a migración SQL versionada, RLS, guardarraíles y validación sin mutar la base real.

## Alcance obligatorio

- Migración SQL no aplicada para `mv_households`, `mv_household_members`, `mv_vehiculos` y `mv_eventos_vehiculo`.
- Límites explícitos por `household_id` para datos operativos.
- RLS basada en membresía de hogar.
- Guardarraíles y checklist de validación estática/manual.

## Fuera de alcance

- NO se DEBE implementar todavía el adaptador TypeScript de Supabase.
- NO se DEBE crear UI.
- NO se DEBEN aplicar migraciones, seeds, resets ni limpiezas contra Supabase real.
- NO se DEBEN crear tablas futuras de adjuntos, OCR, IA, manuales, recordatorios o notificaciones.

## Requisitos

### Requisito: Objetos propios prefijados

El sistema DEBE definir únicamente objetos propios de la app con prefijo `mv_` dentro de este corte.

#### Escenario: migración acotada a la app

- DADO un archivo SQL versionado de migración
- CUANDO se revise su contenido
- ENTONCES toda tabla, política, índice, constraint o función propia del proyecto DEBE usar prefijo `mv_`
- Y NO DEBE modificar ni eliminar tablas públicas ajenas existentes.

### Requisito: Modelo mínimo multiusuario

El sistema DEBE modelar hogares, membresías, vehículos y eventos con las tablas `mv_households`, `mv_household_members`, `mv_vehiculos` y `mv_eventos_vehiculo`.

#### Escenario: tablas mínimas presentes

- DADO el SQL de migración
- CUANDO se revise el esquema propuesto
- ENTONCES DEBEN existir las cuatro tablas mínimas
- Y `mv_vehiculos` y `mv_eventos_vehiculo` DEBEN tener `household_id` obligatorio.

### Requisito: Tenancy por hogar

El sistema DEBE garantizar que todo vehículo y todo evento pertenezcan exactamente a un hogar.

#### Escenario: vehículo asociado a hogar

- DADO un vehículo persistido
- CUANDO se revise su fila
- ENTONCES DEBE tener un `household_id` válido.

#### Escenario: evento asociado al mismo hogar que su vehículo

- DADO un evento de vehículo
- CUANDO se valide su relación con `mv_vehiculos`
- ENTONCES el evento DEBE referenciar un vehículo del mismo `household_id`
- Y NO DEBE poder existir un evento cruzando hogares.

### Requisito: Matrícula única por hogar

El sistema DEBE impedir matrículas duplicadas dentro del mismo hogar, incluyendo vehículos inactivos, mediante `unique (household_id, matricula)` o una garantía equivalente.

#### Escenario: matrícula repetida en el mismo hogar

- DADO un hogar con un vehículo de matrícula `ABC123`
- CUANDO se intente registrar otro vehículo con la misma matrícula en ese hogar
- ENTONCES la persistencia DEBE rechazarlo.

#### Escenario: matrícula repetida en otro hogar

- DADO un hogar A con un vehículo de matrícula `ABC123`
- CUANDO un hogar B registre un vehículo con la misma matrícula
- ENTONCES el esquema PUEDE permitirlo
- Y los historiales de cada hogar DEBEN permanecer aislados.

### Requisito: Integridad de datos operativos

El sistema DEBE impedir datos operativos inválidos para vehículos y eventos.

#### Escenario: valores negativos rechazados

- DADO un vehículo o evento
- CUANDO `kilometros`, `kilometros_actuales` o `coste` sean negativos
- ENTONCES la persistencia DEBE rechazar la fila.

#### Escenario: estados y tipos acotados

- DADO una fila de vehículo o evento
- CUANDO se informe un estado de vehículo o tipo de evento
- ENTONCES el valor DEBE estar dentro de los valores aceptados por el dominio.

### Requisito: Borrado coherente del hogar

El borrado explícito de un hogar DEBE eliminar en cascada sus membresías, vehículos y eventos. Debido a que PostgreSQL no distingue la causa del borrado padre en una FK declarativa, borrar directamente un vehículo también elimina sus eventos; esta operación DEBE permanecer restringida a `admin`.

#### Escenario: borrado explícito del hogar

- DADO un hogar con membresías, vehículos y eventos
- CUANDO un `admin` elimina explícitamente el hogar
- ENTONCES la persistencia DEBE eliminar todos esos hijos sin dejar filas huérfanas.

### Requisito: RLS obligatoria por membresía

El sistema DEBE habilitar RLS en todas las tablas `mv_*` del corte y DEBE permitir acceso solo a usuarios autenticados que sean miembros del hogar correspondiente.

#### Escenario: usuario miembro accede a datos de su hogar

- DADO un usuario autenticado con membresía en un hogar
- CUANDO consulte hogares, vehículos o eventos de ese hogar
- ENTONCES las políticas RLS DEBEN permitir el acceso correspondiente.

#### Escenario: usuario no miembro no accede a datos ajenos

- DADO un usuario autenticado sin membresía en un hogar
- CUANDO intente consultar, crear, actualizar o eliminar datos de ese hogar
- ENTONCES las políticas RLS DEBEN denegar el acceso.

#### Escenario: usuario anónimo no accede a datos operativos

- DADO un usuario no autenticado
- CUANDO intente acceder a tablas `mv_*`
- ENTONCES las políticas RLS DEBEN denegar el acceso.

### Requisito: Preservación del último administrador

El sistema DEBE impedir que una actualización, degradación, traslado o eliminación normal de membresía deje un hogar existente sin al menos un `admin`. La garantía DEBE vivir en PostgreSQL y cubrir operaciones concurrentes; el borrado explícito del hogar PUEDE eliminar sus membresías en cascada.

### Requisito: Guardarraíles de migración

El sistema DEBE documentar que este corte permite explícitamente `mv_households`, `mv_household_members`, `mv_vehiculos` y `mv_eventos_vehiculo`, y DEBE mantener prohibidas operaciones destructivas globales.

#### Escenario: checklist revisa operaciones peligrosas

- DADO la migración propuesta
- CUANDO se complete la checklist de revisión
- ENTONCES DEBE confirmarse ausencia de `drop schema`, `drop database`, resets globales y operaciones `cascade` no justificadas.

### Requisito: Validación sin mutar Supabase real

El sistema DEBE producir evidencia de revisión sin ejecutar la migración contra la instancia Supabase real.

#### Escenario: validación aceptable del corte

- DADO este cambio en revisión
- CUANDO se valide la migración
- ENTONCES la evidencia DEBE incluir revisión estática del SQL, checklist de guardarraíles y revisión de RLS
- Y NO DEBE incluir ejecución contra la base real.

### Requisito: Recuperación y salud del despliegue

Antes de una aplicación real DEBEN existir backup verificado, responsable operativo y ensayo local/efímero de rollback preservando datos o fix-forward. Tras desplegar, el operador DEBE observar inmediatamente errores DB/RLS y latencia: más de 1% exige investigación, más de 2% activa emergencia y más de 5% activa respuesta de todo el equipo.

### Requisito: Presupuesto de revisión

El diff completo supera 400 líneas porque incluye los artefactos SDD. Se acepta una excepción de tamaño para este bundle de aprendizaje en un único commit, mientras el payload de implementación permanezca pequeño; adaptador, UI o ampliaciones posteriores DEBEN separarse.

#### Escenario: alcance crece fuera del corte

- DADO una propuesta de cambio que añade adaptador TypeScript, UI o ejecución real de migraciones
- CUANDO se revise contra esta especificación
- ENTONCES DEBE considerarse fuera de alcance para este corte.

## Checklist de validación esperada

- [ ] El SQL crea solo objetos propios con prefijo `mv_`.
- [ ] Las cuatro tablas mínimas están presentes.
- [ ] `household_id` es obligatorio en vehículos y eventos.
- [ ] La matrícula es única por `(household_id, matricula)` o equivalente.
- [ ] Un evento no puede referenciar un vehículo de otro hogar.
- [ ] Kilómetros y costes negativos son rechazados.
- [ ] RLS está habilitada en todas las tablas `mv_*` del corte.
- [ ] Las políticas se basan en membresía de `mv_household_members`.
- [ ] Usuarios anónimos y no miembros quedan denegados.
- [ ] No hay mutación contra Supabase real.
- [ ] No hay adaptador TypeScript ni UI en este cambio.
