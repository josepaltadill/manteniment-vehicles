# Especificación: validación runtime local de RLS Supabase

## Propósito

Definir un harness reproducible que demuestre el comportamiento runtime de la migración `mv_*` únicamente en un entorno Supabase local o efímero. La ejecución real permanece bloqueada hasta que la evidencia completa, incluida la concurrencia del último administrador, sea satisfactoria.

## Requisitos

### Requisito: Preflight fail-closed

El harness MUST detectar sin mutar la versión y disponibilidad de Supabase CLI y Docker antes de iniciar cualquier runtime o comando mutante. Si falta una herramienta, la versión no es utilizable o el preflight falla, MUST terminar con estado bloqueado y código de salida distinto de cero, sin probar destinos alternativos.

#### Escenario: Herramienta ausente

- GIVEN que Supabase CLI o Docker no están disponibles
- WHEN se ejecuta el harness
- THEN informa la herramienta faltante y su versión disponible, si existe, y no ejecuta migraciones, resets, conexiones ni limpieza

#### Escenario: Preflight satisfactorio

- GIVEN que ambas herramientas están disponibles
- WHEN termina el preflight
- THEN registra sus versiones exactas y habilita únicamente las fases posteriores que superen las guardas de destino

### Requisito: Destino local o efímero demostrado

Antes de cualquier operación mutante, el harness MUST demostrar que el destino pertenece al runtime local/efímero creado o identificado por la propia ejecución. MUST rechazar destinos remotos, compartidos, persistentes, MCP, URLs ambiguas, credenciales compartidas y valores aportados por entorno que no puedan vincularse al runtime permitido. Ante cualquier duda MUST fallar cerrado y no borrar nada.

#### Escenario: Destino no demostrable

- GIVEN una URL, clave, proyecto o endpoint que no puede probarse local y efímero
- WHEN el harness intenta preparar o aplicar el runtime
- THEN rechaza el destino con motivo explícito y no ejecuta ningún comando mutante

#### Escenario: Destino permitido

- GIVEN un runtime local/efímero cuya identidad y propiedad por el harness están verificadas
- WHEN se autoriza la preparación
- THEN solo se permite aplicar la migración y crear fixtures dentro de ese runtime

### Requisito: Aplicación aislada de la migración existente

El harness MUST aplicar desde cero la migración existente en un runtime desechable y MUST verificar que no modifica la migración funcional como parte de esta validación. No MUST existir conexión ni mutación de una instancia Supabase real, compartida o persistente.

#### Escenario: Ejecución limpia

- GIVEN un runtime permitido y vacío
- WHEN se ejecuta la validación
- THEN la migración se aplica allí y el resultado identifica el runtime, la versión y el estado de la aplicación

### Requisito: Matriz de actores y aislamiento entre hogares

La validación MUST cubrir dos hogares y, como mínimo, los contextos `anon`, usuario autenticado no miembro, `editor` y `admin`. Cada caso MUST registrar operación, hogar objetivo, actor, resultado esperado y resultado obtenido.

#### Escenario: Acceso anónimo

- GIVEN el contexto `anon`
- WHEN intenta leer o escribir cualquier tabla `mv_*`
- THEN el acceso es rechazado

#### Escenario: Usuario no miembro

- GIVEN un usuario autenticado sin membresía en el hogar objetivo
- WHEN intenta leer, insertar, actualizar o borrar datos de ese hogar
- THEN la operación es rechazada y no observa datos del hogar

#### Escenario: Editor

- GIVEN un `editor` miembro de un hogar
- WHEN lee o crea/modifica datos operativos de su hogar
- THEN la operación permitida afecta únicamente a ese hogar
- AND cuando administra hogar, membresías o borra datos operativos
- THEN la operación es rechazada

#### Escenario: Administrador

- GIVEN un `admin` miembro de un hogar
- WHEN administra hogar y membresías o realiza las operaciones operativas permitidas
- THEN la operación se autoriza únicamente para su hogar
- AND nunca puede observar ni modificar filas del otro hogar

### Requisito: Cobertura de `using` y `with check`

La matriz MUST probar tanto la visibilidad y autorización de filas existentes (`using`) como la validación del hogar resultante en inserciones y actualizaciones (`with check`). Debe incluir intentos de insertar o trasladar una fila al hogar ajeno y de modificar una fila existente para cruzar hogares.

#### Escenario: Cruce mediante escritura

- GIVEN un actor autorizado en el hogar A
- WHEN intenta insertar o actualizar un vehículo, evento o membresía con `household_id` del hogar B
- THEN la operación es rechazada y no deja una fila cruzada

### Requisito: Integridad declarativa runtime

La validación MUST demostrar el rechazo runtime de una relación evento/vehículo con hogares incompatibles mediante la FK compuesta, de valores inválidos cubiertos por los checks y de una matrícula duplicada dentro del mismo hogar. MUST distinguir estos rechazos de un fallo de permisos.

#### Escenario: Invariantes de datos

- GIVEN fixtures válidos en dos hogares
- WHEN se intenta crear un evento con vehículo de otro hogar, un valor que viola un check o una matrícula repetida en el mismo hogar
- THEN cada operación es rechazada por la invariante correspondiente y la base conserva el estado válido

### Requisito: Preservación del último administrador

La validación MUST comprobar el rechazo de borrar, degradar o trasladar al último `admin` mediante una operación normal de membresía, y MUST comprobar que la misma operación es aceptada cuando queda otro administrador. También MUST comprobar el borrado explícito del hogar y su comportamiento permitido. La prueba concurrente con dos sesiones MUST pasar antes de autorizar producción; si no forma parte del primer corte, el resultado MUST quedar como bloqueo explícito, no como éxito parcial.

#### Escenario: Último administrador secuencial

- GIVEN un hogar con un único `admin`
- WHEN se intenta borrarlo, degradarlo o trasladarlo
- THEN la operación es rechazada y el hogar conserva un administrador

#### Escenario: Otro administrador disponible

- GIVEN un hogar con al menos dos `admin`
- WHEN se retira o degrada uno sin dejar el hogar sin administrador
- THEN la operación es aceptada

#### Escenario: Retirada concurrente

- GIVEN dos sesiones que intentan retirar administradores del mismo hogar al mismo tiempo
- WHEN ambas operaciones se ejecutan concurrentemente
- THEN como máximo una puede dejar de ser válida si produciría cero administradores, y el estado final conserva al menos uno

### Requisito: Evidencia reproducible y bloqueo de despliegue

Cada ejecución MUST producir salida reproducible con el comando exacto, versiones del CLI/runtime, identificación no secreta del entorno, casos ejecutados, esperado, obtenido, errores y código de salida. No MUST conservar por defecto salidas volátiles ni credenciales en el repositorio. El resumen de `apply-progress` MUST incluir el comando reproducible, un resumen manual conciso, el estado de la matriz y los bloqueos pendientes.

#### Escenario: Fallo de un caso

- GIVEN que cualquier caso obligatorio falla o no puede ejecutarse
- WHEN termina el harness
- THEN la salida es distinta de cero, el informe identifica el caso y la aplicación real permanece bloqueada

#### Escenario: Ejecución completa satisfactoria

- GIVEN que todos los casos, incluida concurrencia, pasan
- WHEN se revisa la evidencia
- THEN un revisor puede reproducir la ejecución desde un repositorio limpio y verificar la autorización para el siguiente paso sin consultar credenciales secretas

### Requisito: Limpieza acotada

Al finalizar, el harness SHOULD limpiar los recursos efímeros que creó. MUST limpiar únicamente recursos identificados y etiquetados como propios; si la propiedad o el destino no son inequívocos, MUST detenerse sin borrar y reportar la intervención requerida.

#### Escenario: Limpieza segura

- GIVEN recursos creados por esta ejecución
- WHEN termina una ejecución exitosa o fallida
- THEN solo esos recursos son eliminados y los recursos externos quedan intactos

## No objetivos explícitos

- Aplicar, revertir o inspeccionar una instancia Supabase real, compartida o persistente.
- Usar MCP o credenciales compartidas como destino de validación.
- Cambiar el esquema funcional o crear una migración de producto; un defecto descubierto requiere una decisión y cambio separado.
- Crear adaptadores TypeScript, UI, bootstrap productivo, seeds permanentes o RPC de dominio.
- Sustituir PostgreSQL/Supabase runtime por Vitest.
- Validar monitorización, backup, recuperación o rollback de producción.

## Fallos de seguridad

Cualquier intento de mutar antes del preflight y la guardia de destino, uso de destino ambiguo/remoto/MCP, exposición de secretos, limpieza fuera de recursos propios o continuación tras un bloqueo MUST considerarse fallo crítico y bloquear la validación.

## Evidencia de aceptación

La aceptación requiere: preflight con versiones; prueba de destino local/efímero; matriz completa de actores y dos hogares; `using`/`with check`; FK compuesta, checks y unicidad por hogar; transiciones del último admin, incluida concurrencia; salida reproducible sin secretos; limpieza acotada; y estado final de código cero solo cuando todo lo anterior pase. La evidencia se conserva como salida reproducible más resumen manual en `apply-progress`, sin commitear outputs volátiles por defecto.
